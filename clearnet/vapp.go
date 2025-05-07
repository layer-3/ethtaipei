package main

import (
	"encoding/json"
	"time"

	"github.com/lib/pq"
)

// VApp represents a virtual payment application between participants
type VApp struct {
	ID           uint           `gorm:"primaryKey"`
	Protocol     string         `gorm:"column:protocol;default:'NitroRPC/0.2';not null"`
	AppID        string         `gorm:"column:app_id;not null;uniqueIndex"`
	Participants pq.StringArray `gorm:"type:text[];column:participants;not null"`
	Status       ChannelStatus  `gorm:"column:status;not null"`
	Challenge    uint64         `gorm:"column:challenge;"`
	Nonce        uint64         `gorm:"column:nonce;not null"`
	Token        string         `gorm:"column:token;not null"`
	Weights      pq.Int64Array  `gorm:"type:integer[];column:weights"`
	Quorum       uint64         `gorm:"column:quorum;default:100"`
	Version      uint64         `gorm:"column:version;default:1"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// TableName specifies the table name for the Virtual App model
func (VApp) TableName() string {
	return "v_app"
}

// MarshalJSON provides custom JSON serialization for vApp
func (vc *VApp) MarshalJSON() ([]byte, error) {
	type Alias VApp
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
