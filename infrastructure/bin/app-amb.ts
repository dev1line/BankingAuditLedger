#!/usr/bin/env node
/**
 * Alternative CDK App using Amazon Managed Blockchain (AMB)
 * Use this instead of app.ts to deploy with AMB instead of self-managed EC2
 */
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { NetworkStack } from "../lib/network-stack";
import { DatabaseStack } from "../lib/database-stack";
import { ContainerStack } from "../lib/container-stack";
import { AmbFabricStack } from "../lib/amb-fabric-stack";
import { MonitoringStack } from "../lib/monitoring-stack";

// Load environment variables
dotenv.config({ path: "../.env.aws" });

const app = new cdk.App();

const env = {
  account: process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
  region:
    process.env.AWS_REGION ||
    process.env.CDK_DEFAULT_REGION ||
    "ap-southeast-1",
};

const environment = process.env.ENVIRONMENT || "production";
const projectName = process.env.PROJECT_NAME || "banking-audit-ledger";

// Common tags
const commonTags = {
  Project: process.env.TAG_PROJECT || "BankingAuditLedger",
  Environment: process.env.TAG_ENVIRONMENT || environment,
  CostCenter: process.env.TAG_COST_CENTER || "Engineering",
  Compliance: process.env.TAG_COMPLIANCE || "SOC2",
  ManagedBy: "CDK",
  DeploymentType: "AMB", // Indicates using Managed Blockchain
};

// 1. Network Stack
const networkStack = new NetworkStack(
  app,
  `${projectName}-network-${environment}-amb`,
  {
    env,
    description: "Network infrastructure for Banking Audit Ledger (AMB)",
    tags: commonTags,
  }
);

// 2. Database Stack
const databaseStack = new DatabaseStack(
  app,
  `${projectName}-database-${environment}-amb`,
  {
    env,
    description: "RDS PostgreSQL database for Banking Audit Ledger (AMB)",
    vpc: networkStack.vpc,
    databaseSecurityGroup: networkStack.databaseSecurityGroup,
    tags: commonTags,
  }
);
databaseStack.addDependency(networkStack);

// 3. AMB Fabric Stack (Using Managed Blockchain)
const ambFabricStack = new AmbFabricStack(
  app,
  `${projectName}-amb-fabric-${environment}`,
  {
    env,
    description: "Amazon Managed Blockchain - Hyperledger Fabric",
    vpc: networkStack.vpc,
    fabricSecurityGroup: networkStack.fabricSecurityGroup,
    tags: commonTags,
  }
);
ambFabricStack.addDependency(networkStack);

// 4. Container Stack - using AMB endpoint
const containerStack = new ContainerStack(
  app,
  `${projectName}-container-${environment}-amb`,
  {
    env,
    description: "ECS Fargate containers for application services (AMB)",
    vpc: networkStack.vpc,
    alb: networkStack.alb,
    backendSecurityGroup: networkStack.backendSecurityGroup,
    frontendSecurityGroup: networkStack.frontendSecurityGroup,
    databaseEndpoint: databaseStack.databaseEndpoint,
    databaseSecret: databaseStack.databaseSecret,
    fabricPeerEndpoint: `${ambFabricStack.networkId}.${env.region}.managedblockchain.amazonaws.com:30003`,
    tags: commonTags,
  }
);
containerStack.addDependency(networkStack);
containerStack.addDependency(databaseStack);
containerStack.addDependency(ambFabricStack);

// 5. Monitoring Stack
const monitoringStack = new MonitoringStack(
  app,
  `${projectName}-monitoring-${environment}-amb`,
  {
    env,
    description: "Monitoring and alerting infrastructure (AMB)",
    backendService: containerStack.backendService,
    frontendService: containerStack.frontendService,
    database: databaseStack.database,
    alb: networkStack.alb,
    tags: commonTags,
  }
);
monitoringStack.addDependency(containerStack);
monitoringStack.addDependency(databaseStack);

app.synth();
