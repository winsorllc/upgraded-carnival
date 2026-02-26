---
name: sop-engine
description: Execute multi-step Standard Operating Procedures (SOPs) with approval gates, state persistence, and execution tracking. Use when you need to run complex, multi-step workflows that require human approval, conditional branching, and audit trails.
---

# SOP Engine

Execute Standard Operating Procedures with built-in approval gates, state management, and audit logging.

## When to Use

- Run multi-step procedures that require human approval between steps
- Execute complex workflows that span multiple agent sessions
- Track and audit compliance procedures
- Create reusable workflow templates
- Implement approval-required workflows (e.g., deployments, changes)

## Concepts

### SOP (Standard Operating Procedure)
A defined workflow with:
- **Steps**: Sequential actions to perform
- **Approval Gates**: Points where human approval is required
- **State**: Persisted between steps
- **Audit Log**: Complete execution history

### Execution Modes
- `auto` - Execute all steps without approval
- `supervised` - Request approval before starting, then execute all steps
- `step_by_step` - Request approval before each step
- `priority_based` - High priority = auto, Normal/Low = supervised

### Triggers
- `manual` - Triggered by name
- `cron` - Scheduled execution (expression)
- `webhook` - HTTP trigger

## Installation

No additional installation required. Uses built-in tools: `jq`, `curl`, `git`.

## Quick Start

### 1. Create an SOP

Create `sops/my-sop.md`:

```markdown
---
name: deploy-frontend
description: Deploy frontend to staging
version: "1.0.0"
priority: high
execution_mode: supervised
triggers:
  - type: manual
  - type: cron
    expression: "0 9 * * *"
---

# Deploy Frontend to Staging

## Step 1: Build the Project
```bash
cd /job && npm run build
```

## Step 2: Run Tests
```bash
cd /job && npm test
```

## Step 3: Deploy (requires approval)
```bash
echo "Deploying to staging..."
```

## Step 4: Verify
```bash
curl -s https://staging.example.com/health
```
```

### 2. List Available SOPs
```bash
sop-list
```

### 3. Execute an SOP
```bash
sop-execute deploy-frontend
```

### 4. Approve a Step
```bash
sop-approve <run-id>
```

### 5. Check Status
```bash
sop-status <run-id>
```

## Commands

### sop-list
List all available SOPs.

```bash
sop-list
```

### sop-execute
Start an SOP execution.

```bash
sop-execute <sop-name>
sop-execute <sop-name> --payload '{"key": "value"}'
```

### sop-approve
Approve the next step in a running SOP.

```bash
sop-approve <run-id>
```

### sop-reject
Reject and cancel a running SOP.

```bash
sop-reject <run-id> --reason "Not ready for deployment"
```

### sop-status
Check the status of an SOP run.

```bash
sop-status <run-id>
```

### sop-runs
List all SOP runs (active and completed).

```bash
sop-runs
sop-runs --sop <sop-name>
```

## SOP Definition Format

SOPs are defined in markdown files with YAML frontmatter:

```markdown
---
name: <unique-name>
description: <what this does>
version: "1.0.0"
priority: normal  # low, normal, high, critical
execution_mode: supervised  # auto, supervised, step_by_step, priority_based
triggers:
  - type: manual
  - type: cron
    expression: "0 9 * * *"
  - type: webhook
    path: /webhook/deploy
---

# Title

## Step 1: Description
```bash
command to run
```

## Step 2: Description (requires approval)
```bash
another command
```
```

## Execution Flow

```
┌─────────────────┐
│  sop-execute    │
│  (start run)    │
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │ Auto Mode? │───Yes──► Execute All Steps
    └─────┬──────┘              and Complete
          │ No
          ▼
    ┌────────────┐
    │ Supervised │───Wait for──►┌─────────────┐
    │   Mode     │    Approval   │sop-approve  │
    └─────┬──────┘               └──────┬──────┘
          │                              │
          ▼                              ▼
    ┌────────────┐               Execute Remaining
    │StepByStep │───Wait for──►  Steps One-by-One
    │   Mode    │   Approval    with Approval Each
    └───────────┘
```

## State Management

State is persisted in `~/.thepopebot/sop-state/<run-id>.json`:

```json
{
  "run_id": "run-abc123",
  "sop_name": "deploy-frontend",
  "status": "running",
  "current_step": 2,
  "started_at": "2024-01-15T09:00:00Z",
  "payload": {"key": "value"},
  "history": [
    {"step": 1, "status": "completed", "output": "...", "timestamp": "..."},
    {"step": 2, "status": "pending_approval", "output": "...", "timestamp": "..."}
  ]
}
```

## Audit Logging

All SOP executions are logged to `~/.thepopebot/sop-audit/`:

- `<run-id>.json` - Full execution record
- `<run-id>.log` - Step-by-step output

## Workflow Examples

### Deploy with Approval
```markdown
---
name: deploy-production
description: Deploy to production with approval
priority: critical
execution_mode: step_by_step
triggers:
  - type: manual
---

# Production Deployment

## Step 1: Run Tests
```bash
npm test
```

## Step 2: Build
```bash
npm run build
```

## Step 3: Deploy (APPROVAL REQUIRED)
```bash
./deploy.sh production
```

## Step 4: Verify
```bash
curl -s https://production.example.com/health
```
```

### Data Processing Pipeline
```markdown
---
name: process-daily-data
description: Daily data processing pipeline
priority: high
execution_mode: auto
triggers:
  - type: cron
    expression: "0 2 * * *"
---

# Daily Data Processing

## Step 1: Fetch Data
```bash
curl -o data/raw.json https://api.example.com/data
```

## Step 2: Transform
```bash
node transform.js data/raw.json > data/processed.json
```

## Step 3: Validate
```bash
node validate.js data/processed.json
```

## Step 4: Archive
```bash
mv data/processed.json archive/$(date +%Y%m%d).json
```
```

## Best Practices

1. **Use descriptive step titles** - Makes approval prompts clearer
2. **Keep steps atomic** - Each step should do one thing
3. **Include rollback commands** - For critical operations
4. **Add verification steps** - Always confirm success
5. **Use appropriate modes** - Production = step_by_step, dev = auto
6. **Document prerequisites** - List what needs to be true before execution

## Limitations

- Current implementation uses shell/bash - not all SOPs can be expressed this way
- State is local to the agent - not shared across different agent instances
- Approval requires human intervention via CLI
