package main

import (
	"encoding/json"
	"errors"
	"log"
	"sync"
	"time"

	"github.com/centrifugal/centrifuge"
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

// Route defines a message forwarding route between participants
type Route struct {
	FromParticipant string
	ToParticipant   string
	ChannelID       string
}

// RouterInterface defines methods that must be implemented by a message router
type RouterInterface interface {
	AddRoute(from, to, channelID string) error
	GetRoute(from, to string) (string, bool)
	ForwardMessage(from, to string, message []byte, channelID ...string) error
}

// Router handles message routing between participants
type Router struct {
	node   *centrifuge.Node
	routes map[string]map[string]string // FromParticipant -> ToParticipant -> ChannelID
	mu     sync.RWMutex
}

// NewRouter creates a new router instance
func NewRouter(node *centrifuge.Node) *Router {
	return &Router{
		node:   node,
		routes: make(map[string]map[string]string),
		mu:     sync.RWMutex{},
	}
}

// AddRoute adds a new route for message forwarding
func (r *Router) AddRoute(from, to, channelID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Initialize the map for the sender if it doesn't exist
	if _, exists := r.routes[from]; !exists {
		r.routes[from] = make(map[string]string)
	}

	// Add or update the route
	r.routes[from][to] = channelID
	log.Printf("Added route: %s -> %s via channel %s", from, to, channelID)
	return nil
}

// GetRoute retrieves a route for the given participants
func (r *Router) GetRoute(from, to string) (string, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Check if we have routes for this sender
	if routes, exists := r.routes[from]; exists {
		// Check if we have a route to this recipient
		if channelID, routeExists := routes[to]; routeExists {
			return channelID, true
		}
	}

	return "", false
}

// ForwardMessage forwards a message from one participant to another
func (r *Router) ForwardMessage(from, to string, message []byte, channelID ...string) error {
	var targetChannel string

	// If channelID is explicitly provided, use it
	if len(channelID) > 0 && channelID[0] != "" {
		targetChannel = channelID[0]
	} else {
		// Otherwise look up the route
		var exists bool
		targetChannel, exists = r.GetRoute(from, to)
		if !exists {
			return errors.New("no route exists between participants")
		}
	}

	// Publish the message to the channel
	_, err := r.node.Publish(targetChannel, message)
	if err != nil {
		log.Printf("Error forwarding message: %v", err)
		return err
	}

	log.Printf("Forwarded message from %s to %s via channel %s", from, to, targetChannel)
	return nil
}

// DBVirtualChannel represents a virtual payment channel between participants
type DBVirtualChannel struct {
	ID           uint      `gorm:"primaryKey"`
	ChannelID    string    `gorm:"column:channel_id;type:char(64);not null;uniqueIndex"`
	ParticipantA string    `gorm:"column:participant_a;type:char(42);not null"`
	ParticipantB string    `gorm:"column:participant_b;type:char(42);not null"`
	TokenAddress string    `gorm:"column:token_address;type:char(40);not null"`
	Balance      int64     `gorm:"column:balance;not null;default:0"`
	Status       string    `gorm:"column:status;type:varchar(20);not null;default:'open'"`
	Version      uint64    `gorm:"column:version;not null;default:0"`
	ExpiresAt    time.Time `gorm:"column:expires_at"`
	CreatedAt    time.Time `gorm:"column:created_at;default:CURRENT_TIMESTAMP"`
	UpdatedAt    time.Time `gorm:"column:updated_at;default:CURRENT_TIMESTAMP"`
}

// TableName specifies the table name for the VirtualChannel model
func (DBVirtualChannel) TableName() string {
	return "virtual_channels"
}

// MarshalJSON provides custom JSON serialization for VirtualChannel
func (vc *DBVirtualChannel) MarshalJSON() ([]byte, error) {
	type Alias DBVirtualChannel
	return json.Marshal(&struct {
		*Alias
		ExpiresAt string `json:"expiresAt"`
		CreatedAt string `json:"createdAt"`
		UpdatedAt string `json:"updatedAt"`
	}{
		Alias:     (*Alias)(vc),
		ExpiresAt: vc.ExpiresAt.Format(time.RFC3339),
		CreatedAt: vc.CreatedAt.Format(time.RFC3339),
		UpdatedAt: vc.UpdatedAt.Format(time.RFC3339),
	})
}
