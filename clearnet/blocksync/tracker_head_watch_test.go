package blocksync

import (
	"context"
	"math/big"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/solmock"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

func TestTrackerHeadWatchSubscription(t *testing.T) {
	t.Run("Seen blocks are passed through a channel", func(t *testing.T) {
		t.Parallel()
		const blocksNum = 10

		// Create a simulated backend
		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		inputData := TestInputData{Blocks: make([]TestBlockInstruction, blocksNum)}

		store := NewInMemoryStore()
		confNum := uint64(blocksNum * 2)
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confNum})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		defer tf.Tracker.Stop()
		tf.Tracker.watch(ctx, nil)

		headsSub := tf.Tracker.SubscribeHeads()

		go tf.RunInput(inputData)

		ValidateEventsExactNum(t, headsSub, blocksNum, func(idx int, head HeadEvent) {
			assert.Equal(t, uint64(eth.DEFAULT_EXISTING_BLOCKS+uint64(idx)), head.BlockNumber)
			assert.Equal(t, HeadStateSeen, head.State)
		})
	})

	t.Run("Confirmed blocks are passed through a channel", func(t *testing.T) {
		t.Parallel()
		const blocksNum = uint64(10)

		// Create a simulated backend
		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		inputData := TestInputData{Blocks: make([]TestBlockInstruction, blocksNum)}

		store := NewInMemoryStore()
		confNum := uint64(2)
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confNum})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		defer tf.Tracker.Stop()
		tf.Tracker.watch(ctx, nil)

		eventsNum := blocksNum * 2 // multiply by 2 as each block is "seen" and "confirmed"
		headsSub := tf.Tracker.SubscribeHeads()

		go tf.RunInput(inputData)

		seenNum := eth.DEFAULT_EXISTING_BLOCKS
		ValidateEventsExactNum(t, headsSub, int(eventsNum), func(idx int, head HeadEvent) {
			if idx%2 == 0 {
				assert.Equal(t, seenNum, head.BlockNumber)
				assert.Equal(t, HeadStateSeen, head.State)
			} else {
				assert.Equal(t, seenNum-eth.DEFAULT_EXISTING_BLOCKS, head.BlockNumber)
				assert.Equal(t, HeadStateConfirmed, head.State)
				seenNum++
			}
		})
	})

	t.Run("Removed blocks are passed through a channel", func(t *testing.T) {
		t.Parallel()
		t.Skip("FIXME: implement when removed are implemented")
	})
}

func TestTrackerHeadWatchStore(t *testing.T) {
	t.Run("Skipped blocks are written to the store", func(t *testing.T) {
		t.Parallel()
		const blocksNum = 10

		// Create a simulated backend
		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		inputData := TestInputData{Blocks: make([]TestBlockInstruction, blocksNum)}
		expectedOutput := TestExpectedOutput{SkippedBlocks: big.NewInt(blocksNum)}

		store := NewInMemoryStore()
		confNum := uint64(2 * blocksNum)
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confNum})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		defer tf.Tracker.Stop()
		tf.Tracker.watch(ctx, nil)

		tf.RunInput(inputData)
		tf.ExpectEventuallyOutput(expectedOutput)
	})

	t.Run("Seen and skipped blocks are written to the store", func(t *testing.T) {
		t.Parallel()
		// Create a simulated backend
		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		inputData := TestInputData{Blocks: []TestBlockInstruction{
			{Events1: &[]solmock.TestEvent{solmock.EventA}},
			{}, {},
			{Events1: &[]solmock.TestEvent{solmock.EventA}},
			{}, {}, {},
			{Events1: &[]solmock.TestEvent{solmock.EventA}},
			{Events1: &[]solmock.TestEvent{solmock.EventA}},
			{},
		}}
		expectedOutput := TestExpectedOutput{SkippedBlocks: big.NewInt(6), SeenBlocks: big.NewInt(4)}

		store := NewInMemoryStore()
		confNum := uint64(2 * len(inputData.Blocks))
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confNum})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		defer tf.Tracker.Stop()
		tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))
		tf.Tracker.watch(ctx, nil)

		tf.RunInput(inputData)
		tf.ExpectEventuallyOutput(expectedOutput)
	})

	t.Run("Skipped and confirmed blocks are written to the store", func(t *testing.T) {
		t.Parallel()
		// Create a simulated backend
		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		blockNum := int64(10)
		confirmedNum := int64(5)

		confirmationNum := uint64(blockNum) - uint64(confirmedNum) + eth.DEFAULT_EXISTING_BLOCKS
		inputData := TestInputData{Blocks: make([]TestBlockInstruction, 10)}
		expectedOutput := TestExpectedOutput{SkippedBlocks: big.NewInt(int64(confirmationNum)), ConfirmedBlocks: big.NewInt(confirmedNum)}

		store := NewInMemoryStore()
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confirmationNum})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		defer tf.Tracker.Stop()
		tf.Tracker.watch(ctx, nil)

		tf.RunInput(inputData)
		tf.ExpectEventuallyOutput(expectedOutput)
	})

	t.Run("Skipped and removed blocks are written to the store", func(t *testing.T) {
		t.Parallel()
		t.Skip("TODO: implement logic in the Tracker to remove blocks")
		// Create a simulated backend
		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		// TODO: make sure Forking works correctly in the test framework
		forks := &TestForkInstructions{5: 3, 7: 6} // Fork after 5th block back to 3rd block (removes blocks 4 and 5), fork after 7th block back to 6th block (removes block 7)
		inputData := TestInputData{Blocks: make([]TestBlockInstruction, 10), Forks: forks}
		expectedOutput := TestExpectedOutput{SkippedBlocks: big.NewInt(7), RemovedBlocks: big.NewInt(3)}

		store := NewInMemoryStore()
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		go tf.Tracker.watch(ctx, nil)

		tf.RunInput(inputData)

		// NOTE: don't stop the tracker too quickly to give it time to receive the block in the channel and process it
		// FIXME: this of a better solution: maybe `watch` should return a chan with blocks it sees?
		<-time.After(150 * time.Millisecond)
		tf.Tracker.Stop()

		// Ensure there are exactly 10 heads in the DB with state = 'skipped'.
		tf.ExpectOutput(expectedOutput)
	})
}
