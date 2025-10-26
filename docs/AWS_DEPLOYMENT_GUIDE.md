# 🚀 AWS Production Deployment Guide

> **Complete guide for deploying Banking Audit Ledger to AWS Cloud**

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Disaster Recovery](#disaster-recovery)
8. [Cost Optimization](#cost-optimization)
9. [Troubleshooting](#troubleshooting)

---

## 🏛️ Architecture Overview

### AWS Services Used

| Service             | Purpose             | Configuration                          |
| ------------------- | ------------------- | -------------------------------------- |
| **VPC**             | Network isolation   | 3 AZs, public/private subnets          |
| **RDS PostgreSQL**  | Database            | Multi-AZ, encrypted, automated backups |
| **ECS Fargate**     | Containers          | Backend (3 tasks) + Frontend (2 tasks) |
| **EC2**             | Fabric nodes        | Orderer (3) + Peer (2)                 |
| **ALB**             | Load balancing      | HTTPS with SSL certificate             |
| **ECR**             | Container registry  | Backend & Frontend images              |
| **S3**              | Artifacts & backups | Encrypted, versioned                   |
| **Secrets Manager** | Credentials         | Database & Fabric secrets              |
| **CloudWatch**      | Monitoring          | Logs, metrics, alarms, dashboards      |
| **SNS**             | Alerts              | Email notifications                    |

### High-Level Architecture

```
                        ┌─────────────┐
                        │  Route 53   │
                        │    (DNS)    │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │     ALB     │
                        │  (HTTPS)    │
                        └──────┬──────┘
                ┌──────────────┴──────────────┐
                │                             │
         ┌──────▼──────┐            ┌────────▼────────┐
         │  Frontend   │            │    Backend      │
         │ ECS Fargate │            │  ECS Fargate    │
         │  (2 tasks)  │            │   (3 tasks)     │
         └─────────────┘            └────────┬────────┘
                                          │
                              ┌──────────┼──────────┐
                              │          │          │
                       ┌──────▼──┐  ┌───▼────┐  ┌──▼─────┐
                       │   RDS   │  │ Fabric │  │ Fabric │
                       │   DB    │  │Orderer │  │  Peer  │
                       │Multi-AZ │  │  EC2   │  │  EC2   │
                       └─────────┘  └────────┘  └────────┘
```

---

## ✅ Prerequisites

### 1. AWS Account Setup

- AWS Account with appropriate permissions
- IAM user/role with AdministratorAccess or equivalent
- AWS CLI configured

```bash
# Configure AWS CLI
aws configure

# Verify credentials
aws sts get-caller-identity
```

### 2. Local Tools

```bash
# Node.js >= 18
node --version

# AWS CDK >= 2.114
npm install -g aws-cdk
cdk --version

# Docker
docker --version

# TypeScript
npm install -g typescript
tsc --version
```

### 3. Domain & SSL Certificate

- Domain name registered (via Route 53 or external)
- SSL certificate in ACM (us-east-1 or your region)

```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name audit.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

---

## 📝 Pre-Deployment Checklist

### Configuration Files

- [ ] Copy `.env.aws.example` to `.env.aws`
- [ ] Update `AWS_ACCOUNT_ID`
- [ ] Update `AWS_REGION`
- [ ] Set strong `RDS_MASTER_PASSWORD`
- [ ] Set `ALB_CERTIFICATE_ARN`
- [ ] Set `DOMAIN_NAME`
- [ ] Set `ALERT_EMAIL`

### Security

- [ ] Review security group rules
- [ ] Enable MFA for AWS account
- [ ] Set up CloudTrail
- [ ] Configure AWS Config
- [ ] Review IAM policies

### Cost Management

- [ ] Set up billing alerts
- [ ] Review instance types
- [ ] Configure auto-scaling policies
- [ ] Set up AWS Budget

---

## 🚀 Step-by-Step Deployment

### Step 1: Clone and Configure

```bash
cd BankingAuditLedger

# Copy and edit environment file
cp .env.aws.example .env.aws
vim .env.aws  # Update all values
```

### Step 2: Prepare Infrastructure Code

```bash
cd infrastructure

# Install dependencies
npm install

# Build TypeScript
npm run build

# View what will be created
npm run diff
```

### Step 3: Bootstrap CDK (One-time)

```bash
# Bootstrap CDK in your account/region
source ../.env.aws
cdk bootstrap aws://${AWS_ACCOUNT_ID}/${AWS_REGION}
```

### Step 4: Deploy Infrastructure

```bash
# Option 1: Automated deployment
./deploy.sh

# Option 2: Manual deployment (step by step)

# Deploy network
cdk deploy banking-audit-ledger-network-production

# Deploy database
cdk deploy banking-audit-ledger-database-production

# Deploy Fabric
cdk deploy banking-audit-ledger-fabric-production

# Deploy containers
cdk deploy banking-audit-ledger-container-production

# Deploy monitoring
cdk deploy banking-audit-ledger-monitoring-production
```

**Expected time**: 30-45 minutes

### Step 5: Build and Push Docker Images

```bash
# Get account ID and region
source ../.env.aws

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build backend
cd ../backend-go
docker build -t banking-audit-backend:latest .
docker tag banking-audit-backend:latest \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/banking-audit-backend:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/banking-audit-backend:latest

# Build frontend
cd ../frontend-react
docker build -t banking-audit-frontend:latest .
docker tag banking-audit-frontend:latest \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/banking-audit-frontend:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/banking-audit-frontend:latest
```

### Step 6: Deploy Hyperledger Fabric

```bash
# Package Fabric crypto materials
cd ../blockchain-fabric

# Create crypto materials
./scripts/network.sh up

# Package for S3
tar czf fabric-crypto.tar.gz crypto-config/
tar czf fabric-chaincode.tar.gz chaincode/

# Upload to S3
source ../.env.aws
aws s3 cp fabric-crypto.tar.gz s3://${S3_BUCKET_NAME}-fabric-artifacts/crypto-config/
aws s3 cp fabric-chaincode.tar.gz s3://${S3_BUCKET_NAME}-fabric-artifacts/chaincode/
```

### Step 7: Verify Deployment

```bash
# Check stack status
aws cloudformation describe-stacks \
    --region ${AWS_REGION} \
    --query 'Stacks[?StackName!=`null`].[StackName,StackStatus]' \
    --output table

# Get ALB DNS name
aws cloudformation describe-stacks \
    --stack-name banking-audit-ledger-network-production \
    --query 'Stacks[0].Outputs[?OutputKey==`ALBDNSName`].OutputValue' \
    --output text

# Test health endpoint
ALB_DNS=$(aws cloudformation describe-stacks --stack-name banking-audit-ledger-network-production --query 'Stacks[0].Outputs[?OutputKey==`ALBDNSName`].OutputValue' --output text)

curl https://${ALB_DNS}/healthz
```

---

## ⚙️ Post-Deployment Configuration

### 1. Configure DNS

```bash
# Get ALB DNS name
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name banking-audit-ledger-network-production \
    --query 'Stacks[0].Outputs[?OutputKey==`ALBDNSName`].OutputValue' \
    --output text)

# Create Route 53 record (if using Route 53)
aws route53 change-resource-record-sets \
    --hosted-zone-id ${HOSTED_ZONE_ID} \
    --change-batch '{
      "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "audit.yourdomain.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "ALB_HOSTED_ZONE_ID",
            "DNSName": "'${ALB_DNS}'",
            "EvaluateTargetHealth": true
          }
        }
      }]
    }'
