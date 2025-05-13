package blocksync

import (
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
	"github.com/stretchr/testify/assert"
)

func TestAddressSubscriptions(t *testing.T) {
	topic := stream.Topic(common.HexToAddress("0xdeadbeef").String())

	t.Run("dispatchLog sends to all subscriptions", func(t *testing.T) {
		t.Parallel()

		tracker := NewTracker(nil, nil, nil)
		tracker.addressesSubs[topic] = make(map[*addressSub]struct{})

		harnessCh := make(chan LogEvent, chanSize)
		const subsNum = 5
		subs := make([]*addressSub, subsNum)
		for i := 0; i < subsNum; i++ {
			subs[i] = &addressSub{
				tracker: tracker,
				address: topic,
				eventCh: harnessCh,
				errCh:   make(chan error, chanSize),
			}
			tracker.addressesSubs[topic][subs[i]] = struct{}{}
		}

		eventLog := LogEvent{
			Address: eth.Address(common.HexToAddress("0xdeadbeef")),
			Topics:  []eth.Hash{{123}},
			Data:    []byte{42},
		}

		go tracker.dispatchLog(topic, eventLog)

		// no matter which sub to pass - they all share the same channel
		ValidateEventsExactNum(t, subs[0], subsNum, func(idx int, event LogEvent) {
			assert.Equal(t, eventLog, event)
		})
	})

	t.Run("subscribe extends subs map", func(t *testing.T) {
		t.Parallel()

		tracker := NewTracker(nil, nil, nil)

		sub1 := tracker.SubscribeEvents(topic)
		assert.Equal(t, len(tracker.addressesSubs[topic]), 1)
		assert.Contains(t, tracker.addressesSubs[topic], sub1)

		sub2 := tracker.SubscribeEvents(topic)
		assert.Equal(t, len(tracker.addressesSubs[topic]), 2)
		assert.Contains(t, tracker.addressesSubs[topic], sub2)

		sub3 := tracker.SubscribeEvents(topic)
		assert.Equal(t, len(tracker.addressesSubs[topic]), 3)
		assert.Contains(t, tracker.addressesSubs[topic], sub3)
	})

	t.Run("unsubscribe shrinks subs map", func(t *testing.T) {
		t.Parallel()

		tracker := NewTracker(nil, nil, nil)
		sub1 := tracker.SubscribeEvents(topic)
		sub2 := tracker.SubscribeEvents(topic)
		sub3 := tracker.SubscribeEvents(topic)

		assert.Equal(t, len(tracker.addressesSubs[topic]), 3)

		sub1.Unsubscribe()
		assert.Equal(t, len(tracker.addressesSubs[topic]), 2)
		assert.NotContains(t, tracker.addressesSubs[topic], sub1)

		sub2.Unsubscribe()
		assert.Equal(t, len(tracker.addressesSubs[topic]), 1)
		assert.NotContains(t, tracker.addressesSubs[topic], sub2)

		sub3.Unsubscribe()
		assert.Equal(t, len(tracker.addressesSubs[topic]), 0)
		assert.NotContains(t, tracker.addressesSubs[topic], sub3)
		assert.NotContains(t, tracker.addressesSubs, topic)
	})
}

func TestHeadSubscriptions(t *testing.T) {
	t.Run("dispatchHead sends to all subscriptions", func(t *testing.T) {
		t.Parallel()

		tracker := NewTracker(nil, nil, nil)

		harnessCh := make(chan HeadEvent, chanSize)
		const subsNum = 5
		subs := make([]*headSub, subsNum)
		for i := 0; i < subsNum; i++ {
			subs[i] = &headSub{
				tracker: tracker,
				headCh:  harnessCh,
				errCh:   make(chan error, chanSize),
			}
			tracker.headSubs[subs[i]] = struct{}{}
		}

		headEvent := HeadEvent{
			ChainID:     42,
			BlockNumber: 123,
			BlockHash:   eth.Hash{1, 2, 3},
			State:       HeadStateSeen,
		}

		go tracker.dispatchHead(headEvent)

		// no matter which sub to pass - they all share the same channel
		ValidateEventsExactNum(t, subs[0], subsNum, func(idx int, head HeadEvent) {
			assert.Equal(t, headEvent, head)
		})
	})

	t.Run("subscribe extends subs map", func(t *testing.T) {
		t.Parallel()

		tracker := NewTracker(nil, nil, nil)

		sub1 := tracker.SubscribeHeads()
		assert.Equal(t, 1, len(tracker.headSubs))
		assert.Contains(t, tracker.headSubs, sub1.(*headSub))

		sub2 := tracker.SubscribeHeads()
		assert.Equal(t, 2, len(tracker.headSubs))
		assert.Contains(t, tracker.headSubs, sub2.(*headSub))

		sub3 := tracker.SubscribeHeads()
		assert.Equal(t, 3, len(tracker.headSubs))
		assert.Contains(t, tracker.headSubs, sub3.(*headSub))
	})

	t.Run("unsubscribe shrinks subs map", func(t *testing.T) {
		t.Parallel()

		tracker := NewTracker(nil, nil, nil)
		sub1 := tracker.SubscribeHeads().(*headSub)
		sub2 := tracker.SubscribeHeads().(*headSub)
		sub3 := tracker.SubscribeHeads().(*headSub)

		assert.Equal(t, 3, len(tracker.headSubs))

		sub1.Unsubscribe()
		assert.Equal(t, 2, len(tracker.headSubs))
		assert.NotContains(t, tracker.headSubs, sub1)

		sub2.Unsubscribe()
		assert.Equal(t, 1, len(tracker.headSubs))
		assert.NotContains(t, tracker.headSubs, sub2)

		sub3.Unsubscribe()
		assert.Equal(t, 0, len(tracker.headSubs))
		assert.NotContains(t, tracker.headSubs, sub3)
	})
}
