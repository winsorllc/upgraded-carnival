---
name: sop-workflow
description: Manage Standard Operating Procedures (SOPs) - structured multi-step workflows with approvals, conditions, and automation. Use when you need to define and execute repeatable business processes with checkpoints and human approval gates.
metadata:
  {
    "thepopebot":
      {
        "emoji": "📋",
        "os": ["linux", "darwin"],
        "requires": { "files": ["config/SOPS.json"] },
        "install": []
      }
  }
---

# SOP Workflow Manager

Define and execute Standard Operating Procedures (SOPs) with structured workflows, conditions, approvals, and automation.

## Overview

SOPs are defined in `config/SOPS.json` and executed via this skill. Each SOP has:
- **Triggers**: When to start (manual, webhook, schedule**: Ordered)
- **Steps actions with conditions
- **Approval gates**: Human approval required before proceeding
- **Rollback**: Automatic or manual rollback on failure

## Configuration (config/SOPS.json)

```json
[
  {
    "name": "Deploy Production",
    "description": "Deploy application to production with approval gates",
    "triggers": ["manual", "webhook"],
    "steps": [
      {
        "id": "validate",
        "name": "Validate Build",
        "action": { "type": "command", "command": "npm run build" },
        "timeout": 300
      },
      {
        "id": "approval_dev",
        "name": "Dev Lead Approval",
        "type": "approval",
        "approvers": ["@devlead"],
        "timeout": 3600
      },
      {
        "id": "deploy_staging",
        "name": "Deploy to Staging",
        "action": { "type": "agent", "job": "Deploy to staging environment" }
      },
      {
        "id": "smoke_test",
        "name": "Smoke Tests",
        "type": "test",
        "action": { "type": "command", "command": "npm run test:smoke" }
      },
      {
        "id": "approval_prod",
        "name": "Production Approval",
        "type": "approval",
        "approvers": ["@release-manager"],
        "timeout": 7200
      },
      {
        "id": "deploy_prod",
        "name": "Deploy to Production",
        "action": { "type": "agent", "job": "Deploy to production with blue-green" }
      }
    ],
    "on_failure": "rollback",
    "max_concurrent": 1,
    "cooldown_seconds": 300
  }
]
```

## Commands

### List SOPs

```bash
sop list
```

### Start an SOP

```bash
sop start <sop-name> [--param key=value]
```

### Check SOP status

```bash
sop status <run-id>
```

### Approve a step

```bash
sop approve <run-id> <step-id> [--comment "LGTM"]
```

### Reject a step

```bash
sop reject <run-id> <step-id> --comment "Fix the tests first"
```

### Cancel an SOP run

```bash
sop cancel <run-id>
```

### Show SOP definition

```bash
sop show <sop-name>
```

## Step Types

| Type | Description |
|------|-------------|
| `action` | Execute command, agent task, or webhook |
| `approval` | Require human approval to proceed |
| `condition` | Check condition before proceeding |
| `parallel` | Execute multiple steps in parallel |
| `delay` | Wait for specified duration |

## Environment Variables

- `SOPS_DIR`: Directory containing SOP definitions (default: `config/`)
- `SOPS_STATE_DIR`: Directory for run state (default: `data/sops/`)

## Notes

- Approval requests can be sent to Telegram, Slack, or email
- All steps are logged with timestamps
- Supports rollback on failure (configurable per SOP)
- Runs can be resumed after approval
