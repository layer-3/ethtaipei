package main

import (
	"encoding/json"
	"math/big"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestHandleSendMessage tests the message forwarding functionality in handlers.go
func TestHandleMessageSending(t *testing.T) {
	// Set up test database
	db := setupTestDB(t)

	// Create a mock router
	mockRouter := &MockRouter{}

	// Create a ledger
	ledger := NewLedger(db)

	// Create virtual channel and participants
	channelID := "0xVirtualChannel"
	sender := "0xSender"
	recipient := "0xRecipient"

	// Insert virtual channel into database for the test
	virtualChannel := DBVirtualChannel{
		ChannelID:    channelID,
		ParticipantA: sender,
		ParticipantB: recipient,
		Status:       "open",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	err := db.Create(&virtualChannel).Error
	require.NoError(t, err)

	// Create message parameters with new SendMessageRequest format
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
		Sig: []string{"dummy-signature"},
	}

	// Call HandleSendMessage with proper parameters
	recipientAddr, err := HandleSendMessage(sender, nil, rpcRequest, mockRouter, ledger)
	require.NoError(t, err)

	// Verify the response - recipientAddr should match the recipient
	assert.Equal(t, recipient, recipientAddr)
}

// TestHandlePingFunction tests the ping handler functionality in handlers.go
func TestHandlePingFunction(t *testing.T) {
	// Test case 1: Simple ping with no parameters
	rpcRequest1 := &RPCRequest{
		Req: RPCMessage{
			RequestID: 1,
			Method:    "Ping",
			Params:    []any{nil},
			Timestamp: uint64(time.Now().Unix()),
		},
		Sig: []string{"dummy-signature"},
	}

	response1, err := HandlePing(rpcRequest1)
	require.NoError(t, err)
	assert.NotNil(t, response1)

	require.Equal(t, "pong", response1.Res.Method)
}

// TestHandleVirtualChannelClosing tests the close channel handler functionality
func TestHandleVirtualChannelClosing(t *testing.T) {
	// Set up test database
	db := setupTestDB(t)

	// Create ledger
	ledger := NewLedger(db)

	// Create mock router
	mockRouter := &MockRouter{}

	// Create token address
	tokenAddress := "0xToken123"

	// Set up participants
	participantA := "0xParticipantA"
	participantB := "0xParticipantB"

	// Create direct channels for both participants
	channelA := &DBChannel{
		ChannelID:    "0xDirectChannelA",
		ParticipantA: participantA,
		ParticipantB: BrokerAddress,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	require.NoError(t, db.Create(channelA).Error)

	channelB := &DBChannel{
		ChannelID:    "0xDirectChannelB",
		ParticipantA: participantB,
		ParticipantB: BrokerAddress,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	require.NoError(t, db.Create(channelB).Error)

	// Create a virtual channel
	virtualChannelID := "0xVirtualChannel123"
	virtualChannel := &DBVirtualChannel{
		ChannelID:    virtualChannelID,
		ParticipantA: participantA,
		ParticipantB: participantB,
		Status:       "open",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	require.NoError(t, db.Create(virtualChannel).Error)

	// Add funds to the virtual channel
	accountA := ledger.Account(virtualChannelID, participantA)
	require.NoError(t, accountA.Record(tokenAddress, 200))

	accountB := ledger.Account(virtualChannelID, participantB)
	require.NoError(t, accountB.Record(tokenAddress, 300))

	// Create allocation parameters for closing
	allocations := []Allocation{
		{
			Participant:  participantA,
			Amount:       big.NewInt(250), // Participant A gets more than initial deposit
			TokenAddress: tokenAddress,
		},
		{
			Participant:  participantB,
			Amount:       big.NewInt(250), // Participant B gets less than initial deposit
			TokenAddress: tokenAddress,
		},
	}

	closeParams := CloseVirtualChannelParams{
		ChannelID:        virtualChannelID,
		FinalAllocations: allocations,
	}

	// Create RPC request
	paramsJSON, err := json.Marshal(closeParams)
	require.NoError(t, err)

	req := &RPCRequest{
		Req: RPCMessage{
			RequestID: 1,
			Method:    "CloseChannel",
			Params:    []any{json.RawMessage(paramsJSON)},
			Timestamp: uint64(time.Now().Unix()),
		},
		Sig: []string{"dummy-signature"},
	}

	// Call the handler
	resp, err := HandleCloseVirtualChannel(req, ledger, mockRouter)
	require.NoError(t, err)

	// Verify response
	assert.Equal(t, "CloseChannel", resp.Res.Method)
	assert.Equal(t, uint64(1), resp.Res.RequestID)

	// Check that channel is marked as closed
	var updatedChannel DBVirtualChannel
	require.NoError(t, db.Where("channel_id = ?", virtualChannelID).First(&updatedChannel).Error)
	assert.Equal(t, ChannelStatusClosed, updatedChannel.Status)

	// Check that funds were transferred back to direct channels according to allocations
	directAccountA := ledger.Account(channelA.ChannelID, participantA)
	balanceA, err := directAccountA.Balance(tokenAddress)
	require.NoError(t, err)
	assert.Equal(t, int64(250), balanceA)

	directAccountB := ledger.Account(channelB.ChannelID, participantB)
	balanceB, err := directAccountB.Balance(tokenAddress)
	require.NoError(t, err)
	assert.Equal(t, int64(250), balanceB)

	// Check that virtual channel accounts are empty
	virtualAccountA := ledger.Account(virtualChannelID, participantA)
	virtualBalanceA, err := virtualAccountA.Balance(tokenAddress)
	require.NoError(t, err)
	assert.Equal(t, int64(0), virtualBalanceA)

	virtualAccountB := ledger.Account(virtualChannelID, participantB)
	virtualBalanceB, err := virtualAccountB.Balance(tokenAddress)
	require.NoError(t, err)
	assert.Equal(t, int64(0), virtualBalanceB)
}

// TestHandleListOpenParticipantsFunction tests the list available channels handler functionality
func TestHandleListOpenParticipantsFunction(t *testing.T) {
	// Set up test database
	db := setupTestDB(t)

	// Create channel service and ledger
	channelService := NewChannelService(db)
	ledger := NewLedger(db)

	// Create a token address
	tokenAddress := "0xToken123"

	// Create test direct channels with the broker
	participants := []struct {
		address        string
		channelID      string
		initialBalance int64
	}{
		{"0xParticipant1", "0xChannel1", 1000},
		{"0xParticipant2", "0xChannel2", 2000},
		{"0xParticipant3", "0xChannel3", 0}, // Zero balance, should not be included
		{"0xParticipant4", "0xChannel4", 3000},
	}

	// Insert channels and ledger entries for testing
	for _, p := range participants {
		// Create channel
		channel := DBChannel{
			ChannelID:    p.channelID,
			ParticipantA: p.address,
			ParticipantB: BrokerAddress,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}
		err := db.Create(&channel).Error
		require.NoError(t, err)

		// Add funds if needed
		if p.initialBalance > 0 {
			account := ledger.Account(p.channelID, p.address)
			err = account.Record(tokenAddress, p.initialBalance)
			require.NoError(t, err)
		}
	}

	// Create RPC request with token address parameter
	params := map[string]string{
		"token_address": tokenAddress,
	}
	paramsJSON, err := json.Marshal(params)
	require.NoError(t, err)

	rpcRequest := &RPCRequest{
		Req: RPCMessage{
			RequestID: 1,
			Method:    "ListOpenParticipants",
			Params:    []any{json.RawMessage(paramsJSON)},
			Timestamp: uint64(time.Now().Unix()),
		},
		Sig: []string{"dummy-signature"},
	}

	// Call the handler
	response, err := HandleListOpenParticipants(rpcRequest, channelService, ledger)
	require.NoError(t, err)
	assert.NotNil(t, response)

	// Extract the response data
	var responseParams []interface{}
	responseParams = response.Res.Params
	require.NotEmpty(t, responseParams)

	// First parameter should be an array of ChannelAvailabilityResponse
	channelsArray, ok := responseParams[0].([]ChannelAvailabilityResponse)
	require.True(t, ok, "Response should contain an array of ChannelAvailabilityResponse")

	// We should have 3 channels with positive balances
	assert.Equal(t, 3, len(channelsArray), "Should have 3 channels with positive balances")

	// Check the contents of each channel response
	expectedAddresses := map[string]int64{
		"0xParticipant1": 1000,
		"0xParticipant2": 2000,
		"0xParticipant4": 3000,
	}

	for _, ch := range channelsArray {
		expectedBalance, exists := expectedAddresses[ch.Address]
		assert.True(t, exists, "Unexpected address in response: %s", ch.Address)
		assert.Equal(t, expectedBalance, ch.Amount, "Incorrect balance for address %s", ch.Address)

		// Remove from map to ensure each address appears only once
		delete(expectedAddresses, ch.Address)
	}

	assert.Empty(t, expectedAddresses, "Not all expected addresses were found in the response")

	// Test with no token address parameter
	rpcRequest2 := &RPCRequest{
		Req: RPCMessage{
			RequestID: 2,
			Method:    "ListOpenParticipants",
			Params:    []any{},
			Timestamp: uint64(time.Now().Unix()),
		},
		Sig: []string{"dummy-signature"},
	}

	// Call the handler
	response2, err := HandleListOpenParticipants(rpcRequest2, channelService, ledger)
	require.NoError(t, err)
	assert.NotNil(t, response2)
}
