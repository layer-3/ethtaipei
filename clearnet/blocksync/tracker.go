package blocksync

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/openware/pkg/log"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

// FIXME: make changeable
const chanSize = 15

var logger = log.NewLogger("blocksync")

type Event any

type Producer interface {
	Subscribe() <-chan Event
}

type ChainClient interface {
	ethereum.ChainReader
	ethereum.ChainIDReader
	ethereum.LogFilterer
	ethereum.BlockNumberReader
	ethereum.TransactionReader
}

// Tracker structure with blockchain event handling and error notification

type Tracker struct {
	confNum uint64

	cancel    context.CancelFunc
	wg        sync.WaitGroup
	isRunning bool

	store   Store
	client  ChainClient
	chainId uint64
	start   uint64

	mu sync.RWMutex
	// address -> subs. Use mapping for subs for fast modification
	addressesSubs map[stream.Topic]map[*addressSub]struct{}
	headSubs      map[*headSub]struct{}
}

func NewTracker(client ChainClient, store Store, confNum *uint64) *Tracker {
	if confNum == nil {
		temp := DefaultConfirmationTiers[Fast]
		confNum = &temp
	}

	return &Tracker{
		confNum:       *confNum,
		client:        client,
		store:         store,
		chainId:       0,
		start:         0,
		addressesSubs: make(map[stream.Topic]map[*addressSub]struct{}),
		headSubs:      make(map[*headSub]struct{}),
	}
}

func (t *Tracker) SetHeight(st uint64) error {
	if t.chainId != 0 {
		return errors.New("tracker already started")
	}
	t.start = st
	return nil
}

// Start begins the tracking process
func (t *Tracker) Start(ctx context.Context) error {
	if t.isRunning {
		err := errors.New("tracker already running")
		err = composeAndLogError("error starting tracker", err)
		return err
	}

	ctx = t.setup(ctx)

	latestHeadNumCh := make(chan uint64, 1)

	t.watch(ctx, latestHeadNumCh)

	select {
	case latestHeadNum := <-latestHeadNumCh:
		go t.sync(ctx, t.start, latestHeadNum-1)
	case <-ctx.Done():
		logger.Info("[tracker] context canceled in Start, returning...")
	}

	return nil
}

// setup initializes the tracker context and retrieves the chain ID
func (t *Tracker) setup(ctx context.Context) context.Context {
	ctx, t.cancel = context.WithCancel(ctx)
	chainId, err := t.client.ChainID(ctx)
	if err != nil {
		t.handleUnrecoverableError("error fetching chainID", err)
		return nil
	}
	t.chainId = chainId.Uint64()
	t.isRunning = true
	return ctx
}

func (t *Tracker) SubscribeHeads() stream.Subscription[HeadEvent] {
	sub := &headSub{
		tracker: t,
		headCh:  make(chan HeadEvent, chanSize),
		errCh:   make(chan error),
	}
	t.mu.Lock()
	t.headSubs[sub] = struct{}{}
	t.mu.Unlock()
	return sub
}

// SubscribeEvents to a given address for event tracking and errors
func (t *Tracker) SubscribeEvents(addr stream.Topic) stream.Subscription[LogEvent] {
	sub := &addressSub{
		tracker: t,
		address: addr,
		eventCh: make(chan LogEvent, chanSize),
		errCh:   make(chan error, chanSize),
	}
	t.mu.Lock()
	if _, ok := t.addressesSubs[addr]; !ok {
		t.addressesSubs[addr] = make(map[*addressSub]struct{})
	}
	t.addressesSubs[addr][sub] = struct{}{}
	t.mu.Unlock()
	return sub
}

