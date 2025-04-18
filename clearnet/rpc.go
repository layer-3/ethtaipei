package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
)

// RPCMessage represents the common structure for both requests and responses
// Format: [request_id, method, params, ts]
type RPCMessage struct {
	RequestID uint64
	Method    string
	Params    []any
	Timestamp uint64
}

// UnmarshalJSON implements the json.Unmarshaler interface for RPCMessage
func (m *RPCMessage) UnmarshalJSON(data []byte) error {
	// Parse as raw JSON array first
	var rawMsg []json.RawMessage
	if err := json.Unmarshal(data, &rawMsg); err != nil {
		return err
	}

	// Validate array length
	if len(rawMsg) != 4 {
		return errors.New("invalid message format: expected 4 elements")
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

	// Parse Params ([]interface{})
	if err := json.Unmarshal(rawMsg[2], &m.Params); err != nil {
		return fmt.Errorf("invalid params: %w", err)
	}

	// Parse Timestamp (uint64)
	var timestamp uint64
	if err := json.Unmarshal(rawMsg[3], &timestamp); err != nil {
		return fmt.Errorf("invalid timestamp: %w", err)
	}
	m.Timestamp = uint64(timestamp)

	return nil
}

// MarshalJSON implements the json.Marshaler interface for RPCMessage
func (m RPCMessage) MarshalJSON() ([]byte, error) {
	// Create array representation
	return json.Marshal([]interface{}{
		m.RequestID,
		m.Method,
		m.Params,
		m.Timestamp,
	})
}

// RPCRequest represents a request in the RPC protocol
type RPCRequest struct {
	Req RPCMessage `json:"req"`
	Sig []string   `json:"sig"`
}

// RPCResponse represents a response in the RPC protocol
type RPCResponse struct {
	Res RPCMessage `json:"res"`
	Sig []string   `json:"sig"`
}

// ParseRequest parses a JSON string into a RPCRequest
func ParseRequest(data []byte) (*RPCRequest, error) {
	var req RPCRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, fmt.Errorf("failed to parse request: %w", err)
	}
	return &req, nil
}

// ParseResponse parses a JSON string into a RPCResponse
func ParseResponse(data []byte) (*RPCResponse, error) {
	var res RPCResponse
	if err := json.Unmarshal(data, &res); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	return &res, nil
}

// CreateResponse creates a response from a request with the given fields
func CreateResponse(requestID uint64, method string, responseParams []any, newTimestamp time.Time) *RPCResponse {
	return &RPCResponse{
		Res: RPCMessage{
			RequestID: requestID,
			Method:    method,
			Params:    responseParams,
			Timestamp: uint64(newTimestamp.Unix()),
		},
		Sig: []string{},
	}
}

// ValidateSignature validates the signature of a message against the provided address
// It returns true if the signature is valid, false otherwise
// It can be used for any message that follows the RPC protocol
func ValidateSignature(message []byte, signature string, address string) (bool, error) {
	// Decode the signature from hex
	sigBytes, err := hexutil.Decode(signature)
	if err != nil || len(sigBytes) != 65 {
		return false, errors.New("invalid signature format")
	}

	// Create a nitrolite.Signature from r, s, v components
	var sig nitrolite.Signature
	copy(sig.R[:], sigBytes[0:32])
	copy(sig.S[:], sigBytes[32:64])
	sig.V = sigBytes[64]

	// Convert address to Ethereum address
	ethAddress := common.HexToAddress(address)

	// Use nitrolite.Verify to validate the signature
	isValid, err := nitrolite.Verify(message, sig, ethAddress)
	if err != nil {
		log.Printf("Signature verification error: %v", err)
		return false, fmt.Errorf("signature verification error: %w", err)
	}

	return isValid, nil
}
