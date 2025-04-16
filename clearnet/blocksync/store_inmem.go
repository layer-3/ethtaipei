package blocksync

import (
	"errors"
	"fmt"
	"sync"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
)

// InMemoryStore is an in-memory implementation of the Store interface.
// Heads are stored by: headsByChain[chainID][blockNumber]
// LogEvents are stored by blockHash in logsByChain, stored directly as []LogEvent
type InMemoryStore struct {
	mu sync.Mutex

	// chainID -> blockNumber -> HeadEvent
	headsByChain map[uint64]map[uint64]*HeadEvent

	// chainID -> blockHash -> slice of LogEvent
	logsByChain map[uint64]map[eth.Hash][]LogEvent
}

// NewInMemoryStore creates a new InMemoryStore instance.
func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		headsByChain: make(map[uint64]map[uint64]*HeadEvent),
		logsByChain:  make(map[uint64]map[eth.Hash][]LogEvent),
	}
}

// CreateHead stores a new HeadEvent only if it does not already exist.
func (m *InMemoryStore) CreateHead(e HeadEvent, callbacks ...func() error) (err error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	chainHeads, ok := m.headsByChain[e.ChainID]
	if !ok {
		chainHeads = make(map[uint64]*HeadEvent)
		m.headsByChain[e.ChainID] = chainHeads
	}

	if _, exists := chainHeads[e.BlockNumber]; exists {
		return fmt.Errorf("head already exists for chain=%d, block=%d", e.ChainID, e.BlockNumber)
	}

	// Insert directly as a HeadEvent reference
	clone := e
	chainHeads[e.BlockNumber] = &clone

	// Execute any callbacks
	defer func() {
		if err != nil { // rollback on callback error
			delete(chainHeads, e.BlockNumber)
		}
	}()
	for _, cb := range callbacks {
		if err := cb(); err != nil {
			return err
		}
	}

	return nil
}

// UpsertHead updates or inserts a HeadEvent at the given block number.
func (m *InMemoryStore) UpsertHead(e HeadEvent, callbacks ...func() error) (err error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	chainHeads, ok := m.headsByChain[e.ChainID]
	if !ok {
		chainHeads = make(map[uint64]*HeadEvent)
		m.headsByChain[e.ChainID] = chainHeads
	}

	// Overwrite or insert
	clone := e
	chainHeads[e.BlockNumber] = &clone

	// Execute any callbacks
	defer func() {
		if err != nil { // rollback on callback error
			delete(chainHeads, e.BlockNumber)
		}
	}()
	for _, cb := range callbacks {
		if err := cb(); err != nil {
			return err
		}
	}

	return nil
}

// SaveLogs appends new LogEvents for the head identified by the provided block hash.
func (m *InMemoryStore) SaveLogs(headHash eth.Hash, logs []LogEvent, callbacks ...func() error) (err error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Ensure there's a head with this hash in at least one chain
	found := false
	headChainID := uint64(0)

	// find which chain stores the head with blockHash = headHash
	for chainID, chainHeads := range m.headsByChain {
		for _, headEvent := range chainHeads {
			if headEvent.BlockHash == headHash {
				found = true
				headChainID = chainID
				break
			}
		}
		if found {
			break
		}
	}
	if !found {
		return errors.New("no head found with given block hash")
	}

	// If the chain logs map doesn't exist, create it
	if _, ok := m.logsByChain[headChainID]; !ok {
		m.logsByChain[headChainID] = make(map[eth.Hash][]LogEvent)
	}

	// Append LogEvents directly
	m.logsByChain[headChainID][headHash] = append(m.logsByChain[headChainID][headHash], logs...)

	// Execute any callbacks
	defer func() {
		if err != nil { // rollback on callback error
			logsByChain := m.logsByChain[headChainID][headHash]
			m.logsByChain[headChainID][headHash] = logsByChain[:len(logsByChain)-len(logs)]
		}
	}()
	for _, cb := range callbacks {
		if err := cb(); err != nil {
			return err
		}
	}
	return nil
}

