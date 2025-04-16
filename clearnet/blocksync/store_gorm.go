package blocksync

import (
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
)

// GormStore implements the Store interface using GORM.
// It holds a *gorm.DB instance for database interactions.
type GormStore struct {
	db *gorm.DB
}

// NewGormStore creates a new GormStore with the given *gorm.DB.
func NewGormStore(db *gorm.DB) *GormStore {
	return &GormStore{db: db}
}

// CreateHead inserts a new Head record
func (s *GormStore) CreateHead(h HeadEvent, callbacks ...func() error) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		headModel := HeadEventToHeadModel(&h)
		if err := s.db.Create(&headModel).Error; err != nil {
			return err
		}
		for _, cb := range callbacks {
			if err := cb(); err != nil {
				return err
			}
		}
		return nil
	})
}

// UpsertHead inserts a new Head record or update it
func (s *GormStore) UpsertHead(h HeadEvent, callbacks ...func() error) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		headModel := HeadEventToHeadModel(&h)
		if err := s.upsertHead(&headModel); err != nil {
			return err
		}
		for _, cb := range callbacks {
			if err := cb(); err != nil {
				return err
			}
		}
		return nil
	})
}

// UpsertOrReplaceHead inserts a new Head record or update it
func (s *GormStore) upsertHead(head *HeadModel) error {
	// head.UpdatedAt = time.Now()
	return s.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "chain_id"},
			{Name: "block_number"},
		},
		// When conflict occurs on (chain_id, block_number), update the following columns.
		DoUpdates: clause.AssignmentColumns([]string{
			"block_hash",
			"parent_hash",
			"state",
			"timestamp",
			"logs_bloom",
			"updated_at",
		}),
	}).Create(head).Error
}

// SaveLogs uses an SQL transaction to save logs tied to an existing Head.
// The head ID is retrieved using the provided headHash.
func (s *GormStore) SaveLogs(headHash eth.Hash, logs []LogEvent, callbacks ...func() error) error {
	if len(logs) == 0 {
		return nil
	}

	var headModel HeadModel
	if err := s.db.Where("block_hash = ?", headHash).First(&headModel).Error; err != nil {
		return fmt.Errorf("failed to find head with hash %s: %w", headHash, err)
	}

	logModels := make([]LogModel, len(logs))
	for i, l := range logs {
		logModel := LogEventToLogModel(&l)
		logModel.HeadID = headModel.ID
		logModels[i] = logModel
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&logModels).Error; err != nil {
			return err
		}
		for _, cb := range callbacks {
			if err := cb(); err != nil {
				return err
			}
		}
		return nil
	})
}

// ---------------------------------------------------------------------

// GetHeight returns the highest block number confirmed
func (s *GormStore) GetHeight(chainId uint64) (uint64, error) {
	var h HeadModel
	err := s.db.
		Where("chain_id = ? AND state = ?", chainId, HeadStateConfirmed).
		Order("block_number desc").
		Select("block_number").
		First(&h).Error
	if err != nil {
		if errors.Is(gorm.ErrRecordNotFound, err) {
			return 0, nil
		}
		return 0, err
	}
	return h.BlockNumber, nil
}

// ---------------------------------------------------------------------

func (s *GormStore) buildHeadsFilter(db *gorm.DB, f HeadsFilter) *gorm.DB {
	if f.ChainID != nil {
		db = db.Where("chain_id = ?", f.ChainID.String())
	}
	if f.BlockNumber != nil {
		db = db.Where("block_number = ?", f.BlockNumber.String())
	}
	if f.BlockHash != nil {
		db = db.Where("block_hash = ?", f.BlockHash.String())
	}
	if f.ParentHash != nil {
		db = db.Where("parent_hash = ?", f.ParentHash.String())
	}
	if f.State != nil {
		db = db.Where("state = ?", *f.State)
	}
	return db
}

func (s *GormStore) QueryHeads(f HeadsFilter) ([]HeadEvent, error) {
	db := s.buildHeadsFilter(s.db.Model(&HeadModel{}), f)

	var headModels []HeadModel
	if err := db.Find(&headModels).Error; err != nil {
		return nil, err
	}
	var heads []HeadEvent
	for _, h := range headModels {
		heads = append(heads, h.ToHeadEvent())
	}
	return heads, nil
}

