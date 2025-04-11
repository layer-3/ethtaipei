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

// DBChannel represents a state channel between participants
type DBChannel struct {
	ID           uint      `gorm:"primaryKey"`
	ChannelID    string    `gorm:"column:channel_id;type:char(64);uniqueIndex;not null"`
	ParticipantA string    `gorm:"column:participant_a;type:char(42);not null"`
	ParticipantB string    `gorm:"column:participant_b;type:char(42);not null"`
	Challenge    uint64    `gorm:"column:challenge;default:0"`
	Nonce        uint64    `gorm:"column:nonce;default:0"`
	Adjudicator  string    `gorm:"column:adjudicator;type:char(42);default:''"`
	NetworkID    string    `gorm:"column:network_id;type:varchar(32);default:''"`
	CreatedAt    time.Time `gorm:"column:created_at;not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt    time.Time `gorm:"column:updated_at;not null;default:CURRENT_TIMESTAMP"`
}

// ToNitroChannel converts the channel to a nitrolite.Channel
func (c *DBChannel) ToNitroChannel() (*nitrolite.Channel, error) {
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

// GetOrCreateChannel gets an existing channel or creates a new one
// For real channels, participantB is always the broker application
func (s *ChannelService) GetOrCreateChannel(channelID, participantA, tokenAddress string, nonce uint64, adjudicator string, networkID ...string) (*DBChannel, error) {
	var channel DBChannel
	result := s.db.Where("channel_id = ?", channelID).First(&channel)

	// Determine network ID value (empty string if not provided)
	network := ""
	if len(networkID) > 0 && networkID[0] != "" {
		network = networkID[0]
	}

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// Channel not found, create a new one
			// Always use the broker address for participantB in real channels
			channel = DBChannel{
				ChannelID:    channelID,
				ParticipantA: participantA,
				ParticipantB: BrokerAddress, // Always use broker address for real channels
				NetworkID:    network,       // Set the network ID for real channels
				Nonce:        nonce,
				Adjudicator:  adjudicator,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}

			if err := s.db.Create(&channel).Error; err != nil {
				return nil, fmt.Errorf("failed to create channel: %w", err)
			}

			log.Printf("Created new channel with ID: %s, network: %s", channelID, network)
			return &channel, nil
		}

		return nil, fmt.Errorf("error finding channel: %w", result.Error)
	}

	// If network ID is provided and channel doesn't have one, update it
	if network != "" && channel.NetworkID == "" {
		channel.NetworkID = network
		if err := s.db.Save(&channel).Error; err != nil {
			log.Printf("Failed to update network ID: %v", err)
		} else {
			log.Printf("Updated network ID for channel %s to %s", channelID, network)
		}
	}

	log.Printf("Found existing channel with ID: %s, network: %s", channelID, channel.NetworkID)
	return &channel, nil
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
