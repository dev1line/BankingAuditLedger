package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// LogHashContract provides functions for managing log hashes
type LogHashContract struct {
	contractapi.Contract
}

// LogHash represents a log hash entry on the blockchain
type LogHash struct {
	LogID     string            `json:"logID"`
	Hash      string            `json:"hash"`
	TxID      string            `json:"txID"`
	Timestamp string            `json:"timestamp"`
	Metadata  map[string]string `json:"metadata"`
}

// CommitLogHash commits a log hash to the blockchain
func (s *LogHashContract) CommitLogHash(ctx contractapi.TransactionContextInterface, logID string, hash string, metadataJSON string) error {
	// Validate inputs
	if logID == "" || hash == "" {
		return fmt.Errorf("logID and hash cannot be empty")
	}

	// Validate hash format (should be SHA256 hex string)
	if len(hash) != 64 {
		return fmt.Errorf("invalid hash format, expected SHA256 hex string")
	}

	// Parse metadata
	var metadata map[string]string
	if metadataJSON != "" {
		if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
			return fmt.Errorf("invalid metadata JSON: %v", err)
		}
	}

	// Get transaction ID
	txID := ctx.GetStub().GetTxID()

	// Create log hash entry
	logHash := LogHash{
		LogID:     logID,
		Hash:      hash,
		TxID:      txID,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Metadata:  metadata,
	}

	// Convert to JSON
	logHashJSON, err := json.Marshal(logHash)
	if err != nil {
		return fmt.Errorf("failed to marshal log hash: %v", err)
	}

	// Store in world state
	err = ctx.GetStub().PutState(logID, logHashJSON)
	if err != nil {
		return fmt.Errorf("failed to put log hash to world state: %v", err)
	}

	// Emit event
	eventPayload := fmt.Sprintf("LogHash committed: %s", logID)
	err = ctx.GetStub().SetEvent("LogHashCommitted", []byte(eventPayload))
	if err != nil {
		return fmt.Errorf("failed to emit event: %v", err)
	}

	return nil
}

// GetLogHash retrieves a log hash from the blockchain
func (s *LogHashContract) GetLogHash(ctx contractapi.TransactionContextInterface, logID string) (*LogHash, error) {
	// Get log hash from world state
	logHashJSON, err := ctx.GetStub().GetState(logID)
	if err != nil {
		return nil, fmt.Errorf("failed to read log hash from world state: %v", err)
	}

	if logHashJSON == nil {
		return nil, fmt.Errorf("log hash %s does not exist", logID)
	}

	// Unmarshal JSON
	var logHash LogHash
	err = json.Unmarshal(logHashJSON, &logHash)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal log hash: %v", err)
	}

	return &logHash, nil
}

// VerifyLogHash verifies if a given hash matches the stored hash
func (s *LogHashContract) VerifyLogHash(ctx contractapi.TransactionContextInterface, logID string, providedHash string) (bool, error) {
	// Get stored log hash
	logHash, err := s.GetLogHash(ctx, logID)
	if err != nil {
		return false, err
	}

	// Compare hashes
	return logHash.Hash == providedHash, nil
}

// GetAllLogHashes retrieves all log hashes (for debugging/admin purposes)
func (s *LogHashContract) GetAllLogHashes(ctx contractapi.TransactionContextInterface) ([]*LogHash, error) {
	// Create range query for all log hashes
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var logHashes []*LogHash
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var logHash LogHash
		err = json.Unmarshal(queryResponse.Value, &logHash)
		if err != nil {
			return nil, err
		}
		logHashes = append(logHashes, &logHash)
	}

	return logHashes, nil
}

// GetLogHashHistory retrieves the history of a specific log hash
func (s *LogHashContract) GetLogHashHistory(ctx contractapi.TransactionContextInterface, logID string) ([]*LogHash, error) {
	// Get history iterator
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(logID)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var history []*LogHash
	for resultsIterator.HasNext() {
		historyResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var logHash LogHash
		err = json.Unmarshal(historyResponse.Value, &logHash)
		if err != nil {
			return nil, err
		}

		// Add transaction timestamp
		logHash.Timestamp = time.Unix(historyResponse.Timestamp.Seconds, int64(historyResponse.Timestamp.Nanos)).UTC().Format(time.RFC3339)
		history = append(history, &logHash)
	}

	return history, nil
}

// ComputeHash computes SHA256 hash of provided data
func (s *LogHashContract) ComputeHash(ctx contractapi.TransactionContextInterface, data string) (string, error) {
	hash := sha256.Sum256([]byte(data))
	return fmt.Sprintf("%x", hash), nil
}

// GetStats returns basic statistics about stored log hashes
func (s *LogHashContract) GetStats(ctx contractapi.TransactionContextInterface) (map[string]interface{}, error) {
	// Get all log hashes
	logHashes, err := s.GetAllLogHashes(ctx)
	if err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"total_logs": len(logHashes),
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
	}

	return stats, nil
}

func main() {
	logHashContract, err := contractapi.NewChaincode(&LogHashContract{})
	if err != nil {
		fmt.Printf("Error creating LogHashContract chaincode: %v", err)
		return
	}

	if err := logHashContract.Start(); err != nil {
		fmt.Printf("Error starting LogHashContract chaincode: %v", err)
	}
}
