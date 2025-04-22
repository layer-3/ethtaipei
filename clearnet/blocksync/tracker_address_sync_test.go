package blocksync

import (
	"context"
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/solmock"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

func TestTrackerAddressSyncSubscription(t *testing.T) {
	t.Run("Seen events are delivered", func(t *testing.T) {
		t.Parallel()
		const blocksNum = 5

		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		eventsNum := 0

		// Rule: block k contains k events
		blocks := make([]TestBlockInstruction, blocksNum)
		for i := range blocks {

			events := make([]solmock.TestEvent, i+1) // +1 to avoid blocks without events
			for j := range events {
				events[j] = solmock.EventA
			}

			eventsNum += len(events)
			blocks[i] = BlockWithEvents(events...)
		}

		inputData := TestInputData{Blocks: blocks}

		store := NewInMemoryStore()
		confNum := uint64(blocksNum * 2)
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confNum})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		defer tf.Tracker.Stop()
		eventsSub := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))

		tf.RunInput(inputData)
		go tf.Tracker.sync(ctx, eth.DEFAULT_EXISTING_BLOCKS, eth.DEFAULT_START_BLOCK+blocksNum)

		ValidateEventsExactNum(t, eventsSub, eventsNum, func(idx int, ev LogEvent) {
			expectedBlockNum := eth.DEFAULT_START_BLOCK + getBlockNumByIncreasingEventIdx(idx)
			assert.Equal(t, expectedBlockNum, ev.Height, "incorrect block number for event index %d", idx)
			assert.Equal(t, HeadStateSeen, ev.State, "expected log to have 'seen' state for event index %d", idx)
		})
	})

	t.Run("Events have correct topics", func(t *testing.T) {
		t.Parallel()
		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		inputData := TestInputData{Blocks: []TestBlockInstruction{
			{Events1: &[]solmock.TestEvent{solmock.EventA}},
			{}, {},
			{Events1: &[]solmock.TestEvent{solmock.EventA, solmock.EventB}},
			{},
			{Events1: &[]solmock.TestEvent{solmock.EventC, solmock.EventD}},
		}}
		blocksNum := uint64(len(inputData.Blocks))

		store := NewInMemoryStore()
		confNum := blocksNum * 2
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confNum})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		defer tf.Tracker.Stop()
		eventsSub := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))

		tf.RunInput(inputData)
		go tf.Tracker.sync(ctx, eth.DEFAULT_EXISTING_BLOCKS, eth.DEFAULT_START_BLOCK+blocksNum)

		blockNumsForEvents := []uint64{0, 3, 3, 5, 5}
		topicsForEvents := []solmock.TestEvent{solmock.EventA, solmock.EventA, solmock.EventB, solmock.EventC, solmock.EventD}
		assert.Equal(t, len(blockNumsForEvents), len(topicsForEvents), "blockNumsForEvents and topicsForEvents must have the same length")
		eventsNum := len(blockNumsForEvents)
		ValidateEventsExactNum(t, eventsSub, eventsNum, func(idx int, ev LogEvent) {
			expectedBlockNum := eth.DEFAULT_EXISTING_BLOCKS + blockNumsForEvents[idx]
			assert.Equal(t, expectedBlockNum, ev.Height, "incorrect block number for event index %d", idx)
			assert.Equal(t, common.Hash(topicsForEvents[idx]).String(), ev.Topics[0].String(), "incorrect topic for event index %d", idx)
			assert.Equal(t, HeadStateSeen, ev.State, "expected log to have 'seen' state for event index %d", idx)
		})
	})

	t.Run("Seen and confirmed events are delivered", func(t *testing.T) {
		t.Parallel()
		const blocksNum = uint64(10)

		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		eventsNum := 0
		// Rule: block k contains k events
		blocks := make([]TestBlockInstruction, blocksNum)
		for i := range blocks {

			events := make([]solmock.TestEvent, i+1) // +1 to avoid blocks without events
			for j := range events {
				events[j] = solmock.EventA
			}

			eventsNum += len(events)
			blocks[i] = BlockWithEvents(events...)
		}

		inputData := TestInputData{Blocks: blocks}

		store := NewInMemoryStore()
		confNum := blocksNum / 2
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confNum})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		defer tf.Tracker.Stop()
		eventsSub := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))

		tf.RunInput(inputData)
		go tf.Tracker.sync(ctx, eth.DEFAULT_EXISTING_BLOCKS, eth.DEFAULT_START_BLOCK+blocksNum)

		ValidateEventsExactNum(t, eventsSub, eventsNum, func(idx int, ev LogEvent) {
			expectedTestBlockNum := getBlockNumByIncreasingEventIdx(idx)
			expectedState := HeadStateSeen

			if expectedTestBlockNum <= blocksNum/2 {
				expectedState = HeadStateConfirmed
			}

			assert.Equal(t, eth.DEFAULT_START_BLOCK+expectedTestBlockNum, ev.Height, "incorrect block number for event index %d", idx)
			assert.Equal(t, expectedState, ev.State, "expected log to have %s state for event index %d", expectedState, idx)
		})
	})

	t.Run("Removed events are delivered", func(t *testing.T) {
		t.Parallel()
		t.Skip("TODO: implement")
	})

	t.Run("Events to only subscribed address are delivered", func(t *testing.T) {
		t.Parallel()
		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		// Rule: block k contains k events
		inputData := TestInputData{Blocks: []TestBlockInstruction{
			{Events1: &[]solmock.TestEvent{solmock.EventA}},
			{},
			{Events2: &[]solmock.TestEvent{solmock.EventA, solmock.EventB}},
			{}, {},
			{Events1: &[]solmock.TestEvent{solmock.EventB}, Events2: &[]solmock.TestEvent{solmock.EventB}},
			{},
			{Events1: &[]solmock.TestEvent{solmock.EventC, solmock.EventD}, Events2: &[]solmock.TestEvent{solmock.EventD}},
		}}
		blocksNum := uint64(len(inputData.Blocks))

		store := NewInMemoryStore()
		confNum := blocksNum * 2
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confNum})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		defer tf.Tracker.Stop()

		eventsSub := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))
		// subscribe to other address too
		tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress2.Hex()))

		tf.RunInput(inputData)
		go tf.Tracker.sync(ctx, eth.DEFAULT_EXISTING_BLOCKS, eth.DEFAULT_START_BLOCK+blocksNum)

		blockNumsForEvents := []uint64{0, 5, 7, 7}
		eventsNum := len(blockNumsForEvents)
		ValidateEventsExactNum(t, eventsSub, eventsNum, func(idx int, ev LogEvent) {
			expectedBlockNum := eth.DEFAULT_EXISTING_BLOCKS + blockNumsForEvents[idx]
			assert.Equal(t, expectedBlockNum, ev.Height, "incorrect block number for event index %d", idx)
			assert.Equal(t, HeadStateSeen, ev.State, "expected log to have 'seen' state for event index %d", idx)
		})
	})
}

