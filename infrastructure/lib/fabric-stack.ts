import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import { Construct } from "constructs";

interface FabricStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  fabricSecurityGroup: ec2.SecurityGroup;
}

export class FabricStack extends cdk.Stack {
  public readonly peerEndpoint: string;
  public readonly ordererEndpoint: string;

  constructor(scope: Construct, id: string, props: FabricStackProps) {
    super(scope, id, props);

    // S3 Bucket for Fabric artifacts and backups
    const fabricBucket = new s3.Bucket(this, "FabricArtifactsBucket", {
      bucketName: `${
        process.env.S3_BUCKET_NAME || "banking-audit"
      }-fabric-artifacts`,
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

    // IAM Role for Fabric EC2 instances
    const fabricRole = new iam.Role(this, "FabricEC2Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy"
        ),
      ],
    });

    // Grant S3 access
    fabricBucket.grantReadWrite(fabricRole);

    // User Data script for Fabric nodes
    const ordererUserData = ec2.UserData.forLinux();
    ordererUserData.addCommands(
      "#!/bin/bash",
      "set -e",
      "",
      "# Update system",
      "yum update -y",
      "",
      "# Install Docker",
      "amazon-linux-extras install docker -y",
      "systemctl start docker",
      "systemctl enable docker",
      "usermod -aG docker ec2-user",
      "",
      "# Install Docker Compose",
      'curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose',
      "chmod +x /usr/local/bin/docker-compose",
      "",
      "# Install CloudWatch agent",
      "wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm",
      "rpm -U ./amazon-cloudwatch-agent.rpm",
      "",
      "# Create fabric directories",
      "mkdir -p /opt/fabric/{orderer,crypto-config}",
      "",
      "# Download fabric artifacts from S3",
      `aws s3 sync s3://${fabricBucket.bucketName}/crypto-config /opt/fabric/crypto-config`,
      `aws s3 sync s3://${fabricBucket.bucketName}/orderer /opt/fabric/orderer`,
      "",
      "# Pull Fabric Docker images",
      "docker pull hyperledger/fabric-orderer:2.4.9",
      "",
      "# Start orderer",
      "cd /opt/fabric/orderer",
      "docker-compose up -d",
      "",
      'echo "Fabric Orderer setup complete"'
    );

    const peerUserData = ec2.UserData.forLinux();
    peerUserData.addCommands(
      "#!/bin/bash",
      "set -e",
      "",
      "# Update system",
      "yum update -y",
      "",
      "# Install Docker",
      "amazon-linux-extras install docker -y",
      "systemctl start docker",
      "systemctl enable docker",
      "usermod -aG docker ec2-user",
      "",
      "# Install Docker Compose",
      'curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose',
      "chmod +x /usr/local/bin/docker-compose",
      "",
      "# Install CloudWatch agent",
      "wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm",
      "rpm -U ./amazon-cloudwatch-agent.rpm",
      "",
      "# Create fabric directories",
      "mkdir -p /opt/fabric/{peer,crypto-config,chaincode}",
      "",
      "# Download fabric artifacts from S3",
      `aws s3 sync s3://${fabricBucket.bucketName}/crypto-config /opt/fabric/crypto-config`,
      `aws s3 sync s3://${fabricBucket.bucketName}/peer /opt/fabric/peer`,
      `aws s3 sync s3://${fabricBucket.bucketName}/chaincode /opt/fabric/chaincode`,
      "",
      "# Pull Fabric Docker images",
      "docker pull hyperledger/fabric-peer:2.4.9",
      "",
      "# Start peer",
      "cd /opt/fabric/peer",
      "docker-compose up -d",
      "",
      'echo "Fabric Peer setup complete"'
    );

    // Launch Template for Orderer
    const ordererLaunchTemplate = new ec2.LaunchTemplate(
      this,
      "OrdererLaunchTemplate",
      {
        instanceType: new ec2.InstanceType(
          process.env.ORDERER_INSTANCE_TYPE || "t3.medium"
        ),
        machineImage: ec2.MachineImage.latestAmazonLinux2(),
        securityGroup: props.fabricSecurityGroup,
        role: fabricRole,
        userData: ordererUserData,
        blockDevices: [
          {
            deviceName: "/dev/xvda",
            volume: ec2.BlockDeviceVolume.ebs(
              parseInt(process.env.ORDERER_VOLUME_SIZE || "100"),
              {
                encrypted: true,
                volumeType: ec2.EbsDeviceVolumeType.GP3,
              }
            ),
          },
        ],
      }
    );

    // Auto Scaling Group for Orderers
    const ordererAsg = new autoscaling.AutoScalingGroup(
      this,
      "OrdererAutoScalingGroup",
      {
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        launchTemplate: ordererLaunchTemplate,
        minCapacity: parseInt(process.env.ORDERER_COUNT || "3"),
        maxCapacity: parseInt(process.env.ORDERER_COUNT || "3"),
        desiredCapacity: parseInt(process.env.ORDERER_COUNT || "3"),
        healthCheck: autoscaling.HealthCheck.ec2(),
        updatePolicy: autoscaling.UpdatePolicy.rollingUpdate(),
      }
    );

    // Launch Template for Peer
    const peerLaunchTemplate = new ec2.LaunchTemplate(
      this,
      "PeerLaunchTemplate",
      {
        instanceType: new ec2.InstanceType(
          process.env.PEER_INSTANCE_TYPE || "t3.large"
        ),
        machineImage: ec2.MachineImage.latestAmazonLinux2(),
        securityGroup: props.fabricSecurityGroup,
        role: fabricRole,
        userData: peerUserData,
        blockDevices: [
          {
            deviceName: "/dev/xvda",
            volume: ec2.BlockDeviceVolume.ebs(
              parseInt(process.env.PEER_VOLUME_SIZE || "200"),
              {
                encrypted: true,
                volumeType: ec2.EbsDeviceVolumeType.GP3,
              }
            ),
          },
        ],
      }
    );

    // Auto Scaling Group for Peers
    const peerAsg = new autoscaling.AutoScalingGroup(
      this,
      "PeerAutoScalingGroup",
      {
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        launchTemplate: peerLaunchTemplate,
        minCapacity: parseInt(process.env.PEER_COUNT || "2"),
        maxCapacity: parseInt(process.env.PEER_COUNT || "2"),
        desiredCapacity: parseInt(process.env.PEER_COUNT || "2"),
        healthCheck: autoscaling.HealthCheck.ec2(),
        updatePolicy: autoscaling.UpdatePolicy.rollingUpdate(),
      }
    );

    // Set endpoints (these will be updated by service discovery or fixed IPs)
    this.peerEndpoint = "peer0.fabric.internal:7051";
    this.ordererEndpoint = "orderer.fabric.internal:7050";

    // Outputs
    new cdk.CfnOutput(this, "FabricBucketName", {
      value: fabricBucket.bucketName,
      description: "S3 Bucket for Fabric artifacts",
      exportName: "BankingAuditFabricBucket",
    });

    new cdk.CfnOutput(this, "OrdererASGName", {
      value: ordererAsg.autoScalingGroupName,
      description: "Orderer Auto Scaling Group Name",
    });

    new cdk.CfnOutput(this, "PeerASGName", {
      value: peerAsg.autoScalingGroupName,
      description: "Peer Auto Scaling Group Name",
    });

    new cdk.CfnOutput(this, "PeerEndpoint", {
      value: this.peerEndpoint,
      description: "Fabric Peer Endpoint",
      exportName: "BankingAuditFabricPeerEndpoint",
    });
  }
}
