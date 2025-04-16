package blocksync

import (
	"math/big"
	"time"

	"github.com/google/uuid"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
)

// HeadModel represents a block header record.
type HeadModel struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	CreatedAt   time.Time `gorm:"not null"`
	UpdatedAt   time.Time `gorm:"not null"`
	ChainID     uint64    `gorm:"not null;uniqueIndex:idx_chain_block;uniqueIndex:idx_chain_hash"`
	BlockNumber uint64    `gorm:"not null;uniqueIndex:idx_chain_block"`
	// TODO: add to allow for cursor look-up
	BlockHash  eth.Hash  `gorm:"type:char(66);not null;uniqueIndex:idx_chain_hash"` // 32-byte hash with "0x" prefix
	ParentHash eth.Hash  `gorm:"type:char(66)"`                                     // 32-byte hash with "0x" prefix
	State      HeadState `gorm:"type:HEAD_STATE;not null"`
	Timestamp  time.Time `gorm:"not null"`
	LogsBloom  []byte
}

func (HeadModel) TableName() string {
	return "heads"
}

// HeadFromHeader constructs a Head record from a go-ethereum Header.
func HeadEventToHeadModel(h *HeadEvent) HeadModel {
	if h == nil {
		return HeadModel{}
	}

	return HeadModel{
		ID:          uuid.New(),
		ChainID:     h.ChainID,
		BlockNumber: h.BlockNumber,
		BlockHash:   h.BlockHash,
		ParentHash:  h.ParentHash,
		State:       h.State,
		Timestamp:   h.Timestamp,
		LogsBloom:   h.LogsBloom,
	}
}

func (h *HeadModel) ToHeadEvent() HeadEvent {
	return HeadEvent{
		ChainID:     h.ChainID,
		BlockNumber: h.BlockNumber,
		BlockHash:   h.BlockHash,
		ParentHash:  h.ParentHash,
		State:       h.State,
		Timestamp:   h.Timestamp,
		LogsBloom:   h.LogsBloom,
	}
}

// LogModel represents an Ethereum log entry.
type LogModel struct {
	ID          uuid.UUID   `gorm:"type:uuid;primaryKey"`
	CreatedAt   time.Time   `gorm:"not null"`
	UpdatedAt   time.Time   `gorm:"not null"`
	HeadID      uuid.UUID   `gorm:"type:uuid;not null;index"` // Foreign key to heads.id
	BlockNumber uint64      `gorm:"not null"`
	Address     eth.Address `gorm:"type:char(42);default:null"`
	BlockHash   eth.Hash    `gorm:"type:char(66);not null"`
	TxHash      eth.Hash    `gorm:"type:char(66);not null"`
	TxIndex     uint
	LogIndex    uint
	// TODO: create a separate table for topics to not store as array in DB
	Topics  []eth.Hash `gorm:"type:text[];not null"` // event topics, first is the event signature
	Data    []byte
	Removed bool
}

func (LogModel) TableName() string {
	return "logs"
}

func LogEventToLogModel(l *LogEvent) LogModel {
	if l == nil {
		return LogModel{}
	}

	return LogModel{
		ID:          uuid.New(),
		BlockNumber: l.Height,
		BlockHash:   l.BlockHash,
		TxHash:      l.TxHash,
		TxIndex:     l.TxIndex,
		Address:     l.Address,
		Topics:      l.Topics,
		Data:        l.Data,
		LogIndex:    l.LogIndex,
		Removed:     l.Removed,
	}
}

func (l *LogModel) ToLogEvent(chainId uint64, state HeadState) LogEvent {
	return LogEvent{
		ChainId:   chainId,
		State:     state,
		Height:    l.BlockNumber,
		BlockHash: l.BlockHash,
		TxHash:    l.TxHash,
		TxIndex:   l.TxIndex,
		Address:   l.Address,
		Topics:    l.Topics,
		Data:      l.Data,
		LogIndex:  l.LogIndex,
		Removed:   l.Removed,
	}
}

// TxReceiptEvent represents a transaction receipt event structure for subscription.
type TxReceiptEvent struct {
	ChainId           uint64
	Height            uint64
	Index             uint64
	TxHash            eth.Hash
	State             HeadState
	Address           eth.Address
	GasUsed           uint64
	EffectiveGasPrice *big.Int
	Data              []byte
	Removed           bool
}
