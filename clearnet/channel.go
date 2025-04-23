package main

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/common"
	"gorm.io/gorm"
)

type ChannelStatus string

var (
	ChannelStatusOpen   ChannelStatus = "open"
	ChannelStatusClosed ChannelStatus = "closed"
)

// DBChannel represents a state channel between participants
type DBChannel struct {
	ID           uint          `gorm:"primaryKey"`
	ChannelID    string        `gorm:"column:channel_id;uniqueIndex;"`
	ParticipantA string        `gorm:"column:participant_a;not null"`
	ParticipantB string        `gorm:"column:participant_b;not null"`
	Status       ChannelStatus `gorm:"column:status;not null;"`
	Challenge    uint64        `gorm:"column:challenge;default:0"`
	Nonce        uint64        `gorm:"column:nonce;default:0"`
	Adjudicator  string        `gorm:"column:adjudicator;not null"`
	NetworkID    string        `gorm:"column:network_id;not null"`
	TokenAddress string        `gorm:"column:token_address;not null"`
	Amount       int64         `gorm:"column:amount;not null"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// ToNitroChannel converts the channel to a nitrolite.Channel
func (c *DBChannel) ToNitroChannel() (*nitrolite.Channel, error) {
	participantA := common.HexToAddress(c.ParticipantA)
	participantB := common.HexToAddress(c.ParticipantB)
	adjudicator := common.HexToAddress(c.Adjudicator)

	return &nitrolite.Channel{
		Participants: []common.Address{participantA, participantB},
		Adjudicator:  adjudicator,
		Challenge:    c.Challenge,
		Nonce:        c.Nonce,
	}, nil
}

// FromNitroChannel updates the channel from a nitrolite.Channel
func (c *DBChannel) FromNitroChannel(nc *nitrolite.Channel, channelID string, tokenAddress string) {
	c.ChannelID = channelID
	c.ParticipantA = nc.Participants[0].Hex()
	c.ParticipantB = nc.Participants[1].Hex()
	c.Adjudicator = nc.Adjudicator.Hex()
	c.Challenge = nc.Challenge
	c.Nonce = nc.Nonce
	c.UpdatedAt = time.Now()
}

// TableName specifies the table name for the Channel model
func (DBChannel) TableName() string {
	return "channels"
}

// ChannelService handles channel-related operations
type ChannelService struct {
	db *gorm.DB
}

// NewChannelService creates a new ChannelService instance
func NewChannelService(db *gorm.DB) *ChannelService {
	return &ChannelService{
		db: db,
	}
}

// CreateChannel creates a new channel in the database
// For real channels, participantB is always the broker application
func (s *ChannelService) CreateChannel(channelID, participantA string, nonce uint64, adjudicator string, networkID string, tokenAddress string, amount int64) error {
	channel := DBChannel{
		ChannelID:    channelID,
		ParticipantA: participantA,
		ParticipantB: BrokerAddress, // Always use broker address for direct channels
		NetworkID:    networkID,     // Set the network ID for real channels
		Status:       ChannelStatusOpen,
		Nonce:        nonce,
		Adjudicator:  adjudicator,
		TokenAddress: tokenAddress,
		Amount:       amount,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.db.Create(&channel).Error; err != nil {
		return fmt.Errorf("failed to create channel: %w", err)
	}

	log.Printf("Created new channel with ID: %s, network: %s", channelID, networkID)
	return nil
}

// GetChannelByID retrieves a channel by its ID
func (s *ChannelService) GetChannelByID(channelID string) (*DBChannel, error) {
	var channel DBChannel
	if err := s.db.Where("channel_id = ?", channelID).First(&channel).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Channel not found
		}
		return nil, fmt.Errorf("error finding channel: %w", err)
	}

	return &channel, nil
}

// CloseChannel closes a channel by updating its status to "closed"
func CloseChannel(db *gorm.DB, channelID string) error {
	var channel DBChannel
	result := db.Where("channel_id = ?", channelID).First(&channel)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return fmt.Errorf("channel with ID %s not found", channelID)
		}
		return fmt.Errorf("error finding channel: %w", result.Error)
	}

	// Update the channel status to "closed"
	channel.Status = ChannelStatusClosed
	channel.Amount = 0
	channel.UpdatedAt = time.Now()
	if err := db.Save(&channel).Error; err != nil {
		return fmt.Errorf("failed to close channel: %w", err)
	}

	log.Printf("Closed channel with ID: %s", channelID)
	return nil
}

func getDirectChannelForParticipant(tx *gorm.DB, participant string) (*DBChannel, error) {
	var directChannel DBChannel
	if err := tx.Where("participant_a = ? AND participant_b = ? AND status = ?",
		participant, BrokerAddress, ChannelStatusOpen).Order("nonce DESC").First(&directChannel).Error; err != nil {
		return nil, fmt.Errorf("no direct channel found for participant %s: %w", participant, err)
	}
	return &directChannel, nil
}

// CheckExistingChannels checks if there is an existing open channel on the same network between participant A and B
func (s *ChannelService) CheckExistingChannels(participantA, participantB, networkID string) (*DBChannel, error) {
	var channel DBChannel
	err := s.db.Where("participant_a = ? AND participant_b = ? AND network_id = ? AND status = ?", participantA, participantB, networkID, ChannelStatusOpen).
		First(&channel).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // No open channel found
		}
		return nil, fmt.Errorf("error checking for existing open channel: %w", err)
	}

	return &channel, nil
}
