# Dynamic Finance Simulator — Backend Infrastructure

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (React/TS)                           │
│                     http://localhost:3000                           │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS + JWT (Authorization header)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  API Gateway — HTTP API (v1)                        │
│              JWT Authorizer (Cognito — cognito-jwt)                 │
│                                                                     │
│  POST /review          POST /simulate        GET /history           │
│  POST /simulate        PATCH /history/{id}   PATCH /history/{id}   │
│                        DELETE /history/{id}                         │
└────────┬───────────────────────┬──────────────────────┬────────────┘
         │                       │                      │
         ▼                       ▼                      ▼
┌────────────────┐   ┌───────────────────┐   ┌─────────────────────┐
│ dfs-input-     │   │  dfs-simulation   │   │    dfs-history      │
│ review         │   │                   │   │                     │
│                │   │ 1. Bedrock        │   │ GET  → read S3      │
│ 1. Validate    │   │    code gen       │   │ PATCH → read/write  │
│ 2. Bedrock     │   │ 2. vm2 sandbox    │   │ DELETE → read/write │
│    gap check   │   │    eval loop      │   │                     │
│ 3. Return      │   │ 3. Bedrock        │   │ Timeout: 15s        │
│    questions   │   │    report gen     │   │ Memory: 256MB       │
│    or approval │   │ 4. Write S3       │   │ Arch: x86_64        │
│                │   │ 5. Return result  │   └──────────┬──────────┘
│ Timeout: 30s   │   │                   │              │
│ Memory: 256MB  │   │ Timeout: 5min     │              │
│ Arch: x86_64   │   │ Memory: 256MB     │              │
└────────┬───────┘   │ Arch: x86_64      │              │
         │           └─────────┬─────────┘              │
         │                     │                        │
         │           ┌─────────┴─────────┐              │
         │           │                   │              │
         ▼           ▼                   ▼              ▼
┌─────────────────────────┐   ┌──────────────────────────────────────┐
│      AWS Bedrock        │   │                 S3                   │
│   gpt-oss-120b-1:0      │   │         dfs-history-bucket           │
│                         │   │                                      │
│  Guardrail attached:    │   │  users/{cognito_sub}/history.json    │
│  - Blocks prompt        │   │                                      │
│    injection            │   │  Block all public access: ON         │
│  - Denies off-topic     │   │  Versioning: OFF                     │
│    requests             │   │  Encryption: SSE-S3                  │
│  - PII filtering        │   └──────────────────────────────────────┘
└─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Cognito User Pool                                │
│                                                                     │
│  Sign-in: Email                                                     │
│  Federated IdP: Google OAuth                                        │
│  Pre-signup trigger: dfs-presignup Lambda                           │
│    └── Checks email against ALLOWED_EMAILS env var                 │
│    └── Blocks any email not on the allowlist                        │
│                                                                     │
│  App client: dfs-react-app                                          │
│    └── Grant type: Authorization code                               │
│    └── Scopes: openid, email                                        │
│    └── Callback: http://localhost:3000/callback                     │
│    └── IdPs: Cognito + Google                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         ECR Repository                              │
│                        dfs/lambdas                                  │
│                                                                     │
│  All four Lambda functions share one image                          │
│  Platform: linux/amd64                                              │
│  Base image: public.ecr.aws/lambda/nodejs:22                        │
│  CMD overridden per-function at deploy time                         │
└─────────────────────────────────────────────────────────────────────┘
```

## IAM Roles

| Role                  | Lambda           | Permissions                                                               |
| --------------------- | ---------------- | ------------------------------------------------------------------------- |
| dfs-presignup-role    | dfs-presignup    | CloudWatch logs only                                                      |
| dfs-input-review-role | dfs-input-review | CloudWatch logs, Bedrock InvokeModel                                      |
| dfs-simulation-role   | dfs-simulation   | CloudWatch logs, Bedrock InvokeModel, S3 GetObject + PutObject (users/\*) |
| dfs-history-role      | dfs-history      | CloudWatch logs, S3 GetObject + PutObject + DeleteObject (users/\*)       |

## Environment Variables

| Variable                    | dfs-presignup | dfs-input-review | dfs-simulation | dfs-history |
| --------------------------- | ------------- | ---------------- | -------------- | ----------- |
| `ALLOWED_EMAILS`            | ✅            | ❌               | ❌             | ❌          |
| `BEDROCK_GUARDRAIL_ID`      | ❌            | ✅               | ✅             | ❌          |
| `BEDROCK_GUARDRAIL_VERSION` | ❌            | ✅               | ✅             | ❌          |
| `S3_BUCKET`                 | ❌            | ❌               | ✅             | ✅          |

## Lambda Configuration

| Lambda           | Timeout | Memory | Architecture | Handler                            |
| ---------------- | ------- | ------ | ------------ | ---------------------------------- |
| dfs-presignup    | 5s      | 256MB  | x86_64       | `dist/lambdas/presignup.handler`   |
| dfs-input-review | 30s     | 256MB  | x86_64       | `dist/lambdas/inputReview.handler` |
| dfs-simulation   | 5 min   | 256MB  | x86_64       | `dist/lambdas/simulation.handler`  |
| dfs-history      | 15s     | 256MB  | x86_64       | `dist/lambdas/history.handler`     |

## API Gateway Routes

| Method | Path                    | Lambda           | Authorizer  |
| ------ | ----------------------- | ---------------- | ----------- |
| POST   | /review                 | dfs-input-review | cognito-jwt |
| POST   | /simulate               | dfs-simulation   | cognito-jwt |
| GET    | /history                | dfs-history      | cognito-jwt |
| PATCH  | /history/{simulationId} | dfs-history      | cognito-jwt |
| DELETE | /history/{simulationId} | dfs-history      | cognito-jwt |

## CORS Configuration

| Setting           | Value                               |
| ----------------- | ----------------------------------- |
| Allow-Origin      | `http://localhost:3000`             |
| Allow-Headers     | `Authorization, Content-Type`       |
| Allow-Methods     | `GET, POST, PATCH, DELETE, OPTIONS` |
| Allow-Credentials | `true`                              |
| Max-Age           | `300`                               |

## Deployment

All four Lambdas share a single Docker image stored in ECR. Deploying new code:

```bash
npm run deploy
```

Which runs:

1. `npm run build` — compiles TypeScript to `dist/`
2. `docker-auth` — authenticates Docker to ECR
3. `docker-build` — builds linux/amd64 image with provenance disabled
4. `docker-tag` — tags image as latest
5. `docker-push` — pushes to ECR
6. `lambda-update` — calls update-function-code on all four functions
7. `lambda-wait` — waits for all four updates to complete