```

### 2. Initialize Database

```bash
# Get database endpoint
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name banking-audit-ledger-database-production \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text)

# Get database credentials
DB_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id banking-audit/db-credentials \
    --query SecretString \
    --output text)

# Connect and run migrations (via bastion or ECS exec)
aws ecs execute-command \
    --cluster banking-audit-cluster \
    --task <BACKEND_TASK_ID> \
    --container BackendContainer \
    --interactive \
    --command "/bin/sh"
```

### 3. Deploy Fabric Network

SSH to Fabric EC2 instances and verify:

```bash
# Get Fabric EC2 instance IDs
aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=*fabric*" \
    --query 'Reservations[].Instances[].[InstanceId,PrivateIpAddress,State.Name]' \
    --output table

# Connect via Session Manager
aws ssm start-session --target <INSTANCE_ID>

# Verify Fabric is running
docker ps
docker logs orderer.bankingaudit.com
```

### 4. Configure Monitoring

```bash
# Subscribe to SNS alerts
aws sns subscribe \
    --topic-arn arn:aws:sns:${AWS_REGION}:${AWS_ACCOUNT_ID}:banking-audit-alerts \
    --protocol email \
    --notification-endpoint your-email@domain.com

# Confirm subscription (check email)
```

---

## 📊 Monitoring & Maintenance

### CloudWatch Dashboard

Access at: https://console.aws.amazon.com/cloudwatch

**Key Metrics to Monitor:**

- Backend CPU/Memory utilization
- Frontend CPU/Memory utilization
- RDS CPU, connections, disk usage
- ALB request count, latency, errors
- Fabric transaction throughput

### Log Access

```bash
# Backend logs
aws logs tail /ecs/banking-audit-backend --follow

