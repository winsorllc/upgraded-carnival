---
name: sop-runner
description: Define and execute multi-step Standard Operating Procedures with approval workflows, audit logging, and state tracking.
version: 1.0.0
author: ZeroClaw-inspired implementation for PopeBot
---

# SOP Runner Skill

This skill enables the agent to define, manage, and execute multi-step Standard Operating Procedures (SOPs) with built-in approval workflows, state tracking, and audit logging.

## Capabilities

### 1. Create SOPs
Define procedures with multiple steps, execution modes, and triggers:
- **Auto**: Execute all steps without human approval
- **Supervised**: Request approval before starting, then execute all steps
- **StepByStep**: Request approval before each step
- **PriorityBased**: Auto for Critical/High priority, Supervised for Normal/Low

### 2. Execute SOPs
Run SOPs with full state tracking:
- Each run gets a unique ID
- Progress through steps sequentially
- Store context/data between steps
- Handle completion and failure states

### 3. Approval Workflows
Pause execution for human approval:
- List pending approvals
- Approve or reject runs
- Provide context for decision-making

### 4. Audit Logging
Track all SOP operations:
- Run start/completion
- Step transitions
- Approvals and rejections
- Timestamps and context

## Usage

```javascript
// Available tools:
await sop_create({ name, description, steps, mode, priority })
await sop_execute({ name, payload })
await sop_status({ run_id })
await sop_approve({ run_id })
await sop_reject({ run_id, reason })
await sop_list()
```

## Data Storage

SOPs and runs are stored in `/tmp/sops/` as JSON files:
- `sops/*.json` - SOP definitions
- `runs/*.json` - Active/completed runs
- `audit/*.jsonl` - Audit log entries

## Example Workflow

1. Create an SOP for deployment:
```javascript
await sop_create({
  name: "deploy-service",
  description: "Deploy a microservice to production",
  steps: [
    { title: "Run tests", body: "Execute test suite", requires_confirmation: false },
    { title: "Build image", body: "Build Docker image", requires_confirmation: false },
    { title: "Deploy to staging", body: "Deploy to staging environment", requires_confirmation: true },
    { title: "Verify staging", body: "Health check staging", requires_confirmation: true },
    { title: "Deploy to production", body: "Blue-green deploy to production", requires_confirmation: true }
  ],
  mode: "step_by_step"
})
```

2. Execute the SOP:
```javascript
const result = await sop_execute({
  name: "deploy-service",
  payload: { service: "api-gateway", version: "2.1.0" }
})
// Returns: "SOP run started: deploy-service-abc123\n\nStep 1: Run tests\n\nExecute test suite"
```

3. Check status:
```javascript
await sop_status({ run_id: "deploy-service-abc123" })
```

4. Approve each step:
```javascript
await sop_approve({ run_id: "deploy-service-abc123" })
```
