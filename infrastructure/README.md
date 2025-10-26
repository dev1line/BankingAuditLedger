# 🏗️ Banking Audit Ledger - AWS Infrastructure

> **AWS CDK Infrastructure as Code for Production Deployment**

## 📋 Overview

This infrastructure deploys the Banking Audit Ledger system to AWS using:

- **AWS CDK** (Cloud Development Kit) with TypeScript
- **CloudFormation** for infrastructure provisioning
- **Multi-AZ** deployment for high availability
- **Auto-scaling** for cost optimization

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AWS Cloud (VPC)                       │
│                                                          │
│  ┌──────────────┐         ┌──────────────┐             │
│  │  Public ALB  │────────▶│  CloudFront  │             │
│  └──────────────┘         └──────────────┘             │
│         │                                                │
│  ┌──────▼───────────────────────────────┐              │
│  │        Application Tier               │              │
│  │  ┌─────────────┐   ┌──────────────┐  │              │
│  │  │   ECS       │   │   ECS        │  │              │
│  │  │  Frontend   │   │   Backend    │  │              │
│  │  │  (Fargate)  │   │  (Fargate)   │  │              │
│  │  └─────────────┘   └──────┬───────┘  │              │
│  └────────────────────────────┼──────────┘              │
│                                │                         │
│  ┌────────────────────────────▼──────────┐              │
│  │         Data Tier                     │              │
│  │  ┌─────────────┐   ┌──────────────┐  │              │
│  │  │  RDS        │   │  EC2 Cluster │  │              │
│  │  │ PostgreSQL  │   │  Hyperledger │  │              │
│  │  │ (Multi-AZ)  │   │   Fabric     │  │              │
│  │  └─────────────┘   └──────────────┘  │              │
│  └────────────────────────────────────────              │
│                                                          │
│  ┌──────────────────────────────────────┐              │
│  │  Supporting Services                 │              │
│  │  - CloudWatch Logs & Metrics         │              │
│  │  - Secrets Manager                   │              │
│  │  - S3 (Backups & Artifacts)          │              │
│  │  - ECR (Container Registry)          │              │
│  │  - Systems Manager                   │              │
│  └──────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

## 📦 Components

### Infrastructure Stacks

1. **NetworkStack** - VPC, Subnets, Security Groups
2. **DatabaseStack** - RDS PostgreSQL (Multi-AZ)
3. **ContainerStack** - ECS Fargate for Backend & Frontend
4. **FabricStack** - EC2 cluster for Hyperledger Fabric
5. **MonitoringStack** - CloudWatch, Alarms, Dashboards
6. **CiCdStack** - CodePipeline for automated deployments

## 🚀 Prerequisites

### Required Software

- **Node.js** >= 18.0.0
- **AWS CLI** >= 2.0
- **AWS CDK** >= 2.114.1
- **Docker** (for building images)
- **TypeScript** >= 5.0

### AWS Account Setup

```bash
# Configure AWS credentials
aws configure

# Verify access
aws sts get-caller-identity

# Bootstrap CDK (one-time per account/region)
cdk bootstrap aws://ACCOUNT-ID/REGION
```

## 📝 Installation

```bash
cd infrastructure

# Install dependencies
npm install

# Build TypeScript
npm run build
```

## ⚙️ Configuration

### 1. Copy and configure environment file

```bash
cp ../.env.aws.example .env.aws
```

### 2. Update required values

Edit `.env.aws`:

```bash
AWS_ACCOUNT_ID=YOUR_ACCOUNT_ID
AWS_REGION=us-east-1
RDS_MASTER_PASSWORD=STRONG_PASSWORD_HERE
ALB_CERTIFICATE_ARN=arn:aws:acm:...
DOMAIN_NAME=audit.yourdomain.com
ALERT_EMAIL=your-email@domain.com
```

## 🔧 Deployment

### View Changes

```bash
# See what will be deployed
npm run diff

# Generate CloudFormation templates
npm run synth
```

### Deploy to AWS

```bash
# Deploy all stacks
npm run deploy

# Deploy specific stack
cdk deploy NetworkStack
cdk deploy DatabaseStack
cdk deploy ContainerStack
```

### Deployment Order (Manual)

```bash
# 1. Network infrastructure
cdk deploy NetworkStack

# 2. Database
cdk deploy DatabaseStack

# 3. Fabric network
cdk deploy FabricStack

# 4. Container services
cdk deploy ContainerStack

# 5. Monitoring
cdk deploy MonitoringStack

# 6. CI/CD (optional)
cdk deploy CiCdStack
```

