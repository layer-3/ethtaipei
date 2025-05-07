package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"time"
)

// RPCData represents the common structure for both requests and responses
// Format: [request_id, method, params, ts, intent(optional), app_id(optional)]
type RPCData struct {
	RequestID uint64
	Method    string
	Params    []any
	Timestamp uint64
	Intent    []int64
	AppID     string // If specified, message is sent into the virtual app with this ID.
}

// UnmarshalJSON implements the json.Unmarshaler interface for RPCMessage
func (m *RPCData) UnmarshalJSON(data []byte) error {
	// Parse as raw JSON array first
	var rawMsg []json.RawMessage
	if err := json.Unmarshal(data, &rawMsg); err != nil {
		return err
	}

	// Validate array length (4, 5, or 6 elements)
	if len(rawMsg) < 4 || len(rawMsg) > 6 {
		return errors.New("invalid message format: expected 4, 5, or 6 elements")
	}

	// Parse RequestID (uint64)
	var requestID uint64
	if err := json.Unmarshal(rawMsg[0], &requestID); err != nil {
		return fmt.Errorf("invalid request_id: %w", err)
	}
	m.RequestID = uint64(requestID)

	// Parse Method (string)
	if err := json.Unmarshal(rawMsg[1], &m.Method); err != nil {
		return fmt.Errorf("invalid method: %w", err)
	}

	// Parse Params ([]any)
	if err := json.Unmarshal(rawMsg[2], &m.Params); err != nil {
		return fmt.Errorf("invalid params: %w", err)
	}

	// Parse Timestamp (uint64)
	var timestamp uint64
	if err := json.Unmarshal(rawMsg[3], &timestamp); err != nil {
		return fmt.Errorf("invalid timestamp: %w", err)
	}
	m.Timestamp = uint64(timestamp)

	// Parse Intent if present ([]int64)
	if len(rawMsg) >= 5 {
		var intent []int64
		if err := json.Unmarshal(rawMsg[4], &intent); err != nil {
			return fmt.Errorf("invalid intent: %w", err)
		}
		m.Intent = intent
	}

	// Parse AccountID if present (string)
	if len(rawMsg) == 6 {
		if err := json.Unmarshal(rawMsg[5], &m.AppID); err != nil {
			return fmt.Errorf("invalid channel_id: %w", err)
		}
	}

	return nil
}

// MarshalJSON implements the json.Marshaler interface for RPCMessage
func (m RPCData) MarshalJSON() ([]byte, error) {
	// Create array representation based on what fields are present
	if len(m.Intent) > 0 && m.AppID != "" {
		return json.Marshal([]any{
			m.RequestID,
			m.Method,
			m.Params,
			m.Timestamp,
			m.Intent,
			m.AppID,
		})
	} else if len(m.Intent) > 0 {
		return json.Marshal([]any{
			m.RequestID,
			m.Method,
			m.Params,
			m.Timestamp,
			m.Intent,
		})
	} else if m.AppID != "" {
		return json.Marshal([]any{
			m.RequestID,
			m.Method,
			m.Params,
			m.Timestamp,
			[]int64{},
			m.AppID,
		})
	}
	return json.Marshal([]any{
		m.RequestID,
		m.Method,
		m.Params,
		m.Timestamp,
	})
}

// RPCMessage represents a complete message in the RPC protocol, including request data and signatures
type RPCMessage struct {
	Req RPCData  `json:"req"`
	Sig []string `json:"sig"`
}

// Allocation represents a token allocation for a specific participant
type Allocation struct {
	Participant  string   `json:"destination"`
	TokenAddress string   `json:"token"`
	Amount       *big.Int `json:"amount,string"`
}

// RPCResponse represents a response in the RPC protocol
type RPCResponse struct {
	Res RPCData  `json:"res"`
	Sig []string `json:"sig"`
}

// ParseRPCMessage parses a JSON string into a RPCRequest
func ParseRPCMessage(data []byte) (*RPCMessage, error) {
	var req RPCMessage
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, fmt.Errorf("failed to parse request: %w", err)
	}
	return &req, nil
}

// CreateResponse creates a response from a request with the given fields
func CreateResponse(requestID uint64, method string, responseParams []any, newTimestamp time.Time) *RPCResponse {
	return &RPCResponse{
		Res: RPCData{
			RequestID: requestID,
			Method:    method,
			Params:    responseParams,
			Timestamp: uint64(newTimestamp.Unix()),
		},
		Sig: []string{},
	}
}
