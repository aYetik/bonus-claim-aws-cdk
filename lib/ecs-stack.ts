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
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';

interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  table: dynamodb.ITable;
  region: string;
  envName: string; //dev or prod
}

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    // Hosted zone lookup for domain-based routing and certificate validation
    // This assumes you have a hosted zone for your domain in Route 53 (yetik.net registered with an external registrar and ns records set to AWS Route 53)
    const hostedZone = route53.HostedZone.fromLookup(this, 'YetikHostedZone', {
      domainName: 'yetik.net',
    });

    // Suffix to distinguish between dev/prod deployments (e.g. user-dev.yetik.net vs user.yetik.net)
    const suffix = props.envName === 'dev' ? '-dev' : '';
    const userDomain = `user${suffix}.yetik.net`;
    const adminDomain = `admin${suffix}.yetik.net`;

    // Issue ACM certificates per service with DNS validation for HTTPS support
    const userCert = new certificatemanager.Certificate(this, 'UserCert', {
      domainName: userDomain,
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });
    
    const adminCert = new certificatemanager.Certificate(this, 'AdminCert', {
      domainName: adminDomain,
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    // Shared ECS cluster for both services
    const cluster = new ecs.Cluster(this, 'EveryrealmCluster', {
      vpc: props.vpc,
    });

    // IAM role for tasks to interact with DynamoDB using least-privilege
    const taskRole = new iam.Role(this, 'FargateTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    props.table.grantReadWriteData(taskRole);
    const deploymentHash = Date.now().toString(); //forces new deployment on every stack update (changing it to deploying only when the code changes would be good future improvement)

    //USER SERVICE CONFIGURATION
    const userRepo = ecr.Repository.fromRepositoryName(this, 'UserRepo', 'user-service');
    const userService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'UserService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(userRepo, 'latest'),
        containerPort: 3000,
        environment: {
          TABLE_NAME: props.table.tableName,
          AWS_REGION: props.region,
          DEPLOYMENT_HASH: deploymentHash,
        },
        taskRole,
        executionRole: new iam.Role(this, 'UserServiceExecutionRole', {
          assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
          ],
        }),
      },
      domainName: userDomain, //assign custom domain name
      domainZone: hostedZone, //Route53 zone
      certificate: userCert, //certificate for HTTPS
      redirectHTTP: true,
      publicLoadBalancer: true,
    });

    // Health check to ensure ECS tasks are responsive, also needed to succesfully finish the deployment
    userService.targetGroup.configureHealthCheck({
      path: '/', //health check root
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
    });

    //ADMIN SERVICE CONFIGURATION
    const adminRepo = ecr.Repository.fromRepositoryName(this, 'AdminRepo', 'admin-service');
    const adminService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'AdminService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(adminRepo, 'latest'),
        containerPort: 3000,
        environment: {
          TABLE_NAME: props.table.tableName,
          AWS_REGION: props.region,
          DEPLOYMENT_HASH: deploymentHash,
        },
        taskRole,
        executionRole: new iam.Role(this, 'AdminServiceExecutionRole', {
          assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
          ],
        }),
      },
      domainName: adminDomain, //assign custom domain name
      domainZone: hostedZone, //Route53 zone
      certificate: adminCert, //certificate for HTTPS
      redirectHTTP: true,
      publicLoadBalancer: true,
    });

    // Health check to ensure ECS tasks are responsive, also needed to succesfully finish the deployment
    adminService.targetGroup.configureHealthCheck({
      path: '/', //health check root
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
    });
  }
}