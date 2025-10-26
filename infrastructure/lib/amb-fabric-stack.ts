import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as managedblockchain from "aws-cdk-lib/aws-managedblockchain";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface AmbFabricStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  fabricSecurityGroup?: ec2.SecurityGroup;
}

/**
 * Amazon Managed Blockchain (AMB) Stack for Hyperledger Fabric
 *
 * This stack uses AWS Managed Blockchain service instead of self-managed EC2 instances.
 *
 * Benefits:
 * - Fully managed Fabric network
 * - Automatic scaling and maintenance
 * - Built-in monitoring and logging
 * - No need to manage infrastructure
 * - Integrated with AWS services
 *
 * Limitations:
 * - Higher cost than self-managed
 * - Less control over Fabric configuration
 * - Region availability limited
 * - Fixed Fabric version
 */
export class AmbFabricStack extends cdk.Stack {
  public readonly networkId: string;
  public readonly memberId: string;
  public readonly peerNodeId: string;
  public readonly vpcEndpointServiceName: string;

  constructor(scope: Construct, id: string, props: AmbFabricStackProps) {
    super(scope, id, props);

    // S3 Bucket for Fabric artifacts
    const fabricBucket = new s3.Bucket(this, "AmbFabricArtifactsBucket", {
      bucketName: `${
        process.env.S3_BUCKET_NAME || "banking-audit"
      }-amb-fabric-artifacts`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(
            parseInt(process.env.S3_LIFECYCLE_DAYS || "90")
          ),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create Managed Blockchain Network
    const network = new managedblockchain.CfnMember(
      this,
      "BankingAuditNetwork",
      {
        memberConfiguration: {
          name: "BankingAuditOrg",
          description: "Banking Audit Ledger Organization",
          memberFrameworkConfiguration: {
            memberFabricConfiguration: {
              adminUsername: process.env.FABRIC_CA_ADMIN_USERNAME || "admin",
              adminPassword:
                process.env.FABRIC_CA_ADMIN_PASSWORD || "Admin123!",
            },
          },
        },
        networkConfiguration: {
          name: "BankingAuditNetwork",
          description: "Banking Audit Ledger Hyperledger Fabric Network",
          framework: "HYPERLEDGER_FABRIC",
          frameworkVersion: "2.2", // Latest supported by AMB
          networkFrameworkConfiguration: {
            networkFabricConfiguration: {
              edition: "STARTER", // or "STANDARD" for production
            },
          },
          votingPolicy: {
            approvalThresholdPolicy: {
              thresholdPercentage: 50,
              proposalDurationInHours: 24,
              thresholdComparator: "GREATER_THAN_OR_EQUAL_TO",
            },
          },
        },
      }
    );

    this.memberId = network.attrMemberId;
    this.networkId = network.attrNetworkId;

    // Create Peer Node
    const peerNode = new managedblockchain.CfnNode(this, "PeerNode", {
      networkId: this.networkId,
      memberId: this.memberId,
      nodeConfiguration: {
        availabilityZone: props.vpc.availabilityZones[0],
        instanceType: "bc.t3.small", // or bc.t3.medium, bc.t3.large
      },
    });

    peerNode.addDependency(network);
    this.peerNodeId = peerNode.attrNodeId;

    // VPC Endpoint for Fabric access
    const vpcEndpoint = new ec2.InterfaceVpcEndpoint(
      this,
      "FabricVpcEndpoint",
      {
        vpc: props.vpc,
        service: new ec2.InterfaceVpcEndpointService(
          `com.amazonaws.${this.region}.managedblockchain.${this.networkId}`,
          443
        ),
        subnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        securityGroups: props.fabricSecurityGroup
          ? [props.fabricSecurityGroup]
          : undefined,
      }
    );

    this.vpcEndpointServiceName = vpcEndpoint.vpcEndpointId;

    // IAM Role for Fabric Client
    const fabricClientRole = new iam.Role(this, "FabricClientRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: "Role for ECS tasks to access Managed Blockchain",
    });

    // Grant permissions to access Managed Blockchain
    fabricClientRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "managedblockchain:GetNetwork",
          "managedblockchain:GetMember",
          "managedblockchain:GetNode",
          "managedblockchain:ListMembers",
          "managedblockchain:ListNodes",
          "managedblockchain:CreateProposal",
          "managedblockchain:GetProposal",
          "managedblockchain:VoteOnProposal",
        ],
        resources: [
          `arn:aws:managedblockchain:${this.region}:${this.account}:networks/${this.networkId}`,
          `arn:aws:managedblockchain:${this.region}:${this.account}:members/${this.networkId}/${this.memberId}`,
          `arn:aws:managedblockchain:${this.region}:${this.account}:nodes/${this.networkId}/${this.memberId}/*`,
        ],
      })
    );

    // Outputs
    new cdk.CfnOutput(this, "NetworkId", {
      value: this.networkId,
      description: "Managed Blockchain Network ID",
      exportName: "BankingAuditAMBNetworkId",
    });

    new cdk.CfnOutput(this, "MemberId", {
      value: this.memberId,
      description: "Managed Blockchain Member ID",
      exportName: "BankingAuditAMBMemberId",
    });

    new cdk.CfnOutput(this, "PeerNodeId", {
      value: this.peerNodeId,
      description: "Peer Node ID",
      exportName: "BankingAuditAMBPeerNodeId",
    });

    new cdk.CfnOutput(this, "FabricEndpoint", {
      value: `https://${this.networkId}.${this.region}.managedblockchain.amazonaws.com`,
      description: "Managed Blockchain Fabric Endpoint",
      exportName: "BankingAuditAMBEndpoint",
    });

    new cdk.CfnOutput(this, "FabricCAEndpoint", {
      value: `https://${this.memberId}.${this.networkId}.${this.region}.managedblockchain.amazonaws.com`,
      description: "Fabric Certificate Authority Endpoint",
      exportName: "BankingAuditAMBCAEndpoint",
    });

    new cdk.CfnOutput(this, "VpcEndpointId", {
      value: this.vpcEndpointServiceName,
      description: "VPC Endpoint for Fabric access",
    });

    new cdk.CfnOutput(this, "ClientRoleArn", {
      value: fabricClientRole.roleArn,
      description: "IAM Role ARN for Fabric clients",
    });
  }
}
