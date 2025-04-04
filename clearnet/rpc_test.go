package main

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

// Calculator defines methods for basic arithmetic operations
type Calculator struct {
	CurrentValue int64
}

// NewCalculator creates a new calculator with an initial value
func NewCalculator(initialValue int64) *Calculator {
	return &Calculator{
		CurrentValue: initialValue,
	}
}

// CalculatorHandler handles calculator RPC methods
type CalculatorHandler struct {
	calculator *Calculator
}

// NewCalculatorHandler creates a new calculator handler
func NewCalculatorHandler(initialValue int64) *CalculatorHandler {
	return &CalculatorHandler{
		calculator: NewCalculator(initialValue),
	}
}

// HandleRequest processes an RPC request and returns a response
func (h *CalculatorHandler) HandleRequest(req *RPCRequest, newTimestamp uint64) (*RPCResponse, error) {
	switch req.Req.Method {
	case "add":
		// Extract the parameter from the request
		if len(req.Req.Params) < 1 {
			return nil, json.Unmarshal([]byte(`{"error": "Missing parameter for add method"}`), nil)
		}

		// Convert parameter to int64
		addValue, ok := req.Req.Params[0].(float64)
		if !ok {
			return nil, json.Unmarshal([]byte(`{"error": "Invalid parameter type for add method"}`), nil)
		}

		// Add value to current value
		h.calculator.CurrentValue += int64(addValue)

		// Return current value as response
		return CreateResponse(req, []any{h.calculator.CurrentValue}, newTimestamp), nil

	case "sub":
		// Extract the parameter from the request
		if len(req.Req.Params) < 1 {
			return nil, json.Unmarshal([]byte(`{"error": "Missing parameter for sub method"}`), nil)
		}

		// Convert parameter to int64
		subValue, ok := req.Req.Params[0].(float64)
		if !ok {
			return nil, json.Unmarshal([]byte(`{"error": "Invalid parameter type for sub method"}`), nil)
		}

		// Subtract value from current value
		h.calculator.CurrentValue -= int64(subValue)

		// Return current value as response
		return CreateResponse(req, []any{h.calculator.CurrentValue}, newTimestamp), nil

	case "mul":
		// Extract the parameter from the request
		if len(req.Req.Params) < 1 {
			return nil, json.Unmarshal([]byte(`{"error": "Missing parameter for mul method"}`), nil)
		}

		// Convert parameter to int64
		mulValue, ok := req.Req.Params[0].(float64)
		if !ok {
			return nil, json.Unmarshal([]byte(`{"error": "Invalid parameter type for mul method"}`), nil)
		}

		// Multiply current value by parameter
		h.calculator.CurrentValue *= int64(mulValue)

		// Return current value as response
		return CreateResponse(req, []any{h.calculator.CurrentValue}, newTimestamp), nil

	case "subtract":
		// This is the example from the RPC.md document
		// Extract parameters from the request
		if len(req.Req.Params) < 2 {
			return nil, json.Unmarshal([]byte(`{"error": "Missing parameters for subtract method"}`), nil)
		}

		// Convert parameters to int64
		a, ok1 := req.Req.Params[0].(float64)
		b, ok2 := req.Req.Params[1].(float64)
		if !ok1 || !ok2 {
			return nil, json.Unmarshal([]byte(`{"error": "Invalid parameter types for subtract method"}`), nil)
		}

		// Calculate result
		result := int64(a) - int64(b)

		// Return result as response
		return CreateResponse(req, []any{result}, newTimestamp), nil

	default:
		return nil, json.Unmarshal([]byte(`{"error": "Method not found"}`), nil)
	}
}

