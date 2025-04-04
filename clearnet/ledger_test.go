package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	assert.NoError(t, err, "Failed to connect to in-memory database")

	// Auto migrate the Entry model
	err = db.AutoMigrate(&Entry{})
	assert.NoError(t, err, "Failed to migrate Entry model")

	return db
}

func TestLedgerScenario(t *testing.T) {
	// Setup in-memory database
	db := setupTestDB(t)

	// Initialize ledger
	ledger := NewLedger(db)

	// Define constants for the test
	aliceAddress := "0xAlice"
	bobAddress := "0xBob"
	charlieAddress := "0xCharlie"
	shibAddress := "0xSHIB"
	pepeAddress := "0xPEPE"

	aliceBrokerChannelID := "0x1234__abc"
	charlieBrokerChannelID := "0x5678__def"
	aliceCharlieVChannelID := "0xabcd...123"

	// 1. Alice opens a channel with broker with 20M SHIB (credit +20M)
	aliceAccount := ledger.Account(aliceBrokerChannelID, aliceAddress, shibAddress)
	err := aliceAccount.Record(20000000)
	assert.NoError(t, err, "Failed to credit Alice's account")

	// 2. Bob accepts and activates the channel with 0 tokens
	// Since Record() doesn't allow zero amounts, we'll handle Bob's account differently
	// For testing, we'll just check that Bob's account exists and has zero balance
	bobAccount := ledger.Account(aliceBrokerChannelID, bobAddress, shibAddress)
	bobBalance, err := bobAccount.Balance()
	assert.NoError(t, err, "Failed to get Bob's balance")
	assert.Equal(t, int64(0), bobBalance, "Bob should have 0 SHIB")

	// 3. Charlie opens a channel with broker with 100M PEPE
	charlieAccount := ledger.Account(charlieBrokerChannelID, charlieAddress, pepeAddress)
	err = charlieAccount.Record(100000000)
	assert.NoError(t, err, "Failed to credit Charlie's account")

	// 4. Alice and Charlie establish a Virtual Channel
	// Create virtual channel accounts
	aliceVChannelAccount := ledger.Account(aliceCharlieVChannelID, aliceAddress, shibAddress)
	charlieVChannelAccountPepe := ledger.Account(aliceCharlieVChannelID, charlieAddress, pepeAddress)

	// Alice allocates 5M SHIB to the virtual channel
	err = aliceAccount.Transfer(aliceVChannelAccount, 5000000)
	assert.NoError(t, err, "Failed to transfer from Alice to virtual channel")

	// Charlie allocates 10M PEPE to the virtual channel
	err = charlieAccount.Transfer(charlieVChannelAccountPepe, 10000000)
	assert.NoError(t, err, "Failed to transfer from Charlie to virtual channel")

	// 5. Alice and Charlie play a game, Charlie wins all SHIB
	// Create Charlie's SHIB account in the virtual channel
	charlieVChannelAccountShib := ledger.Account(aliceCharlieVChannelID, charlieAddress, shibAddress)

	// Transfer Alice's SHIB to Charlie in the virtual channel
	err = aliceVChannelAccount.Transfer(charlieVChannelAccountShib, 5000000)
	assert.NoError(t, err, "Failed to transfer from Alice to Charlie in virtual channel")

	// Verify final balances

	// Alice's SHIB on main channel (20M - 5M = 15M)
	aliceBalance, err := aliceAccount.Balance()
	assert.NoError(t, err, "Failed to get Alice's balance")
	assert.Equal(t, int64(15000000), aliceBalance, "Alice should have 15M SHIB on main channel")

	// Alice's SHIB on virtual channel (0 after transfer to Charlie)
	aliceVBalance, err := aliceVChannelAccount.Balance()
	assert.NoError(t, err, "Failed to get Alice's virtual channel balance")
	assert.Equal(t, int64(0), aliceVBalance, "Alice should have 0 SHIB on virtual channel")

	// Charlie's PEPE on main channel (100M - 10M = 90M)
	charlieBalance, err := charlieAccount.Balance()
	assert.NoError(t, err, "Failed to get Charlie's balance")
	assert.Equal(t, int64(90000000), charlieBalance, "Charlie should have 90M PEPE on main channel")

	// Charlie's PEPE on virtual channel (10M)
	charlieVPepeBalance, err := charlieVChannelAccountPepe.Balance()
	assert.NoError(t, err, "Failed to get Charlie's PEPE balance on virtual channel")
	assert.Equal(t, int64(10000000), charlieVPepeBalance, "Charlie should have 10M PEPE on virtual channel")

	// Charlie's SHIB on virtual channel (5M received from Alice)
	charlieShibBalance, err := charlieVChannelAccountShib.Balance()
	assert.NoError(t, err, "Failed to get Charlie's SHIB balance on virtual channel")
	assert.Equal(t, int64(5000000), charlieShibBalance, "Charlie should have 5M SHIB on virtual channel")

	// Verify entire entry table
	var entries []Entry
	err = db.Order("id").Find(&entries).Error
	assert.NoError(t, err, "Failed to retrieve entries")

	// There should be 8 entries (excluding the one for Bob)
	assert.Equal(t, 8, len(entries), "There should be 8 entries in the ledger")
}
