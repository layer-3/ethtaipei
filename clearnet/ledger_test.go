package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	container "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
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

func (m *MockWebsocketConn) WriteJSON(v any) error {
	return nil
}

func (m *MockWebsocketConn) ReadJSON(v any) error {
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

// setupTestSqlite creates an in-memory SQLite DB for testing
func setupTestSqlite(t testing.TB) *gorm.DB {
	t.Helper()

	// Generate a unique DSN for the in-memory DB to avoid sharing data between tests
	uniqueDSN := fmt.Sprintf("file::memory:test%s?mode=memory&cache=shared", uuid.NewString())

	db, err := gorm.Open(sqlite.Open(uniqueDSN), &gorm.Config{})
	require.NoError(t, err)

	// Auto migrate all required models
	err = db.AutoMigrate(&Entry{}, &DBChannel{}, &DBVirtualChannel{})
	require.NoError(t, err)

	return db
}

// setupTestPostgres creates a PostgreSQL database using testcontainers
func setupTestPostgres(ctx context.Context, t testing.TB) (*gorm.DB, testcontainers.Container) {
	t.Helper()

	const dbName = "postgres"
	const dbUser = "postgres"
	const dbPassword = "postgres"

	// Start the PostgreSQL container
	postgresContainer, err := container.Run(ctx,
		"postgres:16-alpine",
		container.WithDatabase(dbName),
		container.WithUsername(dbUser),
		container.WithPassword(dbPassword),
		testcontainers.WithEnv(map[string]string{
			"POSTGRES_HOST_AUTH_METHOD": "trust",
		}),
		testcontainers.WithWaitStrategy(
			wait.ForAll(
				wait.ForLog("database system is ready to accept connections"),
				wait.ForListeningPort("5432/tcp"),
			)))
	require.NoError(t, err)
	log.Println("Started container:", postgresContainer.GetContainerID())

	// Get connection string
	url, err := postgresContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)
	log.Println("PostgreSQL URL:", url)

	// Connect to database
	db, err := gorm.Open(postgres.Open(url), &gorm.Config{})
	require.NoError(t, err)

	// Auto migrate all required models
	err = db.AutoMigrate(&Entry{}, &DBChannel{}, &DBVirtualChannel{})
	require.NoError(t, err)

	return db, postgresContainer
}

// setupTestDB creates a test database based on the TEST_DB_DRIVER environment variable
func setupTestDB(t testing.TB) (*gorm.DB, func()) {
	t.Helper()

	// Create a context with the test timeout
	ctx := context.Background()

	var db *gorm.DB
	var cleanup func()

	switch os.Getenv("TEST_DB_DRIVER") {
	case "postgres":
		log.Println("Using PostgreSQL for testing")
		var container testcontainers.Container
		db, container = setupTestPostgres(ctx, t)
		cleanup = func() {
			if container != nil {
				if err := container.Terminate(ctx); err != nil {
					log.Printf("Failed to terminate PostgreSQL container: %v", err)
				}
			}
		}
	default:
		log.Println("Using SQLite for testing (default)")
		db = setupTestSqlite(t)
		cleanup = func() {} // No cleanup needed for SQLite in-memory database
	}

	return db, cleanup
}

// TestHandlePing tests the ping handler functionality
func TestHandlePing(t *testing.T) {
	// Test case 1: Simple ping with no parameters
	rpcRequest1 := &RPCMessage{
		Req: RPCData{
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
	// Set up test database with cleanup
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Create ledger
	ledger := NewLedger(db)

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
		Status:       ChannelStatusOpen,
		Nonce:        1,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	require.NoError(t, db.Create(channelA).Error)

	channelB := &DBChannel{
		ChannelID:    "0xDirectChannelB",
		ParticipantA: participantB,
		ParticipantB: BrokerAddress,
		Status:       ChannelStatusOpen,
		Nonce:        1,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	require.NoError(t, db.Create(channelB).Error)

	// Create a virtual channel
	virtualChannelID := "0xVirtualChannel123"
	virtualChannel := &DBVirtualChannel{
		ChannelID:    virtualChannelID,
		Participants: []string{participantA, participantB},
		Status:       ChannelStatusOpen,
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

	req := &RPCMessage{
		Req: RPCData{
			RequestID: 1,
			Method:    "CloseChannel",
			Params:    []any{json.RawMessage(paramsJSON)},
			Timestamp: uint64(time.Now().Unix()),
		},
		// Sig: []string{"dummy-signature"},
	}

	// Call the handler
	resp, err := HandleCloseVirtualChannel(req, ledger)
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

// TestHandleHandleListOpenParticipants tests the list available channels handler functionality
func TestHandleHandleListOpenParticipants(t *testing.T) {
	// Set up test database with cleanup
	db, cleanup := setupTestDB(t)
	defer cleanup()

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

	rpcRequest := &RPCMessage{
		Req: RPCData{
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
	var responseParams []any
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
	rpcRequest2 := &RPCMessage{
		Req: RPCData{
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
