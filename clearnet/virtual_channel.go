package main

import (
	"encoding/json"
	"time"
)

// DBVirtualChannel represents a virtual payment channel between participants
type DBVirtualChannel struct {
	ID           uint      `gorm:"primaryKey"`
	ChannelID    string    `gorm:"column:channel_id;type:char(64);not null;uniqueIndex"`
	ParticipantA string    `gorm:"column:participant_a;type:char(42);not null"`
	ParticipantB string    `gorm:"column:participant_b;type:char(42);not null"`
	Nonce        uint64    `gorm:"column:nonce;default:0"`
	Status       string    `gorm:"column:status;type:varchar(20);not null;default:'open'"`
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
		CreatedAt string `json:"createdAt"`
		UpdatedAt string `json:"updatedAt"`
	}{
		Alias:     (*Alias)(vc),
		CreatedAt: vc.CreatedAt.Format(time.RFC3339),
		UpdatedAt: vc.UpdatedAt.Format(time.RFC3339),
	})
}
