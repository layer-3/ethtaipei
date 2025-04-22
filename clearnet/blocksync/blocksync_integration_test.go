package blocksync

import (
	"context"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/solmock"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

// TestBlocksync_Advanced simulates a series of blocks with one event per block,
// using a confirmation threshold of 1 so that each block (except the latest) is
// confirmed when the next block arrives.
func TestBlocksync_Advanced(t *testing.T) {
	backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{Interval: nil})
	require.NoError(t, err)

	// confirmation threshold is low on purpose
	// so that when a new block is mined,
	// the previous block is confirmed.
	threshold := uint64(1)
	// FIXME: use GORM store. It creates `no table: heads` error for some reason.
	// store := SetupGormStore(t)
	store := NewInMemoryStore()
	tf := NewTestFramework(t, &TestSetupData{
		ConfirmationNum: &threshold,
		Backend:         backend,
		Store:           store,
	})
	err = tf.Tracker.SetHeight(eth.DEFAULT_EXISTING_BLOCKS)
	require.NoError(t, err)

	// run with single events only
	preRun1Input := TestInputData{
		Blocks: []TestBlockInstruction{
			BlockWithEvents(solmock.EventA),
			{},
			BlockWithEvents(solmock.EventB),
			BlockWithEvents(solmock.EventC),
			{},
		},
	}
	tf.RunInput(preRun1Input) // simulate blockchain activity before starting the tracker

	sub1 := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))
	errCh := make(chan error)
	go func() {
		err = tf.Tracker.Start(context.Background())
		errCh <- err
	}()

	// run with multiple events
	run1Input := TestInputData{
		Blocks: []TestBlockInstruction{
			BlockWithEvents(solmock.EventA),
			BlockWithEvents(solmock.EventA, solmock.EventB),
			BlockWithEvents(solmock.EventA, solmock.EventB, solmock.EventC),
			{}, // to ensure the prev block is confirmed
		},
	}
	go tf.RunInput(run1Input) // simulate the deployment of events over a series of blocks.

	// Check that the tracker received the first block after we dispatch it
	require.NoError(t, <-errCh)

	// Additionally, check that the subscription received exactly 15 log events.
	// NOTE: 15, because `sync` only confirms 3, whereas `watch` sees and confirms 12 in total.
	ValidateEventsExactNum(t, sub1, 15, func(idx int, ev LogEvent) {
		logger.Info("event", "idx", idx, "state", ev.State, "blockNum", ev.Height)
	})

	confirmedBlocks := len(preRun1Input.Blocks) + len(run1Input.Blocks) - int(threshold)
	// Expected behavior (update this if the behavior changes):
	// with a confirmation threshold of 1, when block 2 is mined block 1 becomes confirmed,
	// and when block 3 is mined block 2 becomes confirmed. Block 3 remains in the "seen" state.
	// Also note that for each block with an event the tracker emits two log events (one for "seen" and one for "confirmed").
	// Therefore, we expect 7 confirmed blocks, 1 skipped block, and a total of 12 log events.
	expectedOutput := TestExpectedOutput{
		SkippedBlocks:   big.NewInt(1), // the last one is skipped
		ConfirmedBlocks: big.NewInt(int64(confirmedBlocks)),
		// TODO: currently only "seen" logs are stored. Therefore, ones confirmed by syncer are not stored.
		EventsNum: big.NewInt(6),
		Events: &map[solmock.TestEvent]uint64{
			solmock.EventA: 3,
			solmock.EventB: 2,
			solmock.EventC: 1,
		},
	}
	tf.ExpectEventuallyOutput(expectedOutput)

	tf.Tracker.Stop()

	preRun2Input := TestInputData{
		Blocks: []TestBlockInstruction{
			BlockWithEvents(solmock.EventA, solmock.EventA),
			{}, {}, {},
			BlockWithEvents(solmock.EventB),
			{}, {},
			BlockWithEvents(solmock.EventC, solmock.EventC, solmock.EventC),
			{},
		},
	}
	tf.RunInput(preRun2Input)
	sub2 := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))

	go func() {
		err = tf.Tracker.Start(context.Background())
		errCh <- err
	}()

	// run with multiple events
	run2Input := TestInputData{
		Blocks: []TestBlockInstruction{
			BlockWithEvents(solmock.EventA),
			BlockWithEvents(solmock.EventB),
			BlockWithEvents(solmock.EventC),
			{},
		},
	}
	go tf.RunInput(run2Input) // simulate the deployment of events over a series of blocks.

	// Check that the tracker received the first block after we dispatch it
	require.NoError(t, <-errCh)

	// Additionally, check that the subscription received exactly 12 log events.
	// NOTE: 12, because `sync` only confirms 6, whereas `watch` sees and confirms 6 in total.
	ValidateEventsExactNum(t, sub2, 12, func(idx int, ev LogEvent) {
		logger.Info("event", "idx", idx, "state", ev.State, "blockNum", ev.Height)
	})

	confirmedBlocks += len(preRun2Input.Blocks) + len(run2Input.Blocks)
	// Expected behavior (update this if the behavior changes):
	// with a confirmation threshold of 1, when block 2 is mined block 1 becomes confirmed,
	// and when block 3 is mined block 2 becomes confirmed. Block 3 remains in the "seen" state.
	// Also note that for each block with an event the tracker emits two log events (one for "seen" and one for "confirmed").
	// Therefore, we expect 7 confirmed blocks, 1 skipped block, and a total of 12 log events.
	expectedOutput = TestExpectedOutput{
		SkippedBlocks:   big.NewInt(1), // the last one is skipped
		ConfirmedBlocks: big.NewInt(int64(confirmedBlocks)),
		// TODO: currently only "seen" logs are stored. Therefore, ones confirmed by syncer are not stored.
		EventsNum: big.NewInt(9),
		Events: &map[solmock.TestEvent]uint64{
			solmock.EventA: 4,
			solmock.EventB: 3,
			solmock.EventC: 2,
		},
	}
	tf.ExpectEventuallyOutput(expectedOutput)
	tf.Tracker.Stop()
}

