#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { VpcStack } from '../lib/vpc-stack';
import { EcsStack } from '../lib/ecs-stack';
import * as route53 from 'aws-cdk-lib/aws-route53';

const app = new cdk.App();
const envType = (app.node.tryGetContext('env') || 'dev') as 'dev' | 'prod';
const region = 'us-east-1';

const envConfig = {
  dev: {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region },
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  },
  prod: {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region },
    removalPolicy: cdk.RemovalPolicy.RETAIN,
  },
};

const currentEnv = envConfig[envType];

const envSuffix = envType.charAt(0).toUpperCase() + envType.slice(1); // "Dev" or "Prod" (different stacks for different environments)
//different naming for different environments is not needed if already using different aws accounts credentials for different environments

const vpcStack = new VpcStack(app, `EveryrealmVpcStack${envSuffix}`, {
  env: currentEnv.env,
});

const dynamoStack = new DynamoDBStack(app, `EveryrealmDynamoDBStack${envSuffix}`, {
  env: currentEnv.env,
  removalPolicy: currentEnv.removalPolicy,
});

new EcsStack(app, `EveryrealmEcsStack${envSuffix}`, {
  env: currentEnv.env,
  vpc: vpcStack.vpc,
  table: dynamoStack.table,
  region,
  envName: envType,
});