## 🗑️ Cleanup

```bash
# Destroy all resources (BE CAREFUL!)
npm run destroy

# Destroy specific stack
cdk destroy ContainerStack
```

## 📊 Cost Estimation

### Monthly Cost (Approximate)

| Service        | Configuration               | Est. Cost/Month |
| -------------- | --------------------------- | --------------- |
| RDS PostgreSQL | db.t3.medium, Multi-AZ      | $140            |
| ECS Fargate    | Backend (3 tasks)           | $90             |
| ECS Fargate    | Frontend (2 tasks)          | $40             |
| EC2            | Fabric nodes (5 x t3.large) | $380            |
| ALB            | Application Load Balancer   | $25             |
| Data Transfer  | 100GB/month                 | $9              |
| CloudWatch     | Logs & Metrics              | $20             |
| S3             | Backups (100GB)             | $3              |
| **Total**      |                             | **~$707/month** |

**Note**: Costs vary by region and usage. Use AWS Cost Calculator for accurate estimates.

## 🔒 Security Best Practices

### Implemented

- ✅ VPC with private subnets
- ✅ Security groups with least privilege
- ✅ Secrets Manager for sensitive data
- ✅ Encrypted RDS storage
- ✅ HTTPS only (TLS/SSL)
- ✅ IAM roles with minimal permissions
- ✅ VPC Flow Logs enabled
- ✅ CloudWatch logging

### Recommended Additional Steps

- [ ] Enable AWS GuardDuty
- [ ] Configure AWS WAF
- [ ] Set up AWS Config rules
- [ ] Enable AWS CloudTrail
- [ ] Configure backup strategy
- [ ] Set up disaster recovery

## 📈 Monitoring

### CloudWatch Dashboards

- **Application Metrics**: Request rate, latency, errors
- **Infrastructure Metrics**: CPU, memory, network
- **Database Metrics**: Connections, queries, replication lag
- **Blockchain Metrics**: Transaction throughput, block height

### Alarms

- High CPU/Memory utilization
- Database connection errors
- API error rates
- Blockchain sync issues

## 🔄 CI/CD Pipeline

The `CiCdStack` creates:

1. **CodeCommit** or **GitHub** integration
2. **CodeBuild** for building containers
3. **CodePipeline** for automated deployments
4. **ECR** for container images

### Pipeline Stages

```
Source → Build → Test → Deploy to Staging → Manual Approval → Deploy to Production
```

## 🛠️ Useful Commands

```bash
# List all stacks
cdk list

# Show differences
cdk diff

# Synthesize CloudFormation
cdk synth

# Deploy with approval
cdk deploy --require-approval never

# View deployed resources
aws cloudformation describe-stacks

# View outputs
aws cloudformation describe-stacks \
  --stack-name NetworkStack \
  --query 'Stacks[0].Outputs'
```

## 📚 Stack Details

### NetworkStack

- VPC with public/private subnets across 3 AZs
- NAT Gateways for outbound internet access
- VPC Endpoints for AWS services
- Security Groups for each component

### DatabaseStack

- RDS PostgreSQL Multi-AZ
- Automated backups
- Read replicas (optional)
- Parameter groups optimized for workload

### ContainerStack

- ECS Cluster with Fargate
- Application Load Balancer
- Auto Scaling policies
- CloudWatch Container Insights

### FabricStack

- EC2 instances for Fabric orderer
- EC2 instances for Fabric peers
- EBS volumes for ledger data
- Auto Scaling Group
- Elastic IPs

### MonitoringStack

- CloudWatch Dashboards
- CloudWatch Alarms
- SNS Topics for alerts
- CloudWatch Logs

## 🔧 Troubleshooting

### Stack Deployment Failed

```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name YourStackName \
  --max-items 20

# View stack resources
aws cloudformation describe-stack-resources \
  --stack-name YourStackName
```

### Update Configuration

```bash
# Update .env.aws
vim .env.aws

# Rebuild
npm run build

# Deploy changes
cdk deploy
```

## 📞 Support

For infrastructure issues:

1. Check CloudFormation console
2. Review CloudWatch logs
3. Check CDK diff output
4. Consult AWS documentation

---

**Infrastructure as Code - Version 1.0.0**
