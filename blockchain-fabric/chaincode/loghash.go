package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-protos-go/peer"
)

// LogHashContract provides functions for managing log hashes
type LogHashContract struct {
}

// LogHash represents a log hash entry on the blockchain
type LogHash struct {
	LogID     string            `json:"logID"`
	Hash      string            `json:"hash"`
	TxID      string            `json:"txID"`
	Timestamp string            `json:"timestamp"`
	Metadata  map[string]string `json:"metadata"`
}

// Init is called during chaincode instantiation to initialize any
// data. Note that chaincode upgrade also calls this function to reset
// or to migrate data.
func (s *LogHashContract) Init(stub shim.ChaincodeStubInterface) peer.Response {
	return shim.Success(nil)
}

// Invoke is called per transaction on the chaincode. Each transaction is
// either a 'get' or a 'set' on the asset created by Init function. The Set
// method may create a new asset by specifying a new key-value pair.
func (s *LogHashContract) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	// Extract the function and args from the transaction proposal
	fn, args := stub.GetFunctionAndParameters()

	var result string
	var err error
	if fn == "CommitLogHash" {
		result, err = s.CommitLogHash(stub, args)
	} else if fn == "GetLogHash" {
		result, err = s.GetLogHash(stub, args)
	} else if fn == "VerifyLogHash" {
		result, err = s.VerifyLogHash(stub, args)
	} else if fn == "ComputeHash" {
		result, err = s.ComputeHash(stub, args)
	} else if fn == "ListAllKeys" {
		result, err = s.ListAllKeys(stub, args)
	} else {
		return shim.Error("Invalid function name")
	}

	if err != nil {
		return shim.Error(err.Error())
	}

	// Return the result as success payload
	return shim.Success([]byte(result))
}

// CommitLogHash commits a log hash to the blockchain
func (s *LogHashContract) CommitLogHash(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	if len(args) != 3 {
		return "", fmt.Errorf("Incorrect arguments. Expecting: logID, hash, metadataJSON")
	}

	logID := args[0]
	hash := args[1]
	metadataJSON := args[2]
	
	// Debug logging
	fmt.Printf("CommitLogHash called with logID: %s, hash: %s\n", logID, hash)

	// Validate inputs
	if logID == "" || hash == "" {
		return "", fmt.Errorf("logID and hash cannot be empty")
	}

	// Validate hash format (should be SHA256 hex string)
	if len(hash) != 64 {
		return "", fmt.Errorf("invalid hash format, expected SHA256 hex string")
	}

	// Parse metadata
	var metadata map[string]string
	if metadataJSON != "" {
		if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
			return "", fmt.Errorf("invalid metadata JSON: %v", err)
		}
	}

	// Get transaction ID
	txID := stub.GetTxID()

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
		return "", fmt.Errorf("failed to marshal log hash: %v", err)
	}

	// Store in world state
	err = stub.PutState(logID, logHashJSON)
	if err != nil {
		return "", fmt.Errorf("failed to put log hash to world state: %v", err)
	}

	fmt.Printf("Log hash committed with key: %s, value: %s\n", logID, string(logHashJSON))

	// Emit event
	eventPayload := fmt.Sprintf("LogHash committed: %s", logID)
	err = stub.SetEvent("LogHashCommitted", []byte(eventPayload))
	if err != nil {
		return "", fmt.Errorf("failed to emit event: %v", err)
	}

	return txID, nil
}

// GetLogHash retrieves a log hash from the blockchain
func (s *LogHashContract) GetLogHash(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	if len(args) != 1 {
		return "", fmt.Errorf("Incorrect arguments. Expecting: logID")
	}

	logID := args[0]
	
	// Debug logging
	fmt.Printf("GetLogHash called with logID: %s\n", logID)

	// Get log hash from world state
	logHashJSON, err := stub.GetState(logID)
	if err != nil {
		return "", fmt.Errorf("failed to read log hash from world state: %v", err)
	}

	if logHashJSON == nil {
		fmt.Printf("Log hash %s does not exist in world state\n", logID)
		return "", fmt.Errorf("log hash %s does not exist", logID)
	}

	fmt.Printf("Log hash %s found: %s\n", logID, string(logHashJSON))
	return string(logHashJSON), nil
}

// VerifyLogHash verifies if a given hash matches the stored hash
func (s *LogHashContract) VerifyLogHash(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	if len(args) != 2 {
		return "", fmt.Errorf("Incorrect arguments. Expecting: logID, providedHash")
	}

	logID := args[0]
	providedHash := args[1]

	// Get stored log hash
	logHashJSON, err := stub.GetState(logID)
	if err != nil {
		return "", fmt.Errorf("failed to read log hash from world state: %v", err)
	}

	if logHashJSON == nil {
		return "", fmt.Errorf("log hash %s does not exist", logID)
	}

	// Unmarshal JSON
	var logHash LogHash
	err = json.Unmarshal(logHashJSON, &logHash)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal log hash: %v", err)
	}

	// Compare hashes
	isValid := logHash.Hash == providedHash
	return strconv.FormatBool(isValid), nil
}

// ComputeHash computes SHA256 hash of provided data
func (s *LogHashContract) ComputeHash(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	if len(args) != 1 {
		return "", fmt.Errorf("Incorrect arguments. Expecting: data")
	}

	data := args[0]
	hash := sha256.Sum256([]byte(data))
	return fmt.Sprintf("%x", hash), nil
}

// ListAllKeys lists all keys in the world state
func (s *LogHashContract) ListAllKeys(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	// Get state iterator
	iterator, err := stub.GetStateByRange("", "")
	if err != nil {
		return "", fmt.Errorf("failed to get state iterator: %v", err)
	}
	defer iterator.Close()

	var keys []string
	for iterator.HasNext() {
		queryResponse, err := iterator.Next()
		if err != nil {
			return "", fmt.Errorf("failed to get next key: %v", err)
		}
		keys = append(keys, queryResponse.Key)
	}

	// Convert to JSON
	keysJSON, err := json.Marshal(keys)
	if err != nil {
		return "", fmt.Errorf("failed to marshal keys: %v", err)
	}

	return string(keysJSON), nil
}

func main() {
	err := shim.Start(&LogHashContract{})
	if err != nil {
		fmt.Printf("Error starting LogHashContract chaincode: %v", err)
	}
}
