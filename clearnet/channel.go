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

// Channel represents a state channel between participants
type Channel struct {
	ID           uint      `gorm:"primaryKey"`
	ChannelID    string    `gorm:"column:channel_id;type:char(64);uniqueIndex;not null"`
	ParticipantA string    `gorm:"column:participant_a;type:char(42);not null"`
	ParticipantB string    `gorm:"column:participant_b;type:char(42);not null"`
	Challenge    uint64    `gorm:"column:challenge;default:0"`
	Nonce        uint64    `gorm:"column:nonce;default:0"`
	Adjudicator  string    `gorm:"column:adjudicator;type:char(42);default:''"`
	CreatedAt    time.Time `gorm:"column:created_at;not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt    time.Time `gorm:"column:updated_at;not null;default:CURRENT_TIMESTAMP"`
}

// ToNitroChannel converts the channel to a nitrolite.Channel
func (c *Channel) ToNitroChannel() (*nitrolite.Channel, error) {
	participantA := common.HexToAddress(c.ParticipantA)
	participantB := common.HexToAddress(c.ParticipantB)
	adjudicator := common.HexToAddress(c.Adjudicator)

	return &nitrolite.Channel{
		Participants: [2]common.Address{participantA, participantB},
		Adjudicator:  adjudicator,
		Challenge:    c.Challenge,
		Nonce:        c.Nonce,
	}, nil
}

// FromNitroChannel updates the channel from a nitrolite.Channel
func (c *Channel) FromNitroChannel(nc *nitrolite.Channel, channelID string, tokenAddress string) {
	c.ChannelID = channelID
	c.ParticipantA = nc.Participants[0].Hex()
	c.ParticipantB = nc.Participants[1].Hex()
	c.Adjudicator = nc.Adjudicator.Hex()
	c.Challenge = nc.Challenge
	c.Nonce = nc.Nonce
	c.UpdatedAt = time.Now()
}

// TableName specifies the table name for the Channel model
func (Channel) TableName() string {
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

// GetOrCreateChannel gets an existing channel or creates a new one
func (s *ChannelService) GetOrCreateChannel(channelID, participantA, participantB, tokenAddress string) (*Channel, error) {
	var channel Channel
	result := s.db.Where("channel_id = ?", channelID).First(&channel)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// Channel not found, create a new one
			channel = Channel{
				ChannelID:    channelID,
				ParticipantA: participantA,
				ParticipantB: participantB,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}

			if err := s.db.Create(&channel).Error; err != nil {
				return nil, fmt.Errorf("failed to create channel: %w", err)
			}

			log.Printf("Created new channel with ID: %s", channelID)
			return &channel, nil
		}

		return nil, fmt.Errorf("error finding channel: %w", result.Error)
	}

	if err := s.db.Save(&channel).Error; err != nil {
		log.Printf("Failed to update last updated time: %v", err)
	}

	log.Printf("Found existing channel with ID: %s", channelID)
	return &channel, nil
}

// GetChannelByID retrieves a channel by its ID
func (s *ChannelService) GetChannelByID(channelID string) (*Channel, error) {
	var channel Channel
	if err := s.db.Where("channel_id = ?", channelID).First(&channel).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Channel not found
		}
		return nil, fmt.Errorf("error finding channel: %w", err)
	}

	return &channel, nil
}