# Frontend logs
aws logs tail /ecs/banking-audit-frontend --follow

# Database logs
aws rds describe-db-log-files \
    --db-instance-identifier <DB_INSTANCE_ID>
```

### Alarms

Configured alarms:

- ✅ Backend High CPU (>80%)
- ✅ Backend High Memory (>85%)
- ✅ Database High CPU (>80%)
- ✅ Database High Connections (>180)
- ✅ ALB 5XX Errors (>10 in 5 min)

### Scaling

Auto-scaling policies:

- **Backend**: 2-10 tasks based on CPU/Memory
- **Frontend**: 2-5 tasks based on CPU
- **Database**: Manual scaling (consider read replicas)

---

## 🔄 Disaster Recovery

### Backup Strategy

**RDS Automated Backups:**

- Daily automated backups (7-day retention)
- Backup window: 03:00-04:00 UTC
- Point-in-time recovery available

**Manual Backups:**

```bash
# Create RDS snapshot
aws rds create-db-snapshot \
    --db-instance-identifier banking-audit-db \
    --db-snapshot-identifier banking-audit-manual-$(date +%Y%m%d)

# List snapshots
aws rds describe-db-snapshots \
    --db-instance-identifier banking-audit-db
```

**Fabric Ledger Backup:**

```bash
# Backup from EC2 instance
aws ssm start-session --target <PEER_INSTANCE_ID>

# In instance
sudo tar czf /tmp/ledger-backup-$(date +%Y%m%d).tar.gz \
    /var/hyperledger/production

# Upload to S3
aws s3 cp /tmp/ledger-backup-*.tar.gz \
    s3://${S3_BUCKET_NAME}-fabric-artifacts/backups/
```

### Recovery Procedures

**Database Recovery:**

```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier banking-audit-db-restored \
    --db-snapshot-identifier <SNAPSHOT_ID>
```

**Application Recovery:**

```bash
# Redeploy from known good image
aws ecs update-service \
    --cluster banking-audit-cluster \
    --service backend-service \
    --force-new-deployment
```

---

## 💰 Cost Optimization

### Monthly Cost Breakdown

| Component                | Configuration             | Monthly Cost    |
| ------------------------ | ------------------------- | --------------- |
| **RDS PostgreSQL**       | db.t3.medium Multi-AZ     | ~$140           |
| **ECS Fargate Backend**  | 3 tasks x 1vCPU, 2GB      | ~$90            |
| **ECS Fargate Frontend** | 2 tasks x 0.5vCPU, 1GB    | ~$40            |
| **EC2 Fabric Orderer**   | 3 x t3.medium             | ~$95            |
| **EC2 Fabric Peer**      | 2 x t3.large              | ~$120           |
| **ALB**                  | Application Load Balancer | ~$25            |
| **Data Transfer**        | 100GB/month               | ~$9             |
| **CloudWatch**           | Logs & Metrics            | ~$20            |
| **S3**                   | 100GB storage             | ~$3             |
| **NAT Gateway**          | 2 x NAT Gateway           | ~$65            |
| **Secrets Manager**      | 2 secrets                 | ~$1             |
| **ECR**                  | Container images          | ~$1             |
| **Total**                |                           | **~$609/month** |

### Cost Saving Tips

1. **Use Reserved Instances**

   - Save 30-70% on EC2
   - 1-year or 3-year commitment

2. **Use Savings Plans**

   - Flexible pricing model
   - Apply to Fargate and EC2

3. **Optimize RDS**

   - Use db.t3.small for non-prod
   - Reduce backup retention
   - Use single-AZ for development

4. **Auto-scaling**

   - Scale down during off-peak hours
   - Use target tracking policies

5. **Data Transfer**
   - Use VPC endpoints
   - Minimize cross-region traffic

---

## 🛠️ Deployment Commands

### Deploy All Stacks

```bash
cd infrastructure
./deploy.sh
```

### Deploy Individual Stacks

```bash
# Network only
cdk deploy banking-audit-ledger-network-production

# Database only
cdk deploy banking-audit-ledger-database-production

# Containers only
cdk deploy banking-audit-ledger-container-production
```

### Update Deployment

```bash
# Update backend code
cd backend-go
docker build -t backend:latest .
docker tag backend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/banking-audit-backend:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/banking-audit-backend:latest

# Force new deployment
aws ecs update-service \
    --cluster banking-audit-cluster \
    --service backend-service \
    --force-new-deployment
```

### Rollback

```bash
# Rollback ECS service
aws ecs update-service \
    --cluster banking-audit-cluster \
    --service backend-service \
    --task-definition banking-audit-backend:PREVIOUS_REVISION

