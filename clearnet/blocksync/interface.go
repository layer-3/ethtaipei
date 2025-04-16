package blocksync

import (
	"context"
	"math/big"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

// HeadsFilter lists all the possible filters for querying heads
type HeadsFilter struct {
	ChainID     *big.Int
	BlockNumber *big.Int
	BlockHash   *eth.Hash
	ParentHash  *eth.Hash
	State       *HeadState
}

// EventsFilter lists all the possible filters for querying logs
type EventsFilter struct {
	ChainID   *big.Int
	Height    *big.Int
	BlockHash *eth.Hash
	State     *HeadState

	Address  *eth.Address
	TxHash   *eth.Hash
	TxIndex  *big.Int
	LogIndex *big.Int
	Topic    *eth.Hash // Single topic to filter by

	Removed *bool
}

// Store is an interface for storing and querying blockchain data
type Store interface {
	CreateHead(HeadEvent, ...func() error) error
	UpsertHead(HeadEvent, ...func() error) error
	SaveLogs(eth.Hash, []LogEvent, ...func() error) error

	GetHeight(uint64) (uint64, error)
	QueryHeads(HeadsFilter) ([]HeadEvent, error)
	CountHeads(HeadsFilter) (int64, error)
	QueryEvents(EventsFilter) ([]LogEvent, error)
	CountEvents(EventsFilter) (int64, error)
}

// Client is an interface for interacting with the real-time blockchain data
type Client interface {
	// SubscribeEvents subscribe to all logs for a given address
	SubscribeEvents(ctx context.Context, addr stream.Topic) (stream.Subscription[LogEvent], error)
	// SubscribeTopic subscribe only to events with the given topic for a given address
	SubscribeTopic(ctx context.Context, addr, topic stream.Topic) (stream.Subscription[LogEvent], error)
	// SubscribeTx subscribe to a transaction receipt for a given txHash
	SubscribeTx(ctx context.Context, txHash stream.Topic) (stream.Subscription[TxReceiptEvent], error)
}
