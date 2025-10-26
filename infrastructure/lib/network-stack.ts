import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly backendSecurityGroup: ec2.SecurityGroup;
  public readonly frontendSecurityGroup: ec2.SecurityGroup;
  public readonly databaseSecurityGroup: ec2.SecurityGroup;
  public readonly fabricSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    this.vpc = new ec2.Vpc(this, "BankingAuditVPC", {
      ipAddresses: ec2.IpAddresses.cidr(process.env.VPC_CIDR || "10.0.0.0/16"),
      maxAzs: 3,
      natGateways: 2,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: "Isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // VPC Flow Logs
    if (process.env.ENABLE_VPC_FLOW_LOGS === "true") {
      this.vpc.addFlowLog("VPCFlowLog", {
        destination: ec2.FlowLogDestination.toCloudWatchLogs(),
        trafficType: ec2.FlowLogTrafficType.ALL,
      });
    }

    // Security Groups

    // Backend API Security Group
    this.backendSecurityGroup = new ec2.SecurityGroup(
      this,
      "BackendSecurityGroup",
      {
        vpc: this.vpc,
        description: "Security group for Backend API containers",
        allowAllOutbound: true,
      }
    );

    // Frontend Security Group
    this.frontendSecurityGroup = new ec2.SecurityGroup(
      this,
      "FrontendSecurityGroup",
      {
        vpc: this.vpc,
        description: "Security group for Frontend containers",
        allowAllOutbound: true,
      }
    );

    // Database Security Group
    this.databaseSecurityGroup = new ec2.SecurityGroup(
      this,
      "DatabaseSecurityGroup",
      {
        vpc: this.vpc,
        description: "Security group for RDS PostgreSQL",
        allowAllOutbound: false,
      }
    );

    // Fabric Security Group
    this.fabricSecurityGroup = new ec2.SecurityGroup(
      this,
      "FabricSecurityGroup",
      {
        vpc: this.vpc,
        description: "Security group for Hyperledger Fabric nodes",
        allowAllOutbound: true,
      }
    );

    // ALB Security Group
    const albSecurityGroup = new ec2.SecurityGroup(this, "ALBSecurityGroup", {
      vpc: this.vpc,
      description: "Security group for Application Load Balancer",
      allowAllOutbound: true,
    });

    // Security Group Rules

    // ALB accepts HTTPS from internet
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS from internet"
    );

    // ALB accepts HTTP (for redirect)
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP from internet (redirect to HTTPS)"
    );

    // Backend accepts from ALB
    this.backendSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(8080),
      "Allow ALB to backend API"
    );

    // Frontend accepts from ALB
    this.frontendSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3000),
      "Allow ALB to frontend"
    );

    // Database accepts from Backend
    this.databaseSecurityGroup.addIngressRule(
      this.backendSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow backend to database"
    );

    // Fabric peer accepts from Backend
    this.fabricSecurityGroup.addIngressRule(
      this.backendSecurityGroup,
      ec2.Port.tcp(7051),
      "Allow backend to Fabric peer"
    );

    // Fabric orderer accepts from Peers
    this.fabricSecurityGroup.addIngressRule(
      this.fabricSecurityGroup,
      ec2.Port.tcp(7050),
      "Allow Fabric peer to orderer"
    );

    // Fabric internal communication
    this.fabricSecurityGroup.addIngressRule(
      this.fabricSecurityGroup,
      ec2.Port.allTcp(),
      "Allow Fabric internal communication"
    );

    // Application Load Balancer
    this.alb = new elbv2.ApplicationLoadBalancer(
      this,
      "ApplicationLoadBalancer",
      {
        vpc: this.vpc,
        internetFacing: true,
        securityGroup: albSecurityGroup,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC,
        },
      }
    );

    // Add default action (will be overridden by ContainerStack)
    this.alb.addListener("DefaultHTTPListener", {
      port: 80,
      defaultAction: elbv2.ListenerAction.fixedResponse(200, {
        contentType: "text/plain",
        messageBody: "OK",
      }),
    });

    // Outputs
    new cdk.CfnOutput(this, "VPCId", {
      value: this.vpc.vpcId,
      description: "VPC ID",
      exportName: "BankingAuditVPCId",
    });

    new cdk.CfnOutput(this, "ALBDNSName", {
      value: this.alb.loadBalancerDnsName,
      description: "Application Load Balancer DNS Name",
      exportName: "BankingAuditALBDNS",
    });

    new cdk.CfnOutput(this, "ALBArn", {
      value: this.alb.loadBalancerArn,
      description: "Application Load Balancer ARN",
      exportName: "BankingAuditALBArn",
    });
  }
}