func (s *GormStore) CountHeads(f HeadsFilter) (int64, error) {
	db := s.buildHeadsFilter(s.db.Model(&HeadModel{}), f)

	var count int64
	if err := db.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// ---------------------------------------------------------------------

// QueryEvents fetches LogEvents via a two-pass approach (heads + logs),
// then merges them to produce LogEvent results.
func (s *GormStore) QueryEvents(f EventsFilter) ([]LogEvent, error) {
	// Possibly do the HEADS pass if the user filters by chain/state
	headIDsMap, headDataMap, err := s.selectHeadsForEventsFilter(&f)
	if err != nil {
		return nil, fmt.Errorf("queryEvents: heads pass error: %w", err)
	}

	db, err := s.prepareEventsQuery(f, headIDsMap)
	if err != nil {
		return nil, fmt.Errorf("queryEvents: prepare query error: %w", err)
	}

	// 1) Fetch matching logs
	var logModels []LogModel
	if err := db.Find(&logModels).Error; err != nil {
		return nil, fmt.Errorf("queryEvents logs fetch error: %w", err)
	}

	// 2) Merge each LogModel with the chainID/state from headDataMap
	out := make([]LogEvent, 0, len(logModels))
	for _, lm := range logModels {
		// Did we capture head data in the first pass?
		hd := headDataMap[lm.HeadID]
		chainID, st := hd.chainID, hd.state

		if hd.isZero() {
			chainID, st, err = s.fetchHeadDataByID(lm.HeadID)
			if err != nil {
				return nil, fmt.Errorf("log references missing head %v: %w", lm.HeadID, err)
			}
		}

		ev := lm.ToLogEvent(chainID, st)
		out = append(out, ev)
	}
	return out, nil
}

// CountEvents calls the same helper, but .Count(...) to find how many logs match.
func (s *GormStore) CountEvents(f EventsFilter) (int64, error) {
	// Possibly do the HEADS pass if the user filters by chain/state
	headIDsMap, headDataMap, err := s.selectHeadsForEventsFilter(&f)
	if err != nil {
		return 0, fmt.Errorf("countEvents: heads pass error: %w", err)
	}

	db, err := s.prepareEventsQuery(f, headIDsMap)
	if err != nil {
		return 0, fmt.Errorf("queryEvents: prepare query error: %w", err)
	}

	// If the heads pass returned zero permissible heads, we can skip DB entirely
	// (optional micro-optimization). Usually the `head_id IN ?` condition
	// will yield zero rows anyway, but we can fast-exit if needed:
	if headDataMap != nil && len(headDataMap) == 0 {
		return 0, nil
	}

	var count int64
	if err := db.Count(&count).Error; err != nil {
		return 0, fmt.Errorf("countEvents logs query error: %w", err)
	}
	return count, nil
}

// prepareEventsQuery is the “hybrid” helper. It returns:
//
//  1. a gorm.DB that applies the logs filters and an optional head_id IN (?)
//  2. headDataMap: a mapping of HeadID -> (chainID, state)
//  3. error if anything failed
func (s *GormStore) prepareEventsQuery(f EventsFilter, headIDsMap map[uuid.UUID]struct{}) (*gorm.DB, error) {
	db := s.db.Model(&LogModel{})
	// If we have a set of permissible head IDs, apply head_id IN (...)
	if headIDsMap != nil {
		if len(headIDsMap) == 0 {
			// no logs possible
			// Return a DB query that yields no rows (like "WHERE 1=2")
			db = db.Where("1 = 2")
		} else {
			db = db.Where("head_id IN ?", headIDsMap)
		}
	}

	db = s.buildLogsFilter(db, f)

	return db, nil
}

// selectHeadsForEventsFilter retrieves the set of heads that match any
// chain/state fields, returning a map of (headID -> chainID/state).
// If no head-based filter is needed, returns (nil, nil, nil).
func (s *GormStore) selectHeadsForEventsFilter(f *EventsFilter) (map[uuid.UUID]struct{}, map[uuid.UUID]headData, error) {
	needHeads := f.ChainID != nil || f.State != nil
	if !needHeads {
		return nil, nil, nil
	}

	db := s.db.Model(&HeadModel{})
	if f.ChainID != nil {
		db = db.Where("chain_id = ?", f.ChainID.String())
	}
	if f.State != nil {
		db = db.Where("state = ?", *f.State)
	}

	var heads []struct {
		ID      uuid.UUID
		ChainID uint64
		State   HeadState
	}
	if err := db.Select("id, chain_id, state").Find(&heads).Error; err != nil {
		return nil, nil, err
	}

	headIDs := make(map[uuid.UUID]struct{}, len(heads))
	dataMap := make(map[uuid.UUID]headData, len(heads))
	for _, h := range heads {
		headIDs[h.ID] = struct{}{}
		dataMap[h.ID] = headData{chainID: h.ChainID, state: h.State}
	}
	return headIDs, dataMap, nil
}

// buildLogsFilter applies only the fields that exist in LogModel.
func (s *GormStore) buildLogsFilter(db *gorm.DB, f EventsFilter) *gorm.DB {
	if f.Height != nil {
		db = db.Where("block_number = ?", f.Height.String())
	}
	if f.BlockHash != nil {
		db = db.Where("block_hash = ?", f.BlockHash.String())
	}
	if f.Address != nil {
		db = db.Where("address = ?", f.Address.String())
	}
	if f.TxHash != nil {
		db = db.Where("tx_hash = ?", f.TxHash.String())
	}
	if f.TxIndex != nil {
		db = db.Where("tx_index = ?", f.TxIndex.String())
	}
	if f.LogIndex != nil {
		db = db.Where("log_index = ?", f.LogIndex.String())
	}
	if f.Topic != nil {
		// ANY works with `text[]`, while IN requires a list of columns
		db = db.Where("? = ANY(topics)", f.Topic.String())
	}
	if f.Removed != nil {
		db = db.Where("removed = ?", *f.Removed)
	}
	// ignoring f.ChainID, f.State => those are in heads
	return db
}

// fetchHeadDataByID is a fallback if we didn't do a heads pass or if the headID
// wasn't in that pass's result. Typically we only do this if no head-based fields
// were set, so we didn't have a reason to pre-fetch.
func (s *GormStore) fetchHeadDataByID(headID uuid.UUID) (uint64, HeadState, error) {
	var h HeadModel
	if err := s.db.Model(&HeadModel{}).
		Select("chain_id, state").
		Where("id = ?", headID).
		First(&h).Error; err != nil {
		return 0, HeadStateUnset, err
	}
	return h.ChainID, h.State, nil
}

type headData struct {
	chainID uint64
	state   HeadState
}

func (hd headData) isZero() bool {
	return hd.chainID == 0 && hd.state == HeadStateUnset
}
