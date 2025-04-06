import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  table: dynamodb.ITable;
  region: string;
  hostedZone: route53.IHostedZone;
  envName: string;
}

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, 'EveryrealmCluster', {
      vpc: props.vpc,
    });

    const taskRole = new iam.Role(this, 'FargateTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    props.table.grantReadWriteData(taskRole); //least privilege principle

    // user-service
    const userServiceRepo = ecr.Repository.fromRepositoryName(this, 'UserRepo', 'user-service');
    const userService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'UserService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(userServiceRepo, 'latest'),
        containerPort: 3000,
        environment: {
          TABLE_NAME: props.table.tableName,
          AWS_REGION: props.region,
        },
        taskRole,
        executionRole: new iam.Role(this, 'UserServiceExecutionRole', {
          assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
          ],
        }),
      },
      publicLoadBalancer: true,
    });

    userService.targetGroup.configureHealthCheck({
      path: '/',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
    });

    // admin-service
    const adminServiceRepo = ecr.Repository.fromRepositoryName(this, 'AdminRepo', 'admin-service');
    const adminService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'AdminService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(adminServiceRepo, 'latest'),
        containerPort: 3000,
        environment: {
          TABLE_NAME: props.table.tableName,
          AWS_REGION: props.region,
        },
        taskRole,
        executionRole: new iam.Role(this, 'AdminServiceExecutionRole', {
          assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
          ],
        }),
      },
      publicLoadBalancer: true,
    });
    
    adminService.targetGroup.configureHealthCheck({
      path: '/',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
    });

    // Hosted zone records
    const suffix = props.envName === 'dev' ? '-dev' : '';

    new route53.ARecord(this, 'UserServiceAliasRecord', {
      zone: props.hostedZone,
      recordName: `user${suffix}`,
      target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(userService.loadBalancer)),
    });

    new route53.ARecord(this, 'AdminServiceAliasRecord', {
      zone: props.hostedZone,
      recordName: `admin${suffix}`,
      target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(adminService.loadBalancer)),
    });
  }
}
