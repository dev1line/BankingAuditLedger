# 🔍 Amazon Managed Blockchain (AMB) vs Self-Managed Comparison

> **Comparing AWS Managed Blockchain with Self-Managed Hyperledger Fabric on EC2**

## 📋 Executive Summary

| Aspect                   | Self-Managed EC2 | Amazon Managed Blockchain (AMB) | Winner |
| ------------------------ | ---------------- | ------------------------------- | ------ |
| **Setup Time**           | 2-4 hours        | 15-30 minutes                   | ✅ AMB |
| **Operational Overhead** | High             | Low                             | ✅ AMB |
| **Cost**                 | $215/month       | $380/month                      | ✅ EC2 |
| **Flexibility**          | Full control     | Limited                         | ✅ EC2 |
| **Scalability**          | Manual           | Automatic                       | ✅ AMB |
| **Maintenance**          | Self             | AWS                             | ✅ AMB |
| **Customization**        | Full             | Limited                         | ✅ EC2 |

---

## 🏗️ Architecture Comparison

### Self-Managed on EC2

```
┌─────────────────────────────────────┐
│         Your AWS Account             │
│                                      │
│  ┌────────────┐    ┌─────────────┐  │
│  │  Orderer   │    │   Peer      │  │
│  │  EC2       │◄───┤   EC2       │  │
│  │  t3.medium │    │   t3.large  │  │
│  └────────────┘    └─────────────┘  │
│       ▲                  ▲           │
│       │ You manage:      │           │
│       │ - OS patches     │           │
│       │ - Docker         │           │
│       │ - Fabric config  │           │
│       │ - Monitoring     │           │
│       │ - Scaling        │           │
│       │ - Backups        │           │
│       └──────────────────┘           │
└─────────────────────────────────────┘
```

### Amazon Managed Blockchain

```
┌─────────────────────────────────────┐
│      AWS Managed Blockchain         │
│          (Black Box)                │
│                                      │
│  ┌─────────────────────────────┐    │
│  │  Managed Fabric Network     │    │
│  │  ✓ Auto-scaling             │    │
│  │  ✓ Auto-patching            │    │
│  │  ✓ Built-in monitoring      │    │
│  │  ✓ Integrated logging       │    │
│  │  ✓ Automated backups        │    │
│  └─────────────────────────────┘    │
│              ▲                       │
│              │ VPC Endpoint          │
│              │                       │
│  ┌───────────┴──────────┐            │
│  │   Your Application   │            │
│  │   (ECS/EC2)          │            │
│  └──────────────────────┘            │
└─────────────────────────────────────┘
```

---

## 💰 Cost Comparison

### Self-Managed EC2 (Monthly)

| Component               | Qty | Unit Cost | Total    |
| ----------------------- | --- | --------- | -------- |
| EC2 Orderer (t3.medium) | 3   | $30       | $90      |
| EC2 Peer (t3.large)     | 2   | $60       | $120     |
| EBS Storage (100GB)     | 5   | $10       | $50      |
| **Subtotal**            |     |           | **$260** |

**Pros:**

- ✅ Lower base cost
- ✅ Pay only for what you use
- ✅ Can use Spot/Reserved instances

**Cons:**

- ❌ Hidden costs: DevOps time, monitoring tools, backup solutions
- ❌ Operational overhead not factored in

### Amazon Managed Blockchain (Monthly)

| Component                    | Qty | Unit Cost | Total    |
| ---------------------------- | --- | --------- | -------- |
| Network (STARTER Edition)    | 1   | $220      | $220     |
| Peer Node (bc.t3.small)      | 1   | $70       | $70      |
| Peer Node (bc.t3.small)      | 1   | $70       | $70      |
| Data Storage (10GB included) | -   | $0        | $0       |
| Data Transfer                | -   | $0.01/GB  | $1       |
| **Subtotal**                 |     |           | **$361** |

**Pros:**

- ✅ Fully managed - no DevOps overhead
- ✅ Built-in monitoring & logging
- ✅ Automatic scaling & updates
- ✅ AWS Support included

**Cons:**

- ❌ ~40% higher base cost
- ❌ Less flexible pricing options

### Total Cost of Ownership (TCO) - 1 Year

| Item                          | Self-Managed | AMB        | Difference   |
| ----------------------------- | ------------ | ---------- | ------------ |
| Infrastructure                | $3,120       | $4,332     | +$1,212      |
| DevOps (0.5 FTE @ $120k/year) | $60,000      | $0         | -$60,000     |
| Monitoring Tools              | $1,200       | $0         | -$1,200      |
| **Total**                     | **$64,320**  | **$4,332** | **-$59,988** |

