import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  databaseSecurityGroup: ec2.SecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly databaseEndpoint: string;
  public readonly databaseSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Database credentials in Secrets Manager
    const dbCredentials = new secretsmanager.Secret(
      this,
      "DatabaseCredentials",
      {
        secretName:
          process.env.DB_SECRET_NAME || "banking-audit/db-credentials",
        description: "RDS PostgreSQL credentials for Banking Audit Ledger",
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: process.env.RDS_MASTER_USERNAME || "audit_admin",
          }),
          generateStringKey: "password",
          excludeCharacters: '/@"',
          passwordLength: 32,
        },
      }
    );

    this.databaseSecret = dbCredentials;

    // Parameter Group
    const parameterGroup = new rds.ParameterGroup(
      this,
      "DatabaseParameterGroup",
      {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_15_4,
        }),
        description: "Parameter group for Banking Audit PostgreSQL",
        parameters: {
          shared_buffers: "256MB",
          max_connections: "200",
          effective_cache_size: "1GB",
          work_mem: "16MB",
          maintenance_work_mem: "128MB",
          random_page_cost: "1.1",
          effective_io_concurrency: "200",
          wal_buffers: "8MB",
          default_statistics_target: "100",
          log_statement: "all",
          log_duration: "on",
        },
      }
    );

    // RDS PostgreSQL Instance
    this.database = new rds.DatabaseInstance(this, "PostgreSQLDatabase", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      instanceType: new ec2.InstanceType(
        process.env.RDS_INSTANCE_CLASS || "db.t3.medium"
      ),
      credentials: rds.Credentials.fromSecret(dbCredentials),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [props.databaseSecurityGroup],
      databaseName: process.env.RDS_DATABASE_NAME || "banking_audit_db",
      allocatedStorage: parseInt(process.env.RDS_ALLOCATED_STORAGE || "100"),
      maxAllocatedStorage: parseInt(
        process.env.RDS_MAX_ALLOCATED_STORAGE || "500"
      ),
      storageEncrypted: true,
      multiAz: process.env.RDS_MULTI_AZ === "true",
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(
        parseInt(process.env.RDS_BACKUP_RETENTION_DAYS || "7")
      ),
      preferredBackupWindow: process.env.BACKUP_WINDOW || "03:00-04:00",
      preferredMaintenanceWindow:
        process.env.MAINTENANCE_WINDOW || "sun:04:00-sun:05:00",
      deletionProtection: process.env.RDS_DELETION_PROTECTION === "true",
      parameterGroup: parameterGroup,
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      cloudwatchLogsExports: ["postgresql", "upgrade"],
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    this.databaseEndpoint = this.database.dbInstanceEndpointAddress;

    // Outputs
    new cdk.CfnOutput(this, "DatabaseEndpoint", {
      value: this.databaseEndpoint,
      description: "RDS PostgreSQL Endpoint",
      exportName: "BankingAuditDatabaseEndpoint",
    });

    new cdk.CfnOutput(this, "DatabaseSecretArn", {
      value: dbCredentials.secretArn,
      description: "Database Credentials Secret ARN",
      exportName: "BankingAuditDatabaseSecretArn",
    });

    new cdk.CfnOutput(this, "DatabaseName", {
      value: process.env.RDS_DATABASE_NAME || "banking_audit_db",
      description: "Database Name",
      exportName: "BankingAuditDatabaseName",
    });
  }
}
