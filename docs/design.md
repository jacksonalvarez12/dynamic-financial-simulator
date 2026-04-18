# Dynamic Finance Simulator — Design Document

**Project:** Dynamic Finance Simulator  
**Stack:** React (TypeScript) + AWS (Lambda, API Gateway, Cognito, Bedrock, S3)  
**Status:** Pre-development

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Auth & Access Control](#3-auth--access-control)
4. [API Design](#4-api-design)
5. [Lambda Specifications](#5-lambda-specifications)
6. [LLM Integration](#6-llm-integration)
7. [Code Execution & Sandboxing](#7-code-execution--sandboxing)
8. [Data Models](#8-data-models)
9. [S3 Storage Design](#9-s3-storage-design)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Validation Strategy](#11-validation-strategy)
12. [Open Questions](#12-open-questions)

---

## 1. Overview

Dynamic Finance Simulator lets a user describe their financial life in free text — income, expenses, savings vehicles, and future life events — and receive a month-by-month simulation of their finances over a configurable time horizon. The simulation is powered by an LLM that generates a JavaScript step function representing the user's financial rules, which is then evaluated in a sandboxed loop to produce a full timeline. The result is displayed as per-bucket graphs, a natural language report, and optionally the underlying simulation code.

Each simulation run is stored in a per-user history file in S3, displayed in a sidebar analogous to chat history in Claude.ai. Users may iterate on a simulation by editing their inputs and re-running.

### Core User Flow

```
Enter financial details (free text)
  → POST /review (gap-check with LLM)
    → if needs_clarification: user edits input and resubmits (up to 3 times, frontend-managed)
    → if approved: POST /simulate
      → LLM generates step function → sandboxed eval loop
        → Results (graphs + report + optional code view)
          → Saved to history / user may edit inputs and start a fresh simulation
```

---

## 2. Architecture

### Component Map

```
Browser (React/TS)
  └── API Gateway (Cognito JWT Authorizer)
        ├── POST /review     → Input Review Lambda
        ├── POST /simulate   → Simulation Lambda
        └── GET|PATCH|DELETE /history → History Lambda
                                            └── S3 (users/{sub}/history.json)

Input Review Lambda  ──▶  AWS Bedrock (gpt-oss-120b + Guardrails)
Simulation Lambda    ──▶  AWS Bedrock (gpt-oss-120b + Guardrails)
                     ──▶  vm2 Sandbox (simulationStep eval)
                     ──▶  S3 (append result after successful run)

Cognito User Pool (Google OAuth + email allowlist via pre-signup Lambda)
  └── Issues JWT consumed by API Gateway authorizer
```

### Lambda Responsibilities (summary)

| Lambda       | Trigger                     | Bedrock                 | S3                  |
| ------------ | --------------------------- | ----------------------- | ------------------- |
| Input Review | POST /review                | Yes — gap analysis      | No                  |
| Simulation   | POST /simulate              | Yes — code gen + report | Write only (append) |
| History      | GET\|PATCH\|DELETE /history | No                      | Read + Write        |

---

## 3. Auth & Access Control

### Identity Provider

AWS Cognito User Pool with Google as a federated OIDC identity provider. Login is handled via the Cognito Hosted UI or `@aws-amplify/auth` on the frontend.

### Allowlist Enforcement

Access is restricted to a specific set of users (the developer and their friends). This is enforced via a **Cognito pre-signup Lambda trigger**. On every new sign-up attempt, the trigger checks the incoming email against a hardcoded allowlist (or a small DynamoDB table for easier management). If the email is not on the list, the trigger throws an error and Cognito rejects the sign-up — the user never gets a token.

```typescript
// Pre-signup Lambda (conceptual)
export const handler = async (event: CognitoUserPoolTriggerEvent) => {
  const email = event.request.userAttributes.email;
  const allowlist = process.env.ALLOWED_EMAILS!.split(",");
  if (!allowlist.includes(email)) {
    throw new Error("Access restricted.");
  }
  return event;
};
```

### API Gateway Authorization

All three API routes are protected by a **Cognito JWT Authorizer** on API Gateway. The authorizer validates the token signature, expiry, and issuer before any Lambda is invoked. An invalid or missing token returns HTTP 401 before any Lambda cold-start cost is incurred.

### S3 Access Scoping

S3 is never accessed directly by the browser. All reads and writes go through Lambda. The S3 key for each user is derived from the **`sub` claim in the Cognito JWT**, which API Gateway injects into the Lambda event's `requestContext.authorizer.jwt.claims`. The client never supplies a user ID — it is always read from the trusted authorizer context.

```typescript
const sub = event.requestContext.authorizer.jwt.claims.sub as string;
const s3Key = `users/${sub}/history.json`;
```

The Lambda IAM role has access to `s3://bucket/users/*`. Per-user scoping is enforced in code, not via IAM conditions, which is sufficient for a personal-scale project.

**S3 bucket settings:**

- Block all public access: enabled
- No bucket policy granting public or cross-account access
- No pre-signed URL generation; Lambda mediates all access

---

## 4. API Design

All routes require a valid Cognito JWT in the `Authorization: Bearer <token>` header.

### POST /review

Validates user input for completeness and returns either a list of follow-up questions or an approval.

**Request:**

```typescript
{
  financialInput: string; // free text, 20–5000 chars
}
```

**Response:**

```typescript
{
  status: 'needs_clarification' | 'approved';
  questions?: string[];   // present when status === 'needs_clarification'
}
```

### POST /simulate

Accepts approved financial input and returns the completed simulation.

**Request:**

```typescript
{
  approvedInput: string; // free text, 20–5000 chars
  simulationId: string; // uuid generated by frontend on "New Simulation"
}
```

**Response:**

```typescript
{
  simulationData: FinanceState[];
  report: string;
  simulationStepCode: string;
  durationMonths: number;
}
```

### GET /history

Called on application startup. Returns the full history file for the authenticated user, or an empty structure if none exists.

**Response:** `SimulationHistory` (see Data Models)

### PATCH /history/{simulationId}

Updates the name of a simulation entry.

**Request:**

```typescript
{
  simulationName: string;
}
```

### DELETE /history/{simulationId}

Removes a simulation and all its iterations from the history file.

---

## 5. Lambda Specifications

### Input Review Lambda

1. Validate request body with Joi (`financialInput`)
2. Call Bedrock with the gap-analysis prompt (see LLM Integration)
3. Parse the LLM response and return it directly to the client: either `{ status: 'approved' }` or `{ status: 'needs_clarification', questions }`
4. On any Bedrock or parsing error, return HTTP 500 — the frontend displays a failure message and prompts the user to try again

The review loop itself is managed entirely on the frontend. The Lambda is stateless and single-pass: one call in, one response out.

### Simulation Lambda

1. Validate request body with Joi (`approvedInput`)
2. Call Bedrock with the code-generation prompt to produce `initialFinanceState`, `durationYears`, `durationMonths`, and `simulationStepCode` as a JS string
3. Validate the LLM response structure with Joi
4. Execute the simulation loop in the vm2 sandbox (see Code Execution), validating each `FinanceState` output with Joi
5. Call Bedrock a second time with the simulation results and original input to generate the natural language report
6. Write the completed simulation directly to S3 (read `users/{sub}/history.json` → append new entry → write back)
7. Return simulation data, report, and code string to the client

On any error at any step — Bedrock failure, Joi validation failure, vm2 error, S3 write failure — the Lambda returns HTTP 500. No partial data is written to S3. The frontend scraps the in-progress state and displays a failure message prompting the user to try again.

### History Lambda

Handles three operations against the user's S3 history file:

**GET:** Read `s3Key`. If the object does not exist (NoSuchKey), return an empty `SimulationHistory` and write the empty structure to S3 to initialize it.

**PATCH:** Read → find simulation by ID → update `simulationName` → write back.

**DELETE:** Read → filter out simulation by ID → write back.

All three operations are guarded by the S3 key being derived from the JWT `sub` claim. No client-supplied paths are used.

---

## 6. LLM Integration

### Model

`gpt-oss-120b` via AWS Bedrock. All invocations attach a Bedrock Guardrail that:

- Blocks prompt injection attempts (e.g. attempts to override system instructions)
- Restricts the model to financial topics (denied topic policy in plain English)
- Filters PII in responses (optional but recommended)

### Gap Analysis Prompt (Input Review Lambda)

```
System: You are a financial planning assistant reviewing a user's financial profile
for completeness. Your job is to identify significant gaps that would prevent
an accurate multi-decade simulation — missing income sources, unclear savings
vehicles, unspecified time horizons, etc.

Respond ONLY in the following JSON format:
{
  "status": "approved" | "needs_clarification",
  "questions": ["question 1", "question 2"]  // omit if approved
}

Do not include preamble, markdown fences, or any text outside the JSON object.

User input: {financialInput}
```

### Code Generation Prompt (Simulation Lambda)

```
System: You are a financial simulation engine. Given a user's financial profile,
produce a JavaScript simulation. Respond ONLY with a JSON object in this exact shape:

{
  "initialFinanceState": {
    "date": "YYYY-MM",
    "values": { "bucketName": number }
  },
  "durationYears": number,
  "durationMonths": number,
  "simulationStepCode": "const simulationStep = (prev) => { ... return next; }"
}

Rules for simulationStep:
- It must be a pure function. No side effects, no external references, no require(),
  no fetch(), no process, no global state.
- It must return an object matching { date: string, values: { [bucket: string]: number } }
- All arithmetic must be safe against division by zero and must not produce Infinity or NaN.
- The date field must advance exactly one month in YYYY-MM format each call.
- simulationStepCode must be valid plain JavaScript (not TypeScript).

Do not include markdown fences, preamble, or any text outside the JSON object.

User financial profile: {approvedInput}
```

### Report Generation Prompt (Simulation Lambda, second call)

```
System: You are a financial advisor reviewing the results of a personal finance
simulation. Write a clear, plain-English report (400–800 words) covering:
- Overall trajectory and net-worth outlook
- Notable milestones (home purchase, retirement, etc.) and whether they appear on track
- Any months where finances look stressed or negative
- Specific comments on any goals or concerns the user mentioned

User financial profile: {approvedInput}
Simulation duration: {months} months
Simulation data (monthly snapshots): {simulationData}
```

---

## 7. Code Execution & Sandboxing

### The Problem

The Simulation Lambda receives a JavaScript function body as a string from the LLM. This string must be executed in a loop up to ~1200 times (100 years × 12 months). Running `eval()` or `new Function()` in the Lambda process directly would give the generated code access to the Node.js runtime, file system, network, and `process`.

### Solution: vm2

`vm2` is a free, MIT-licensed npm package (`npm install vm2`) that executes untrusted JavaScript in a sandboxed V8 context, preventing access to Node built-ins, `require`, `process`, the file system, and network APIs.

```typescript
import { VM } from "vm2";

function runSimulation(
  simulationStepCode: string,
  initialState: FinanceState,
  totalMonths: number,
): FinanceState[] {
  const vm = new VM({
    timeout: 2000, // abort if any single step hangs
    allowAsync: false, // no async/await escape hatches
    sandbox: {}, // no host globals exposed
  });

  // Define the function inside the sandbox
  vm.run(simulationStepCode);

  const simulation: FinanceState[] = [initialState];
  let pointer = initialState;

  for (let i = 0; i < totalMonths; i++) {
    const raw = vm.run(`simulationStep(${JSON.stringify(pointer)})`);

    // Validate shape with Joi before accepting (see Validation)
    const { error, value } = financeStateSchema.validate(raw);
    if (error) {
      throw new Error(
        `Invalid FinanceState at month ${i + 1}: ${error.message}`,
      );
    }

    simulation.push(value);
    pointer = value;
  }

  return simulation;
}
```

### Security Notes

- `vm2` has had historical CVEs related to prototype-chain escapes. For a personal project with LLM-generated (not arbitrary user) input, this risk is acceptable. The nuclear alternative — running the eval in a `child_process` with `--disallow-code-generation-from-strings` and killing it after N ms — exists if needed later.
- The `timeout: 2000` ms cap prevents an infinite loop in a single step from hanging the Lambda.
- `allowAsync: false` prevents async tricks that could escape the timeout.

---

## 8. Data Models

### FinanceState

```typescript
type FinanceState = {
  date: string; // 'YYYY-MM'
  values: { [bucket: string]: number };
};

// Example:
// { date: '2026-04', values: { '401k': 9483.23, 'HYSA': 213.45, 'mortgage_balance': 287000 } }
```

Buckets are named by the LLM based on the user's input. Each bucket maps directly to a single number — its balance or value for that month.

### SimulationHistory (S3 schema)

```typescript
type SimulationEntry = {
  id: string; // uuid
  simulationName: string; // user-editable display name
  createdAt: string; // ISO 8601 timestamp
  input: string;
  simulationData: FinanceState[];
  report: string;
  simulationStepCode: string;
};

type SimulationHistory = {
  simulations: SimulationEntry[];
};
```

Each simulation is fully independent. If the user edits their inputs and re-runs, a brand new `SimulationEntry` is created and appended. There is no concept of iterations or shared state between simulations.

---

## 9. S3 Storage Design

### Bucket Structure

```
s3://dfs-history-bucket/
  users/
    {cognito_sub}/
      history.json
```

One file per user. The file contains the full `SimulationHistory` object.

### Read/Write Pattern

Reads go exclusively through the History Lambda. Writes come from two places: the History Lambda (PATCH, DELETE) and the Simulation Lambda (append on successful run). The pattern for all mutations is **read → mutate in memory → write back** (last-write-wins). Concurrent writes are not a concern for a personal-scale app.

### Initialization

On first `GET /history`, if S3 returns `NoSuchKey`, the History Lambda writes an empty `{ simulations: [] }` to the key and returns it. The client never needs to handle a missing history scenario.

### Application Startup Behavior

```
App mounts
  → dispatch GET /history
  → store result in top-level useState, passed as props to Sidebar
  → render sidebar from in-memory state

User deletes simulation
  → optimistically remove from local history state (sidebar updates instantly)
  → fire DELETE /history/{id} in background
  → on error: restore previous state + show toast

User renames simulation
  → optimistically update local history state
  → fire PATCH /history/{id} in background
  → on error: restore + toast
```

---

## 10. Frontend Architecture

### Stack

- React with TypeScript
- `@aws-amplify/auth` for Cognito/Google OAuth
- React `useState` / `useReducer` for local component state — no global state library needed
- Recharts for simulation graphs
- `react-syntax-highlighter` for the optional code view panel

### Page Structure

```
AppShell
  ├── Sidebar
  │     └── SimulationList (history from S3, loaded on startup)
  │           └── SimulationItem (name, date, click to load)
  └── MainPanel
        ├── InputView          (free text fields + review loop UI)
        ├── LoadingView        (shown during simulation run)
        └── ResultsView
              ├── ReportPanel        (LLM-generated text)
              ├── GraphPanel         (one chart per bucket)
              │     └── BucketChart  (Recharts LineChart or AreaChart)
              └── CodePanel          (collapsible, syntax-highlighted JS)
```

### Graph Design

One `LineChart` per bucket rendered by Recharts. The x-axis is the `date` field (YYYY-MM). For buckets that naturally relate (e.g. multiple income sources), they may be combined on a single `ComposedChart` with multiple `Line` components. A summary `AreaChart` showing total net worth across all positive-value buckets is shown at the top.

### State Flow

```
App mounts
  → GET /history → stored in top-level useState, passed as props to Sidebar

User submits input
  → POST /review
    → if needs_clarification: display questions; user edits and resubmits
      (frontend tracks iteration count; forces proceed to /simulate after 3 attempts)
    → if approved: POST /simulate
      → on success: append new SimulationEntry to local history state → navigate to ResultsView
      → on error: display failure message, prompt user to try again (no state written)

User deletes simulation
  → optimistically remove from local history state (sidebar updates instantly)
  → DELETE /history/{id} in background
  → on error: restore previous state + show toast

User renames simulation
  → optimistically update local history state
  → PATCH /history/{id} in background
  → on error: restore + toast
```

---

## 11. Validation Strategy

Joi is used exclusively in the Lambda layer. The frontend does not validate — all input validation is the backend's responsibility.

### Lambda Request Body Schemas

```typescript
// POST /review
const reviewSchema = Joi.object({
  financialInput: Joi.string().min(20).max(5000).required(),
});

// POST /simulate
const simulateSchema = Joi.object({
  approvedInput: Joi.string().min(20).max(5000).required(),
  simulationId: Joi.string().uuid().required(),
  userId: Joi.any().forbidden(), // never accept from client — taken from JWT
});

// PATCH /history/{id}
const renameSchema = Joi.object({
  simulationName: Joi.string().min(1).max(100).required(),
});
```

### LLM Output — simulationStep Return Value

Applied inside the vm2 loop on every step output:

```typescript
const financeStateSchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required(),
  values: Joi.object()
    .pattern(
      Joi.string(), // bucket name key
      Joi.number().finite().required(), // .finite() rejects NaN and Infinity
    )
    .required(),
});
```

`Joi.number().finite()` is critical: LLM-generated arithmetic can produce `Infinity` (division by zero in an early month) or `NaN` (operations on undefined state), which would silently corrupt all subsequent months in the loop. Any validation failure mid-loop aborts the entire simulation — the Lambda returns HTTP 500 and nothing is written to S3.

### LLM Code Generation Response

The top-level Bedrock response is validated before the sandbox is invoked:

```typescript
const codeGenResponseSchema = Joi.object({
  initialFinanceState: financeStateSchema.required(),
  durationYears: Joi.number().integer().min(0).max(100).required(),
  durationMonths: Joi.number().integer().min(0).max(11).required(),
  simulationStepCode: Joi.string().min(50).max(10000).required(),
});
```

---

## 12. Resolved Design Decisions

The following questions were considered during design and are now closed.

| #   | Question                                                                        | Decision                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Should the simulation Lambda write to S3 directly or invoke the History Lambda? | **Direct write.** Simulation Lambda reads the user's `history.json`, appends the new entry, and writes back. Invoking the History Lambda would add latency and complexity for no benefit at this scale.                                       |
| 2   | Should the `simulationStepCode` be stored minified or pretty-printed in S3?     | **Pretty-printed.** Storage cost is negligible and the code view panel in the frontend requires readable output.                                                                                                                              |
| 3   | Rate limiting strategy?                                                         | **None beyond AWS account-level limits.** The app is restricted to a small allowlisted group via Cognito pre-signup. Bedrock token cost is the natural usage governor.                                                                        |
| 4   | How should errors during the review call be handled?                            | **Return failure to the user.** Any error (Bedrock failure, parse failure) returns HTTP 500. The frontend displays a generic failure message and prompts the user to try again.                                                               |
| 5   | How should errors during simulation be handled?                                 | **Abort everything.** Any failure at any step — code gen, vm2 eval, Joi validation mid-loop, S3 write — returns HTTP 500. Nothing is written to S3. The frontend scraps all in-progress state and prompts the user to try again from scratch. |
| 6   | Should the review loop iteration counter live in the Lambda or the frontend?    | **Frontend.** The Lambda is stateless and single-pass. The frontend tracks how many times the user has submitted for review and forces a proceed-to-simulate after 3 unsuccessful attempts.                                                   |