**Winner: ✅ AMB** (when factoring in operational costs)

---

## ⚙️ Feature Comparison

### Hyperledger Fabric Features

| Feature                     | Self-Managed   | AMB        | Notes             |
| --------------------------- | -------------- | ---------- | ----------------- |
| Fabric Version              | 2.4.9 (latest) | 2.2        | AMB lags behind   |
| Custom Chaincode            | ✅ Yes         | ✅ Yes     | Both support      |
| Multiple Channels           | ✅ Yes         | ✅ Yes     | Both support      |
| Private Data Collections    | ✅ Yes         | ✅ Yes     | Both support      |
| CouchDB/LevelDB             | ✅ Both        | ✅ Both    | Both support      |
| Custom Endorsement Policies | ✅ Yes         | ⚠️ Limited | EC2 more flexible |
| Raft Consensus              | ✅ Yes         | ✅ Yes     | Both support      |
| Multi-Org Network           | ✅ Yes         | ✅ Yes     | Both support      |

### Operational Features

| Feature                | Self-Managed        | AMB          |
| ---------------------- | ------------------- | ------------ |
| Auto-scaling           | ❌ Manual           | ✅ Automatic |
| Patch Management       | ❌ Manual           | ✅ Automatic |
| Backup                 | ❌ Manual           | ✅ Automatic |
| Monitoring             | ❌ Setup CloudWatch | ✅ Built-in  |
| High Availability      | ❌ Manual setup     | ✅ Built-in  |
| Disaster Recovery      | ❌ Manual           | ✅ Managed   |
| Certificate Management | ❌ Manual           | ✅ Managed   |
| Network Upgrades       | ❌ Manual           | ✅ Automatic |

---

## 🚀 Deployment Complexity

### Self-Managed EC2

**Steps Required:**

1. ✅ Create VPC & Subnets
2. ✅ Launch EC2 instances
3. ✅ Install Docker
4. ✅ Generate crypto materials
5. ✅ Configure orderer
6. ✅ Configure peers
7. ✅ Create channel
8. ✅ Deploy chaincode
9. ✅ Setup monitoring
10. ✅ Configure backups
11. ✅ Setup logging
12. ✅ Security hardening

**Time: ~4 hours**

### Amazon Managed Blockchain

**Steps Required:**

1. ✅ Create VPC & Subnets
2. ✅ Create AMB Network (via CDK)
3. ✅ Create VPC Endpoint
4. ✅ Deploy chaincode

**Time: ~30 minutes**

---

## 📊 Performance Comparison

### Throughput

| Metric           | Self-Managed | AMB       | Notes                |
| ---------------- | ------------ | --------- | -------------------- |
| Transactions/sec | 1000+        | 500-800   | EC2 can be optimized |
| Latency (avg)    | 100-200ms    | 150-300ms | Similar              |
| Endorsement Time | 50-100ms     | 100-200ms | AMB slightly slower  |

### Scalability

**Self-Managed:**

- ✅ Scale to thousands of TPS with optimization
- ✅ Add nodes anytime
- ❌ Requires planning and testing

**AMB:**

- ⚠️ Limited to 500-800 TPS (STARTER edition)
- ⚠️ STANDARD edition: 1000+ TPS but much more expensive
- ✅ Automatic scaling within limits

---

## 🔒 Security Comparison

| Security Feature         | Self-Managed           | AMB                      |
| ------------------------ | ---------------------- | ------------------------ |
| Network Isolation        | VPC                    | ✅ VPC + AMB isolation   |
| Encryption at Rest       | ✅ Manual setup        | ✅ Automatic             |
| Encryption in Transit    | ✅ Manual setup        | ✅ Automatic             |
| Key Management           | ❌ Your responsibility | ✅ AWS KMS               |
| Audit Logging            | ❌ Manual setup        | ✅ CloudTrail integrated |
| Compliance (SOC2, HIPAA) | ❌ Your audit          | ✅ AWS certified         |
| Certificate Rotation     | ❌ Manual              | ✅ Automatic             |

**Winner: ✅ AMB** (better security by default)

---

## 🛠️ Maintenance Comparison

### Self-Managed EC2

**Monthly Tasks:**

- 🔧 OS patches (4-8 hours)
- 🔧 Fabric upgrades (4-8 hours)
- 🔧 Monitor disk space (1 hour)
- 🔧 Backup verification (2 hours)
- 🔧 Security updates (2 hours)
- 🔧 Certificate renewal (1 hour)

**Total: ~15-25 hours/month**

### Amazon Managed Blockchain

**Monthly Tasks:**