// GetHeight returns the highest confirmed block number for a given chainID.
func (m *InMemoryStore) GetHeight(chainID uint64) (uint64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	chainHeads, ok := m.headsByChain[chainID]
	if !ok {
		return 0, nil // no heads for this chain, therefore height is 0
	}

	var maxConfirmed uint64
	for _, head := range chainHeads {
		if head.State == HeadStateConfirmed && head.BlockNumber > maxConfirmed {
			maxConfirmed = head.BlockNumber
		}
	}
	return maxConfirmed, nil
}

// QueryHeads returns all heads matching the given filter.
func (m *InMemoryStore) QueryHeads(f HeadsFilter) ([]HeadEvent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	var out []HeadEvent

	for chainID, chainHeads := range m.headsByChain {
		// Filter by chainID if set
		if f.ChainID != nil && chainID != f.ChainID.Uint64() {
			continue
		}

		for _, head := range chainHeads {
			// Evaluate all possible filter criteria against the *HeadEvent
			if f.BlockNumber != nil && head.BlockNumber != f.BlockNumber.Uint64() {
				continue
			}
			if f.BlockHash != nil && head.BlockHash != *f.BlockHash {
				continue
			}
			if f.ParentHash != nil && head.ParentHash != *f.ParentHash {
				continue
			}
			if f.State != nil && head.State != *f.State {
				continue
			}
			// Since it's already a HeadEvent, just add a copy to out
			out = append(out, *head)
		}
	}
	return out, nil
}

// CountHeads is a convenience wrapper around QueryHeads.
func (m *InMemoryStore) CountHeads(f HeadsFilter) (int64, error) {
	heads, err := m.QueryHeads(f)
	if err != nil {
		return 0, err
	}
	return int64(len(heads)), nil
}

// QueryEvents returns all LogEvents matching the given filter.
func (m *InMemoryStore) QueryEvents(f EventsFilter) ([]LogEvent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	var out []LogEvent

	// If chainID is specified, limit to that chain only
	if f.ChainID != nil {
		chainID := f.ChainID.Uint64()
		chainLogs, ok := m.logsByChain[chainID]
		if !ok {
			return out, nil
		}
		for blockHash, events := range chainLogs {
			if f.BlockHash != nil && blockHash != *f.BlockHash {
				continue
			}
			for _, ev := range events {
				if !matchEventFilter(ev, f) {
					continue
				}
				out = append(out, ev)
			}
		}
		return out, nil
	}

	// Otherwise scan all chains
	for _, chainLogs := range m.logsByChain {
		for blockHash, events := range chainLogs {
			if f.BlockHash != nil && blockHash != *f.BlockHash {
				continue
			}
			for _, ev := range events {
				if !matchEventFilter(ev, f) {
					continue
				}
				out = append(out, ev)
			}
		}
	}

	return out, nil
}

// CountEvents is a convenience wrapper around QueryEvents.
func (m *InMemoryStore) CountEvents(f EventsFilter) (int64, error) {
	events, err := m.QueryEvents(f)
	if err != nil {
		return 0, err
	}
	return int64(len(events)), nil
}

// matchEventFilter checks an individual LogEvent against the pointer fields
// in EventsFilter. If any set field doesn't match, returns false.
func matchEventFilter(ev LogEvent, f EventsFilter) bool {
	// Height
	if f.Height != nil && ev.Height != f.Height.Uint64() {
		return false
	}
	// State
	if f.State != nil && ev.State != *f.State {
		return false
	}
	// Address
	if f.Address != nil && ev.Address != *f.Address {
		return false
	}
	// TxHash
	if f.TxHash != nil && ev.TxHash != *f.TxHash {
		return false
	}
	// TxIndex
	if f.TxIndex != nil && uint64(ev.TxIndex) != f.TxIndex.Uint64() {
		return false
	}
	// LogIndex
	if f.LogIndex != nil && uint64(ev.LogIndex) != f.LogIndex.Uint64() {
		return false
	}
	// Topic - Check if the filter topic is contained in the event's Topics array
	if f.Topic != nil {
		found := false
		for _, topic := range ev.Topics {
			if topic == *f.Topic {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	// Removed
	if f.Removed != nil && ev.Removed != *f.Removed {
		return false
	}
	return true
}
