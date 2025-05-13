# Blocksync

The blocksync package provides a robust solution for tracking and confirming blockchain events with configurable confirmation levels. It ensures reliable event delivery with proper state management (seen, confirmed, removed) and protection against chain reorganizations.

## Usage Guide

### Basic Usage

#### 1. Initialize the Tracker

```go
import (
    "context"
    "github.com/layer-3/ethtaipei/clearnet/blocksync"
    "github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

// Create an Ethereum client that satisfies the ChainClient interface
// This should implement ethereum.ChainReader, ethereum.ChainIDReader, 
// ethereum.LogFilterer, ethereum.BlockNumberReader and ethereum.TransactionReader
client := /* your Ethereum client implementation */

// Create a store implementation (e.g., GormStore)
db := /* your gorm.DB instance */
store := blocksync.NewGormStore(db)

// Set confirmation number (optional, defaults to Fast tier)
// You can use predefined confirmation tiers:
// - Instant: 1 confirmation
// - Fast: 5 confirmations
// - Safe: 10 confirmations
// - Finalized: 20 confirmations
confNum := blocksync.DefaultConfirmationTiers[blocksync.Fast]

// Initialize the tracker
tracker := blocksync.NewTracker(client, store, &confNum)

// Optionally set a starting height
// Must be done before starting the tracker
tracker.SetHeight(100000) // Start tracking from block 100000

// Start the tracker
ctx := context.Background()
err := tracker.Start(ctx)
if err != nil {
    // Handle error
}
```

#### 2. Subscribe to Events

To receive events for a specific contract address:

```go
// Subscribe to blockchain events for a specific address
address := "0xYourContractAddress" // Replace with actual address
sub := tracker.SubscribeEvents(stream.Topic(address))

// Handle events
go func() {
    for {
        select {
        case event := <-sub.Event():
            // Process the log event
            // The event can have different states: "seen" or "confirmed"
            if event.State == blocksync.HeadStateConfirmed {
                // Handle confirmed event
                processConfirmedEvent(event)
            } else if event.State == blocksync.HeadStateSeen {
                // Handle seen but not yet confirmed event
                trackSeenEvent(event)
            }
            
            // Access event data like topic, data, etc.
            topics := event.Topics
            data := event.Data
            
        case err := <-sub.Err():
            // Handle error
            log.Printf("Error from subscription: %v", err)
            return
        }
    }
}()
```

#### 3. Subscribe to Block Headers

You can also subscribe to block header events:

```go
// Subscribe to block headers
headSub := tracker.SubscribeHeads()

// Handle head events
go func() {
    for {
        select {
        case headEvent := <-headSub.Event():
            // Process block header events
            blockNumber := headEvent.BlockNumber
            blockHash := headEvent.BlockHash
            state := headEvent.State // "seen", "confirmed" or "skipped"
            
        case err := <-headSub.Err():
            // Handle error
            log.Printf("Error from head subscription: %v", err)
            return
        }
    }
}()
```

#### 4. Cleanup

When you're done, stop the tracker to clean up resources:

```go
// Stop the tracker and clean up resources
tracker.Stop()
```

### Advanced Usage

#### Custom Confirmation Levels

You can customize the number of confirmations required:

```go
// Set a custom confirmation number
customConfNum := uint64(15) // 15 block confirmations
tracker := blocksync.NewTracker(client, store, &customConfNum)
```

#### Querying Historical Events

You can query events that have already been processed:

```go
// Create a filter for events
filter := blocksync.EventsFilter{
    ChainID:  big.NewInt(1),          // Ethereum mainnet
    Address:  &contractAddress,        // Contract address
    Topic:    &eventSignatureHash,     // Event signature topic
    State:    &blocksync.HeadStateConfirmed, // Only confirmed events
}

// Query events
events, err := store.QueryEvents(filter)
if err != nil {
    // Handle error
}

// Process historical events
for _, event := range events {
    processEvent(event)
}
```

#### Accessing Event Data

When you receive an event, you can access its data:

