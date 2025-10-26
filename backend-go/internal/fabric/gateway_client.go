package fabric

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"time"

	"github.com/banking-audit-ledger/backend/internal/config"
	"github.com/hyperledger/fabric-gateway/pkg/client"
	"github.com/hyperledger/fabric-gateway/pkg/identity"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

// LogHash represents a log hash entry on the blockchain
type LogHash struct {
	LogID     string            `json:"logID"`
	Hash      string            `json:"hash"`
	TxID      string            `json:"txID"`
	Timestamp string            `json:"timestamp"`
	Metadata  map[string]string `json:"metadata"`
}

// GatewayClient represents a Fabric Gateway client
type GatewayClient struct {
	gateway *client.Gateway
	network *client.Network
	Config  config.FabricConfig
	Logger  *logrus.Logger
}

// NewGatewayClient creates a new Fabric Gateway client
func NewGatewayClient(cfg config.FabricConfig) (*GatewayClient, error) {
	logger := logrus.New()

	// Load client certificate and key
	clientCertPath := filepath.Join(cfg.NetworkConfigPath, "organizations", "peerOrganizations", "org1.example.com", "users", "Admin@org1.example.com", "msp", "signcerts", "Admin@org1.example.com-cert.pem")
	clientKeyPath := filepath.Join(cfg.NetworkConfigPath, "organizations", "peerOrganizations", "org1.example.com", "users", "Admin@org1.example.com", "msp", "keystore")
	
	keyFiles, err := ioutil.ReadDir(clientKeyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read keystore: %w", err)
	}
	if len(keyFiles) == 0 {
		return nil, fmt.Errorf("no keys found in keystore")
	}
	clientKeyPath = filepath.Join(clientKeyPath, keyFiles[0].Name())

	clientCert, err := loadTLSCertificate(clientCertPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load client certificate: %w", err)
	}

	clientKey, err := loadPrivateKeyGW(clientKeyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load private key: %w", err)
	}

	// Create identity - use Org1MSP as the MSP ID
	id, err := identity.NewX509Identity("Org1MSP", clientCert)
	if err != nil {
		return nil, fmt.Errorf("failed to create identity: %w", err)
	}

	// Create sign function
	sign, err := identity.NewPrivateKeySign(clientKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create sign function: %w", err)
	}

	// Load TLS certificate for gRPC connection
	tlsCertPath := filepath.Join(cfg.NetworkConfigPath, "organizations", "peerOrganizations", "org1.example.com", "peers", "peer0.org1.example.com", "tls", "ca.crt")
	tlsCert, err := loadTLSCertificate(tlsCertPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load TLS certificate: %w", err)
	}

	certPool := x509.NewCertPool()
	certPool.AddCert(tlsCert)

	// Create TLS credentials
	tlsCreds := credentials.NewTLS(&tls.Config{
		RootCAs: certPool,
	})

	// Create gRPC connection to peer - use peer0.org1.example.com which is accessible from Docker network
	peerAddr := "peer0.org1.example.com:7051"
	conn, err := grpc.Dial(peerAddr, grpc.WithTransportCredentials(tlsCreds))
	if err != nil {
		return nil, fmt.Errorf("failed to create gRPC connection: %w", err)
	}

	// Create Gateway connection
	gateway, err := client.Connect(
		id,
		client.WithSign(sign),
		client.WithClientConnection(conn),
		client.WithEvaluateTimeout(5*time.Second),
		client.WithEndorseTimeout(15*time.Second),
		client.WithSubmitTimeout(5*time.Second),
		client.WithCommitStatusTimeout(1*time.Minute),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Gateway: %w", err)
	}

	// Get network
	network := gateway.GetNetwork(cfg.ChannelName)

	logger.WithFields(logrus.Fields{
		"channel": cfg.ChannelName,
		"chaincode": cfg.ChaincodeName,
	}).Info("Successfully created Fabric Gateway client")

	return &GatewayClient{
		gateway: gateway,
		network: network,
		Config:  cfg,
		Logger:  logger,
	}, nil
}

