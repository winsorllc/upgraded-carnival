---
name: sop-runner-v2
description: Execute Standard Operating Procedures (SOPs) with conditional logic, approval gates, and multi-step workflows. Enhanced version with condition evaluation, audit logging, and execution metrics.
metadata:
  {
    "thepopebot":
      {
        "emoji": "📋",
        "version": "2.0.0",
        "features": ["conditional-steps", "approval-gates", "audit-logging", "metrics"]
      }
  }
---

# SOP Runner v2 — Enhanced Standard Operating Procedures

Execute SOPs with conditional branching, approval requirements, and comprehensive audit trails.

## Overview

This skill extends the basic SOP runner with:
- **Conditional Steps**: Execute steps based on runtime conditions
- **Approval Gates**: Pause for human approval at critical steps
- **Audit Logging**: Track all SOP executions with timestamps and results
- **Execution Metrics**: Collect timing, success rate, and performance data
- **Priority Queues**: Handle urgent SOPs with priority scheduling
- **Cooldown Management**: Prevent SOP spam with configurable cooldowns

## SOP Structure

SOPs live in `/job/sops/<name>/` with two files:

### SOP.toml (manifest)
```toml
[sop]
name = "deploy-production"
description = "Deploy code to production with approval gate"
version = "1.0.0"
priority = "high"
execution_mode = "supervised"
cooldown_secs = 3600
max_concurrent = 1

[triggers]
# Optional trigger configuration

[gates]
# Approval gate configuration
```

### SOP.md (procedure)
```md
## Steps

1. **Run Tests**
   Execute the test suite
   
2. **Build Release** [if: tests_pass]
   Build the production release
   ```bash
   npm run build:prod
   ```
   
3. **Deploy to Staging** [requires_approval: true]
   Deploy to staging environment first
   
4. **Verify Staging** [if: staging_ok]
   Run smoke tests on staging
   
5. **Deploy to Production** [if: staging_verified, requires_approval: true]
   Final production deployment
```

## Triggers

### Shell Command
```toml
[[triggers]]
type = "command"
pattern = "^deploy:"
capture_groups = true
```

### File Watch
```toml
[[triggers]]
type = "file_watch"
path = "/job/releases/*.tar.gz"
event = "create"
```

### Schedule
```toml
[[triggers]]
type = "schedule"
cron = "0 2 * * *"
```

## API

### Execute an SOP
```javascript
const result = await sopRunner.execute('deploy-production', {
  vars: { version: '1.2.3' },
  skipApproval: false
});
```

### List Available SOPs
```javascript
const sops = await sopRunner.list();
```

### Get SOP Status
```javascript
const status = await sopRunner.getStatus('deploy-production');
```

### Cancel Running SOP
```javascript
await sopRunner.cancel('deploy-production');
```

## Approval Workflow

When an SOP step has `requires_approval: true`:

1. Execution pauses at that step
2. Notification sent via configured channels
3. Awaiting manual approval via:
   - `/approve <sop-name>` command
   - Web UI approval button
   - API call: `POST /api/sop/approve`
4. After approval, execution resumes

## Conditions

Steps can have conditional execution:

- `[if: var_name]` — Execute if variable is truthy
- `[if: !var_name]` — Execute if variable is falsy
- `[if: var_name == "value"]` — Execute if variable equals value
- `[if: previous_step == "success"]` — Execute if previous step succeeded

## Audit Log

All executions are logged to `/job/logs/sop/<sop-name>/<timestamp>.json`:

```json
{
  "sop": "deploy-production",
  "started_at": "2026-02-25T13:00:00Z",
  "completed_at": "2026-02-25T13:15:00Z",
  "status": "success",
  "steps": [
    {
      "number": 1,
      "title": "Run Tests",
      "status": "success",
      "duration_ms": 45000,
      "output": "All tests passed"
    }
  ],
  "metrics": {
    "total_duration_ms": 900000,
    "steps_completed": 5,
    "steps_skipped": 0,
    "approval_waits": 2
  }
}
```

## Best Practices

1. **Keep SOPs Atomic**: Each SOP should do one thing well
2. **Use Approval Gates**: Require approval for production changes
3. **Add Conditions**: Handle failure cases gracefully
4. **Set Cooldowns**: Prevent accidental repeated executions
5. **Log Everything**: Audit trails are critical for debugging

## Example SOPs

### Database Backup SOP
```toml
# /job/sops/db-backup/SOP.toml
[sop]
name = "db-backup"
description = "Backup database with integrity check"
version = "1.0.0"
priority = "medium"
execution_mode = "automatic"
cooldown_secs = 86400
```

### Security Patch SOP
```toml
# /job/sops/security-patch/SOP.toml
[sop]
name = "security-patch"
description = "Apply security patches with rollback"
version = "1.0.0"
priority = "critical"
execution_mode = "supervised"
max_concurrent = 1

[gates]
pre_patch = { type = "approval", required = true }
post_patch = { type = "verification", command = "npm audit" }
```