# Rollback CDK stack
cdk deploy banking-audit-ledger-container-production \
    --no-rollback
```

---

## 🔍 Troubleshooting

### Issue: Stack deployment fails

**Solution:**

```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
    --stack-name banking-audit-ledger-network-production \
    --max-items 20

# Check for resource limits
aws service-quotas list-service-quotas \
    --service-code ec2 \
    --query 'Quotas[?QuotaName==`EC2-VPC Elastic IPs`]'
```

### Issue: Backend cannot connect to database

**Solution:**

```bash
# Check security groups
aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=*database*" \
    --query 'SecurityGroups[].IpPermissions'

# Check database status
aws rds describe-db-instances \
    --db-instance-identifier banking-audit-db

# Check logs
aws logs tail /ecs/banking-audit-backend --follow
```

### Issue: High costs

**Solution:**

```bash
# Check cost explorer
aws ce get-cost-and-usage \
    --time-period Start=2025-10-01,End=2025-10-31 \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=SERVICE

# Review running instances
aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].[InstanceId,InstanceType,LaunchTime]' \
    --output table
```

---

## 🔐 Security Best Practices

### Implemented

- ✅ VPC with private subnets
- ✅ Security groups with minimal access
- ✅ Encrypted RDS storage
- ✅ Encrypted EBS volumes
- ✅ Secrets Manager for credentials
- ✅ HTTPS only (TLS 1.2+)
- ✅ IAM roles with least privilege
- ✅ VPC Flow Logs
- ✅ CloudWatch logging

### Additional Recommendations

1. **Enable AWS GuardDuty**

```bash
aws guardduty create-detector \
    --enable \
    --finding-publishing-frequency FIFTEEN_MINUTES
```

2. **Configure AWS WAF**

```bash
# Attach WAF to ALB
aws wafv2 associate-web-acl \
    --web-acl-arn <WAF_ACL_ARN> \
    --resource-arn <ALB_ARN>
```

3. **Enable CloudTrail**

```bash
aws cloudtrail create-trail \
    --name banking-audit-trail \
    --s3-bucket-name banking-audit-cloudtrail
```

---

## 📈 Performance Tuning

### RDS Optimization

```sql
-- Connect to RDS
psql -h ${DB_ENDPOINT} -U audit_admin -d banking_audit_db

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Create indexes
CREATE INDEX CONCURRENTLY idx_logs_source_event_type
ON logs(source, event_type);
```

### ECS Task Optimization

```bash
# Update task definition with optimized resources
aws ecs register-task-definition \
    --family banking-audit-backend \
    --cpu 2048 \
    --memory 4096 \
    --container-definitions file://task-def.json
```

---

## 📞 Support & Resources

### AWS Support Links

- **AWS Console**: https://console.aws.amazon.com
- **Cost Explorer**: https://console.aws.amazon.com/cost-management
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch
- **ECS**: https://console.aws.amazon.com/ecs

### Useful Commands

```bash
# View all resources
aws resourcegroupstaggingapi get-resources \
    --tag-filters "Key=Project,Values=BankingAuditLedger"

# Cost report
aws ce get-cost-and-usage \
    --time-period Start=2025-10-01,End=2025-10-31 \
    --granularity DAILY \
    --metrics BlendedCost

# Service health
aws ecs describe-services \
    --cluster banking-audit-cluster \
    --services backend-service frontend-service
```

---

## 🗑️ Cleanup (Destroy Infrastructure)

**⚠️ WARNING: This will delete all resources!**

```bash
cd infrastructure

# Option 1: Destroy all
cdk destroy --all

# Option 2: Destroy individual stacks (reverse order)
cdk destroy banking-audit-ledger-monitoring-production
cdk destroy banking-audit-ledger-container-production
cdk destroy banking-audit-ledger-fabric-production
cdk destroy banking-audit-ledger-database-production
cdk destroy banking-audit-ledger-network-production

# Clean up S3 buckets (manual)
aws s3 rb s3://banking-audit-ledger-prod --force
aws s3 rb s3://banking-audit-fabric-artifacts --force

# Delete ECR repositories
aws ecr delete-repository \
    --repository-name banking-audit-backend \
    --force

aws ecr delete-repository \
    --repository-name banking-audit-frontend \
    --force
```

---

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [Hyperledger Fabric on AWS](https://aws.amazon.com/blockchain/hyperledger-fabric/)

---

**Deployment Guide Version**: 1.0.0  
**Last Updated**: 2025-10-26  
**Status**: Production Ready ✅
