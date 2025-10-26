# 📦 Version Lock File

> **Stable versions tested and verified for Banking Audit Ledger**
>
> Last updated: 2025-10-26

## 🎯 Purpose

This file documents all locked versions to ensure:

- **Reproducible builds** across different environments
- **Stability** by preventing unexpected updates
- **Compatibility** between all components

## 🐳 Docker Images

### Base Images

| Component      | Image                        | Version              | Purpose              |
| -------------- | ---------------------------- | -------------------- | -------------------- |
| Go Builder     | `golang:alpine`              | `1.24.9-alpine3.21`  | Backend compilation  |
| Go Runtime     | `alpine`                     | `3.21`               | Backend runtime      |
| Node Builder   | `node:alpine`                | `18.20.5-alpine3.21` | Frontend compilation |
| Nginx          | `nginx:alpine`               | `1.27-alpine3.21`    | Frontend serving     |
| PostgreSQL     | `postgres:alpine`            | `15.10-alpine`       | Database             |
| Fabric Orderer | `hyperledger/fabric-orderer` | `2.4.9`              | Blockchain orderer   |
| Fabric Peer    | `hyperledger/fabric-peer`    | `2.4.9`              | Blockchain peer      |

### Why These Versions?

- **Alpine Linux 3.21**: Latest stable, minimal attack surface
- **Go 1.24.9**: Latest stable with security patches
- **Node 18.20.5**: LTS version with long-term support
- **Nginx 1.27**: Stable version with HTTP/2 support
- **PostgreSQL 15.10**: Latest stable 15.x series
- **Fabric 2.4.9**: Latest stable 2.4.x LTS series

## 🔧 Backend (Go)

### Go Version

```
go 1.24.0
toolchain go1.24.9
```

### Core Dependencies

| Package                                   | Version   | Purpose            |
| ----------------------------------------- | --------- | ------------------ |
| `github.com/gin-gonic/gin`                | `v1.9.1`  | HTTP web framework |
| `github.com/hyperledger/fabric-gateway`   | `v1.9.0`  | Fabric client      |
| `github.com/hyperledger/fabric-protos-go` | `v0.3.2`  | Fabric protobuf    |
| `google.golang.org/grpc`                  | `v1.75.1` | gRPC client        |
| `gorm.io/gorm`                            | `v1.25.4` | ORM                |
| `gorm.io/driver/postgres`                 | `v1.5.2`  | PostgreSQL driver  |
| `github.com/sirupsen/logrus`              | `v1.9.3`  | Logging            |
| `github.com/google/uuid`                  | `v1.6.0`  | UUID generation    |
| `github.com/prometheus/client_golang`     | `v1.16.0` | Metrics            |

### Full Dependency Tree

See [backend-go/go.mod](backend-go/go.mod) for complete list.

## 🎨 Frontend (React)

### Node Version

```
node: 18.20.5
npm: 10.x
```

### Core Dependencies

| Package            | Version   | Purpose            |
| ------------------ | --------- | ------------------ |
| `react`            | `19.2.0`  | UI framework       |
| `react-dom`        | `19.2.0`  | React DOM renderer |
| `react-router-dom` | `7.9.4`   | Routing            |
| `axios`            | `1.12.2`  | HTTP client        |
| `tailwindcss`      | `3.4.0`   | CSS framework      |
| `lucide-react`     | `0.548.0` | Icons              |
| `typescript`       | `4.9.5`   | Type safety        |
| `react-scripts`    | `5.0.1`   | Build tooling      |

### Dev Dependencies

| Package                  | Version   | Purpose           |
| ------------------------ | --------- | ----------------- |
| `@testing-library/react` | `16.3.0`  | Testing utilities |
| `@types/react`           | `19.2.2`  | React types       |
| `autoprefixer`           | `10.4.21` | CSS autoprefixing |
| `postcss`                | `8.5.6`   | CSS processing    |

### Full Dependency Tree

See [frontend-react/package.json](frontend-react/package.json) for complete list.

## ⛓️ Blockchain (Hyperledger Fabric)

### Fabric Version

```
Fabric: 2.4.9
Fabric CA: 1.5.6 (compatible)
```

### Chaincode

| Component | Version | Language |
| --------- | ------- | -------- |
| `loghash` | `1.0`   | Go       |

### Fabric Components

| Component             | Version           | Purpose          |
| --------------------- | ----------------- | ---------------- |
| `fabric-chaincode-go` | Latest compatible | Chaincode shim   |
| `fabric-protos-go`    | Latest compatible | Protocol buffers |

## 🗄️ Database

### PostgreSQL

```
Version: 15.10
```

### Schema Version

Managed by GORM migrations. See [backend-go/internal/database/database.go](backend-go/internal/database/database.go)

## 🔄 Update Policy

### When to Update

✅ **Update when:**

- Security vulnerabilities discovered
- Critical bug fixes available
- New features required for business logic

❌ **Don't update for:**

- Minor version bumps without specific need
- "Just to stay current"
- Unstable/beta versions

### Update Process

1. **Test in development first**
2. **Update VERSIONS.md**
3. **Update go.mod / package.json**
4. **Update Dockerfile**
5. **Rebuild and test**
6. **Document changes in CHANGELOG**

### Version Update Commands

```bash
# Backend: Update Go dependencies
cd backend-go
go get -u github.com/package/name@vX.Y.Z
go mod tidy

# Frontend: Update npm packages
cd frontend-react
npm install package@X.Y.Z

# Docker: Update in Dockerfile and docker-compose.yml
```

## 🧪 Tested Combinations

The following combinations have been tested and verified:

### Development Environment

- macOS 14.6 (Sonoma)
- Docker Desktop 4.27.0
- Docker Engine 25.0.3
- Docker Compose 2.24.5

### Production Environment

- Ubuntu 22.04 LTS
- Docker Engine 24.0.7
- Docker Compose 2.23.0

## 📋 Compatibility Matrix

| Component          | Min Version | Tested Version | Max Version |
| ------------------ | ----------- | -------------- | ----------- |
| Docker             | 20.10.0     | 25.0.3         | Latest      |
| Docker Compose     | 2.0.0       | 2.24.5         | Latest      |
| Go (development)   | 1.24.0      | 1.24.9         | 1.24.x      |
| Node (development) | 18.0.0      | 18.20.5        | 18.x LTS    |

## 🔐 Security Updates

### Current Status

All dependencies are up-to-date as of **2025-10-26** with no known vulnerabilities.

### Vulnerability Scanning

```bash
# Backend
cd backend-go
go list -json -m all | nancy sleuth

# Frontend
cd frontend-react
npm audit

# Docker images
docker scan bankingauditledger-backend:latest
docker scan bankingauditledger-frontend:latest
```

## 📝 Changelog

### 2025-10-26 - Initial Version Lock

- ✅ All versions locked for first stable release
- ✅ Tested with Hyperledger Fabric 2.4.9
- ✅ Verified blockchain integration working
- ✅ All services healthy and operational

---

**Note:** This file should be updated whenever any version changes. Always test thoroughly before deploying version updates to production.