// TODO: migrate from gormStore to mockStore
func TestTrackerAddressSyncStore(t *testing.T) {
	t.Run("Seen events and blocks are written to the store", func(t *testing.T) {
		t.Parallel()
		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		inputData := TestInputData{Blocks: []TestBlockInstruction{
			{Events1: &[]solmock.TestEvent{solmock.EventA}},
			{}, {},
			{Events1: &[]solmock.TestEvent{solmock.EventA, solmock.EventB}},
			{},
			{Events1: &[]solmock.TestEvent{solmock.EventC, solmock.EventD}},
		}}
		eventsNum := int64(5)
		blocksNum := uint64(len(inputData.Blocks))
		confNum := blocksNum * 2
		expectedOutput := TestExpectedOutput{SeenBlocks: big.NewInt(3), SkippedBlocks: big.NewInt(3), EventsNum: big.NewInt(eventsNum), Events: &map[solmock.TestEvent]uint64{
			solmock.EventA: 2,
			solmock.EventB: 1,
			solmock.EventC: 1,
			solmock.EventD: 1,
		}}
		store := NewInMemoryStore()
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confNum})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		defer tf.Tracker.Stop()
		// TODO: add a check that there are no errors in subscription
		tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))

		tf.RunInput(inputData)
		go tf.Tracker.sync(ctx, eth.DEFAULT_EXISTING_BLOCKS, eth.DEFAULT_START_BLOCK+blocksNum)
		tf.ExpectEventuallyOutput(expectedOutput)
	})

	// NOTE: this logic is temporary. See comment in `sync` Tracker function.
	t.Run("Confirmed events NOT written to the store", func(t *testing.T) {
		t.Parallel()
		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		inputData1 := TestInputData{Blocks: []TestBlockInstruction{
			{Events1: &[]solmock.TestEvent{solmock.EventA}},
			{Events1: &[]solmock.TestEvent{solmock.EventA, solmock.EventB}},
			{Events1: &[]solmock.TestEvent{solmock.EventC, solmock.EventD}},
		}}
		blocksNum := uint64(len(inputData1.Blocks))
		inputData2 := TestInputData{Blocks: make([]TestBlockInstruction, blocksNum)}
		eventsNum := int64(5)
		confNum := blocksNum
		expectedOutput := TestExpectedOutput{EventsNum: big.NewInt(eventsNum), Events: &map[solmock.TestEvent]uint64{
			solmock.EventA: 2,
			solmock.EventB: 1,
			solmock.EventC: 1,
			solmock.EventD: 1,
		}}
		store := NewInMemoryStore()
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confNum})

		// firstly see events
		ctx := tf.Tracker.setup(context.Background())
		tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))
		tf.Tracker.watch(ctx, nil)
		tf.RunInput(inputData1)
		tf.ExpectEventuallyOutput(expectedOutput)

		// then stop, include some blocks, sync and see confirmed events
		tf.Tracker.Stop()
		ctx = tf.Tracker.setup(ctx)
		tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))
		tf.RunInput(inputData2)
		go tf.Tracker.sync(ctx, eth.DEFAULT_START_BLOCK, eth.DEFAULT_START_BLOCK+2*blocksNum)
		tf.ExpectEventuallyOutput(expectedOutput)
	})

	t.Run("Removed events are written to the store", func(t *testing.T) {
		t.Parallel()
		t.Skip("TODO: implement")
	})

	t.Run("Events to only subscribed address are written to the store", func(t *testing.T) {
		t.Parallel()
		backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{})
		require.NoError(t, err)

		// Rule: block k contains k events
		inputData := TestInputData{Blocks: []TestBlockInstruction{
			{Events1: &[]solmock.TestEvent{solmock.EventA}},
			{},
			{Events2: &[]solmock.TestEvent{solmock.EventA, solmock.EventB}},
			{}, {},
			{Events1: &[]solmock.TestEvent{solmock.EventA, solmock.EventB}, Events2: &[]solmock.TestEvent{solmock.EventB}},
			{},
			{Events1: &[]solmock.TestEvent{solmock.EventC, solmock.EventD}, Events2: &[]solmock.TestEvent{solmock.EventD}},
		}}
		blocksNum := uint64(len(inputData.Blocks))
		confNum := blocksNum * 2
		eventsNum := int64(5)
		expectedOutput := TestExpectedOutput{EventsNum: big.NewInt(eventsNum), Events: &map[solmock.TestEvent]uint64{
			solmock.EventA: 2,
			solmock.EventB: 1,
			solmock.EventC: 1,
			solmock.EventD: 1,
		}}
		store := NewInMemoryStore()
		tf := NewTestFramework(t, &TestSetupData{Backend: backend, Store: store, ConfirmationNum: &confNum})

		// We won't call tracker.Start() because that invokes both sync and watch.
		ctx := tf.Tracker.setup(context.Background())
		defer tf.Tracker.Stop()
		tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))

		tf.RunInput(inputData)
		go tf.Tracker.sync(ctx, eth.DEFAULT_EXISTING_BLOCKS, eth.DEFAULT_START_BLOCK+blocksNum)
		tf.ExpectEventuallyOutput(expectedOutput)
	})
}
