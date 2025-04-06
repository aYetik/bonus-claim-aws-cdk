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
    env: { region },
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  },
  prod: {
    env: { region },
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

// We have cdk bootstrap in the pipeline so we need to skip to run cdk code like hostedzone.fromlookup
// This is a workaround for the issue where cdk bootstrap command fails while trying to run cdk code hostedzone.fromlookup
if (app.node.tryGetContext('env')) {
  const hostedZone = route53.HostedZone.fromLookup(app, 'YetikHostedZone', {
    domainName: 'yetik.net',
  });

  new EcsStack(app, `EveryrealmEcsStack${envSuffix}`, {
    env: currentEnv.env,
    vpc: vpcStack.vpc,
    table: dynamoStack.table,
    region,
    hostedZone,
    envName: envType,
  });
} else {
  console.log('Skipping hosted zone and ecs synthesis — probably running `cdk bootstrap`');
}
