package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"time"

	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
)

// RPCData represents the common structure for both requests and responses
// Format: [request_id, method, params, ts]
type RPCData struct {
	RequestID uint64
	Method    string
	Params    []any
	Timestamp uint64
}

// UnmarshalJSON implements the json.Unmarshaler interface for RPCMessage
func (m *RPCData) UnmarshalJSON(data []byte) error {
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

	return nil
}

// MarshalJSON implements the json.Marshaler interface for RPCMessage
func (m RPCData) MarshalJSON() ([]byte, error) {
	// Create array representation
	return json.Marshal([]any{
		m.RequestID,
		m.Method,
		m.Params,
		m.Timestamp,
	})
}

// RPCMessage represents a complete message in the RPC protocol, including request data and signatures
type RPCMessage struct {
	Req        RPCData      `json:"req"`
	ChannelID  string       `json:"cid,omitempty"` // If cid is specified, message is sent to the virtual channel.
	Allocation []Allocation `json:"out,omitempty"`
	Sig        []string     `json:"sig"`
}

// Allocation represents a token allocation for a specific participant
type Allocation struct {
	Participant  string   `json:"destination"`
	TokenAddress string   `json:"token"`
	Amount       *big.Int `json:"amount,string"`
}

// RPCResponse represents a response in the RPC protocol
type RPCResponse struct {
	Res        RPCData      `json:"res"`
	ChannelID  string       `json:"cid,omitempty"` // If cid is specified, message is sent to the virtual channel.
	Allocation []Allocation `json:"out,omitempty"`
	Sig        []string     `json:"sig"`
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

	ethAddress := common.HexToAddress(address)

	// Use nitrolite.Verify to validate the signature
	isValid, err := nitrolite.Verify(message, sig, ethAddress)
	if err != nil {
		log.Printf("Signature verification error: %v", err)
		return false, fmt.Errorf("signature verification error: %w", err)
	}

	return isValid, nil
}
