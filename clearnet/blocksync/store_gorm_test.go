package blocksync

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
)

func TestGormStore(t *testing.T) {
	db, err := NewSqliteStore(t)
	require.NoError(t, err)
	s := NewGormStore(db)

	hash := eth.Hash(common.HexToHash("0x37f29dc4d3b9e8bc4af9a3ab3482fce4ade78a5ada7364c5d0f379e4d3d13aa1"))

	// create a new Head
	const chainId = 1337
	const blockNumber = 42
	head := HeadEvent{
		ChainID:     chainId,
		BlockNumber: blockNumber,
		BlockHash:   hash,
		ParentHash:  hash,
		State:       HeadStateConfirmed,
		Timestamp:   time.Now(),
	}

	// create a few logs
	logs := []LogEvent{{
		Height:    blockNumber,
		BlockHash: hash,
		TxHash:    hash,
		Topics:    []eth.Hash{hash},
		Data:      []byte("log1"),
	}, {
		Height:    blockNumber,
		BlockHash: hash,
		TxHash:    hash,
		Topics:    []eth.Hash{hash},
		Data:      []byte("log2"),
	}}

	// create the head
	err = s.CreateHead(head)
	require.NoError(t, err)

	header, err := s.CountHeads(HeadsFilter{})
	require.NoError(t, err)
	require.Equal(t, int64(1), header)

	// check that the height is 42 (we call s.Height())
	height, err := s.GetHeight(chainId)
	require.NoError(t, err)
	require.Equal(t, uint64(blockNumber), height)

	// Save logs using SaveLogs
	err = s.SaveLogs(head.BlockHash, logs)
	require.NoError(t, err)

	// retrieve the updated head from db
	var dbHead HeadModel
	err = db.First(&dbHead, "block_hash = ?", hash).Error
	require.NoError(t, err)
	require.Equal(t, HeadStateConfirmed, dbHead.State)

	headEvent := dbHead.ToHeadEvent()
	headEvent.State = HeadStateConfirmed

	// update head state to confirmed
	err = s.UpsertHead(headEvent)
	require.NoError(t, err)

	err = db.First(&dbHead, "block_hash = ?", hash).Error
	require.NoError(t, err)

	require.Equal(t, HeadStateConfirmed, dbHead.State)

	closeDB(t, db)
}

func NewSqliteStore(t *testing.T) (*gorm.DB, error) {
	// Generate a unique DSN for the in-memory DB.
	// Using the current timestamp (or any unique string) ensures a new DB each time.
	uniqueDSN := fmt.Sprintf(
		"file:memdb_%s?mode=memory&cache=shared",
		strings.ReplaceAll(uuid.NewString(), "-", ""),
	)

	db, err := gorm.Open(sqlite.Open(uniqueDSN), &gorm.Config{
		// Logger: gorm_logger.Default.LogMode(gorm_logger.Info),
	})
	require.NoError(t, err)

	// AutoMigrate the Head and Log structs.
	err = db.AutoMigrate(HeadModel{}, LogModel{})
	require.NoError(t, err)
	return db, err
}

func closeDB(t *testing.T, db *gorm.DB) {
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("failed to retrieve underlying sql.DB: %v", err)
	}
	if err := sqlDB.Close(); err != nil {
		t.Fatalf("failed to close the in-memory sqlite database: %v", err)
	}
}
