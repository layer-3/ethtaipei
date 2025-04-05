package main

import (
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// MockWebsocketConn implements a subset of the websocket.Conn interface for testing
type MockWebsocketConn struct {
	lastWrittenMessage []byte
	messageToRead      []byte
	t                  *testing.T
}

func NewMockWebsocketConn(t *testing.T) *MockWebsocketConn {
	return &MockWebsocketConn{
		t: t,
	}
}

// To satisfy websocket.Conn interface
func (m *MockWebsocketConn) WriteMessage(messageType int, data []byte) error {
	m.lastWrittenMessage = data
	return nil
}

func (m *MockWebsocketConn) ReadMessage() (messageType int, p []byte, err error) {
	return websocket.TextMessage, m.messageToRead, nil
}

func (m *MockWebsocketConn) Close() error {
	return nil
}

// Additional methods to complete the websocket.Conn interface
func (m *MockWebsocketConn) WriteControl(messageType int, data []byte, deadline time.Time) error {
	return nil
}

func (m *MockWebsocketConn) WriteJSON(v interface{}) error {
	return nil
}

func (m *MockWebsocketConn) ReadJSON(v interface{}) error {
	return nil
}

func (m *MockWebsocketConn) SetWriteDeadline(t time.Time) error {
	return nil
}

func (m *MockWebsocketConn) SetReadDeadline(t time.Time) error {
	return nil
}

func (m *MockWebsocketConn) SetPongHandler(h func(string) error) {
	// no-op
}

func (m *MockWebsocketConn) NextWriter(messageType int) (io.WriteCloser, error) {
	return nil, nil
}

func (m *MockWebsocketConn) NextReader() (messageType int, r io.Reader, err error) {
	return 0, nil, nil
}

// setupTestDB creates an in-memory database for testing
func setupTestDB(t *testing.T) *gorm.DB {
	// Use a unique database name for each test to avoid sharing data between tests
	dbName := fmt.Sprintf("file::memory:test%d?mode=memory&cache=shared", time.Now().UnixNano())
	db, err := gorm.Open(sqlite.Open(dbName), &gorm.Config{})
	require.NoError(t, err)

	// Auto migrate all required models
	err = db.AutoMigrate(&Entry{}, &DBChannel{}, &DBVirtualChannel{})
	require.NoError(t, err)

	return db
}

// TestHandleSendMessage tests the message forwarding functionality
func TestHandleSendMessage(t *testing.T) {
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
		TokenAddress: "0xToken",
		Status:       "open",
		Version:      1,
		ExpiresAt:    time.Now().Add(24 * time.Hour),
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

// TestHandlePing tests the ping handler functionality
func TestHandlePing(t *testing.T) {
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

// TestHandleCloseChannel tests the close channel handler functionality
func TestHandleCloseChannel(t *testing.T) {
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
		TokenAddress: tokenAddress,
		Status:       "open",
		Version:      0,
		ExpiresAt:    time.Now().Add(24 * time.Hour),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	require.NoError(t, db.Create(virtualChannel).Error)

	// Add funds to the virtual channel
	accountA := ledger.Account(virtualChannelID, participantA, tokenAddress)
	require.NoError(t, accountA.Record(200))

	accountB := ledger.Account(virtualChannelID, participantB, tokenAddress)
	require.NoError(t, accountB.Record(300))

	// Create allocation parameters for closing
	allocations := []FinalAllocation{
		{
			Participant: participantA,
			Amount:      big.NewInt(250), // Participant A gets more than initial deposit
		},
		{
			Participant: participantB,
			Amount:      big.NewInt(250), // Participant B gets less than initial deposit
		},
	}

	closeParams := CloseChannelParams{
		ChannelID:   virtualChannelID,
		Allocations: allocations,
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
	assert.Equal(t, "closed", updatedChannel.Status)
	assert.Equal(t, uint64(1), updatedChannel.Version)

	// Check that funds were transferred back to direct channels according to allocations
	directAccountA := ledger.Account(channelA.ChannelID, participantA, tokenAddress)
	balanceA, err := directAccountA.Balance()
	require.NoError(t, err)
	assert.Equal(t, int64(250), balanceA)

	directAccountB := ledger.Account(channelB.ChannelID, participantB, tokenAddress)
	balanceB, err := directAccountB.Balance()
	require.NoError(t, err)
	assert.Equal(t, int64(250), balanceB)

	// Check that virtual channel accounts are empty
	virtualAccountA := ledger.Account(virtualChannelID, participantA, tokenAddress)
	virtualBalanceA, err := virtualAccountA.Balance()
	require.NoError(t, err)
	assert.Equal(t, int64(0), virtualBalanceA)

	virtualAccountB := ledger.Account(virtualChannelID, participantB, tokenAddress)
	virtualBalanceB, err := virtualAccountB.Balance()
	require.NoError(t, err)
	assert.Equal(t, int64(0), virtualBalanceB)
}

// TestHandleHandleListOpenParticipants tests the list available channels handler functionality
func TestHandleHandleListOpenParticipants(t *testing.T) {
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
			account := ledger.Account(p.channelID, p.address, tokenAddress)
			err = account.Record(p.initialBalance)
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

// MockRouter implements the RouterInterface for testing
type MockRouter struct {
	routes map[string]map[string]string
}

func (r *MockRouter) AddRoute(from, to, channelID string) error {
	if r.routes == nil {
		r.routes = make(map[string]map[string]string)
	}

	if _, exists := r.routes[from]; !exists {
		r.routes[from] = make(map[string]string)
	}

	r.routes[from][to] = channelID
	return nil
}

func (r *MockRouter) GetRoute(from, to string) (string, bool) {
	if r.routes == nil {
		return "", false
	}

	if routes, exists := r.routes[from]; exists {
		if channelID, routeExists := routes[to]; routeExists {
			return channelID, true
		}
	}

	return "", false
}

func (r *MockRouter) ForwardMessage(from, to string, message []byte, channelID ...string) error {
	// No-op for testing
	return nil
}
