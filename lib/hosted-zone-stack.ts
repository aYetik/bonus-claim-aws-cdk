import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

interface HostedZoneStackProps extends cdk.StackProps {
  domainName: string;
  userServiceLoadBalancer: elbv2.ApplicationLoadBalancer;
  adminServiceLoadBalancer: elbv2.ApplicationLoadBalancer;
}

export class HostedZoneStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HostedZoneStackProps) {
    super(scope, id, props);

    // Lookup existing hosted zone (must already exist in AWS)
    const zone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.domainName,
    });

    // Create A record for user-service
    new route53.ARecord(this, 'UserServiceAliasRecord', {
      zone,
      recordName: `user.${props.domainName}`,
      target: route53.RecordTarget.fromAlias(
        new route53_targets.LoadBalancerTarget(props.userServiceLoadBalancer)
      ),
    });

    // Create A record for admin-service
    new route53.ARecord(this, 'AdminServiceAliasRecord', {
      zone,
      recordName: `admin.${props.domainName}`,
      target: route53.RecordTarget.fromAlias(
        new route53_targets.LoadBalancerTarget(props.adminServiceLoadBalancer)
      ),
    });
  }
}
