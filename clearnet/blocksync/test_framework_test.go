package blocksync

import (
	"context"
	"fmt"
	"math/big"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/solmock"
)

type TestSetupData struct {
	ConfirmationNum *uint64
	Backend         *eth.SimulatedBackend
	Store           Store
}

func (tsd TestSetupData) validate() error {
	if tsd.Backend == nil {
		return fmt.Errorf("nil backend")
	}

	return nil
}

type TestBlockInstruction struct {
	Events1 *[]solmock.TestEvent
	Events2 *[]solmock.TestEvent
}

func BlockWithEvents(events ...solmock.TestEvent) TestBlockInstruction {
	return TestBlockInstruction{Events1: &events}
}

func RepeatBlocks(num uint64, blockInstruction TestBlockInstruction) []TestBlockInstruction {
	blocks := make([]TestBlockInstruction, num)
	for i := range blocks {
		blocks[i] = blockInstruction
	}
	return blocks
}

// map[BlockNumToForkAt]BlockNumToBaseForkAt
// NOTE: blockNum starts at 1, blockIdx at 0
type TestForkInstructions map[uint64]uint64

type TestInputData struct {
	Blocks []TestBlockInstruction
	Forks  *TestForkInstructions
}

func (tid TestInputData) validate() error {
	if tid.Forks == nil {
		return nil
	}

	for forkAt, forkBase := range *tid.Forks {
		if forkAt < forkBase {
			return fmt.Errorf("Fork at %d is less than the base block at %d", forkAt, forkBase)
		}
	}

	return nil
}

type TestExpectedOutput struct {
	// NOTE: *big.Int to allow for nil value, in which case the field is not checked
	ConfirmedBlocks *big.Int
	SkippedBlocks   *big.Int
	SeenBlocks      *big.Int
	RemovedBlocks   *big.Int
	EventsNum       *big.Int
	Events          *map[solmock.TestEvent]uint64
}

type testFramework struct {
	t                    *testing.T
	eventEmitterInst1    *solmock.TestEventEmitter
	eventEmitterInst2    *solmock.TestEventEmitter
	Backend              *eth.SimulatedBackend
	Tracker              *Tracker
	Store                Store
	SubscriptionAddress1 common.Address
	SubscriptionAddress2 common.Address
}

func NewTestFramework(t *testing.T, setup *TestSetupData) *testFramework {
	if setup == nil {
		t.Fatal("[newTestFramework]: nil setup, input or expected output data")
	}

	confNum := setup.ConfirmationNum
	if confNum == nil {
		temp := DefaultConfirmationTiers[Instant]
		confNum = &temp
	}

	require.NoError(t, setup.validate(), "[newTestFramework]: error validating setup data")

	tracker := NewTracker(setup.Backend, setup.Store, confNum)

	eventEmitterAddr1, _, eventEmitterInst1, err := solmock.DeployTestEventEmitter(setup.Backend.Deployer().TransactOpts, setup.Backend)
	require.NoError(t, err, "[newTestFramework]: error deploying eventEmitter contract")

	eventEmitterAddr2, _, eventEmitterInst2, err := solmock.DeployTestEventEmitter(setup.Backend.Deployer().TransactOpts, setup.Backend)
	require.NoError(t, err, "[newTestFramework]: error deploying eventEmitter contract")

	// manually include the deployment transaction
	setup.Backend.Commit()

	return &testFramework{
		t:                    t,
		eventEmitterInst1:    eventEmitterInst1,
		eventEmitterInst2:    eventEmitterInst2,
		Backend:              setup.Backend,
		Tracker:              tracker,
		Store:                setup.Store,
		SubscriptionAddress1: eventEmitterAddr1,
		SubscriptionAddress2: eventEmitterAddr2,
	}
}

func (tf *testFramework) RunInput(inputData TestInputData) []common.Hash {
	require.NoError(tf.t, inputData.validate(), "[newTestFramework]: error validating input data")

	blockNumToHash := make(map[uint64]common.Hash)
	ctx := context.Background()
	var hashes []common.Hash

	for blockIdx, block := range inputData.Blocks {
		thisBlockNum := uint64(blockIdx) + 1
		if block.Events1 != nil {
			for _, event := range *block.Events1 {
				hash, err := solmock.SendTriggerEventTx(ctx, tf.eventEmitterInst1, tf.Backend.Deployer(), event)
				require.NoError(tf.t, err, "[runInputData]: error emitting event")
				hashes = append(hashes, hash)
			}
		}

		if block.Events2 != nil {
			for _, event := range *block.Events2 {
				hash, err := solmock.SendTriggerEventTx(ctx, tf.eventEmitterInst2, tf.Backend.Deployer(), event)
				require.NoError(tf.t, err, "[runInputData]: error emitting event")
				hashes = append(hashes, hash)
			}
		}

		blockNumToHash[thisBlockNum] = tf.Backend.Commit()

		if inputData.Forks != nil {
			if forkBaseBlockNum, ok := (*inputData.Forks)[thisBlockNum]; ok {
				if forkBaseBlockNum > thisBlockNum {
					tf.t.Fatalf("Fork base block number %d is greater than the fork at number %d", forkBaseBlockNum, thisBlockNum)
				}
				if err := tf.Backend.Fork(blockNumToHash[forkBaseBlockNum]); err != nil {
					tf.t.Fatalf("Failed to fork at block %d: %v", forkBaseBlockNum, err)
				}
			}
		}
	}

	return hashes
}

func (tf *testFramework) ExpectOutput(expectedOutput TestExpectedOutput) {
	tf.ExpectOutputWithT(tf.t, expectedOutput)
}

func (tf *testFramework) ExpectEventuallyOutput(expectedOutput TestExpectedOutput) {
	assert.EventuallyWithT(tf.t, func(t *assert.CollectT) {
		tf.ExpectOutputWithT(t, expectedOutput)
	}, 5*time.Second, 100*time.Millisecond)
}

func (tf *testFramework) ExpectOutputWithT(t require.TestingT, expectedOutput TestExpectedOutput) {
	blockStates := map[HeadState]*big.Int{
		HeadStateConfirmed: expectedOutput.ConfirmedBlocks,
		HeadStateSkipped:   expectedOutput.SkippedBlocks,
		HeadStateSeen:      expectedOutput.SeenBlocks,
		HeadStateRemoved:   expectedOutput.RemovedBlocks,
	}

	for state, expected := range blockStates {
		if expected != nil {
			headsFilter := HeadsFilter{
				State: &state,
			}
			actualCount, err := tf.Store.CountHeads(headsFilter)
			require.NoError(t, err, "failed to count heads by state")

			assert.Equal(
				t,
				expected.Int64(),
				actualCount,
				fmt.Sprintf("%s blocks", state),
			)
		}
	}

	if expectedOutput.EventsNum != nil {
		actualCount, err := tf.Store.CountEvents(EventsFilter{})
		require.NoError(t, err, "failed to count events")

		assert.Equal(
			t,
			expectedOutput.EventsNum.Int64(),
			actualCount,
			"events",
		)
	}

	if expectedOutput.Events != nil {
		for evt, expectedCount := range *expectedOutput.Events {
			topicHash := eth.Hash(evt)

			eventsFilter := EventsFilter{
				Topic: &topicHash,
			}

			actualCount, err := tf.Store.CountEvents(eventsFilter)
			require.NoError(t, err, "failed to count events by topic")

			assert.Equal(
				t,
				expectedCount,
				uint64(actualCount),
				"events",
			)
		}
	}
}