// TestBlocksync_Faulty demonstrates a tracker that must:
//   - catch up with blocks that were mined before starting,
//   - handle blocks with multiple events,
//   - use a confirmation threshold of 2,
//   - deal with temporary (forced) failures in store methods,
//   - be stopped and later restarted to continue from its last state.
func TestBlocksync_Faulty(t *testing.T) {
	t.Skip("TODO: update with lots of fauly scenarios")
	// Set up a simulated backend with a defined block interval.
	blockInterval := 500 * time.Millisecond
	backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{Interval: &blockInterval})
	require.NoError(t, err)

	// Create a FlakyStore that fails on the very first call to CreateHead and SaveLogs.
	// (After one failure each, it behaves normally.)
	flakyStore := NewFlakyStore(NewInMemoryStore(), 1, 1)

	// Use a confirmation threshold of 2.
	threshold := uint64(2)

	// Create a test framework instance using the backend and our flaky store.
	tf := NewTestFramework(t, &TestSetupData{
		ConfirmationNum: &threshold,
		Backend:         backend,
		Store:           flakyStore,
	})

	// ----- Pre-mining Phase: some blocks are mined before the tracker starts -----
	preInput := TestInputData{
		Blocks: []TestBlockInstruction{
			// Block 1: two events (e.g. EventA and EventB)
			BlockWithEvents(solmock.EventA, solmock.EventB),
			// Block 2: one event (EventC)
			BlockWithEvents(solmock.EventC),
		},
	}
	tf.RunInput(preInput)
	// Allow a couple of block intervals so these blocks are mined.
	time.Sleep(2 * blockInterval)

	// ----- Start the Tracker (it should now catch up with the pre-mined blocks) -----
	err = tf.Tracker.Start(context.Background())
	require.NoError(t, err)

	// Subscribe to events for one of the deployed addresses.
	sub := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))

	// ----- Additional Blocks: while tracker is running, new blocks with multiple events are mined -----
	additionalInput := TestInputData{
		Blocks: []TestBlockInstruction{
			// Block 3: two events (EventA and EventB)
			BlockWithEvents(solmock.EventA, solmock.EventB),
			// Block 4: two events (EventC and EventD)
			BlockWithEvents(solmock.EventC, solmock.EventD),
			// Block 5: one event (EventA)
			BlockWithEvents(solmock.EventA),
		},
	}
	// Launch the additional input a short while later.
	go func() {
		time.Sleep(1 * time.Second)
		tf.RunInput(additionalInput)
	}()

	// Expected events:
	// preInput produced: 2 (block1) + 1 (block2) = 3 events.
	// additionalInput produced: 2 (block3) + 2 (block4) + 1 (block5) = 5 events.
	// Total = 8 events.
	expectedOutput := TestExpectedOutput{
		EventsNum: big.NewInt(8),
		Events: &map[solmock.TestEvent]uint64{
			solmock.EventA: 3, // from block1, block3, block5
			solmock.EventB: 2, // from block1, block3
			solmock.EventC: 2, // from block2, block4
			solmock.EventD: 1, // from block4
		},
	}
	tf.ExpectEventuallyOutput(expectedOutput)

	// Because our FlakyStore forced an error (e.g. "forced error in CreateHead" or "forced error in SaveLogs")
	// you can check that an error appears on the subscription’s error channel.
	select {
	case err := <-sub.Err():
		require.NotNil(t, err)
		assert.Contains(t, err.Error(), "forced error in")
	case <-time.After(2 * time.Second):
		// It is also acceptable if the error was handled internally.
	}

	// ----- Stop the Tracker -----
	tf.Tracker.Stop()

	// ----- Restart Phase: simulate a restart so the tracker resumes from its last known state -----
	newTracker := NewTracker(backend, flakyStore, &threshold)
	// Reuse the test framework (tf) so that SubscriptionAddress1 remains the same.
	tf.Tracker = newTracker
	err = newTracker.Start(context.Background())
	require.NoError(t, err)

	// ----- More Blocks After Restart: the tracker should process these new blocks correctly -----
	restartInput := TestInputData{
		Blocks: []TestBlockInstruction{
			// Block 6: one event (EventD)
			BlockWithEvents(solmock.EventD),
			// Block 7: two events (EventB and EventC)
			BlockWithEvents(solmock.EventB, solmock.EventC),
		},
	}
	go func() {
		time.Sleep(1 * time.Second)
		tf.RunInput(restartInput)
	}()

	// Expected additional events: 1 + 2 = 3 events.
	expectedAdditionalOutput := TestExpectedOutput{
		EventsNum: big.NewInt(3),
		Events: &map[solmock.TestEvent]uint64{
			solmock.EventD: 1,
			solmock.EventB: 1,
			solmock.EventC: 1,
		},
	}
	tf.ExpectEventuallyOutput(expectedAdditionalOutput)

	// Unsubscribe and clean up.
	sub.Unsubscribe()
}

