package blocksync

import (
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

// LogEvent represents a log event structure for subscription.
type LogEvent struct {
	ChainId uint64
	// TODO: rename to BlockNumber
	Height    uint64
	BlockHash eth.Hash
	State     HeadState
	Address   eth.Address
	TxHash    eth.Hash
	TxIndex   uint
	Topics    []eth.Hash
	Data      []byte
	LogIndex  uint
	Removed   bool
}

func ToLogEvent(l *types.Log, chainId uint64, state HeadState) LogEvent {
	topics := make([]eth.Hash, len(l.Topics))
	for i, topic := range l.Topics {
		topics[i] = eth.Hash(topic)
	}

	return LogEvent{
		ChainId:   chainId,
		Height:    l.BlockNumber,
		BlockHash: eth.Hash(l.BlockHash),
		State:     state,
		Address:   eth.Address(l.Address),
		TxHash:    eth.Hash(l.TxHash),
		TxIndex:   l.TxIndex,
		Topics:    topics,
		Data:      l.Data,
		LogIndex:  l.Index,
		Removed:   l.Removed,
	}
}

func (le LogEvent) ToLog() *types.Log {
	topics := make([]common.Hash, len(le.Topics))
	for i, topic := range le.Topics {
		topics[i] = common.Hash(topic)
	}

	return &types.Log{
		BlockNumber: le.Height,
		BlockHash:   common.Hash(le.BlockHash),
		Address:     common.Address(le.Address),
		TxHash:      common.Hash(le.TxHash),
		TxIndex:     le.TxIndex,
		Topics:      topics,
		Data:        le.Data,
		Index:       le.LogIndex,
		Removed:     le.Removed,
	}
}

// addressSub represents a subscription to a specific blockchain address
// with channels for events and errors
type addressSub struct {
	tracker *Tracker
	address stream.Topic

	once    sync.Once
	eventCh chan LogEvent
	errCh   chan error
}

func (as *addressSub) Unsubscribe() {
	as.tracker.mu.Lock()
	defer as.tracker.mu.Unlock()

	subs, exists := as.tracker.addressesSubs[as.address]
	if exists {
		delete(subs, as)
		if len(subs) == 0 {
			delete(as.tracker.addressesSubs, as.address)
		}
	}

	as.once.Do(func() {
		close(as.eventCh)
		close(as.errCh)
	})
}

func (as *addressSub) Event() <-chan LogEvent {
	return as.eventCh
}

func (as *addressSub) Err() <-chan error {
	return as.errCh
}
