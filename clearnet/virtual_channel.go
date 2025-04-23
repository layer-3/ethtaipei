package main

import (
	"encoding/json"
	"time"
)

// DBVirtualChannel represents a virtual payment channel between participants
type DBVirtualChannel struct {
	ID           uint          `gorm:"primaryKey"`
	ChannelID    string        `gorm:"column:channel_id;not null;uniqueIndex"`
	ParticipantA string        `gorm:"column:participant_a;not null"`
	ParticipantB string        `gorm:"column:participant_b;not null"`
	Nonce        uint64        `gorm:"column:nonce;not null"`
	Status       ChannelStatus `gorm:"column:status;not null"`
	Signers      []string      `gorm:"column:signers"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
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
		CreatedAt string `json:"createdAt"`
		UpdatedAt string `json:"updatedAt"`
	}{
		Alias:     (*Alias)(vc),
		CreatedAt: vc.CreatedAt.Format(time.RFC3339),
		UpdatedAt: vc.UpdatedAt.Format(time.RFC3339),
	})
}
