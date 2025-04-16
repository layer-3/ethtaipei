package blocksync_test

import (
	"context"
	"log"
	"math/big"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/layer-3/ethtaipei/clearnet/blocksync"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/solmock"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

// TODO: organize tests in groups
func TestTracker_Subscribe_OneEventPerBlock(t *testing.T) {
	t.Skip("FIXME: does not pass")

	const eventNum = 10
	ctx := context.Background()

	backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{Interval: &eth.DEFAULT_INTERVAL})
	require.NoError(t, err)

	blockWithEvent := blocksync.TestBlockInstruction{Events1: &[]solmock.TestEvent{solmock.EventA}}
	inputData := blocksync.TestInputData{Blocks: blocksync.RepeatBlocks(eventNum, blockWithEvent)}
	expectedOutput := blocksync.TestExpectedOutput{SkippedBlocks: big.NewInt(0), ConfirmedBlocks: big.NewInt(eventNum), EventsNum: big.NewInt(eventNum)}

	store := blocksync.NewGormStore(must(blocksync.NewSqliteStore(t)))
	tf := blocksync.NewTestFramework(t, &blocksync.TestSetupData{Backend: backend, Store: store})

	log.Println("Tracker starting")
	err = tf.Tracker.Start(ctx)
	require.NoError(t, err)

	sub := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))
	go blocksync.RequireNoErrorChan(sub.Err())

	// TODO: move this logic to testing framework
	var seen []blocksync.LogEvent
	go func() {
		for ev := range sub.Event() {
			seen = append(seen, ev)
			log.Printf("Received Block with Dummy contract: %d (%s)", ev.Height, ev.State)
		}
	}()

	tf.RunInput(inputData)

	// NOTE: don't stop the tracker too quickly to give it time to receive the block in the channel and process it
	// FIXME: this of a better solution: maybe `watch` should return a chan with blocks it sees?
	<-time.After(150 * time.Millisecond)

	// Stop the tracker
	tf.Tracker.Stop()

	got := len(seen)
	expected := eventNum * 2 // multiply by 2 as each log is "seen" and "confirmed"

	require.Equal(t, expected, got, "expected %d logs, got %d", expected, got)
	tf.ExpectOutput(expectedOutput)
}

func TestTracker_Subscribe_SeveralEventsPerBlock(t *testing.T) {
	t.Skip("FIXME: does not pass")

	ctx := context.Background()

	backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{Interval: &eth.DEFAULT_INTERVAL})
	require.NoError(t, err)

	const eventNum = 5
	inputData := blocksync.TestInputData{Blocks: []blocksync.TestBlockInstruction{
		{}, blocksync.BlockWithEvents(solmock.EventA), {}, blocksync.BlockWithEvents(solmock.EventB), blocksync.BlockWithEvents(solmock.EventA, solmock.EventB), {}, {}, blocksync.BlockWithEvents(solmock.EventA),
	}}
	expectedOutput := blocksync.TestExpectedOutput{SkippedBlocks: big.NewInt(0), ConfirmedBlocks: big.NewInt(eventNum), EventsNum: big.NewInt(eventNum)}

	store := blocksync.NewGormStore(must(blocksync.NewSqliteStore(t)))
	tf := blocksync.NewTestFramework(t, &blocksync.TestSetupData{Backend: backend, Store: store})

	err = tf.Tracker.Start(ctx)
	require.NoError(t, err)

	sub := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))
	go blocksync.RequireNoErrorChan(sub.Err())

	var seen []blocksync.LogEvent
	go func() {
		for ev := range sub.Event() {
			seen = append(seen, ev)
		}
	}()

	tf.RunInput(inputData)

	// NOTE: don't stop the tracker too quickly to give it time to receive the block in the channel and process it
	// FIXME: this of a better solution: maybe `watch` should return a chan with blocks it sees?
	<-time.After(150 * time.Millisecond)

	// Stop the tracker
	tf.Tracker.Stop()

	got := len(seen)
	expected := eventNum * 2 // multiply by 2 as each log is "seen" and "confirmed"

	require.Equal(t, expected, got, "expected %d logs, got %d", expected, got)
	tf.ExpectOutput(expectedOutput)
}

func TestTracker_Subscribe_EventsFromDifferentAddresses(t *testing.T) {}

func TestTracker_Subscribe_CanSeeEventsInConfirmedBlocks(t *testing.T) {}

func TestTracker_Subscribe_Fork_ReceiveRemovedEvent(t *testing.T) {}

func TestTracker_Subscribe_Fork_EventIsLaterResend(t *testing.T) {}

func TestTracker_Unsubscribe(t *testing.T) {}

// TODO: add tests for multiple subscriptions

func TestTracker_FinalityDBJoinLogs(t *testing.T) {
	t.Skip("FIXME: does not always pass")

	const eventNum = 2
	ctx := context.Background()

	// Create simulated backend
	backend, err := eth.NewSimulatedBackend(eth.SimulatedBackendConfig{Interval: &eth.DEFAULT_INTERVAL})
	require.NoError(t, err)

	blockWithEvent := blocksync.TestBlockInstruction{Events1: &[]solmock.TestEvent{solmock.EventA}}
	inputData := blocksync.TestInputData{Blocks: blocksync.RepeatBlocks(eventNum, blockWithEvent)}
	expectedOutput := blocksync.TestExpectedOutput{SkippedBlocks: big.NewInt(0), ConfirmedBlocks: big.NewInt(eventNum), EventsNum: big.NewInt(eventNum)}

	store := blocksync.NewGormStore(must(blocksync.NewSqliteStore(t)))
	tf := blocksync.NewTestFramework(t, &blocksync.TestSetupData{Backend: backend, Store: store})

	log.Println("Tracker starting")
	err = tf.Tracker.Start(ctx)
	require.NoError(t, err)

	sub := tf.Tracker.SubscribeEvents(stream.Topic(tf.SubscriptionAddress1.Hex()))
	go blocksync.RequireNoErrorChan(sub.Err())

	var seen []blocksync.LogEvent

	go func() {
		for ev := range sub.Event() {
			seen = append(seen, ev)
			log.Printf("Received Block with Dummy contract: %d (%s)", ev.Height, ev.State)
		}
	}()

	// var expectedTxHashes []common.Hash
	tf.RunInput(inputData)

	// NOTE: don't stop the tracker too quickly to give it time to receive the block in the channel and process it
	// FIXME: this of a better solution: maybe `watch` should return a chan with blocks it sees?
	<-time.After(150 * time.Millisecond)

	// Stop the tracker
	tf.Tracker.Stop()

	// Use a join query to select head state and log transaction hash.
	// var records []struct {
	// 	State  string `gorm:"column:state"`
	// 	TxHash string `gorm:"column:tx_hash"`
	// }
	// err = tf.DB.Raw("SELECT heads.state as state, logs.tx_hash as tx_hash FROM heads INNER JOIN logs ON heads.id = logs.head_id ORDER BY heads.block_number ASC").Scan(&records).Error
	// require.NoError(t, err)
	// require.Equal(t, 2, len(records), "expected 2 head-log joined records in the database")

	// for i, rec := range records {
	// 	require.Equal(t, "confirmed", rec.State, "expected head state to be confirmed")
	// 	require.Equal(t, expectedTxHashes[i], rec.TxHash, "tx hash mismatch")
	// }

	tf.ExpectOutput(expectedOutput)
}

func must[T any](t T, err error) T {
	if err != nil {
		panic(err)
	}
	return t
}
