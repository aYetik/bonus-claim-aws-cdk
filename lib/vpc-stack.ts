import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'EveryrealmVpc', {
      maxAzs: 2, //availability zones (1 is also enough for development but we need atleast 2 for the load balancer)
      natGateways: 1, //needed to access the internet (1 is enough for development)
    });
  }
}
