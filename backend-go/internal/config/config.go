package config

import (
	"os"
	"strconv"
)

// Config holds all configuration for the application
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Fabric   FabricConfig
	LogLevel string
	LogFormat string
	MetricsEnabled bool
	MetricsPort    int
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Host string
	Port int
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
	SSLMode  string
}

// FabricConfig holds Hyperledger Fabric configuration
type FabricConfig struct {
	NetworkConfigPath string
	ChannelName       string
	ChaincodeName     string
	UserName          string
	OrgName           string
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Host: getEnv("SERVER_HOST", "0.0.0.0"),
			Port: getEnvAsInt("SERVER_PORT", 8080),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnvAsInt("DB_PORT", 5432),
			User:     getEnv("DB_USER", "audit_user"),
			Password: getEnv("DB_PASSWORD", "audit_password"),
			Name:     getEnv("DB_NAME", "banking_audit_db"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
	Fabric: FabricConfig{
		NetworkConfigPath: getEnv("FABRIC_NETWORK_CONFIG_PATH", "../blockchain-fabric/network-base"),
		ChannelName:       getEnv("FABRIC_CHANNEL_NAME", "mychannel"),
		ChaincodeName:     getEnv("FABRIC_CHAINCODE_NAME", "loghash"),
		UserName:          getEnv("FABRIC_USER_NAME", "Admin"),
		OrgName:           getEnv("FABRIC_ORG_NAME", "Org1MSP"),
	},
		LogLevel:       getEnv("LOG_LEVEL", "info"),
		LogFormat:      getEnv("LOG_FORMAT", "json"),
		MetricsEnabled: getEnvAsBool("METRICS_ENABLED", true),
		MetricsPort:    getEnvAsInt("METRICS_PORT", 9090),
	}
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt gets an environment variable as integer with a default value
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getEnvAsBool gets an environment variable as boolean with a default value
func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