- ✅ Chaincode updates (1 hour)
- ✅ Monitor dashboard (1 hour)

**Total: ~2 hours/month**

**Savings: ~20 hours/month** (⅔ of a DevOps engineer)

---

## ⚠️ Limitations of AMB

### 1. Fabric Version

**Issue:** AMB supports Fabric 2.2, while latest is 2.5

- Self-managed can use latest features
- AMB lags 1-2 major versions

### 2. Region Availability

AMB available in limited regions:

- ✅ us-east-1 (N. Virginia)
- ✅ us-east-2 (Ohio)
- ✅ ap-southeast-1 (Singapore)
- ✅ ap-northeast-1 (Tokyo)
- ✅ ap-northeast-2 (Seoul)
- ✅ eu-west-1 (Ireland)
- ✅ eu-west-2 (London)

**Not available** in: ap-south-1, sa-east-1, and many others

### 3. Customization

**Limited:**

- Cannot modify Fabric core configuration
- Cannot use custom Fabric images
- Cannot install system-level tools on nodes
- Fixed consensus mechanism

### 4. Cost at Scale

For high-throughput scenarios:

- STARTER edition: Limited to 500 TPS
- STANDARD edition: $1,850/month (vs $260 self-managed)

---

## 💡 Recommendations

### Use Self-Managed EC2 When:

✅ **You need:**

- Full control over Fabric configuration
- Latest Fabric features (2.4+)
- Custom consensus mechanisms
- Deployment in unsupported regions
- Cost optimization at scale (>10 nodes)
- Custom networking setup

✅ **You have:**

- Experienced DevOps team
- Time for infrastructure management
- Custom requirements

### Use Amazon Managed Blockchain When:

✅ **You need:**

- Quick deployment (POC/MVP)
- Minimal operational overhead
- AWS compliance certifications
- Integrated AWS services
- Automatic scaling & updates

✅ **You have:**

- Small team (no dedicated DevOps)
- Limited blockchain expertise
- Budget for managed services
- Standard use cases

---

## 🎯 For Banking Audit Ledger Project

### Recommendation: **Hybrid Approach**

**Development/Staging:** Use AMB

- Fast setup
- Low maintenance
- Cost-effective for small scale

**Production:** Use Self-Managed EC2

- Better performance (1000+ TPS)
- Latest Fabric features
- Cost-effective at scale
- Full customization

### Implementation Plan

**Phase 1: MVP (3 months)**

```bash
# Use AMB for rapid development
cd infrastructure
# Edit cdk.json to use app-amb.ts
cdk deploy --all
```

**Phase 2: Production (Month 4+)**

```bash
# Migrate to self-managed for scale
cd infrastructure
# Edit cdk.json to use app.ts
cdk deploy --all
```

---

## 📦 AMB Deployment

### Using CDK

```bash
cd infrastructure

# Edit cdk.json
{
  "app": "npx ts-node --prefer-ts-exts bin/app-amb.ts"
}

# Deploy
cdk deploy --all
```

### Environment Variables for AMB

Add to `.env.aws`:

```bash
# AMB Configuration
USE_MANAGED_BLOCKCHAIN=true
AMB_EDITION=STARTER  # or STANDARD
AMB_FABRIC_VERSION=2.2
AMB_NODE_INSTANCE_TYPE=bc.t3.small
```

---

## 🧪 Testing AMB

### 1. Deploy Test Stack

```bash
cd infrastructure
export AWS_REGION=ap-southeast-1
export ENVIRONMENT=staging

# Deploy AMB stack
cdk deploy banking-audit-ledger-amb-fabric-staging
```

### 2. Get Network Info

```bash
# Get Network ID
aws managedblockchain list-networks \
    --region ap-southeast-1

# Get Member ID
aws managedblockchain list-members \
    --network-id n-XXXXX

# Get Node Info
aws managedblockchain list-nodes \
    --network-id n-XXXXX \
    --member-id m-XXXXX
```

### 3. Connect from Backend

Update backend to use AMB endpoint:

```go
// Use AMB VPC Endpoint
fabricEndpoint := "https://n-XXXXX.ap-southeast-1.managedblockchain.amazonaws.com"
peerEndpoint := "peer-nd-XXXXX:30003"
```

---

## 📈 Cost Projections

### Year 1

| Scenario         | Self-Managed | AMB        | Savings     |
| ---------------- | ------------ | ---------- | ----------- |
| Infrastructure   | $3,120       | $4,332     | -$1,212     |
| DevOps (0.5 FTE) | $60,000      | $0         | +$60,000    |
| Tools & Licenses | $1,200       | $0         | +$1,200     |
| **Total**        | **$64,320**  | **$4,332** | **$59,988** |

