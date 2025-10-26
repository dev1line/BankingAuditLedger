#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { NetworkStack } from "../lib/network-stack";
import { DatabaseStack } from "../lib/database-stack";
import { ContainerStack } from "../lib/container-stack";
import { FabricStack } from "../lib/fabric-stack";
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

// Common tags for all resources
const commonTags = {
  Project: process.env.TAG_PROJECT || "BankingAuditLedger",
  Environment: process.env.TAG_ENVIRONMENT || environment,
  CostCenter: process.env.TAG_COST_CENTER || "Engineering",
  Compliance: process.env.TAG_COMPLIANCE || "SOC2",
  ManagedBy: "CDK",
};

// 1. Network Stack (VPC, Subnets, Security Groups)
const networkStack = new NetworkStack(
  app,
  `${projectName}-network-${environment}`,
  {
    env,
    description: "Network infrastructure for Banking Audit Ledger",
    tags: commonTags,
  }
);

// 2. Database Stack (RDS PostgreSQL)
const databaseStack = new DatabaseStack(
  app,
  `${projectName}-database-${environment}`,
  {
    env,
    description: "RDS PostgreSQL database for Banking Audit Ledger",
    vpc: networkStack.vpc,
    databaseSecurityGroup: networkStack.databaseSecurityGroup,
    tags: commonTags,
  }
);
databaseStack.addDependency(networkStack);

// 3. Fabric Stack (EC2 cluster for Hyperledger Fabric)
const fabricStack = new FabricStack(
  app,
  `${projectName}-fabric-${environment}`,
  {
    env,
    description: "Hyperledger Fabric network infrastructure",
    vpc: networkStack.vpc,
    fabricSecurityGroup: networkStack.fabricSecurityGroup,
    tags: commonTags,
  }
);
fabricStack.addDependency(networkStack);

// 4. Container Stack (ECS Fargate for Backend & Frontend)
const containerStack = new ContainerStack(
  app,
  `${projectName}-container-${environment}`,
  {
    env,
    description: "ECS Fargate containers for application services",
    vpc: networkStack.vpc,
    alb: networkStack.alb,
    backendSecurityGroup: networkStack.backendSecurityGroup,
    frontendSecurityGroup: networkStack.frontendSecurityGroup,
    databaseEndpoint: databaseStack.databaseEndpoint,
    databaseSecret: databaseStack.databaseSecret,
    fabricPeerEndpoint: fabricStack.peerEndpoint,
    tags: commonTags,
  }
);
containerStack.addDependency(networkStack);
containerStack.addDependency(databaseStack);
containerStack.addDependency(fabricStack);

// 5. Monitoring Stack (CloudWatch, Alarms, Dashboards)
const monitoringStack = new MonitoringStack(
  app,
  `${projectName}-monitoring-${environment}`,
  {
    env,
    description: "Monitoring and alerting infrastructure",
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
