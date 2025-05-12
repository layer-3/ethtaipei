package main

import (
	"errors"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

// ChannelStatus represents the current state of a channel (open or closed)
type ChannelStatus string

var (
	ChannelStatusJoining ChannelStatus = "joining"
	ChannelStatusOpen    ChannelStatus = "open"
	ChannelStatusClosed  ChannelStatus = "closed"
)

// Channel represents a state channel between participants
type Channel struct {
	ID           uint          `gorm:"primaryKey"`
	ChannelID    string        `gorm:"column:channel_id;uniqueIndex;"`
	ParticipantA string        `gorm:"column:participant_a;not null"`
	ParticipantB string        `gorm:"column:participant_b;not null"`
	Status       ChannelStatus `gorm:"column:status;not null;"`
	Challenge    uint64        `gorm:"column:challenge;default:0"`
	Nonce        uint64        `gorm:"column:nonce;default:0"`
	Version      uint64        `gorm:"column:version;default:0"`
	Adjudicator  string        `gorm:"column:adjudicator;not null"`
	NetworkID    string        `gorm:"column:network_id;not null"`
	Token        string        `gorm:"column:token;not null"`
	Amount       int64         `gorm:"column:amount;not null"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// TableName specifies the table name for the Channel model
func (Channel) TableName() string {
	return "channels"
}

// CreateChannel creates a new channel in the database
// For real channels, participantB is always the broker application
func CreateChannel(tx *gorm.DB, channelID, participantA string, nonce uint64, adjudicator string, networkID string, tokenAddress string, amount int64) error {
	channel := Channel{
		ChannelID:    channelID,
		ParticipantA: participantA,
		ParticipantB: BrokerAddress, // Always use broker address for channels
		NetworkID:    networkID,     // Set the network ID for channels
		Status:       ChannelStatusJoining,
		Nonce:        nonce,
		Adjudicator:  adjudicator,
		Token:        tokenAddress,
		Amount:       amount,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := tx.Create(&channel).Error; err != nil {
		return fmt.Errorf("failed to create channel: %w", err)
	}

	log.Printf("Created new channel with ID: %s, network: %s", channelID, networkID)
	return nil
}

// GetChannelByID retrieves a channel by its ID
func GetChannelByID(tx *gorm.DB, channelID string) (*Channel, error) {
	var channel Channel
	if err := tx.Where("channel_id = ?", channelID).First(&channel).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Channel not found
		}
		return nil, fmt.Errorf("error finding channel: %w", err)
	}

	return &channel, nil
}

// getChannelForParticipant finds the channel between a participant and the broker
func getChannelForParticipant(tx *gorm.DB, participant string) (*Channel, error) {
	var channel Channel
	if err := tx.Where("participant_a = ? AND participant_b = ? AND status = ?",
		participant, BrokerAddress, ChannelStatusOpen).Order("nonce DESC").First(&channel).Error; err != nil {
		return nil, fmt.Errorf("no open channel found for participant %s: %w", participant, err)
	}
	return &channel, nil
}

// CheckExistingChannels checks if there is an existing open channel on the same network between participant A and B
func CheckExistingChannels(tx *gorm.DB, participantA, participantB, networkID string) (*Channel, error) {
	var channel Channel
	err := tx.Where("participant_a = ? AND participant_b = ? AND network_id = ? AND status = ?", participantA, participantB, networkID, ChannelStatusOpen).
		First(&channel).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // No open channel found
		}
		return nil, fmt.Errorf("error checking for existing open channel: %w", err)
	}

	return &channel, nil
}