```go
func processEvent(event blocksync.LogEvent) {
    // Event metadata
    chainId := event.ChainId
    blockNumber := event.Height
    blockHash := event.BlockHash
    state := event.State
    
    // Transaction data
    txHash := event.TxHash
    txIndex := event.TxIndex
    logIndex := event.LogIndex
    
    // Event data
    contractAddress := event.Address
    topics := event.Topics  // First topic is usually the event signature
    data := event.Data      // Raw event data
    
    // Decode the event data based on your contract's ABI
    // ...
}
```

## Tracker Specs

### Database

The database is considered to be a source of truth for the logs and heads. If
the log or head is not in the database, it is considered to be NOT processed and
NOT dispatched to users.

```go
type Head struct {
  ID          uuid.UUID
  CreatedAt   time.Time
  UpdatedAt   time.Time
  ChainID     uint64
  BlockNumber uint64
  BlockHash   eth.Hash
  ParentHash  eth.Hash
  State       HeadState
  Timestamp   time.Time
  LogsBloom   []byte
}

type Log struct {
  ID          uuid.UUID
  CreatedAt   time.Time
  UpdatedAt   time.Time
  HeadID      uuid.UUID
  Head        Head
  BlockNumber uint64
  Address     eth.Address
  BlockHash   eth.Hash
  TxHash      eth.Hash
  TxIndex     uint
  LogIndex    uint
  Topic       eth.Hash
  Data        []byte
  Removed     bool
}
```

### Watch

Continuously listens to new heads and confirms the old ones.

1. Subscribes for new block headers.
2. For a received header with number `N`, converts it into a head record and
   checks its bloom filter against registered addresses.
3. If any matching logs are found, it saves the head `N` as "seen" and logs in
   the database and dispatches the events as "seen"; otherwise, it saves the
   head `N` as “skipped”.
4. Marks head `N - confirmationNum` as “confirmed” in the database.

### Sync

Sync and confirm the historical heads up to a certain height.

1. Operates only in a specified interval of `start` (or the highest confirmed
   block in the DB) and `end` (supplied).
2. For each block with number N in a range `start, end - confirmationNum`, do:
3. Fetch block `N`, check if it contains the event of interest.
4. If it does, emit a "seen" and "confirmed" event for this log.
5. Mark the block `N` as "confirmed" in the database.
6. For each block with number `N` in a range `end - confirmationNum, end`, do:
7. Fetch block `N`, check if it contains the event of interest.
8. If it does, emit a "seen" event for this log.
9. Mark the block `N` as "seen" in the database.

### Rules of marking blocks in DB

As already mentioned, the database is considered a source of truth for events.
If an event is dispatched, it must be stored in the DB.

Logs are tied to Heads, meaning if a Head has "confirmed" status, all logs
tied to it are also "confirmed" and dispatched.
However, logs "seen" dispatch and saving them to DB are atomic operations,
whereas saving logs and dispatching a head tied to them are not.

After a block is marked as

- "skipped", its status can be changed to "removed" or "confirmed".
- "seen", its status can be changed to "removed" or "confirmed".
- "confirmed", its status can _sometimes_ be changed to "removed" (note: only
  when user supplies confirmation number that is less than chain protocol
  finalization one).
- "removed", its status can NOT be changed.

### Note on starting Watch and Sync

`Sync` must be started on the first block `Watch` fetches to guarantee none
blocks are skipped. Therefore, `Watch` passes the number of the block it sees
through a channel back to the invoking routine, which starts `Sync` with this
number. The requirement is that we must have a clear separation of sync and
watch ranges, so that watch starts on the consequent block to the sync's end.

Reasoning for using channel:

We could have determined this range before starting both routines, but there can
be situations and blockchains, when another block(s) is included right
in-between us fetching the latest one and starting the routines. Note that
unfortunately watch could not start fetching at a certain height - it starts on
the latest block. Therefore, watch is the one, that starts the sync too. This
means, that watch should pass the number of its first fetched block to sync
somehow. I think, channel is the easiest and the most straightforward solution.

### Note on "seen" and "confirmed" order

As `Watch` and `Sync` are running concurrently, there can be a situation when a
Log has a "confirmed" status before "seen". This can only happen when `Sync` is
running and there are no such cases after `Sync` has finished processing old
blocks. Moreover, `Sync` is only applicable after the blocksync (and most
probably the calling service too) has crashed, therefore, it is believed this
issue is an acceptable trade-off to a cleaner architecture and separation of
concerns.
