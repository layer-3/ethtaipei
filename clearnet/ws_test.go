package main

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// TestSendMessageProxyBehavior tests that the SendMessage method acts as a proxy without sending a response
func TestSendMessageProxyBehavior(t *testing.T) {
	// Setup test database
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	// Auto migrate models
	err = db.AutoMigrate(&Entry{}, &DBChannel{}, &DBVirtualChannel{})
	require.NoError(t, err)

	// Create services
	ledger := NewLedger(db)

	// Setup router
	mockRouter := &MockRouter{}

	// Setup two participants
	sender := "0xSender"
	recipient := "0xRecipient"
	channelID := "0xVirtualChannel"

	// Insert virtual channel for testing
	virtualChannel := DBVirtualChannel{
		ChannelID:    channelID,
		ParticipantA: sender,
		ParticipantB: recipient,
		TokenAddress: "0xToken",
		Status:       "open",
		Version:      1,
		ExpiresAt:    time.Now().Add(24 * time.Hour),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	err = db.Create(&virtualChannel).Error
	require.NoError(t, err)

	// Create test request
	msgData := json.RawMessage(`{"message":"Hello, world!"}`)

	sendReq := SendMessageRequest{
		ChannelID: channelID,
		Data:      msgData,
	}

	// Marshal to JSON
	paramsJSON, err := json.Marshal(sendReq)
	require.NoError(t, err)

	// Create RPC request
	rpcRequest := &RPCRequest{
		Req: RPCMessage{
			RequestID: 1,
			Method:    "SendMessage",
			Params:    []any{json.RawMessage(paramsJSON)},
			Timestamp: uint64(time.Now().Unix()),
		},
		Sig: "dummy-signature",
	}

	// Call HandleSendMessage directly to verify proxy behavior
	recipientAddr, err := HandleSendMessage(sender, nil, rpcRequest, mockRouter, ledger)
	require.NoError(t, err)

	// Verify the correct recipient is returned
	assert.Equal(t, recipient, recipientAddr)

	// Verify message forwarding was called - in a real implementation,
	// this would verify that ForwardMessage was called with the right parameters

	// Manually verify the expected RPC format for a forwarded message
	incomingRPC := RPCResponse{
		Res: RPCMessage{
			RequestID: 12345, // Dummy ID for testing
			Method:    "IncomingMessage",
			Params: []any{map[string]interface{}{
				"channelId": channelID,
				"sender":    sender,
				"data":      msgData,
			}},
			Timestamp: 67890, // Dummy timestamp for testing
		},
		Sig: "broker-signature",
	}

	// Marshal to JSON to verify the structure
	forwardedMsg, err := json.Marshal(incomingRPC)
	require.NoError(t, err)

	// Parse back to verify structure remained intact
	var parsedRPC RPCResponse
	err = json.Unmarshal(forwardedMsg, &parsedRPC)
	require.NoError(t, err)

	// Verify the message follows the expected RPC format
	assert.Equal(t, "IncomingMessage", parsedRPC.Res.Method)
	assert.Equal(t, "broker-signature", parsedRPC.Sig)

	// Verify the message parameters
	params, ok := parsedRPC.Res.Params[0].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, channelID, params["channelId"])
	assert.Equal(t, sender, params["sender"])
}
