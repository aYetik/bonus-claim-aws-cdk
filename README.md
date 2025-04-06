# Bonus Claim Microservices Infrastructure with AWS CDK

This project provisions a modern, cloud-native infrastructure on AWS using CDK (TypeScript), designed to support two microservices — `user-service` and `admin-service` — running on ECS Fargate with shared DynamoDB integration. CI/CD is handled through GitHub Actions, offering fully automated deployment pipelines.

---

## 🚀 Deployment with GitHub Actions

### 🔐 Setup

Before deploying, make sure your AWS account has a hosted zone for your domain (e.g. `yetik.net`) already created in Route 53.
Update domain name in `ecs-stack.ts` if you are using a different domain.
GitHub repository needs to be configured with secrets:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `CDK_DEFAULT_ACCOUNT`
  - `CDK_DEFAULT_REGION`

> No CDK or AWS CLI usage required after initial setup. Just push and deploy.

### 🌱 Environments

- `dev` → deployed on pushes to `dev` branch
- `prod` → deployed on pushes to `master`

Each environment gets its own VPC, ALBs, ECS services, certificates, and DNS entries. Domain routing is automatically set up using Route 53.

### 🔄 Workflow Summary
On each push to `dev` or `master`:
1. GitHub Actions installs dependencies and CDK.
2. Builds and pushes Docker images to ECR.
3. Bootstraps AWS environment if needed.
4. Deploys VPC, DynamoDB, ECS Services with ALBs.

---

### ✅ Test Health
Dev:
```bash
curl https://user-dev.yetik.net/
curl https://admin-dev.yetik.net/
```
Prod:
```bash
curl https://user.yetik.net/
curl https://admin.yetik.net/
```

---

## 🧪 How to Use the Services

### **User Service** (`https://user-dev.yetik.net`)

#### ➕ POST `/add-bonus-claim`

Adds a bonus claim to DynamoDB. Accepts optional `userId` and `bonusId` in body. Defaults to `USER#100` and `BONUS#DEMO` if not provided.

```bash
curl -X POST https://user-dev.yetik.net/add-bonus-claim \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "bonusId": "XYZ"}'
```

### **Admin Service** (`https://admin-dev.yetik.net`)

#### 📄 GET `/get-bonus-claim`

Fetch a specific bonus claim using optional query parameters. Returns default values from user-service's /add-bonus-claim if no parameter provided.

```bash
curl "https://admin-dev.yetik.net/get-bonus-claim?userId=123&bonusId=XYZ"
```

#### 📋 GET `/list-bonus-claims`

Lists all bonus claims or applies optional filters by userId and/or bonusId:

```bash
curl "https://admin-dev.yetik.net/list-bonus-claims?userId=123"
```

---

## 🧩 DynamoDB Table Schema

### Table: `BonusClaimsTable`

The shared table uses composite keys.

- **PK** (Partition Key): `USER#<user_id>`
- **SK** (Sort Key): `BONUS#<bonus_id>`
- **status**: Claim status. `CLAIMED | REDEEMED | etc.`
- **timestamp**: ISO 8601 timestamp of creation

### Sample Data Inserted via Lambda
```json
[
  { "PK": "USER#1", "SK": "BONUS#A", "status": "CLAIMED" },
  { "PK": "USER#2", "SK": "BONUS#B", "status": "PENDING" },
  { "PK": "USER#3", "SK": "BONUS#C", "status": "COMPLETED" }
]
```

---

## 🧠 Architectural Decisions

### Full CDK Infrastructure
- VPC, DynamoDB, ECS, IAM roles, ALBs all provisioned with CDK.

### SSL Certificates + HTTPS
- Certificates are automatically requested via ACM and attached to load balancers.

### DNS Routing
- Subdomains like user-dev.yetik.net and admin-dev.yetik.net are automatically created and routed via Route53 A records.

### Environment Isolation
- `dev` and `prod` use separate stacks, subdomains, and isolated AWS resources.
- Deploys automatically triggered via branch names (`dev`, `master`).

### IAM Least Privilege
- Each service has its own scoped execution and task roles.

### ECR Images
- Docker images built and uploaded to AWS ECR under `user-service` and `admin-service`.

### Manual Hosted Zone
- Domain/Route53 setup is the **only manual step** per project requirements.

### Health Checks
- Both services implement / endpoints to health check, compatible with ALB target group checks.

---

## ⚙️ CI/CD with GitHub Actions

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
  ENV: # dynamically resolved in GitHub Actions, dev or prod depending on branch
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
- Add input validations
- Require authentication for endpoints
- Rate limiting
- Monitoring & Logging with AWS CloudWatch
- CI/CD Enhancements, require succesful build before merge etc
- Add backup and restore strategy for DynamoDB
- Improve CDK Deployments time potentially deploying containers only when something is changed

---

Happy deploying with AWS CDK and GitHub Actions! 🎉