// TestBlocksync_BadStore_CreateHead verifies that when CreateHead fails (with a
// forced error), the tracker’s error handling kicks in and an error is
// delivered on the subscription error channel.
func TestBlocksync_BadStore_CreateHead(t *testing.T) {
	blockInterval := 100 * time.Millisecond
	backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{Interval: &blockInterval})
	require.NoError(t, err)

	// Use a faulty store that fails on CreateHead.
	faultyStore := NewFaultyStore(true, false)

	threshold := uint64(1)
	tf := NewTestFramework(t, &TestSetupData{
		ConfirmationNum: &threshold,
		Backend:         backend,
		Store:           faultyStore,
	})

	// Simulate one block with an event.
	inputData := TestInputData{
		Blocks: []TestBlockInstruction{
			BlockWithEvents(solmock.EventA),
		},
	}

	// Subscribe to events.
	sub := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))
	// Run the input after a short delay.
	go func() {
		<-time.After(500 * time.Millisecond)
		tf.RunInput(inputData)
	}()

	// Start the tracker.
	err = tf.Tracker.Start(context.Background())
	require.NoError(t, err)

	// Allow some time for processing.
	time.Sleep(1 * time.Second)

	// Expect that an error is delivered on the subscription error channel.
	select {
	case err := <-sub.Err():
		require.NotNil(t, err)
		require.True(t, strings.Contains(err.Error(), "forced error in CreateHead"),
			"expected error to contain 'forced error in CreateHead', got: %v", err)
	case <-time.After(5 * time.Second):
		t.Fatal("expected error on subscription error channel, but got none")
	}
}

// TestBlocksync_BadStore_SaveLogs verifies that when SaveLogs fails (with a
// forced error), the tracker’s error handling kicks in and an error is
// delivered on the subscription error channel.
func TestBlocksync_BadStore_SaveLogs(t *testing.T) {
	blockInterval := 100 * time.Millisecond
	backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{Interval: &blockInterval})
	require.NoError(t, err)

	// Use a faulty store that fails on SaveLogs (but not on CreateHead).
	faultyStore := NewFaultyStore(false, true)

	threshold := uint64(1)
	tf := NewTestFramework(t, &TestSetupData{
		ConfirmationNum: &threshold,
		Backend:         backend,
		Store:           faultyStore,
	})

	// Simulate one block with an event.
	inputData := TestInputData{
		Blocks: []TestBlockInstruction{
			BlockWithEvents(solmock.EventB),
		},
	}

	sub := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))
	go func() {
		<-time.After(500 * time.Millisecond)
		tf.RunInput(inputData)
	}()

	err = tf.Tracker.Start(context.Background())
	require.NoError(t, err)

	time.Sleep(1 * time.Second)

	select {
	case err := <-sub.Err():
		require.NotNil(t, err)
		require.True(t, strings.Contains(err.Error(), "forced error in SaveLogs"),
			"expected error to contain 'forced error in SaveLogs', got: %v", err)
	case <-time.After(5 * time.Second):
		t.Fatal("expected error on subscription error channel, but got none")
	}
}