func TestRPCCalculator(t *testing.T) {
	// Create a calculator handler with initial value 0
	handler := NewCalculatorHandler(0)

	// Test subtract method (example from RPC.md)
	subtractReqJSON := []byte(`{
		"req": [1001, "subtract", [42, 23], 1741344819012],
		"sig": "0xa0ad67f51cc73aee5b874ace9bc2e2053488bde06de257541e05fc58fd8c4f149cca44f1c702fcbdbde0aa09bcd24456f465e5c3002c011a3bc0f317df7777d2"
	}`)

	subtractReq, err := ParseRequest(subtractReqJSON)
	assert.NoError(t, err)

	// Expected timestamp for response
	newTimestamp := uint64(1741344819814)

	// Handle subtract request
	subtractRes, err := handler.HandleRequest(subtractReq, newTimestamp)
	assert.NoError(t, err)

	// Verify response
	assert.Equal(t, subtractReq.Req.RequestID, subtractRes.Res.RequestID)
	assert.Equal(t, subtractReq.Req.Method, subtractRes.Res.Method)
	assert.Equal(t, 1, len(subtractRes.Res.Params))
	assert.Equal(t, int64(19), subtractRes.Res.Params[0])
	assert.Equal(t, newTimestamp, subtractRes.Res.Timestamp)

	// Test the calculator state operations as shown in RPC.md example table
	// Initial state (calculator value = 0)

	// Test 1: "add" method with parameter 50
	addReqJSON := []byte(`{
		"req": [1003, "add", [50], 1741344821000],
		"sig": "signature_placeholder"
	}`)

	addReq, err := ParseRequest(addReqJSON)
	assert.NoError(t, err)

	addRes, err := handler.HandleRequest(addReq, 1741344821000)
	assert.NoError(t, err)

	// Verify response - value should be 50
	assert.Equal(t, []any{int64(50)}, addRes.Res.Params)

	// Test 2: "mul" method with parameter 2
	mulReqJSON := []byte(`{
		"req": [1004, "mul", [2], 1741344822000],
		"sig": "signature_placeholder"
	}`)

	mulReq, err := ParseRequest(mulReqJSON)
	assert.NoError(t, err)

	mulRes, err := handler.HandleRequest(mulReq, 1741344822000)
	assert.NoError(t, err)

	// Verify response - value should be 100 (50*2)
	assert.Equal(t, []any{int64(100)}, mulRes.Res.Params)

	// Test 3: "sub" method with parameter 10
	subReqJSON := []byte(`{
		"req": [1005, "sub", [10], 1741344823000],
		"sig": "signature_placeholder"
	}`)

	subReq, err := ParseRequest(subReqJSON)
	assert.NoError(t, err)

	subRes, err := handler.HandleRequest(subReq, 1741344823000)
	assert.NoError(t, err)

	// Verify response - value should be 90 (100-10)
	assert.Equal(t, []any{int64(90)}, subRes.Res.Params)

	// Verify final calculator state
	assert.Equal(t, int64(90), handler.calculator.CurrentValue)
}

func TestRPCMessageParsing(t *testing.T) {
	// Test parsing of a specific RPC message format
	jsonData := []byte(`[12345, "get_user", ["john_doe", 42], 1679941234567]`)

	var rpcMsg RPCMessage
	err := json.Unmarshal(jsonData, &rpcMsg)
	assert.NoError(t, err)

	// Verify the parsed fields
	assert.Equal(t, uint64(12345), rpcMsg.RequestID)
	assert.Equal(t, "get_user", rpcMsg.Method)
	assert.Equal(t, uint64(1679941234567), rpcMsg.Timestamp)

	// Check parameters
	assert.Equal(t, 2, len(rpcMsg.Params))
	assert.Equal(t, "john_doe", rpcMsg.Params[0])
	assert.Equal(t, float64(42), rpcMsg.Params[1])
}

func TestRPCMessageSerialization(t *testing.T) {
	// Test RPCMessage serialization and deserialization
	originalMsg := RPCMessage{
		RequestID: 1001,
		Method:    "subtract",
		Params:    []any{float64(42), float64(23)},
		Timestamp: 1741344819012,
	}

	// Marshal to JSON
	bytes, err := json.Marshal(originalMsg)
	assert.NoError(t, err)

	// Unmarshal back
	var parsedMsg RPCMessage
	err = json.Unmarshal(bytes, &parsedMsg)
	assert.NoError(t, err)

	// Verify fields match
	assert.Equal(t, originalMsg.RequestID, parsedMsg.RequestID)
	assert.Equal(t, originalMsg.Method, parsedMsg.Method)
	assert.Equal(t, originalMsg.Timestamp, parsedMsg.Timestamp)

	// For params, we need to check each element
	assert.Equal(t, len(originalMsg.Params), len(parsedMsg.Params))
	for i, param := range originalMsg.Params {
		assert.Equal(t, param, parsedMsg.Params[i])
	}
}
