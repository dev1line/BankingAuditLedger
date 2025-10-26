package services

import (
	"fmt"
	"time"

	"github.com/banking-audit-ledger/backend/internal/models"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// VerificationService handles log verification operations
type VerificationService struct {
	db     *gorm.DB
	fabric FabricClient
	logger *logrus.Logger
}

// NewVerificationService creates a new verification service
func NewVerificationService(db *gorm.DB, fabricClient FabricClient, logger *logrus.Logger) *VerificationService {
	return &VerificationService{
		db:     db,
		fabric: fabricClient,
		logger: logger,
	}
}

// VerifyLog verifies the integrity of a log by comparing off-chain and on-chain hashes
func (s *VerificationService) VerifyLog(id string) (*models.VerificationResponse, error) {
	// Get log from database
	var log models.Log
	if err := s.db.Where("id = ?", id).First(&log).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("log not found")
		}
		return nil, fmt.Errorf("failed to get log: %w", err)
	}

	// Get hash from blockchain
	blockchainLogHash, err := s.fabric.GetLogHash(id)
	if err != nil {
		s.logger.WithError(err).WithField("logID", id).Error("Failed to get hash from blockchain")
		return &models.VerificationResponse{
			ID:           log.ID,
			HashOffChain: log.Hash,
			HashOnChain:  "",
			IsValid:      false,
			VerifiedAt:   time.Now(),
		}, nil
	}

	// Compare hashes
	isValid := log.Hash == blockchainLogHash.Hash

	s.logger.WithFields(logrus.Fields{
		"logID":        id,
		"hashOffChain": log.Hash,
		"hashOnChain":  blockchainLogHash.Hash,
		"isValid":      isValid,
	}).Info("Log verification completed")

	return &models.VerificationResponse{
		ID:           log.ID,
		HashOffChain: log.Hash,
		HashOnChain:  blockchainLogHash.Hash,
		IsValid:      isValid,
		VerifiedAt:   time.Now(),
	}, nil
}

// VerifyLogWithHash verifies a log with a provided hash
func (s *VerificationService) VerifyLogWithHash(id, providedHash string) (*models.VerificationResponse, error) {
	// Get log from database
	var log models.Log
	if err := s.db.Where("id = ?", id).First(&log).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("log not found")
		}
		return nil, fmt.Errorf("failed to get log: %w", err)
	}

	// Verify with blockchain
	isValid, err := s.fabric.VerifyLogHash(id, providedHash)
	if err != nil {
		s.logger.WithError(err).WithField("logID", id).Error("Failed to verify hash with blockchain")
		return &models.VerificationResponse{
			ID:           log.ID,
			HashOffChain: log.Hash,
			HashOnChain:  "",
			IsValid:      false,
			VerifiedAt:   time.Now(),
		}, nil
	}

	s.logger.WithFields(logrus.Fields{
		"logID":        id,
		"hashOffChain": log.Hash,
		"providedHash": providedHash,
		"isValid":      isValid,
	}).Info("Log verification with provided hash completed")

	return &models.VerificationResponse{
		ID:           log.ID,
		HashOffChain: log.Hash,
		HashOnChain:  providedHash,
		IsValid:      isValid,
		VerifiedAt:   time.Now(),
	}, nil
}
