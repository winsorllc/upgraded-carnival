---
name: sop-engine
description: Define and execute Standard Operating Procedures (SOPs) with triggers, conditions, approval gates, and structured workflows.
---

# SOP Engine

A powerful workflow orchestration system for defining repeatable, structured procedures with conditional execution, approval gates, and multiple trigger sources.

## Overview

SOPs (Standard Operating Procedures) are structured workflows that define:
- **Triggers**: What activates the SOP (manual, cron, webhook, event-based)
- **Conditions**: When the SOP should actually run
- **Steps**: Ordered actions to execute
- **Approval Gates**: Human-in-the-loop checkpoints
- **Execution Modes**: Auto, supervised, or step-by-step

## Creating an SOP

SOPs are defined in `/job/sops/<name>/` with two files:

### 1. SOP.toml (Metadata & Triggers)

```toml
[sop]
name = "incident-response"
description = "Handle production incidents"
version = "1.0.0"
author = "ops-team"
priority = "high"
execution_mode = "supervised"

[[triggers]]
type = "webhook"
path = "/incident"

[[triggers]]
type = "manual"

[conditions]
requires = ["PROD_DOWN", "ON_CALL_AVAILABLE"]
```

### 2. SOP.md (Procedure Steps)

```markdown
# Incident Response Procedure

## Step 1: Assess Impact
- Check monitoring dashboards
- Identify affected services
- Estimate user impact

## Step 2: Notify Stakeholders
- Send Slack alert to #incidents
- Page on-call engineer
- Create incident doc

## Step 3: Mitigate
- Roll back recent deploys if applicable
- Scale up resources if needed
- Enable maintenance mode if critical

## Step 4: Resolve
- Verify service restoration
- Monitor for 15 minutes
- Close incident
```

## Execution Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `auto` | Execute all steps without approval | Routine, low-risk tasks |
| `supervised` | Request approval before starting | Standard operations |
| `step_by_step` | Approve each step individually | Critical/high-risk changes |
| `priority_based` | High/Critical → auto, Normal/Low → supervised | Mixed workflows |

## Priority Levels

- **critical**: System-wide outages, security breaches
- **high**: Major feature broken, data loss risk
- **normal**: Standard operations, routine maintenance
- **low**: Cosmetic changes, documentation updates

## Trigger Types

### Manual Trigger
```toml
[[triggers]]
type = "manual"
```

### Cron Trigger
```toml
[[triggers]]
type = "cron"
expression = "0 9 * * *"  # Daily at 9 AM
```

### Webhook Trigger
```toml
[[triggers]]
type = "webhook"
path = "/webhook/incident"
```

### Event Trigger (future)
```toml
[[triggers]]
type = "event"
event = "deploy.failed"
condition = "environment == 'production'"
```

## Conditions

Conditions use a simple expression language:

```toml
[conditions]
# All conditions must be true (AND logic)
requires = ["ON_CALL_AVAILABLE", "MAINTENANCE_WINDOW"]

# Or use expressions
expression = "severity >= 'high' && business_hours == true"
```

Built-in condition variables:
- `business_hours`: true if 9 AM - 6 PM local time
- `weekday`: true if Monday - Friday
- `on_call_available`: checks on-call schedule
- `maintenance_window`: true if in scheduled window

## Commands

### List SOPs
```bash
{baseDir}/list.js
```

### Execute SOP
```bash
# Manual execution
{baseDir}/execute.js <sop-name>

# With variables
{baseDir}/execute.js <sop-name> --vars '{"severity": "high", "service": "api"}'

# Dry run (simulate without executing)
{baseDir}/execute.js <sop-name> --dry-run
```

### View SOP Status
```bash
{baseDir}/status.js [run-id]
```

### Approve Step
```bash
{baseDir}/approve.js <run-id> --step <step-number>
```

### Cancel SOP
```bash
{baseDir}/cancel.js <run-id>
```

## Output Format

```
=== SOP Engine ===
Available SOPs: 4

1. incident-response ⚡ HIGH (supervised)
   Triggers: webhook:/incident, manual
   Conditions: ON_CALL_AVAILABLE, PROD_DOWN

2. daily-backup 🕐 NORMAL (auto)
   Triggers: cron:0 2 * * *
   Conditions: none

3. deploy-prod 🚀 CRITICAL (step_by_step)
   Triggers: manual
   Conditions: tests_passed, staging_verified

4. cleanup-logs 🧹 LOW (auto)
   Triggers: cron:0 0 * * 0
   Conditions: disk_usage > 80%
```

## Installation

```bash
cd {baseDir}
npm install
```

## Configuration

Set in `.env` or environment:

- `SOP_DIR` - SOPs directory (default: `/job/sops`)
- `SOP_APPROVAL_CHANNEL` - Telegram chat or Slack channel for approvals
- `SOP_NOTIFICATION_ENABLED` - Enable/disable notifications (default: true)

## Use Cases

### 1. Incident Response
```toml
[sop]
name = "incident-response"
priority = "critical"
execution_mode = "step_by_step"
```

### 2. Automated Backups
```toml
[sop]
name = "daily-backup"
priority = "normal"
execution_mode = "auto"

[[triggers]]
type = "cron"
expression = "0 2 * * *"
```

### 3. Deployment Pipeline
```toml
[sop]
name = "deploy-production"
priority = "high"
execution_mode = "supervised"

[conditions]
requires = ["tests_passed", "security_scan_clean", "staging_verified"]
```

### 4. Onboarding Workflow
```toml
[sop]
name = "employee-onboarding"
priority = "normal"
execution_mode = "supervised"

[[triggers]]
type = "webhook"
path = "/hr/new-employee"
```

## API

### HTTP Endpoints

```bash
# Trigger SOP via webhook
POST /api/sop/<name>/trigger
Content-Type: application/json

{
  "variables": {
    "severity": "high",
    "service": "api"
  }
}

# Get SOP status
GET /api/sop/<name>/status

# Approve pending step
POST /api/sop/run/<run-id>/approve
{
  "step": 2,
  "approved": true,
  "comment": "Looks good"
}
```

## Security

- SOPs are audited before execution
- Conditions are evaluated in a sandboxed context
- Approval tokens are single-use and expire after 24 hours
- All execution is logged with full audit trail

## When to Use

- When you need repeatable, auditable workflows
- When human approval is required for certain operations
- When workflows have complex conditional logic
- When you need to track execution history and outcomes
