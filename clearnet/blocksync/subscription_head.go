package blocksync

import (
	"time"

	"github.com/ethereum/go-ethereum/core/types"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

// HeadState is a custom type representing the state of a head.
// TODO: move to `confirmation.go` and rename accordingly, as it applies to logs, blocks, txs
type HeadState string

// Enumerated head states.
const (
	HeadStateUnset     HeadState = ""
	HeadStateSkipped   HeadState = "skipped"
	HeadStateSeen      HeadState = "seen"
	HeadStateConfirmed HeadState = "confirmed"
	HeadStateRemoved   HeadState = "removed"
)

// Head represents a block header record.
type HeadEvent struct {
	ChainID     uint64
	BlockNumber uint64
	BlockHash   eth.Hash
	ParentHash  eth.Hash
	State       HeadState
	Timestamp   time.Time
	LogsBloom   []byte
}

func ToHeadEvent(h types.Header, chainId uint64, state HeadState) HeadEvent {
	return HeadEvent{
		ChainID:     chainId,
		BlockNumber: h.Number.Uint64(),
		BlockHash:   eth.Hash(h.Hash()),
		ParentHash:  eth.Hash(h.ParentHash),
		State:       state,
		Timestamp:   time.Unix(int64(h.Time), 0),
		LogsBloom:   h.Bloom[:],
	}
}

// addressSub represents a subscription to a specific blockchain address
// with channels for events and errors
type headSub struct {
	tracker *Tracker
	address stream.Topic
	headCh  chan HeadEvent
	errCh   chan error
}

func (hs *headSub) Unsubscribe() {
	hs.tracker.mu.Lock()
	defer hs.tracker.mu.Unlock()

	delete(hs.tracker.headSubs, hs)
	close(hs.headCh)
	close(hs.errCh)
}

func (hs *headSub) Event() <-chan HeadEvent {
	return hs.headCh
}

func (hs *headSub) Err() <-chan error {
	return hs.errCh
}
