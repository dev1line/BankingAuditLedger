package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Log represents an audit log entry
type Log struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	CreatedAt   time.Time      `json:"created_at" gorm:"not null"`
	Source      string         `json:"source" gorm:"not null;size:255"`
	EventType   string         `json:"event_type" gorm:"not null;size:255"`
	Payload     string         `json:"payload" gorm:"type:jsonb;not null"`
	Hash        string         `json:"hash" gorm:"size:64;not null"`
	TxID        *string        `json:"tx_id" gorm:"size:255"`
	CommittedAt *time.Time     `json:"committed_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// TableName returns the table name for the Log model
func (Log) TableName() string {
	return "logs"
}

// CreateLogRequest represents the request payload for creating a log
type CreateLogRequest struct {
	LogID     string      `json:"log_id"`
	Source    string      `json:"source" binding:"required"`
	EventType string      `json:"event_type" binding:"required"`
	Payload   interface{} `json:"payload" binding:"required"`
}

// LogResponse represents the response for log operations
type LogResponse struct {
	ID          uuid.UUID  `json:"id"`
	CreatedAt   time.Time  `json:"created_at"`
	Source      string     `json:"source"`
	EventType   string     `json:"event_type"`
	Payload     interface{} `json:"payload"`
	Hash        string     `json:"hash"`
	TxID        *string    `json:"tx_id"`
	CommittedAt *time.Time `json:"committed_at"`
}

// VerificationResponse represents the response for verification operations
type VerificationResponse struct {
	ID           uuid.UUID `json:"id"`
	HashOffChain string    `json:"hash_offchain"`
	HashOnChain  string    `json:"hash_onchain"`
	IsValid      bool      `json:"is_valid"`
	VerifiedAt   time.Time `json:"verified_at"`
}

// ListLogsResponse represents the response for listing logs
type ListLogsResponse struct {
	Logs      []LogResponse `json:"logs"`
	Total     int64         `json:"total"`
	Page      int           `json:"page"`
	PageSize  int           `json:"page_size"`
	TotalPages int          `json:"total_pages"`
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp time.Time         `json:"timestamp"`
	Services  map[string]string `json:"services"`
}
