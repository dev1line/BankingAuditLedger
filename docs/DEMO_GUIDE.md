# 🚀 Banking Audit Ledger - Demo Guide

## ✅ Services Running

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Database**: PostgreSQL (Docker)
- **Blockchain**: Hyperledger Fabric (Mock mode)

---

## 📋 Demo Steps

### 1. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

### 2. Create an Audit Log

#### Via API (curl):
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

#### Via Frontend:
1. Go to http://localhost:3000
2. Click on "Admin" or "Dashboard"
3. Click "Create New Log"
4. Fill in the form and submit

### 3. View Logs

#### Via API:
```bash
# Get all logs
curl http://localhost:8080/api/v1/logs

# Get specific log
curl http://localhost:8080/api/v1/logs/{log-id}
```

#### Via Frontend:
1. Navigate to Dashboard
2. View the list of logs
3. Click on a log to see details

### 4. Verify a Log

#### Via API:
```bash
curl http://localhost:8080/api/v1/verify/{log-id}
```

#### Via Frontend:
1. Go to Dashboard
2. Click "Verify" on any log

### 5. Check System Health

```bash
curl http://localhost:8080/healthz
```

---

## 🛠️ API Endpoints

### Logs
- `POST /api/v1/logs` - Create a new log
- `GET /api/v1/logs` - List all logs
- `GET /api/v1/logs/:id` - Get specific log

### Verification
- `GET /api/v1/verify/:id` - Verify log integrity

### System
- `GET /healthz` - Health check
- `GET /metrics` - Prometheus metrics

---

## 📊 Example Use Cases

### 1. Transaction Audit
```json
{
  "source": "core-banking",
  "event_type": "transaction",
  "payload": {
    "transaction_id": "TXN-12345",
    "amount": 5000,
    "currency": "USD",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### 2. Access Control Audit
```json
{
  "source": "security-system",
  "event_type": "access",
  "payload": {
    "user": "admin",
    "resource": "/api/users",
    "action": "read",
    "ip": "192.168.1.100"
  }
}
```

---

## 🔍 Monitoring

### Check Backend Logs
```bash
docker logs -f banking-audit-backend
```

### Check Database
```bash
docker exec -it banking-audit-postgres psql -U audit_user -d banking_audit_db -c "SELECT COUNT(*) FROM logs;"
```

### Check Frontend
```bash
tail -f frontend-react/npm-debug.log  # if there are any issues
```

---

## ⚠️ Important Notes

1. **Blockchain**: Currently using Mock Fabric client (blockchain features are simulated)
2. **Database**: PostgreSQL is running in Docker container
3. **Frontend**: React app on port 3000
4. **Backend**: Go API on port 8080

---

## 🛑 Stop Services

```bash
# Stop all services
docker-compose down

# Stop specific service
docker stop banking-audit-backend
docker stop banking-audit-postgres
```

---

## 📝 Next Steps

1. Replace mock Fabric client with real Hyperledger Fabric integration
2. Add authentication and authorization
3. Implement real-time notifications
4. Add advanced querying and analytics
5. Deploy to production environment

---

**Happy Demo! 🎉**