// CommitLogHash commits a log hash to the blockchain
func (c *GatewayClient) CommitLogHash(logID, hash string, metadata map[string]string) (string, error) {
	c.Logger.WithFields(logrus.Fields{
		"logID": logID,
		"hash":  hash,
	}).Info("Committing log hash to blockchain via Gateway")

	// Convert metadata to JSON
	metadataJSON := "{}"
	if metadata != nil && len(metadata) > 0 {
		metadataBytes, err := json.Marshal(metadata)
		if err != nil {
			return "", fmt.Errorf("failed to marshal metadata: %w", err)
		}
		metadataJSON = string(metadataBytes)
	}

	// Get contract
	contract := c.network.GetContract(c.Config.ChaincodeName)

	// Submit transaction with logID, hash, and metadata
	result, err := contract.SubmitTransaction("CommitLogHash", logID, hash, metadataJSON)
	if err != nil {
		return "", fmt.Errorf("failed to submit transaction: %w", err)
	}

	txID := string(result)
	c.Logger.WithFields(logrus.Fields{
		"txID": txID,
		"logID": logID,
	}).Info("Transaction committed successfully via Gateway")

	return txID, nil
}

// GetLogHash retrieves a log hash from the blockchain
func (c *GatewayClient) GetLogHash(logID string) (*LogHash, error) {
	c.Logger.WithFields(logrus.Fields{
		"logID": logID,
	}).Info("Getting log hash from blockchain via Gateway")

	// Get contract
	contract := c.network.GetContract(c.Config.ChaincodeName)

	// Evaluate transaction
	result, err := contract.EvaluateTransaction("GetLogHash", logID)
	if err != nil {
		return nil, fmt.Errorf("failed to evaluate transaction: %w", err)
	}

	// Parse result
	var logHash LogHash
	if err := json.Unmarshal(result, &logHash); err != nil {
		return nil, fmt.Errorf("failed to unmarshal result: %w", err)
	}

	c.Logger.WithFields(logrus.Fields{
		"logID": logID,
		"found": logHash.LogID != "",
	}).Info("Retrieved log hash from blockchain")

	return &logHash, nil
}

// VerifyLogHash verifies a log hash against the blockchain
func (c *GatewayClient) VerifyLogHash(logID, hash string) (bool, error) {
	c.Logger.WithFields(logrus.Fields{
		"logID": logID,
		"hash":  hash,
	}).Info("Verifying log hash against blockchain via Gateway")

	// Get contract
	contract := c.network.GetContract(c.Config.ChaincodeName)

	// Evaluate transaction
	result, err := contract.EvaluateTransaction("VerifyLogHash", logID, hash)
	if err != nil {
		return false, fmt.Errorf("failed to evaluate transaction: %w", err)
	}

	// Parse result
	var verified bool
	if err := json.Unmarshal(result, &verified); err != nil {
		return false, fmt.Errorf("failed to unmarshal result: %w", err)
	}

	c.Logger.WithFields(logrus.Fields{
		"logID": logID,
		"verified": verified,
	}).Info("Verified log hash against blockchain")

	return verified, nil
}

// Close closes the Gateway client
func (c *GatewayClient) Close() {
	_ = c.gateway.Close()
}

// loadTLSCertificate loads a TLS certificate from file
func loadTLSCertificate(path string) (*x509.Certificate, error) {
	certPEM, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}

	block, _ := pem.Decode(certPEM)
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM certificate")
	}

	return x509.ParseCertificate(block.Bytes)
}

func loadPrivateKey(path string) (interface{}, error) {
	keyPEM, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}

	block, _ := pem.Decode(keyPEM)
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM key")
	}

	return x509.ParsePKCS8PrivateKey(block.Bytes)
}

// loadPrivateKeyGW loads a private key from file (renamed to avoid conflict with legacy)
func loadPrivateKeyGW(path string) (interface{}, error) {
	keyPEM, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}

	block, _ := pem.Decode(keyPEM)
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM key")
	}

	return x509.ParsePKCS8PrivateKey(block.Bytes)
}
