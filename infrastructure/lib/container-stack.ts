import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as autoscaling from "aws-cdk-lib/aws-applicationautoscaling";
import { Construct } from "constructs";

interface ContainerStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  alb: elbv2.ApplicationLoadBalancer;
  backendSecurityGroup: ec2.SecurityGroup;
  frontendSecurityGroup: ec2.SecurityGroup;
  databaseEndpoint: string;
  databaseSecret: secretsmanager.ISecret;
  fabricPeerEndpoint: string;
}

export class ContainerStack extends cdk.Stack {
  public readonly backendService: ecs.FargateService;
  public readonly frontendService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ContainerStackProps) {
    super(scope, id, props);

    // ECS Cluster
    const cluster = new ecs.Cluster(this, "BankingAuditCluster", {
      vpc: props.vpc,
      clusterName: "banking-audit-cluster",
      containerInsights: process.env.ENABLE_CONTAINER_INSIGHTS === "true",
    });

    // ECR Repositories
    const backendRepo = new ecr.Repository(this, "BackendRepository", {
      repositoryName:
        process.env.ECR_BACKEND_REPOSITORY || "banking-audit-backend",
      imageScanOnPush: true,
      lifecycleRules: [
        {
          maxImageCount: 10,
          description: "Keep last 10 images",
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const frontendRepo = new ecr.Repository(this, "FrontendRepository", {
      repositoryName:
        process.env.ECR_FRONTEND_REPOSITORY || "banking-audit-frontend",
      imageScanOnPush: true,
      lifecycleRules: [
        {
          maxImageCount: 10,
          description: "Keep last 10 images",
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // CloudWatch Log Groups
    const backendLogGroup = new logs.LogGroup(this, "BackendLogGroup", {
      logGroupName: "/ecs/banking-audit-backend",
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const frontendLogGroup = new logs.LogGroup(this, "FrontendLogGroup", {
      logGroupName: "/ecs/banking-audit-frontend",
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Backend Task Definition
    const backendTaskDef = new ecs.FargateTaskDefinition(
      this,
      "BackendTaskDef",
      {
        memoryLimitMiB: parseInt(process.env.BACKEND_MEMORY || "2048"),
        cpu: parseInt(process.env.BACKEND_CPU || "1024"),
      }
    );

    // Grant access to secrets
    props.databaseSecret.grantRead(backendTaskDef.taskRole);

    backendTaskDef.addContainer("BackendContainer", {
      image: ecs.ContainerImage.fromEcrRepository(backendRepo, "latest"),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "backend",
        logGroup: backendLogGroup,
      }),
      environment: {
        SERVER_HOST: "0.0.0.0",
        SERVER_PORT: "8080",
        FABRIC_CHANNEL_NAME: process.env.FABRIC_CHANNEL_NAME || "mychannel",
        FABRIC_CHAINCODE_NAME: process.env.FABRIC_CHAINCODE_NAME || "loghash",
        FABRIC_PEER_ADDRESS: props.fabricPeerEndpoint,
        LOG_LEVEL: "info",
        LOG_FORMAT: "json",
        METRICS_ENABLED: "true",
        METRICS_PORT: "9090",
      },
      secrets: {
        DB_HOST: ecs.Secret.fromSecretsManager(props.databaseSecret, "host"),
        DB_PORT: ecs.Secret.fromSecretsManager(props.databaseSecret, "port"),
        DB_USER: ecs.Secret.fromSecretsManager(
          props.databaseSecret,
          "username"
        ),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(
          props.databaseSecret,
          "password"
        ),
        DB_NAME: ecs.Secret.fromSecretsManager(props.databaseSecret, "dbname"),
      },
      portMappings: [
        {
          containerPort: 8080,
          protocol: ecs.Protocol.TCP,
        },
        {
          containerPort: 9090,
          protocol: ecs.Protocol.TCP,
        },
      ],
      healthCheck: {
        command: [
          "CMD-SHELL",
          "curl -f http://localhost:8080/healthz || exit 1",
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Backend Service
    this.backendService = new ecs.FargateService(this, "BackendService", {
      cluster,
      taskDefinition: backendTaskDef,
      desiredCount: parseInt(process.env.BACKEND_DESIRED_COUNT || "3"),
      securityGroups: [props.backendSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      enableExecuteCommand: true,
      circuitBreaker: { rollback: true },
    });

    // Backend Auto Scaling
    const backendScaling = this.backendService.autoScaleTaskCount({
      minCapacity: parseInt(process.env.BACKEND_MIN_CAPACITY || "2"),
      maxCapacity: parseInt(process.env.BACKEND_MAX_CAPACITY || "10"),
    });

    backendScaling.scaleOnCpuUtilization("BackendCPUScaling", {
      targetUtilizationPercent: parseInt(
        process.env.BACKEND_TARGET_CPU_UTILIZATION || "70"
      ),
      scaleInCooldown: cdk.Duration.seconds(
        parseInt(process.env.BACKEND_SCALE_IN_COOLDOWN || "300")
      ),
      scaleOutCooldown: cdk.Duration.seconds(
        parseInt(process.env.BACKEND_SCALE_OUT_COOLDOWN || "60")
      ),
    });

    backendScaling.scaleOnMemoryUtilization("BackendMemoryScaling", {
      targetUtilizationPercent: parseInt(
        process.env.BACKEND_TARGET_MEMORY_UTILIZATION || "80"
      ),
    });

    // Frontend Task Definition
    const frontendTaskDef = new ecs.FargateTaskDefinition(
      this,
      "FrontendTaskDef",
      {
        memoryLimitMiB: parseInt(process.env.FRONTEND_MEMORY || "1024"),
        cpu: parseInt(process.env.FRONTEND_CPU || "512"),
      }
    );

    frontendTaskDef.addContainer("FrontendContainer", {
      image: ecs.ContainerImage.fromEcrRepository(frontendRepo, "latest"),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "frontend",
        logGroup: frontendLogGroup,
      }),
      environment: {
        REACT_APP_API_BASE_URL: `https://${
          process.env.DOMAIN_NAME || "api.example.com"
        }/api/v1`,
        REACT_APP_APP_NAME: "Banking Audit Ledger",
        REACT_APP_VERSION: "1.0.0",
      },
      portMappings: [
        {
          containerPort: 3000,
          protocol: ecs.Protocol.TCP,
        },
      ],
      healthCheck: {
        command: ["CMD-SHELL", "curl -f http://localhost:3000 || exit 1"],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Frontend Service
    this.frontendService = new ecs.FargateService(this, "FrontendService", {
      cluster,
      taskDefinition: frontendTaskDef,
      desiredCount: parseInt(process.env.FRONTEND_DESIRED_COUNT || "2"),
      securityGroups: [props.frontendSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      enableExecuteCommand: true,
      circuitBreaker: { rollback: true },
    });

    // Frontend Auto Scaling
    const frontendScaling = this.frontendService.autoScaleTaskCount({
      minCapacity: parseInt(process.env.FRONTEND_MIN_CAPACITY || "2"),
      maxCapacity: parseInt(process.env.FRONTEND_MAX_CAPACITY || "5"),
    });

    frontendScaling.scaleOnCpuUtilization("FrontendCPUScaling", {
      targetUtilizationPercent: parseInt(
        process.env.FRONTEND_TARGET_CPU_UTILIZATION || "70"
      ),
    });

    // ALB Target Groups (attach to services but don't create listeners yet)

    // Backend Target Group
    const backendTargetGroup = this.backendService.loadBalancerTarget({
      containerName: "BackendContainer",
      containerPort: 8080,
    });

    // Frontend Target Group
    const frontendTargetGroup = this.frontendService.loadBalancerTarget({
      containerName: "FrontendContainer",
      containerPort: 3000,
    });

    // Add HTTP redirect listener (replace default)
    const httpListener = props.alb.addListener("HTTPListener", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: "HTTPS",
        port: "443",
        permanent: true,
      }),
    });

    // Add HTTPS listener (only if certificate provided)
    if (process.env.ALB_CERTIFICATE_ARN) {
      const httpsListener = props.alb.addListener("HTTPSListener", {
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [
          elbv2.ListenerCertificate.fromArn(process.env.ALB_CERTIFICATE_ARN),
        ],
        defaultAction: elbv2.ListenerAction.fixedResponse(404, {
          contentType: "text/plain",
          messageBody: "Not Found",
        }),
      });

      // Add target groups to listener
      this.backendService.registerLoadBalancerTargets({
        containerName: "BackendContainer",
        containerPort: 8080,
        newTargetGroupId: "BackendTG",
        listener: ecs.ListenerConfig.applicationListener(httpsListener, {
          protocol: elbv2.ApplicationProtocol.HTTP,
          healthCheck: {
            path: "/healthz",
            interval: cdk.Duration.seconds(30),
          },
          conditions: [
            elbv2.ListenerCondition.pathPatterns([
              "/api/*",
              "/healthz",
              "/metrics",
            ]),
          ],
          priority: 10,
        }),
      });

      this.frontendService.registerLoadBalancerTargets({
        containerName: "FrontendContainer",
        containerPort: 3000,
        newTargetGroupId: "FrontendTG",
        listener: ecs.ListenerConfig.applicationListener(httpsListener, {
          protocol: elbv2.ApplicationProtocol.HTTP,
          healthCheck: {
            path: "/",
            interval: cdk.Duration.seconds(30),
          },
          priority: 100,
        }),
      });
    }

    // Outputs
    new cdk.CfnOutput(this, "BackendServiceName", {
      value: this.backendService.serviceName,
      description: "Backend ECS Service Name",
    });

    new cdk.CfnOutput(this, "FrontendServiceName", {
      value: this.frontendService.serviceName,
      description: "Frontend ECS Service Name",
    });

    new cdk.CfnOutput(this, "BackendECRRepository", {
      value: backendRepo.repositoryUri,
      description: "Backend ECR Repository URI",
    });

    new cdk.CfnOutput(this, "FrontendECRRepository", {
      value: frontendRepo.repositoryUri,
      description: "Frontend ECR Repository URI",
    });
  }
}