// sync performs synchronization of events up to the endHeight head number inclusive
// TODO: make sure removed blocks and events are marked as such
// FIXME: "confirmed" events from `watch` can be delivered to a subscriber earlier than "seen" events from `sync`.
// This is because `sync` tackles "seen" at the end, while `watch` does it at the beginning.
// To fix this, watch may be split into `seener` and `confirmer` to allow for more control over the order of events.
// TODO: add ability to process a gap, then seen / confirmed blocks (just iterate over them), and another gap.
// In other words, cover the case when Tracker crashes during sync, which leaves a gap, seen/confirmed blocks, gap, current block.
func (t *Tracker) sync(ctx context.Context, startHeight, endHeight uint64) {
	t.wg.Add(1)
	defer t.wg.Done()

	logger.Info("[sync] starting...", "startHeight", startHeight, "endHeight", endHeight)

	// no need to sync if we are at the genesis block
	if endHeight == 0 {
		return
	}

	storeHeight, err := t.store.GetHeight(t.chainId)
	if err != nil {
		t.handleUnrecoverableError("error fetching store height", err)
		return
	}

	if storeHeight+1 > startHeight {
		startHeight = storeHeight + 1
	}

	endConfirmedHeight := startHeight - 1
	// check if there are any blocks to confirm
	if t.confNum <= endHeight-startHeight {
		endConfirmedHeight = endHeight - t.confNum
	}

	// confirmation loop: start ... end - confNum
	for blockNum := startHeight; blockNum <= endConfirmedHeight; blockNum += 1 {
		// TODO: decide whether notify about "seen" based on entity in DB
		// If sync relies on DB entries to determine whether an event has been sent to a subscriber or not,
		// then we need to make sure writing to DB is atomic with notifying subscribers.
		// NOTE: if no such option is possible, then notifying and NOT storing is preferred.

		logger.Info("[sync] syncing confirmed block", "blockNumber", blockNum)
		confirmedHeader, err := t.client.HeaderByNumber(ctx, big.NewInt(int64(blockNum)))
		if err != nil {
			t.handleUnrecoverableError("error syncing confirmed header", err, "blockNumber", blockNum)
			return
		}

		if err := t.processConfirmedHeader(ctx, confirmedHeader); err != nil {
			return
		}
	}

	// seen loop: end - confNum + 1 ... end
	for blockNum := endConfirmedHeight + 1; blockNum <= endHeight; blockNum += 1 {
		logger.Info("[sync] syncing seen block", "blockNumber", blockNum)
		cursorHeader, err := t.client.HeaderByNumber(ctx, big.NewInt(int64(blockNum)))
		if err != nil {
			t.handleUnrecoverableError("error syncing seen header", err, "blockNumber", blockNum)
			return
		}

		if err := t.processNewHeader(ctx, cursorHeader); err != nil {
			return
		}
	}

	logger.Info("[sync] exited")
}

// watch monitors new heads and processes them
// NOTE: blocks execution until it is subscribed to new heads
func (t *Tracker) watch(ctx context.Context, latestHeadNumCh chan<- uint64) {
	t.wg.Add(1)

	logger.Info("[watch] starting, subscribing to newHeads...")
	headerCh := make(chan *types.Header)
	sub, err := t.client.SubscribeNewHead(ctx, headerCh)
	if err != nil {
		t.handleUnrecoverableError("error creating new head subscription", err)
		return
	}

	go func() {
		defer t.wg.Done()
		defer sub.Unsubscribe()

		hasReportedFirstHead := false

		for {
			select {
			case <-ctx.Done():
				logger.Info("[watch-internal] context canceled, unsubscribing from newHeads...")
				return

			case err := <-sub.Err():
				if err != nil {
					t.handleUnrecoverableError("error in new head subscription", err)
					return
				}

			case header, ok := <-headerCh:
				if !ok {
					logger.Info("[watch-internal] header channel closed, watching is stopped")
					return
				}
				logger.Info("[watch-internal] received newHead", "blockNumber", header.Number.Uint64(), "blockHash", header.Hash())

				if !hasReportedFirstHead && latestHeadNumCh != nil {
					latestHeadNumCh <- header.Number.Uint64()
					close(latestHeadNumCh)
					hasReportedFirstHead = true
				}

				if err := t.processNewHeader(ctx, header); err != nil {
					return
				}

				// Can there be any confirmed head? Mark it as confirmed
				if header.Number.Uint64() >= t.confNum {
					confirmedHeadNumber := header.Number.Uint64() - t.confNum
					confirmedHeader, err := t.client.HeaderByNumber(ctx, big.NewInt(int64(confirmedHeadNumber)))
					if err != nil {
						t.handleUnrecoverableError("error fetching confirmed header", err, "blockNumber", confirmedHeadNumber)
						return
					}

					if err := t.processConfirmedHeader(ctx, confirmedHeader); err != nil {
						return
					}
				}
			}
		}
	}()

	logger.Info("[watch] exited")
}