### Year 2+ (Self-Managed Optimized)

| Scenario                  | Self-Managed | AMB        |
| ------------------------- | ------------ | ---------- |
| Infrastructure (Reserved) | $2,000       | $4,332     |
| DevOps (reduced)          | $30,000      | $0         |
| Tools                     | $1,200       | $0         |
| **Total**                 | **$33,200**  | **$4,332** |

**Breakeven:** AMB cheaper if DevOps cost > $4,332/year

---

## ⚡ Migration Path

### From AMB to Self-Managed

```bash
# 1. Export chaincode from AMB
aws managedblockchain get-member \
    --network-id n-XXXXX \
    --member-id m-XXXXX

# 2. Backup ledger data
# (AMB provides export tools)

# 3. Deploy self-managed
cd infrastructure
cdk deploy --all  # Using app.ts

# 4. Restore data
# Import ledger to new network

# 5. Update application endpoints
# Point to new peer endpoints

# 6. Decommission AMB
cdk destroy banking-audit-ledger-amb-fabric-staging
```

**Estimated time:** 1-2 days with planning

---

## 🎯 Decision Matrix

### Choose Self-Managed EC2 If:

- [ ] Need latest Fabric features (2.4+)
- [ ] Cost-sensitive (>$400/month budget)
- [ ] Have DevOps expertise
- [ ] Need custom configurations
- [ ] Want full control
- [ ] Deploy in unsupported regions
- [ ] High throughput required (>1000 TPS)

**Score Self-Managed:** \_\_\_ / 7

### Choose AMB If:

- [ ] Quick time-to-market
- [ ] Small team (no dedicated DevOps)
- [ ] Need AWS compliance
- [ ] Limited blockchain expertise
- [ ] Prefer managed services
- [ ] Budget for higher cost
- [ ] Standard use cases

**Score AMB:** \_\_\_ / 7

**If AMB Score > EC2 Score**: Use AMB  
**If EC2 Score > AMB Score**: Use Self-Managed

---

## 🔧 Technical Specs

### AMB Network Specs (STARTER Edition)

- **Consensus:** Raft
- **Fabric Version:** 2.2
- **Channels:** Up to 8
- **Peer Nodes:** Up to 3 per member
- **Throughput:** ~500 TPS
- **Storage:** 10GB included, expandable
- **Availability:** 99.9% SLA

### AMB Network Specs (STANDARD Edition)

- **Consensus:** Raft
- **Fabric Version:** 2.2
- **Channels:** Unlimited
- **Peer Nodes:** Unlimited
- **Throughput:** 1000+ TPS
- **Storage:** 10GB included, expandable
- **Availability:** 99.95% SLA
- **Cost:** $1,850/month + $70/node

---

## 📝 Testing Checklist

### AMB Testing

- [ ] Deploy AMB network
- [ ] Create channel
- [ ] Deploy loghash chaincode
- [ ] Test from backend
- [ ] Measure latency
- [ ] Test throughput
- [ ] Check CloudWatch metrics
- [ ] Verify costs
- [ ] Test failover
- [ ] Document limitations

### Comparison Testing

- [ ] Same workload on both
- [ ] Measure TPS
- [ ] Compare latency
- [ ] Compare costs
- [ ] Compare ops effort
- [ ] Document findings

---

## 🏁 Conclusion

### For Banking Audit Ledger:

**Recommended Approach: Start with Self-Managed**

**Reasons:**

1. ✅ Already have working EC2 setup
2. ✅ Using latest Fabric 2.4.9
3. ✅ Cost-effective for our scale
4. ✅ Full control over configuration
5. ✅ Better performance (1000+ TPS)

**When to Reconsider AMB:**

- If DevOps resources become limited
- If compliance requirements demand managed service
- For regional expansion to AMB-supported regions
- If operational overhead becomes too high

---

## 📚 Resources

- [AWS Managed Blockchain Pricing](https://aws.amazon.com/managed-blockchain/pricing/)
- [AMB Developer Guide](https://docs.aws.amazon.com/managed-blockchain/)
- [Fabric on AMB Best Practices](https://docs.aws.amazon.com/managed-blockchain/latest/hyperledger-fabric-dev/)
- [AMB vs Self-Managed](https://aws.amazon.com/blogs/database/introducing-amazon-managed-blockchain/)

---

**Analysis Date:** 2025-10-26  
**Recommended:** Self-Managed EC2  
**Alternative:** AMB for rapid prototyping

**Status:** ✅ Analysis Complete