// FaultyStore wraps an InMemoryStore
// and forces errors on CreateHead and/or SaveLogs.
type FaultyStore struct {
	inner          Store
	failCreateHead bool
	failSaveLogs   bool
}

func NewFaultyStore(failCreateHead, failSaveLogs bool) *FaultyStore {
	return &FaultyStore{
		inner:          NewInMemoryStore(),
		failCreateHead: failCreateHead,
		failSaveLogs:   failSaveLogs,
	}
}

func (fs *FaultyStore) CreateHead(e HeadEvent, callbacks ...func() error) error {
	if fs.failCreateHead {
		return fmt.Errorf("forced error in CreateHead")
	}
	return fs.inner.CreateHead(e, callbacks...)
}

func (fs *FaultyStore) UpsertHead(e HeadEvent, callbacks ...func() error) error {
	return fs.inner.UpsertHead(e, callbacks...)
}

func (fs *FaultyStore) SaveLogs(headHash eth.Hash, logs []LogEvent, callbacks ...func() error) error {
	if fs.failSaveLogs {
		return fmt.Errorf("forced error in SaveLogs")
	}
	return fs.inner.SaveLogs(headHash, logs, callbacks...)
}

func (fs *FaultyStore) GetHeight(chainId uint64) (uint64, error) {
	return fs.inner.GetHeight(chainId)
}

func (fs *FaultyStore) QueryHeads(f HeadsFilter) ([]HeadEvent, error) {
	return fs.inner.QueryHeads(f)
}

func (fs *FaultyStore) CountHeads(f HeadsFilter) (int64, error) {
	return fs.inner.CountHeads(f)
}

func (fs *FaultyStore) QueryEvents(f EventsFilter) ([]LogEvent, error) {
	return fs.inner.QueryEvents(f)
}

func (fs *FaultyStore) CountEvents(f EventsFilter) (int64, error) {
	return fs.inner.CountEvents(f)
}

// FlakyStore wraps a normal Store
// and forces errors for a preset number of calls.
type FlakyStore struct {
	inner              Store
	createHeadFailures int
	saveLogsFailures   int
	mu                 sync.Mutex
}

func NewFlakyStore(inner Store, createHeadFailures, saveLogsFailures int) *FlakyStore {
	return &FlakyStore{
		inner:              inner,
		createHeadFailures: createHeadFailures,
		saveLogsFailures:   saveLogsFailures,
	}
}

func (fs *FlakyStore) CreateHead(e HeadEvent, callbacks ...func() error) error {
	fs.mu.Lock()
	defer fs.mu.Unlock()
	if fs.createHeadFailures > 0 {
		fs.createHeadFailures--
		return fmt.Errorf("forced error in CreateHead")
	}
	return fs.inner.CreateHead(e, callbacks...)
}

func (fs *FlakyStore) UpsertHead(e HeadEvent, callbacks ...func() error) error {
	return fs.inner.UpsertHead(e, callbacks...)
}

func (fs *FlakyStore) SaveLogs(headHash eth.Hash, logs []LogEvent, callbacks ...func() error) error {
	fs.mu.Lock()
	defer fs.mu.Unlock()
	if fs.saveLogsFailures > 0 {
		fs.saveLogsFailures--
		return fmt.Errorf("forced error in SaveLogs")
	}
	return fs.inner.SaveLogs(headHash, logs, callbacks...)
}

func (fs *FlakyStore) GetHeight(chainId uint64) (uint64, error) {
	return fs.inner.GetHeight(chainId)
}

func (fs *FlakyStore) QueryHeads(f HeadsFilter) ([]HeadEvent, error) {
	return fs.inner.QueryHeads(f)
}

func (fs *FlakyStore) CountHeads(f HeadsFilter) (int64, error) {
	return fs.inner.CountHeads(f)
}

func (fs *FlakyStore) QueryEvents(f EventsFilter) ([]LogEvent, error) {
	return fs.inner.QueryEvents(f)
}

func (fs *FlakyStore) CountEvents(f EventsFilter) (int64, error) {
	return fs.inner.CountEvents(f)
}
