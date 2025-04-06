# Bonus Claim Microservices Infrastructure with AWS CDK

This project provisions AWS infrastructure using AWS CDK (in TypeScript) for two microservices: `user-service` and `admin-service`, running on ECS Fargate with DynamoDB integration. All deployments are fully automated through GitHub Actions.

---

## 🚀 Deployment Instructions (via GitHub Actions)

### 🔐 Prerequisites
- A hosted zone for your domain (manually created in Route 53)
- GitHub repository with the following **Secrets** configured:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`

> ✅ No manual CDK or AWS CLI commands are needed beyond initial GitHub setup.

### 🚦 Environments
- `dev`: Automatically deployed when changes are pushed to the `dev` branch.
- `prod`: Automatically deployed when changes are pushed to the `master` branch.

Each environment has fully isolated AWS resources.

### 🔄 Workflow Summary
On each push to `dev` or `master`:
1. GitHub Actions installs dependencies and CDK.
2. Builds and pushes Docker images to ECR.
3. Bootstraps AWS environment if needed.
4. Deploys VPC, DynamoDB, ECS Services with ALBs.

---

## 🔍 Testing ECS Endpoints

After deployment, CDK will output URLs like:
```
User Service URL: http://Everyr-UserS-xxxxx.us-east-1.elb.amazonaws.com
Admin Service URL: http://Everyr-Admin-xxxxx.us-east-1.elb.amazonaws.com
```

### ✅ Test Health
```bash
curl http://<USER_SERVICE_URL>/health
curl http://<ADMIN_SERVICE_URL>/health
```

### 🎁 Test Bonus Claim
```bash
# Add bonus claim
curl -X POST http://<USER_SERVICE_URL>/add-bonus-claim

# Get bonus claim
curl http://<ADMIN_SERVICE_URL>/get-bonus-claim
```

---

## 🧩 DynamoDB Table Schema

### Table: `BonusClaimsTable`
- **PK** (Partition Key): `USER#<user_id>`
- **SK** (Sort Key): `BONUS#<bonus_id>`
- **status**: CLAIMED | REDEEMED | etc.
- **timestamp**: ISO 8601 string

### Sample Data Inserted via Lambda
```json
{
  "PK": { "S": "USER#100" },
  "SK": { "S": "BONUS#DEMO" },
  "status": { "S": "CLAIMED" },
  "timestamp": { "S": "2025-04-06T12:00:00Z" }
}
```

---

## 🧠 Architectural Decisions

### Full CDK Infrastructure
- VPC, DynamoDB, ECS, IAM roles, ALBs all provisioned with CDK.

### Environment Isolation
- Separate `dev` and `prod` stacks (e.g. `EveryrealmVpcStackDev` vs. `EveryrealmVpcStackProd`).
- Triggered via branch names (`dev`, `master`).

### IAM Least Privilege
- Separate IAM roles for each service with restricted permissions.

### ECR Images
- Docker images built only when service code changes.
- Uploaded to AWS ECR under `user-service` and `admin-service`.

### Manual Hosted Zone
- Domain/Route53 setup is the **only manual step** per project requirements.

---

## ⚙️ GitHub Actions Overview

### Workflow File
`.github/workflows/deploy.yml`

### Key Features
- Auto-deploys on push to `dev` or `master`
- Dynamically determines environment (`ENV`) based on branch
- Bootstraps CDK environment automatically
- Uses GitHub secrets for credentials
- CDK deployed with `--require-approval never`

### Environment Variables
```yaml
env:
  AWS_REGION: us-east-1
  USER_SERVICE_REPO: user-service
  ADMIN_SERVICE_REPO: admin-service
  ENV: ${{ github.ref == 'refs/heads/master' && 'prod' || 'dev' }}
```

---

## 📁 Project Structure
```
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
```

---

## ✅ Improvements for Production Readiness
- Add HTTPS support and domain config via CDK
- Add monitoring via CloudWatch dashboards
- Enable rollback strategies for failed deployments

---

Happy deploying with CDK and GitHub Actions! 🎉