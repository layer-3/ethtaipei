package main

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// Entry represents a ledger entry in the database
type Entry struct {
	ID          uint   `gorm:"primaryKey"`
	AccountID   string `gorm:"column:account_id;not null"`
	Beneficiary string `gorm:"column:beneficiary;not null"`
	Credit      int64  `gorm:"column:credit;not null"`
	Debit       int64  `gorm:"column:debit;not null"`
	CreatedAt   time.Time
}

// TableName specifies the table name for the Entry model
func (Entry) TableName() string {
	return "ledger"
}

// BeneficiaryAccount represents an account in the ledger system
type BeneficiaryAccount struct {
	AccountID   string
	Beneficiary string
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
func (l *Ledger) SelectBeneficiaryAccount(channelID, beneficiary string) *BeneficiaryAccount {
	return &BeneficiaryAccount{
		AccountID:   channelID,
		Beneficiary: beneficiary,
		db:          l.db,
	}
}

// Balance returns the current balance (credit - debit) for this account
func (a *BeneficiaryAccount) Balance() (int64, error) {
	var creditSum, debitSum int64

	err := a.db.Model(&Entry{}).
		Where("account_id = ? AND beneficiary = ?",
			a.AccountID, a.Beneficiary).
		Select("COALESCE(SUM(credit), 0) as credit_sum, COALESCE(SUM(debit), 0) as debit_sum").
		Row().Scan(&creditSum, &debitSum)

	if err != nil {
		return 0, err
	}

	return creditSum - debitSum, nil
}

// Balances returns the balances for all token addresses for this account
func GetAccountBalances(db *gorm.DB, accountID string) ([]AvailableBalance, error) {
	type BalanceResult struct {
		Beneficiary string
		CreditSum   int64
		DebitSum    int64
	}

	var results []BalanceResult
	err := db.Model(&Entry{}).
		Where("account_id = ?", accountID).
		Select("beneficiary, COALESCE(SUM(credit), 0) as credit_sum, COALESCE(SUM(debit), 0) as debit_sum").
		Group("beneficiary").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	var balances []AvailableBalance
	for _, r := range results {
		balances = append(balances, AvailableBalance{
			Address: r.Beneficiary,
			Amount:  r.CreditSum - r.DebitSum,
		})
	}

	return balances, nil
}

// Record creates a new ledger entry for this account
// If amount > 0, it records a credit; if amount < 0, it records a debit
func (a *BeneficiaryAccount) Record(amount int64) error {
	entry := &Entry{
		AccountID:   a.AccountID,
		Beneficiary: a.Beneficiary,
		Credit:      0,
		Debit:       0,
		CreatedAt:   time.Now(),
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
func (a *BeneficiaryAccount) Transfer(toAccount *BeneficiaryAccount, amount int64) error {
	fmt.Println("transferring amount:", amount)
	if amount < 0 {
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
		fromAccount := &BeneficiaryAccount{
			AccountID:   a.AccountID,
			Beneficiary: a.Beneficiary,
			db:          tx,
		}

		toAccountTx := &BeneficiaryAccount{
			AccountID:   toAccount.AccountID,
			Beneficiary: toAccount.Beneficiary,
			db:          tx,
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
