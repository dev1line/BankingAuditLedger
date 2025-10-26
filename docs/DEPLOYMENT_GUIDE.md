# 📘 Banking Audit Ledger - Deployment Guide

> **Comprehensive guide for deploying and operating the Banking Audit Ledger system**

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Version Information](#version-information)
4. [Quick Start](#quick-start)
5. [Manual Setup](#manual-setup)
6. [Configuration](#configuration)
7. [API Reference](#api-reference)
8. [Common Operations](#common-operations)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)

---

## 🎯 System Overview

The Banking Audit Ledger is an enterprise-grade audit logging system that combines:

- **PostgreSQL** for off-chain data storage
- **Hyperledger Fabric** for immutable blockchain ledger
- **Go Backend** for RESTful API services
- **React Frontend** for web interface

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   React     │────▶│  Go Backend  │────▶│  PostgreSQL  │
│  Frontend   │     │   (API)      │     │  Database    │
└─────────────┘     └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Hyperledger │
                    │   Fabric     │
                    │  (Blockchain)│
                    └──────────────┘
```

---

## ✅ Prerequisites

### Required Software

- **Docker** >= 20.10.0
- **Docker Compose** >= 2.0.0
- **Git** >= 2.30.0

### System Requirements

- **CPU**: 4 cores minimum
- **RAM**: 8GB minimum (16GB recommended)
- **Disk**: 20GB free space
- **OS**: macOS, Linux, or Windows with WSL2

### Verification

Check your system:

```bash
# Check Docker
docker --version
docker-compose --version

# Check Docker is running
docker info

# Check available resources
docker system df
```

---

## 📦 Version Information

All versions are **locked** for stability and reproducibility.

### Docker Images

| Component        | Image                        | Version              |
| ---------------- | ---------------------------- | -------------------- |
| Go Backend       | `golang:alpine`              | `1.24.9-alpine3.21`  |
| Frontend Builder | `node:alpine`                | `18.20.5-alpine3.21` |
| Nginx            | `nginx:alpine`               | `1.27-alpine3.21`    |
| PostgreSQL       | `postgres:alpine`            | `15.10-alpine`       |
| Fabric Orderer   | `hyperledger/fabric-orderer` | `2.4.9`              |
| Fabric Peer      | `hyperledger/fabric-peer`    | `2.4.9`              |

### Go Dependencies

```go
go 1.24.0

// Key dependencies
github.com/gin-gonic/gin v1.9.1
github.com/hyperledger/fabric-gateway v1.9.0
github.com/hyperledger/fabric-protos-go v0.3.2
google.golang.org/grpc v1.75.1
gorm.io/gorm v1.25.4
```

### Node.js Dependencies

```json
{
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "axios": "1.12.2",
  "tailwindcss": "3.4.0"
}
```

---

## 🚀 Quick Start

### Option 1: Automated Startup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd BankingAuditLedger

# Run the startup script
./start.sh
```

The script will:

1. ✓ Check prerequisites
2. ✓ Start Hyperledger Fabric network
3. ✓ Deploy chaincode
4. ✓ Build and start application services
5. ✓ Run system tests

**Total time**: ~3-5 minutes

### Option 2: Quick Docker Compose

```bash
# Start Fabric network first
cd fabric-samples/test-network
./network.sh up createChannel -c mychannel
./network.sh deployCC -ccn loghash -ccp ../chaincode/loghash -ccl go
cd ../..

# Start application services
docker-compose up -d --build
```

---

## 🔧 Manual Setup

### Step 1: Prepare Fabric Network

```bash
cd blockchain-fabric

# Start network with channel and deploy chaincode
./scripts/network.sh up

# Verify network is running
docker ps | grep peer0.bankingaudit.com
```

### Step 2: Verify Chaincode Deployment

```bash
# Check chaincode is deployed (already done by network.sh up)
cd blockchain-fabric

# Verify chaincode is deployed
./scripts/network.sh test
```

Expected output:

```
Committed chaincode definition for chaincode 'loghash' on channel 'mychannel':
Version: 1.0, Sequence: 1, Endorsement Plugin: escc, Validation Plugin: vscc
```

### Step 3: Start Database

```bash
cd ../../  # Back to project root

# Start PostgreSQL only
docker-compose up -d postgres

# Wait for database to be ready
docker-compose exec postgres pg_isready -U audit_user -d banking_audit_db
```

### Step 4: Start Backend

```bash
# Build backend
docker-compose build backend

# Start backend
docker-compose up -d backend

# Check backend health
curl http://localhost:8080/healthz
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-26T...",
  "services": {
    "database": "healthy",
    "fabric": "healthy"
  }
}
```

### Step 5: Start Frontend

```bash
# Build and start frontend
docker-compose up -d frontend

# Verify frontend is accessible
curl -I http://localhost:3000
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=audit_user
DB_PASSWORD=audit_password
DB_NAME=banking_audit_db
DB_SSLMODE=disable

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# Fabric
FABRIC_NETWORK_CONFIG_PATH=/opt/fabric-config
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=loghash
FABRIC_USER_NAME=Admin
FABRIC_ORG_NAME=Org1MSP

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Metrics
METRICS_ENABLED=true
METRICS_PORT=9090

# Frontend
REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
REACT_APP_APP_NAME=Banking Audit Ledger
REACT_APP_VERSION=1.0.0
```

### Network Ports

| Service        | Port | Purpose            |
| -------------- | ---- | ------------------ |
| Frontend       | 3000 | Web UI             |
| Backend API    | 8080 | REST API           |
| Metrics        | 9090 | Prometheus metrics |
| PostgreSQL     | 5432 | Database           |
| Fabric Peer    | 7051 | Peer endpoint      |
| Fabric Orderer | 7050 | Orderer endpoint   |

---

## 📚 API Reference

### Base URL

```
http://localhost:8080/api/v1
```

### Endpoints

#### 1. Create Log

**POST** `/logs`

Create a new audit log entry.

**Request:**

```bash
curl -X POST http://localhost:8080/api/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "source": "core-banking",
    "event_type": "transfer",
    "payload": {
      "from": "account-001",
      "to": "account-002",
      "amount": 1000,
      "currency": "USD"
    }
  }'
```

**Response:**

```json
{
  "id": "d1e72248-5357-49f9-85d0-2ceaae974591",
  "created_at": "2025-10-26T04:57:17.724505Z",
  "source": "core-banking",
  "event_type": "transfer",
  "payload": {
    "from": "account-001",
    "to": "account-002",
    "amount": 1000,
    "currency": "USD"
  },
  "hash": "90b16b3e0caa8ac0781257a3fea28467610fd936b1a336eb3359eb79838e061a",
  "tx_id": "cc97eb91958832e40099330ffa8b4f7ef06e24e95724344911c903a6ac827ecf",
  "committed_at": "2025-10-26T04:57:20.114586Z"
}
```

#### 2. Get Log by ID

**GET** `/logs/:id`

**Request:**

```bash
curl http://localhost:8080/api/v1/logs/d1e72248-5357-49f9-85d0-2ceaae974591
```

#### 3. List Logs

**GET** `/logs`

**Query Parameters:**

- `page` (int): Page number (default: 1)
- `page_size` (int): Items per page (default: 10)
- `source` (string): Filter by source
- `event_type` (string): Filter by event type

**Request:**

```bash
curl "http://localhost:8080/api/v1/logs?page=1&page_size=10&source=core-banking"
```

**Response:**

```json
{
  "logs": [...],
  "total": 62,
  "page": 1,
  "page_size": 10,
  "total_pages": 7
}
```

#### 4. Verify Log

**GET** `/verify/:id`

Verify log integrity against blockchain.

**Request:**

```bash
curl http://localhost:8080/api/v1/verify/d1e72248-5357-49f9-85d0-2ceaae974591
```

**Response:**

```json
{
  "id": "d1e72248-5357-49f9-85d0-2ceaae974591",
  "hash_offchain": "90b16b3e0caa8ac0781257a3fea28467610fd936b1a336eb3359eb79838e061a",
  "hash_onchain": "90b16b3e0caa8ac0781257a3fea28467610fd936b1a336eb3359eb79838e061a",
  "is_valid": true,
  "verified_at": "2025-10-26T04:57:33.775075Z"
}
```

#### 5. Health Check

**GET** `/healthz`

**Request:**

```bash
curl http://localhost:8080/healthz
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-26T04:57:10.288151Z",
  "services": {
    "database": "healthy",
    "fabric": "healthy"
  }
}
```

---

## 🔨 Common Operations

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Fabric peer logs
docker logs -f peer0.org1.example.com
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

### Stop Services

```bash
# Stop application services only
docker-compose down

# Stop Fabric network
cd fabric-samples/test-network
./network.sh down
cd ../..

# Stop everything
docker-compose down
cd fabric-samples/test-network && ./network.sh down
```

### Database Operations

```bash
# Access database shell
docker-compose exec postgres psql -U audit_user -d banking_audit_db

# Run SQL query
docker-compose exec postgres psql -U audit_user -d banking_audit_db -c "SELECT COUNT(*) FROM logs;"

# Backup database
docker-compose exec postgres pg_dump -U audit_user banking_audit_db > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U audit_user -d banking_audit_db
```

### Chaincode Operations

```bash
cd blockchain-fabric

# Test chaincode
./scripts/network.sh test

# Query chaincode manually
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="BankingAuditMSP"
export CORE_PEER_ADDRESS=localhost:7051

# Invoke chaincode
peer chaincode invoke \
  -o localhost:7050 \
  -C mychannel \
  -n loghash \
  --tls \
  -c '{"Args":["CommitLogHash","test-id","abcd1234...","{}"]}'
```

### System Monitoring

```bash
# Check service status
docker-compose ps

# Check resource usage
docker stats

# Check disk usage
docker system df

# View metrics
curl http://localhost:9090/metrics
```

---

## 🔍 Troubleshooting

### Issue: Backend cannot connect to Fabric

**Symptoms:**

```
Error: failed to submit transaction: connection refused
```

**Solution:**

```bash
# 1. Check Fabric network is running
docker ps | grep peer0.org1.example.com

# 2. Check chaincode is deployed
cd fabric-samples/test-network
docker exec peer0.org1.example.com \
  peer lifecycle chaincode querycommitted -C mychannel

# 3. Restart backend
cd ../..
docker-compose restart backend
```

### Issue: Database connection failed

**Symptoms:**

```
Error: failed to connect to database
```

**Solution:**

```bash
# 1. Check PostgreSQL is running
docker-compose ps postgres

# 2. Test connection
docker-compose exec postgres pg_isready -U audit_user -d banking_audit_db

# 3. Check logs
docker-compose logs postgres

# 4. Restart PostgreSQL
docker-compose restart postgres
```

### Issue: Frontend cannot reach backend

**Symptoms:**

- API calls fail with network error
- CORS errors in browser console

**Solution:**

```bash
# 1. Check backend is running
curl http://localhost:8080/healthz

# 2. Check backend logs
docker-compose logs backend

# 3. Verify API URL in frontend
# Should be: http://localhost:8080/api/v1

# 4. Restart frontend
docker-compose restart frontend
```

### Issue: Port already in use

**Symptoms:**

```
Error: Bind for 0.0.0.0:8080 failed: port is already allocated
```

**Solution:**

```bash
# Find process using the port
lsof -i :8080
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Issue: Chaincode deployment fails

**Symptoms:**

```
Error: chaincode install failed
```

**Solution:**

```bash
cd fabric-samples/test-network

# 1. Clean up network
./network.sh down

# 2. Remove old chaincode packages
rm -rf ../chaincode/loghash/vendor

# 3. Restart network
./network.sh up createChannel -c mychannel

# 4. Redeploy chaincode
./network.sh deployCC -ccn loghash -ccp ../chaincode/loghash -ccl go
```

---

## 🚢 Production Deployment

### Security Checklist

- [ ] Change default database passwords
- [ ] Enable TLS for all connections
- [ ] Configure firewall rules
- [ ] Set up authentication/authorization
- [ ] Enable audit logging
- [ ] Configure backup strategy
- [ ] Set up monitoring alerts

### Performance Tuning

#### Database

```yaml
# docker-compose.yml
postgres:
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "effective_cache_size=1GB"
```

#### Backend

```yaml
backend:
  deploy:
    replicas: 3
    resources:
      limits:
        cpus: "2"
        memory: 2G
      reservations:
        cpus: "1"
        memory: 512M
```

### Backup Strategy

```bash
# Daily database backup
0 2 * * * docker-compose exec -T postgres \
  pg_dump -U audit_user banking_audit_db | \
  gzip > /backups/audit_$(date +\%Y\%m\%d).sql.gz

# Fabric ledger backup
docker exec peer0.org1.example.com \
  tar czf /tmp/ledger-backup.tar.gz \
  /var/hyperledger/production
```

### Monitoring

Use Prometheus + Grafana:

```yaml
# docker-compose.yml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9091:9090"

grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
```

---

## 📝 Additional Resources

- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)
- [Go Gin Framework](https://gin-gonic.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)

---

## 📞 Support

For issues or questions:

1. Check this deployment guide
2. Review logs: `docker-compose logs -f`
3. Check system status: `./start.sh` output
4. Consult [README.md](./README.md) for architecture overview

---

**Built with ❤️ for enterprise blockchain solutions**
