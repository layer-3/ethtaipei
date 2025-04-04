package main

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// Entry represents a ledger entry in the database
type Entry struct {
	ID           uint      `gorm:"primaryKey"`
	ChannelID    string    `gorm:"column:channel_id;type:char(64);not null"`
	Participant  string    `gorm:"column:participant;type:char(40);not null"`
	TokenAddress string    `gorm:"column:token_address;type:char(40);not null"`
	Credit       int64     `gorm:"column:credit;not null"`
	Debit        int64     `gorm:"column:debit;not null"`
	CreatedAt    time.Time `gorm:"column:created_at;default:CURRENT_TIMESTAMP"`
}

// TableName specifies the table name for the Entry model
func (Entry) TableName() string {
	return "ledger"
}

// Account represents an account in the ledger system
type Account struct {
	ChannelID    string
	Participant  string
	TokenAddress string
	db           *gorm.DB
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
func (l *Ledger) Account(channelID, participant, tokenAddress string) *Account {
	return &Account{
		ChannelID:    channelID,
		Participant:  participant,
		TokenAddress: tokenAddress,
		db:           l.db,
	}
}

// Balance returns the current balance (credit - debit) for this account
func (a *Account) Balance() (int64, error) {
	var creditSum, debitSum int64

	err := a.db.Model(&Entry{}).
		Where("channel_id = ? AND participant = ? AND token_address = ?",
			a.ChannelID, a.Participant, a.TokenAddress).
		Select("COALESCE(SUM(credit), 0) as credit_sum, COALESCE(SUM(debit), 0) as debit_sum").
		Row().Scan(&creditSum, &debitSum)

	if err != nil {
		return 0, err
	}

	return creditSum - debitSum, nil
}

// Record creates a new ledger entry for this account
// If amount > 0, it records a credit; if amount < 0, it records a debit
func (a *Account) Record(amount int64) error {
	entry := &Entry{
		ChannelID:    a.ChannelID,
		Participant:  a.Participant,
		TokenAddress: a.TokenAddress,
		Credit:       0,
		Debit:        0,
		CreatedAt:    time.Now(),
	}

	if amount > 0 {
		entry.Credit = amount
	} else if amount < 0 {
		entry.Debit = -amount // Convert negative to positive for debit
	} else {
		return errors.New("amount cannot be zero")
	}

	return a.db.Create(entry).Error
}

// Transfer moves funds from this account to another account
func (a *Account) Transfer(toAccount *Account, amount int64) error {
	if amount <= 0 {
		return errors.New("transfer amount must be positive")
	}

	// Check if the source account has sufficient funds
	balance, err := a.Balance()
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
			ChannelID:    a.ChannelID,
			Participant:  a.Participant,
			TokenAddress: a.TokenAddress,
			db:           tx,
		}

		toAccountTx := &Account{
			ChannelID:    toAccount.ChannelID,
			Participant:  toAccount.Participant,
			TokenAddress: toAccount.TokenAddress,
			db:           tx,
		}

		// Debit the source account
		if err := fromAccount.Record(-amount); err != nil {
			return err
		}

		// Credit the destination account
		if err := toAccountTx.Record(amount); err != nil {
			return err
		}

		return nil
	})
}
