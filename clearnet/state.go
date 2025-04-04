package main

import (
	"database/sql/driver"
	"encoding/json"
	"errors"

	"gorm.io/gorm"
)

// RPCState represents the RPC request/response state stored in the database
type RPCState struct {
	ID        uint   `gorm:"primaryKey"`
	Timestamp uint64 `gorm:"column:ts;not null"`
	ReqID     uint64 `gorm:"column:req_id;not null;uniqueIndex"`
	Method    string `gorm:"column:method;type:varchar(255);not null"`
	Params    JSON   `gorm:"column:params;type:json;not null"`
	ClientSig string `gorm:"column:client_sig;type:varchar(128)"`
	ServerSig string `gorm:"column:server_sig;type:varchar(128)"`
}

// TableName specifies the table name for the RPCState model
func (RPCState) TableName() string {
	return "rpc_states"
}

// JSON is a custom type for handling JSON data
type JSON json.RawMessage

// Scan implements the sql.Scanner interface
func (j *JSON) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to unmarshal JSON value")
	}

	result := json.RawMessage{}
	err := json.Unmarshal(bytes, &result)
	*j = JSON(result)
	return err
}

// Value implements the driver.Valuer interface
func (j JSON) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return json.RawMessage(j).MarshalJSON()
}

// RPCService handles RPC state operations
type RPCService struct {
	db *gorm.DB
}

// NewRPCService creates a new RPCStateService instance
func NewRPCService(db *gorm.DB) *RPCService {
	return &RPCService{
		db: db,
	}
}

// StoreRequest stores a new RPC request
func (s *RPCService) StoreRequest(req *RPCRequest) (*RPCState, error) {
	// Convert params to JSON
	paramsJSON, err := json.Marshal(req.Req.Params)
	if err != nil {
		return nil, err
	}

	rpcState := &RPCState{
		ReqID:     req.Req.RequestID,
		Method:    req.Req.Method,
		Params:    JSON(paramsJSON),
		Timestamp: req.Req.Timestamp,
		ClientSig: req.Sig,
	}

	err = s.db.Create(rpcState).Error
	if err != nil {
		return nil, err
	}

	return rpcState, nil
}

// UpdateResponse updates an existing RPC state with response data
func (s *RPCService) UpdateResponse(res *RPCResponse) (*RPCState, error) {
	// Convert params to JSON
	paramsJSON, err := json.Marshal(res.Res.Params)
	if err != nil {
		return nil, err
	}

	var rpcState RPCState
	// Find the existing request by reqID
	if err := s.db.Where("req_id = ?", res.Res.RequestID).First(&rpcState).Error; err != nil {
		return nil, err
	}

	// Update with response data
	rpcState.Params = JSON(paramsJSON)
	rpcState.ServerSig = res.Sig

	if err := s.db.Save(&rpcState).Error; err != nil {
		return nil, err
	}

	return &rpcState, nil
}

// GetByReqID retrieves an RPC state by its request ID
func (s *RPCService) GetByReqID(reqID uint64) (*RPCState, error) {
	var rpcState RPCState

	if err := s.db.Where("req_id = ?", reqID).First(&rpcState).Error; err != nil {
		return nil, err
	}

	return &rpcState, nil
}

// ListAll returns all RPC states
func (s *RPCService) ListAll(limit, offset int) ([]RPCState, error) {
	var states []RPCState

	err := s.db.Limit(limit).Offset(offset).Order("ts desc").Find(&states).Error
	if err != nil {
		return nil, err
	}

	return states, nil
}
