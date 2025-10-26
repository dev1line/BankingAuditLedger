package services

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"

	"github.com/banking-audit-ledger/backend/internal/fabric"
	"github.com/banking-audit-ledger/backend/internal/models"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// FabricClient defines the interface for blockchain operations
type FabricClient interface {
	CommitLogHash(logID, hash string, metadata map[string]string) (string, error)
	GetLogHash(logID string) (*fabric.LogHash, error)
	VerifyLogHash(logID, providedHash string) (bool, error)
	Close()
}

// LogService handles log-related operations
type LogService struct {
	db     *gorm.DB
	fabric FabricClient
	logger *logrus.Logger
}

// NewLogService creates a new log service
func NewLogService(db *gorm.DB, fabricClient FabricClient, logger *logrus.Logger) *LogService {
	return &LogService{
		db:     db,
		fabric: fabricClient,
		logger: logger,
	}
}

// CreateLog creates a new audit log
func (s *LogService) CreateLog(req *models.CreateLogRequest) (*models.LogResponse, error) {
	// Convert payload to JSON string
	payloadBytes, err := json.Marshal(req.Payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}
	payloadStr := string(payloadBytes)

	// Compute SHA256 hash
	hash := fmt.Sprintf("%x", sha256.Sum256(payloadBytes))

	// Create log entry
	log := &models.Log{
		ID:        uuid.New(),
		CreatedAt: time.Now(),
		Source:    req.Source,
		EventType: req.EventType,
		Payload:   payloadStr,
		Hash:      hash,
	}

	// Save to database
	if err := s.db.Create(log).Error; err != nil {
		return nil, fmt.Errorf("failed to save log to database: %w", err)
	}

	// Commit hash to blockchain
	var txID string
	if s.fabric != nil {
		// Always use database ID for consistency between commit and verification
		txID, err = s.fabric.CommitLogHash(log.ID.String(), hash, map[string]string{
			"source":     req.Source,
			"event_type": req.EventType,
			"created_at": log.CreatedAt.Format(time.RFC3339),
		})
		if err != nil {
			s.logger.WithError(err).Error("Failed to commit hash to blockchain")
			// Don't fail the entire operation, just log the error
		} else {
			// Update log with transaction ID
			log.TxID = &txID
			now := time.Now()
			log.CommittedAt = &now
			s.db.Save(log)
		}
	} else {
		s.logger.Warning("Fabric client is nil - skipping blockchain commit")
	}

	s.logger.WithFields(logrus.Fields{
		"logID":    log.ID,
		"source":   log.Source,
		"eventType": log.EventType,
		"txID":     txID,
	}).Info("Log created successfully")

	return s.toLogResponse(log), nil
}

// GetLog retrieves a log by ID
func (s *LogService) GetLog(id string) (*models.LogResponse, error) {
	var log models.Log
	if err := s.db.Where("id = ?", id).First(&log).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("log not found")
		}
		return nil, fmt.Errorf("failed to get log: %w", err)
	}

	return s.toLogResponse(&log), nil
}

// ListLogs retrieves logs with pagination
func (s *LogService) ListLogs(page, pageSize int, source, eventType string) (*models.ListLogsResponse, error) {
	var logs []models.Log
	var total int64

	query := s.db.Model(&models.Log{})

	// Apply filters
	if source != "" {
		query = query.Where("source = ?", source)
	}
	if eventType != "" {
		query = query.Where("event_type = ?", eventType)
	}

	// Count total records
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count logs: %w", err)
	}

	// Apply pagination
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to get logs: %w", err)
	}

	// Convert to response format
	logResponses := make([]models.LogResponse, len(logs))
	for i, log := range logs {
		logResponses[i] = *s.toLogResponse(&log)
	}

	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))

	return &models.ListLogsResponse{
		Logs:       logResponses,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// toLogResponse converts a Log model to LogResponse
func (s *LogService) toLogResponse(log *models.Log) *models.LogResponse {
	var payload interface{}
	if err := json.Unmarshal([]byte(log.Payload), &payload); err != nil {
		s.logger.WithError(err).Error("Failed to unmarshal payload")
		payload = log.Payload
	}

	return &models.LogResponse{
		ID:          log.ID,
		CreatedAt:   log.CreatedAt,
		Source:      log.Source,
		EventType:   log.EventType,
		Payload:     payload,
		Hash:        log.Hash,
		TxID:        log.TxID,
		CommittedAt: log.CommittedAt,
	}
}
