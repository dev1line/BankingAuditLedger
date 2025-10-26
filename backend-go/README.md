# Banking Audit Ledger - Go Backend

This is the backend service for the Banking Audit Ledger system built with Go.

## Overview

The backend provides:

- REST API for log management
- PostgreSQL integration for off-chain storage
- Hyperledger Fabric SDK integration for blockchain operations
- Log hash computation and verification
- Health checks and metrics

## Features

- **Log Management**: Store and retrieve audit logs
- **Hash Verification**: Compute SHA256 hashes and verify against blockchain
- **Blockchain Integration**: Commit hashes to Hyperledger Fabric
- **Database Operations**: PostgreSQL for log storage and metadata
- **API Endpoints**: RESTful API for frontend integration
- **Monitoring**: Health checks and Prometheus metrics

## Quick Start

1. Install dependencies:

```bash
go mod tidy
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the application:

```bash
go run main.go
```

## API Endpoints

- `POST /logs` - Create a new audit log
- `GET /logs/:id` - Get log by ID
- `GET /logs` - List all logs with pagination
- `GET /verify/:id` - Verify log integrity
- `GET /healthz` - Health check
- `GET /metrics` - Prometheus metrics

## Configuration

See `.env.example` for all available configuration options.
