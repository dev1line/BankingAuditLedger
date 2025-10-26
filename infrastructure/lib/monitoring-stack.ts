import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatch_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sns_subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

interface MonitoringStackProps extends cdk.StackProps {
  backendService: ecs.FargateService;
  frontendService: ecs.FargateService;
  database: rds.DatabaseInstance;
  alb: elbv2.ApplicationLoadBalancer;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // SNS Topic for Alerts
    const alertTopic = new sns.Topic(this, "AlertTopic", {
      displayName: "Banking Audit Ledger Alerts",
      topicName: "banking-audit-alerts",
    });

    // Email subscription
    if (process.env.ALERT_EMAIL) {
      alertTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(process.env.ALERT_EMAIL)
      );
    }

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, "BankingAuditDashboard", {
      dashboardName: "BankingAuditLedger-Production",
    });

    // Backend Metrics
    const backendCPU = props.backendService.metricCpuUtilization({
      period: cdk.Duration.minutes(5),
    });

    const backendMemory = props.backendService.metricMemoryUtilization({
      period: cdk.Duration.minutes(5),
    });

    // Frontend Metrics
    const frontendCPU = props.frontendService.metricCpuUtilization({
      period: cdk.Duration.minutes(5),
    });

    const frontendMemory = props.frontendService.metricMemoryUtilization({
      period: cdk.Duration.minutes(5),
    });

    // Database Metrics
    const dbConnections = props.database.metricDatabaseConnections({
      period: cdk.Duration.minutes(5),
    });

    const dbCPU = props.database.metricCPUUtilization({
      period: cdk.Duration.minutes(5),
    });

    // ALB Metrics
    const albRequests = props.alb.metrics.requestCount({
      period: cdk.Duration.minutes(5),
    });

    const albTargetResponseTime = props.alb.metrics.targetResponseTime({
      period: cdk.Duration.minutes(5),
    });

    // Add widgets to dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Backend Service Metrics",
        left: [backendCPU, backendMemory],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: "Frontend Service Metrics",
        left: [frontendCPU, frontendMemory],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Database Metrics",
        left: [dbConnections, dbCPU],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: "Load Balancer Metrics",
        left: [albRequests, albTargetResponseTime],
        width: 12,
      })
    );

    // Alarms

    // Backend High CPU
    const backendHighCPU = new cloudwatch.Alarm(this, "BackendHighCPUAlarm", {
      metric: backendCPU,
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: "Backend CPU utilization is too high",
    });
    backendHighCPU.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    // Backend High Memory
    const backendHighMemory = new cloudwatch.Alarm(
      this,
      "BackendHighMemoryAlarm",
      {
        metric: backendMemory,
        threshold: 85,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: "Backend memory utilization is too high",
      }
    );
    backendHighMemory.addAlarmAction(
      new cloudwatch_actions.SnsAction(alertTopic)
    );

    // Database High CPU
    const dbHighCPU = new cloudwatch.Alarm(this, "DatabaseHighCPUAlarm", {
      metric: dbCPU,
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: "Database CPU utilization is too high",
    });
    dbHighCPU.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    // Database High Connections
    const dbHighConnections = new cloudwatch.Alarm(
      this,
      "DatabaseHighConnectionsAlarm",
      {
        metric: dbConnections,
        threshold: 180,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: "Database connection count is too high",
      }
    );
    dbHighConnections.addAlarmAction(
      new cloudwatch_actions.SnsAction(alertTopic)
    );

    // ALB 5XX Errors
    const alb5XXErrors = new cloudwatch.Alarm(this, "ALB5XXErrorsAlarm", {
      metric: props.alb.metrics.httpCodeTarget(
        elbv2.HttpCodeTarget.TARGET_5XX_COUNT,
        { period: cdk.Duration.minutes(5) }
      ),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: "Too many 5XX errors from targets",
    });
    alb5XXErrors.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    // Outputs
    new cdk.CfnOutput(this, "DashboardURL", {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: "CloudWatch Dashboard URL",
    });

    new cdk.CfnOutput(this, "AlertTopicArn", {
      value: alertTopic.topicArn,
      description: "SNS Topic ARN for alerts",
    });
  }
}
