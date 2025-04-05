Bonus Claim Microservices Infrastructure with AWS CDK

This project sets up a production-ready AWS infrastructure using AWS CDK (in TypeScript) for two Fargate-based microservices: user-service and admin-service. The system uses DynamoDB to store bonus claim records, and the deployment is automated using GitHub Actions.

🔧 Infrastructure Overview

VPC: Isolated network using private and public subnets.

DynamoDB: On-demand table for storing bonus claims with composite keys.

ECS Fargate Services:

user-service: Accepts and writes bonus claim data.

admin-service: Fetches claim data.

ALB: Application Load Balancer for each service.

IAM Roles: Strictly scoped to service-level needs.

🚀 Deployment Instructions

1. Prerequisites

AWS CLI configured with sufficient permissions

CDK CLI installed: npm install -g aws-cdk

Docker installed and running

Node.js 18+ and npm installed

A domain (optional for DNS setup)

2. Bootstrap CDK (first time only)

cdk bootstrap

3. Deploy (Local)

# For development environment
cdk deploy --all --require-approval never --context env=dev

# For production environment
cdk deploy --all --require-approval never --context env=prod

4. Deploy via GitHub Actions

Push to:

dev branch to deploy dev environment

master branch to deploy prod environment

GitHub Actions will:

Build the services

Push Docker images to ECR

Deploy infrastructure via CDK

🔍 Testing ECS Endpoints

After deployment, CDK will output ALB URLs like:

User Service URL: http://Everyr-UserS-xxxxx.us-east-1.elb.amazonaws.com
Admin Service URL: http://Everyr-Admin-xxxxx.us-east-1.elb.amazonaws.com

Test Health Check

curl http://<USER_SERVICE_URL>/health
curl http://<ADMIN_SERVICE_URL>/health

Test Bonus Claim

# Add bonus claim
curl -X POST http://<USER_SERVICE_URL>/add-bonus-claim

# Get bonus claim
curl http://<ADMIN_SERVICE_URL>/get-bonus-claim

🧩 DynamoDB Schema

Table: BonusClaimsTable

PK (Partition Key): USER#<user_id>

SK (Sort Key): BONUS#<bonus_id>

status: CLAIMED / REDEEMED / etc.

timestamp: ISO string timestamp

Sample Item Inserted (via Lambda):

{
  "PK": { "S": "USER#100" },
  "SK": { "S": "BONUS#DEMO" },
  "status": { "S": "CLAIMED" },
  "timestamp": { "S": "2025-04-06T12:00:00Z" }
}

🧠 Architectural Decisions

Environment Separation

Used context variables and stack naming to isolate dev and prod.

Each environment deploys to separate resources.

No .env Files

Environment configuration is fully managed by CDK and GitHub secrets.

IAM Security

Each service has its own IAM role scoped to the table.

Docker Builds

Dockerfiles are minimal and separate for each service.

Rebuilds triggered only if the corresponding service changes.

Hosted Zone

Hosted zone and DNS records setup is the only manual step.

🛠 GitHub Actions Pipeline

File: .github/workflows/deploy.yml

Trigger:

On push to dev or master

Steps:

Checkout source

Install dependencies and CDK CLI

Configure AWS credentials from GitHub secrets

Build CDK project

Build & push Docker images to ECR

Deploy the CDK stack with appropriate context (env=dev or env=prod)

Secrets

AWS_ACCESS_KEY_ID

AWS_SECRET_ACCESS_KEY

AWS_REGION (can be hardcoded in workflow)

📁 Project Structure

.
├── bin/
│   └── everyrealm-cdk-task.ts
├── lib/
│   ├── dynamodb-stack.ts
│   ├── ecs-stack.ts
│   └── vpc-stack.ts
├── services/
│   ├── user-service/
│   └── admin-service/
├── lambda/
│   └── insert-items.ts
└── .github/
    └── workflows/deploy.yml

✅ Future Improvements

Add automated rollback for failed deploys

Add domain and HTTPS support via CDK

Add monitoring with CloudWatch dashboards

Feel free to open issues or contribute. Happy deploying! 🚀

