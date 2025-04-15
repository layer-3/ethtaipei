package main

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// RPCMessageDB represents an RPC message in the database
type RPCMessageDB struct {
	ID         uint      `gorm:"primaryKey"`
	Ts         uint64    `gorm:"column:ts;not null"`
	ReqID      uint64    `gorm:"column:req_id;not null"`
	Method     string    `gorm:"column:method;type:varchar(255);not null"`
	Params     []byte    `gorm:"column:params;type:jsonb;not null"`
	Result     []byte    `gorm:"column:result;type:jsonb;not null"`
	ClientSig  string    `gorm:"column:client_sig;type:varchar(128)"`
	ServerSig  string    `gorm:"column:server_sig;type:varchar(128)"`
	CreatedAt  time.Time `gorm:"column:created_at;default:CURRENT_TIMESTAMP"`
}

// TableName specifies the table name for the RPCMessageDB model
func (RPCMessageDB) TableName() string {
	return "rpc_states"
}

// RPCMessageService handles RPC message storage and retrieval
type RPCMessageService struct {
	db *gorm.DB
}

// NewRPCMessageService creates a new RPCMessageService instance
func NewRPCMessageService(db *gorm.DB) *RPCMessageService {
	return &RPCMessageService{
		db: db,
	}
}

// StoreMessage stores an RPC message in the database
func (s *RPCMessageService) StoreMessage(req *RPCRequest) error {
	// Convert params and result to JSON bytes
	paramsBytes, err := json.Marshal(req.Req.Params)
	if err != nil {
		return err
	}

	// Create the message record
	msg := &RPCMessageDB{
		Ts:        req.Req.Timestamp,
		ReqID:     req.Req.RequestID,
		Method:    req.Req.Method,
		Params:    paramsBytes,
		Result:    []byte("null"), // No result yet
		ClientSig: req.Sig[0],
		ServerSig: "", // No server signature yet
	}

	// Store in database
	return s.db.Create(msg).Error
}

// GetMessages retrieves RPC messages from the database with pagination
func (s *RPCMessageService) GetMessages(limit int, offset int) (messages []RPCMessageDB, total int64, err error) {
	// Get total count
	if err := s.db.Model(&RPCMessageDB{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated messages
	err = s.db.Order("ts DESC").Offset(offset).Limit(limit).Find(&messages).Error
	return messages, total, err
}

// GetMessageByID retrieves a specific RPC message by its request ID
func (s *RPCMessageService) GetMessageByID(reqID uint64) (*RPCMessageDB, error) {
	var message RPCMessageDB
	err := s.db.Where("req_id = ?", reqID).First(&message).Error
	if err != nil {
		return nil, err
	}
	return &message, nil
}

// StoreResponseMessage stores an RPC response message in the database
func (s *RPCMessageService) StoreResponseMessage(req *RPCRequest, res *RPCResponse) error {
	// Convert params and result to JSON bytes
	paramsBytes, err := json.Marshal(req.Req.Params)
	if err != nil {
		return err
	}

	resultBytes, err := json.Marshal(res.Res.Params)
	if err != nil {
		return err
	}

	// Create the message record
	msg := &RPCMessageDB{
		Ts:        req.Req.Timestamp,
		ReqID:     req.Req.RequestID,
		Method:    req.Req.Method,
		Params:    paramsBytes,
		Result:    resultBytes,
		ClientSig: req.Sig[0],
		ServerSig: res.Sig[0],
	}

	// Store in database
	return s.db.Create(msg).Error
}
