package main

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// Entry represents a ledger entry in the database
type Entry struct {
	ID           uint   `gorm:"primaryKey"`
	ChannelID    string `gorm:"column:channel_id;not null"`
	Participant  string `gorm:"column:participant;not null"`
	TokenAddress string `gorm:"column:token_address;not null"`
	// NetworkID  string    `gorm:"column:network_id;not null"`
	Credit    int64 `gorm:"column:credit;not null"`
	Debit     int64 `gorm:"column:debit;not null"`
	CreatedAt time.Time
}

// TableName specifies the table name for the Entry model
func (Entry) TableName() string {
	return "ledger"
}

// Account represents an account in the ledger system
type Account struct {
	ChannelID   string
	Participant string
	db          *gorm.DB
}

// Ledger represents the ledger service
type Ledger struct {
	db *gorm.DB
}

// NewLedger creates a new ledger instance
func NewLedger(db *gorm.DB) *Ledger {
	return &Ledger{
		db: db,
	}
}

// Account creates an Account instance for the given parameters
func (l *Ledger) Account(channelID, participant string) *Account {
	return &Account{
		ChannelID:   channelID,
		Participant: participant,
		db:          l.db,
	}
}

// Balance returns the current balance (credit - debit) for this account
func (a *Account) Balance(tokenAddress string) (int64, error) {
	var creditSum, debitSum int64

	err := a.db.Model(&Entry{}).
		Where("channel_id = ? AND participant = ? AND token_address = ?",
			a.ChannelID, a.Participant, tokenAddress).
		Select("COALESCE(SUM(credit), 0) as credit_sum, COALESCE(SUM(debit), 0) as debit_sum").
		Row().Scan(&creditSum, &debitSum)

	if err != nil {
		return 0, err
	}

	return creditSum - debitSum, nil
}

// Balances returns the balances for all token addresses for this account
func (a *Account) Balances() (map[string]int64, error) {
	type BalanceResult struct {
		TokenAddress string
		CreditSum    int64
		DebitSum     int64
	}

	var results []BalanceResult
	err := a.db.Model(&Entry{}).
		Where("channel_id = ? AND participant = ?", a.ChannelID, a.Participant).
		Select("token_address, COALESCE(SUM(credit), 0) as credit_sum, COALESCE(SUM(debit), 0) as debit_sum").
		Group("token_address").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	balances := make(map[string]int64)
	for _, result := range results {
		balances[result.TokenAddress] = result.CreditSum - result.DebitSum
	}

	return balances, nil
}

// Record creates a new ledger entry for this account
// If amount > 0, it records a credit; if amount < 0, it records a debit
func (a *Account) Record(tokenAddress string, amount int64) error {
	entry := &Entry{
		ChannelID:    a.ChannelID,
		Participant:  a.Participant,
		TokenAddress: tokenAddress,
		Credit:       0,
		Debit:        0,
		CreatedAt:    time.Now(),
	}

	if amount > 0 {
		entry.Credit = amount
	} else if amount < 0 {
		entry.Debit = -amount // Convert negative to positive for debit
	} else {
		// return errors.New("amount cannot be zero") // Uncomment if you want to disallow zero amounts
	}

	return a.db.Create(entry).Error
}

// Transfer moves funds from this account to another account
func (a *Account) Transfer(toAccount *Account, tokenAddress string, amount int64) error {
	if amount <= 0 {
		return errors.New("transfer amount must be positive")
	}

	// Check if the source account has sufficient funds
	balance, err := a.Balance(tokenAddress)
	if err != nil {
		return err
	}

	if balance < amount {
		return errors.New("insufficient funds for transfer")
	}

	// Use a transaction to ensure atomicity
	return a.db.Transaction(func(tx *gorm.DB) error {
		// Create a temporary account with transaction db
		fromAccount := &Account{
			ChannelID:   a.ChannelID,
			Participant: a.Participant,
			db:          tx,
		}

		toAccountTx := &Account{
			ChannelID:   toAccount.ChannelID,
			Participant: toAccount.Participant,
			db:          tx,
		}

		// Debit the source account
		if err := fromAccount.Record(tokenAddress, -amount); err != nil {
			return err
		}

		// Credit the destination account
		if err := toAccountTx.Record(tokenAddress, amount); err != nil {
			return err
		}

		return nil
	})
}