// processNewHeader processes a new header by creating the head record,
// extracting logs if needed, and dispatching the head event.
// Head deduplication occurs at store level.
func (t *Tracker) processNewHeader(ctx context.Context, header *types.Header) error {
	state := HeadStateSkipped

	// Copy addresses to avoid holding the lock too long.
	t.mu.RLock()
	addrs := topicMapKeys(t.addressesSubs)
	t.mu.RUnlock()

	if t.headerContainsAddrEvents(header, addrs) {
		state = HeadStateSeen
	}

	// store head first, so that events can be linked to it
	headEvent := ToHeadEvent(*header, t.chainId, state)
	callback := func() error {
		headEvent.State = HeadStateSeen // NOTE: HeadEvent can NOT be "skipped"
		t.dispatchHead(headEvent)
		headEvent.State = state
		return nil
	}

	// NOTE: in "seen", process events AFTER a head is
	if err := t.store.CreateHead(headEvent, callback); err != nil {
		logger.Error("error storing head", "block", header.Number, "error", err)
		if !strings.Contains(err.Error(), "already exists") { // deduplication is assumed to be done at the store level
			return t.handleUnrecoverableError("error storing head as seen", err, "block", header.Number)
		}
	}

	if state == HeadStateSeen {
		if err := t.extractAndProcessLogs(ctx, header, addrs, state); err != nil {
			return err
		}
	}

	return nil
}

// processConfirmedHeader handles confirmed blocks
func (t *Tracker) processConfirmedHeader(ctx context.Context, header *types.Header) error {
	t.mu.RLock()
	addrs := topicMapKeys(t.addressesSubs)
	t.mu.RUnlock()

	// NOTE: in confirmation, events are processed BEFORE a head is
	if t.headerContainsAddrEvents(header, addrs) {
		if err := t.extractAndProcessLogs(ctx, header, addrs, HeadStateConfirmed); err != nil {
			return err
		}
	}

	headEvent := ToHeadEvent(*header, t.chainId, HeadStateConfirmed)
	callback := func() error {
		t.dispatchHead(headEvent)
		return nil
	}

	if err := t.store.UpsertHead(headEvent, callback); err != nil {
		return t.handleUnrecoverableError("error storing head as confirmed", err, "block", header.Number)
	}

	return nil
}

// headerContainsAddrEvents checks if a header has relevant address events
func (t *Tracker) headerContainsAddrEvents(header *types.Header, addrs []common.Address) bool {
	relevant := false
	for _, addr := range addrs {
		logger.Info("checking Bloom", "headNum", header.Number, "address", addr)
		if types.BloomLookup(header.Bloom, addr) {
			logger.Info("FOUND event in bloom lookup", "headNum", header.Number, "address", addr)
			relevant = true
			break
		}
	}
	return relevant
}

// extractAndProcessLogs fetches logs for a block, stores and dispatches them
func (t *Tracker) extractAndProcessLogs(ctx context.Context, header *types.Header, addrs []common.Address, state HeadState) error {
	var logs []LogEvent
	query := ethereum.FilterQuery{
		FromBlock: header.Number,
		ToBlock:   header.Number,
		Addresses: addrs,
	}

	logger.Info("checking logs", "block", header.Number)

	ethLogs, err := t.client.FilterLogs(ctx, query)
	if err != nil {
		t.handleUnrecoverableError("error filtering logs", err, "block", header.Number)
	}

	logger.Info("fetched logs", "block", header.Number, "logs", len(ethLogs))

	for _, ethLog := range ethLogs {
		if ethLog.Removed {
			// TODO: handle removed Event and removed Head
			continue
		}
		logs = append(logs, ToLogEvent(&ethLog, t.chainId, state))
	}

	logger.Info("extracted logs", "block", header.Number, "logs", len(logs))

	if state == HeadStateSeen {
		callback := func() error { t.dispatchLogs(logs); return nil }
		if err = t.store.SaveLogs(eth.Hash(header.Hash()), logs, callback); err != nil {
			return t.handleUnrecoverableError("error storing logs", err, "block", header.Number)
		}
		return nil
	}

	t.dispatchLogs(logs)
	return nil
}

func (t *Tracker) dispatchHead(headEvent HeadEvent) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	for sub := range t.headSubs {
		select {
		case sub.headCh <- headEvent:
		default:
			logger.Warn("error dispatching head to blocked subscriber", "block", headEvent.BlockNumber)
			select {
			case sub.errCh <- errors.New("subscriber blocked to receive head"):
			default:
				logger.Error("error dispatching error to blocked subscriber", "block", headEvent.BlockNumber)
			}
		}
	}
}

