package main

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates an in-memory database for testing
func setupLedgerTestDB(t *testing.T) *gorm.DB {
	// Use a unique database name for each test to avoid sharing data between tests
	dbName := fmt.Sprintf("file::memory:test%d?mode=memory&cache=shared", time.Now().UnixNano())
	db, err := gorm.Open(sqlite.Open(dbName), &gorm.Config{})
	require.NoError(t, err)

	// Auto migrate all required models
	err = db.AutoMigrate(&Entry{}, &DBChannel{}, &VirtualChannel{})
	require.NoError(t, err)

	return db
}

// TestLedgerAccountBalance tests the basic account balance functionality
func TestLedgerAccountBalance(t *testing.T) {
	// Set up test database
	db := setupLedgerTestDB(t)

	// Create a ledger
	ledger := NewLedger(db)

	// Create a test account
	account := ledger.Account("channel1", "0xUser1", "0xToken1")

	// Test initial balance - should be zero
	balance, err := account.Balance()
	require.NoError(t, err)
	assert.Equal(t, int64(0), balance)

	// Record a credit
	err = account.Record(100)
	require.NoError(t, err)

	// Check balance after credit
	balance, err = account.Balance()
	require.NoError(t, err)
	assert.Equal(t, int64(100), balance)

	// Record a debit
	err = account.Record(-50)
	require.NoError(t, err)

	// Check balance after debit
	balance, err = account.Balance()
	require.NoError(t, err)
	assert.Equal(t, int64(50), balance)
}

// TestLedgerTransfer tests the transfer function between accounts
func TestLedgerTransfer(t *testing.T) {
	// Set up test database
	db := setupLedgerTestDB(t)

	// Create a ledger
	ledger := NewLedger(db)

	// Create test accounts
	accountA := ledger.Account("channel1", "0xUser1", "0xToken1")
	accountB := ledger.Account("channel1", "0xUser2", "0xToken1")

	// Initialize accountA with some funds
	err := accountA.Record(200)
	require.NoError(t, err)

	// Transfer funds from accountA to accountB
	err = accountA.Transfer(accountB, 75)
	require.NoError(t, err)

	// Check balances after transfer
	balanceA, err := accountA.Balance()
	require.NoError(t, err)
	t.Logf("Balance A: %d", balanceA) // Debug log

	// Inspect ledger entries for accountA
	var entriesA []Entry
	err = db.Where("channel_id = ? AND participant = ? AND token_address = ?",
		"channel1", "0xUser1", "0xToken1").Find(&entriesA).Error
	require.NoError(t, err)
	for _, entry := range entriesA {
		t.Logf("Account A entry: Credit=%d, Debit=%d", entry.Credit, entry.Debit)
	}

	balanceB, err := accountB.Balance()
	require.NoError(t, err)
	t.Logf("Balance B: %d", balanceB) // Debug log

	// Inspect ledger entries for accountB
	var entriesB []Entry
	err = db.Where("channel_id = ? AND participant = ? AND token_address = ?",
		"channel1", "0xUser2", "0xToken1").Find(&entriesB).Error
	require.NoError(t, err)
	for _, entry := range entriesB {
		t.Logf("Account B entry: Credit=%d, Debit=%d", entry.Credit, entry.Debit)
	}

	// The actual balance is 125 for A (200 initial - 75 transferred)
	// and 75 for B (0 initial + 75 credit)
	assert.Equal(t, int64(125), balanceA)
	assert.Equal(t, int64(75), balanceB)

	// Test transfer with insufficient funds
	err = accountA.Transfer(accountB, 200)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "insufficient funds")
}

// TestRouterAddAndGetRoute tests the router functionality
func TestRouterAddAndGetRoute(t *testing.T) {
	// Create router
	router := &Router{
		node:   nil, // not needed for this test
		routes: make(map[string]map[string]string),
	}

	// Add a route
	fromAddr := "0xParticipant1"
	toAddr := "0xParticipant2"
	channelID := "0xVirtualChannel123"

	err := router.AddRoute(fromAddr, toAddr, channelID)
	require.NoError(t, err)

	// Test route lookup
	retrievedChannel, exists := router.GetRoute(fromAddr, toAddr)
	assert.True(t, exists, "Route should exist")
	assert.Equal(t, channelID, retrievedChannel, "ChannelID should match")

	// Test non-existent route
	_, exists = router.GetRoute("0xNonExistent", toAddr)
	assert.False(t, exists, "Route should not exist")

	// Test non-existent destination
	_, exists = router.GetRoute(fromAddr, "0xNonExistent")
	assert.False(t, exists, "Route should not exist")

	// Add a second route for the same sender
	toAddr2 := "0xParticipant3"
	channelID2 := "0xVirtualChannel456"

	err = router.AddRoute(fromAddr, toAddr2, channelID2)
	require.NoError(t, err)

	// Verify both routes exist
	retrievedChannel, exists = router.GetRoute(fromAddr, toAddr)
	assert.True(t, exists)
	assert.Equal(t, channelID, retrievedChannel)

	retrievedChannel, exists = router.GetRoute(fromAddr, toAddr2)
	assert.True(t, exists)
	assert.Equal(t, channelID2, retrievedChannel)
}

// TestVirtualChannelJSON tests the JSON serialization of VirtualChannel
func TestVirtualChannelJSON(t *testing.T) {
	// Create a virtual channel
	now := time.Now()
	vc := &VirtualChannel{
		ID:           1,
		ChannelID:    "0xVirtualChannel123",
		ParticipantA: "0xParticipant1",
		ParticipantB: "0xParticipant2",
		TokenAddress: "0xToken1",
		Balance:      500,
		Status:       "open",
		Version:      1,
		ExpiresAt:    now.Add(24 * time.Hour),
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	// Serialize to JSON
	bytes, err := json.Marshal(vc)
	require.NoError(t, err)

	// Parse JSON string to verify format
	var data map[string]interface{}
	err = json.Unmarshal(bytes, &data)
	require.NoError(t, err)

	// Check that time fields are formatted as strings
	_, ok := data["ExpiresAt"].(string)
	assert.True(t, ok, "ExpiresAt should be a string")

	_, ok = data["CreatedAt"].(string)
	assert.True(t, ok, "CreatedAt should be a string")

	_, ok = data["UpdatedAt"].(string)
	assert.True(t, ok, "UpdatedAt should be a string")
}
