import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';

interface DynamoDBStackProps extends cdk.StackProps {
  removalPolicy: cdk.RemovalPolicy;
}

export class DynamoDBStack extends cdk.Stack {
  public readonly table: dynamodb.ITable; //exposed so other stacks (like ECS) can access it

  constructor(scope: Construct, id: string, props: DynamoDBStackProps) {
    super(scope, id, props);

    const table = new dynamodb.TableV2(this, 'BonusClaimsTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      removalPolicy: props.removalPolicy,
    });

    this.table = table;

    // sample insert Lambda
    const insertLambda = new lambda.Function(this, 'InsertItemsLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'insert-items.handler',
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantWriteData(insertLambda); //permission to write (least privilege principle)

    // Use a Custom Resource to invoke the Lambda during stack creation
    const provider = new cr.Provider(this, 'InsertItemsProvider', {
      onEventHandler: insertLambda,
    });

    // Trigger the Lambda once during deployment to populate the table with dummy data
    new cdk.CustomResource(this, 'InsertSampleDataCustomResource', {
      serviceToken: provider.serviceToken,
    });
  }
}

