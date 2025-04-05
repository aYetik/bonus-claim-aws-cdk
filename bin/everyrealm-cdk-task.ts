#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { VpcStack } from '../lib/vpc-stack';
import { EcsStack } from '../lib/ecs-stack';

const app = new cdk.App();
const envType = (app.node.tryGetContext('env') || 'dev') as 'dev' | 'prod';
const region = 'us-east-1';

const envConfig = {
  dev: {
    env: { region },
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  },
  prod: {
    env: { region },
    removalPolicy: cdk.RemovalPolicy.RETAIN,
  },
};

const currentEnv = envConfig[envType];

//deploy the VPC stack
const vpcStack = new VpcStack(app, 'EveryrealmVpcStack', {
  env: currentEnv.env,
});

//deploy the DynamoDB stack
const dynamoStack = new DynamoDBStack(app, 'EveryrealmDynamoDBStack', {
  env: currentEnv.env,
  removalPolicy: currentEnv.removalPolicy,
});

//deploy ECS stack
//pass the VPC and DynamoDB table name to the ECS stack
new EcsStack(app, 'EveryrealmEcsStack', {
  env: currentEnv.env,
  vpc: vpcStack.vpc,
  table: dynamoStack.table,
  region: currentEnv.env.region,
});