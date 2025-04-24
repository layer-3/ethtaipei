package main

import (
	"encoding/json"
	"time"

	"github.com/lib/pq"
)

// DBVirtualChannel represents a virtual payment channel between participants
type DBVirtualChannel struct {
	ID           uint           `gorm:"primaryKey"`
	ChannelID    string         `gorm:"column:channel_id;not null;uniqueIndex"`
	Participants pq.StringArray `gorm:"type:text[];column:participants;not null"`
	Nonce        uint64         `gorm:"column:nonce;not null"`
	Status       ChannelStatus  `gorm:"column:status;not null"`
	Signers      pq.StringArray `gorm:"type:text[];column:signers"`
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