// dispatchLogs sends log events to subscribers
func (t *Tracker) dispatchLogs(logs []LogEvent) {
	for _, logEntry := range logs {
		t.dispatchLog(stream.Topic(logEntry.Address.String()), logEntry)
	}
}

// dispatchLog sends an event to the appropriate subscribers
func (t *Tracker) dispatchLog(topic stream.Topic, evt LogEvent) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	subMap, ok := t.addressesSubs[topic]
	if !ok {
		return
	}
	for sub := range subMap {
		select {
		case sub.eventCh <- evt:
		default:
			logger.Warn("error dispatching event to blocked subscriber", "address", topic)
			select {
			case sub.errCh <- errors.New("subscriber blocked to receive event"):
			default:
				logger.Error("error dispatching error to blocked subscriber", "address", topic)
			}
		}
	}
}

// Stop halts the tracking process
func (t *Tracker) Stop() {
	logger.Info("[tracker] stopping...")

	t.mu.RLock()
	isRunning := t.isRunning
	t.mu.RUnlock()
	if !isRunning {
		logger.Info("[tracker] already stopped")
		return
	}

	// TODO: decide whether to unsubscribe users when stopping
	for _, subs := range t.addressesSubs {
		for sub := range subs {
			sub.Unsubscribe()
		}
	}

	for sub := range t.headSubs {
		sub.Unsubscribe()
	}

	t.cancel()
	t.wg.Wait()

	t.mu.Lock()
	defer t.mu.Unlock()
	t.chainId = 0
	t.isRunning = false
	logger.Info("[tracker] stopped")
}

func composeAndLogError(msg string, err error, keysAndValues ...any) error {
	if len(keysAndValues)%2 != 0 {
		logger.Warn("Ignoring key without a value in log", "context", keysAndValues)
		keysAndValues = keysAndValues[:len(keysAndValues)-1] // Trim last element
	}

	var keyValuePairs []string
	for i := 0; i < len(keysAndValues); i += 2 {
		key, val := keysAndValues[i], keysAndValues[i+1]
		if key == nil || val == nil {
			continue // Skip pairs where either key or value is nil
		}
		keyValuePairs = append(keyValuePairs, fmt.Sprintf("%v: %v", key, val))
	}

	// Efficiently join key-value pairs
	var keyValueStr string
	if len(keyValuePairs) > 0 {
		keyValueStr = strings.Join(keyValuePairs, ", ")
	}

	// Format error message correctly
	var wrappedErr error
	if keyValueStr == "" {
		wrappedErr = fmt.Errorf("msg: %s, err: %v", msg, err)
	} else {
		wrappedErr = fmt.Errorf("msg: %s, %s, err: %v", msg, keyValueStr, err)
	}

	logger.Error(wrappedErr.Error())
	return wrappedErr
}

// handleUnrecoverableError deals with errors that affect all subscribers
func (t *Tracker) handleUnrecoverableError(msg string, err error, keysAndValues ...interface{}) error {
	wrappedErr := composeAndLogError(msg, err, keysAndValues...)

	t.mu.RLock()
	defer t.mu.RUnlock()

	for _, subs := range t.addressesSubs {
		for sub := range subs {
			select {
			case sub.errCh <- wrappedErr:
			default:
				logger.Warn("unrecoverable error can not be delivered", "address", sub.address, "error", wrappedErr)
			}
		}
	}

	// launch `Stop` in a go-routine to be able to return to external execution flow
	go t.Stop()
	return wrappedErr
}

// handleSubscriberError deals with errors specific to a subscriber
func (t *Tracker) handleSubscriberError(sub *addressSub, err error, recoverable bool) {
	select {
	case sub.errCh <- err:
	default:
		logger.Warn("recoverable error can not be delivered", "address", sub.address, "error", err)
	}

	if !recoverable {
		sub.Unsubscribe()
	}
}

// NOTE: for now we use more simple, but less efficient way to extract keys from a map
func topicMapKeys[V any](m map[stream.Topic]V) []common.Address {
	keys := make([]common.Address, 0, len(m))
	for k := range m {
		keys = append(keys, common.HexToAddress(string(k)))
	}
	return keys
}
