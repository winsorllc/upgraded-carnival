---
name: sop-system
description: Standard Operating Procedure (SOP) system for defining, approving, and executing repeatable workflows with approval gates. Based on ZeroClaw's SOP architecture.
---

# SOP System Skill

A powerful workflow engine for defining Standard Operating Procedures (SOPs) with approval gates, execution modes, and audit logging. Inspired by ZeroClaw's SOP architecture.

## When to Activate

Activate this skill when:

- You need to create repeatable workflows with defined steps
- Workflows require human approval at certain stages
- You want to enforce consistent procedures across jobs
- Building production deployment pipelines
- Creating incident response procedures
- Establishing quality assurance workflows

## Core Concepts

### SOP (Standard Operating Procedure)

A documented, repeatable procedure with:
- **Name**: Unique identifier
- **Description**: What this SOP does
- **Version**: Semantic versioning (e.g., 1.0.0)
- **Priority**: low, normal, high, critical
- **Execution Mode**: How much autonomy the agent has
- **Steps**: Ordered list ofactions to perform
- **Approval Gates**: Steps requiring human confirmation

### Execution Modes

| Mode | Behavior |
|------|----------|
| `auto` | Execute all steps without human approval |
| `supervised` | Request approval before starting, then execute all steps |
| `step_by_step` | Request approval before each step |
| `priority_based` | Critical/High → Auto, Normal/Low → Supervised |

### Approval Gates

Steps can require explicit human approval before proceeding. Gates support:
- **Manual approval**: Wait for explicit "approve" command
- **Timeout auto-approve**: Auto-approve after N minutes if no response
- **Conditional gates**: Only require approval if certain conditions are met

## File Structure

SOPs are defined in `.pi/sops/` directory:

```
.pi/sops/
├── index.json                 # SOP registry (name → manifest path)
├── deploy-production/
│   ├── SOP.md                 # Human-readable procedure
│   └── manifest.json          # Machine-readable metadata
├── incident-response/
│   ├── SOP.md
│   └── manifest.json
└── ...
```

### SOP.md Format

```markdown
# Deploy to Production

**Version**: 1.0.0  
**Priority**: high  
**Execution Mode**: step_by_step

## Overview

Deploys the application to production after running tests and creating a backup.

## Steps

### Step 1: Run Tests

Execute the full test suite and verify all tests pass.

```bash
npm test
npm run test:e2e
```

**Approval Required**: Yes  
**Approval Timeout**: 5 minutes

---

### Step 2: Create Backup

Create a database backup before deployment.

```bash
npm run db:backup
```

**Approval Required**: Yes  
**Approval Timeout**: 10 minutes

---

### Step 3: Deploy

Push changes to production and run migrations.

```bash
git push origin main
npm run migrate
```

**Approval Required**: Yes  
**Approval Timeout**: 5 minutes

---

### Step 4: Verify Deployment

Check health endpoints and monitor error rates.

```bash
curl https://api.example.com/health
npm run check:logs -- --since 5m
```

**Approval Required**: No
```

### manifest.json Format

```json
{
  "name": "deploy-production",
  "description": "Deploys the application to production with safety checks",
  "version": "1.0.0",
  "priority": "high",
  "executionMode": "step_by_step",
  "cooldownSecs": 3600,
  "maxConcurrent": 1,
  "triggers": [
    {
      "type": "manual"
    },
    {
      "type": "webhook",
      "path": "/deploy/production"
    }
  ],
  "steps": [
    {
      "number": 1,
      "title": "Run Tests",
      "requiresApproval": true,
      "approvalTimeoutMins": 5,
      "suggestedTools": ["shell", "file_read"]
    },
    {
      "number": 2,
      "title": "Create Backup",
      "requiresApproval": true,
      "approvalTimeoutMins": 10,
      "suggestedTools": ["shell"]
    },
    {
      "number": 3,
      "title": "Deploy",
      "requiresApproval": true,
      "approvalTimeoutMins": 5,
      "suggestedTools": ["shell", "git_operations"]
    },
    {
      "number": 4,
      "title": "Verify Deployment",
      "requiresApproval": false,
      "suggestedTools": ["shell", "http_request"]
    }
  ]
}
```

## Commands

### Create SOP

```bash
node /job/.pi/skills/sop-system/cli.js create deploy-production
# Creates .pi/sops/deploy-production/SOP.md and manifest.json from template
```

### List SOPs

```bash
node /job/.pi/skills/sop-system/cli.js list
# Shows all registered SOPs with status
```

### Execute SOP

```bash
# Manual execution
node /job/.pi/skills/sop-system/cli.js run deploy-production

# With parameters
node /job/.pi/sop-system/cli.js run deploy-production --param environment=production --param version=2.1.0

# Dry run (no actual execution)
node /job/.pi/sop-system/cli.js run deploy-production --dry-run
```

### Approve Step

```bash
# Approve current step
node /job/.pi/sop-system/cli.js approve sop_run_abc123

# Approve with comment
node /job/.pi/sop-system/cli.js approve sop_run_abc123 --comment "Tests passed, proceeding"

# Reject step
node /job/.pi/sop-system/cli.js reject sop_run_abc123 --reason "Test failures detected"
```

### View SOP Status

```bash
# Get run status
node /job/.pi/sop-system/cli.js status sop_run_abc123

# View step details
node /job/.pi/sop-system/cli.js status sop_run_abc123 --step 2

# List all runs for an SOP
node /job/.pi/sop-system/cli.js history deploy-production --limit 10
```

### Cancel Running SOP

```bash
node /job/.pi/sop-system/cli.js cancel sop_run_abc123
```

## Tool Calls (Agent Integration)

```typescript
// Execute an SOP
sop_execute({
  sopName: "deploy-production",
  params: { environment: "production", version: "2.1.0" },
  executionMode: "step_by_step"
})
// Returns: { success: true, runId: "sop_run_abc123", status: "running", currentStep: 1 }

// Approve a step
sop_approve({
  runId: "sop_run_abc123",
  stepNumber: 2,
  comment: "Backup created successfully"
})
// Returns: { success: true, runId, stepNumber, status: "approved" }

// Reject a step
sop_reject({
  runId: "sop_run_abc123",
  stepNumber: 2,
  reason: "Backup failed - insufficient disk space"
})
// Returns: { success: true, runId, stepNumber, status: "rejected", action: "paused" }

// Get SOP run status
sop_status({ runId: "sop_run_abc123" })
// Returns: { success: true, runId, sopName, status, currentStep, totalSteps, stepResults: [...] }

// List SOP runs
sop_list_runs({ sopName, status, limit })
// Returns: { success: true, runs: [...], total: number }

// Get audit log for a run
sop_get_audit({ runId: "sop_run_abc123" })
// Returns: { success: true, runId, events: [{ timestamp, type, details }, ...] }
```

## SOP Run States

```
┌─────────────────────────────────────────────────────────────────┐
│                     SOP Run State Machine                        │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │ pending  │ ──create──► waiting_approval (if supervised)
    └────┬─────┘            │
         │                  │ approve
         │                  ▼
         │           ┌──────────────┐
         │           │ running      │ ──step complete──► awaiting_approval
         │           └──────┬───────┘                       │
         │                  │                               │ approve
         │                  │ all steps done                ▼
         │                  │                        ┌──────────────┐
         │                  └───────────────────────►│ completed    │
         │                                          └──────────────┘
         │
         │  step rejected / error
         ▼
┌────────────────┐
│ paused/failed  │ ──retry──► running (from failed step)
└────────────────┘
```

| State | Description |
|-------|-------------|
| `pending` | SOP created, waiting to start |
| `waiting_approval` | Awaiting approval to begin |
| `running` | Currently executing steps |
| `awaiting_approval` | Paused at approval gate |
| `paused` | Manually paused by user |
| `completed` | All steps finished successfully |
| `failed` | Step failed or rejected |
| `cancelled` | Manually cancelled |

## Audit Logging

All SOP runs are logged to `.pi/sops/runs/`:

```
.pi/sops/runs/
├── sop_run_abc123.json       # Full run state
├── sop_run_abc123.audit.jsonl # Audit event log
└── ...
```

### Audit Events

| Event Type | Description |
|------------|-------------|
| `run_created` | SOP run created |
| `run_started` | Execution began |
| `step_started` | Step execution started |
| `step_completed` | Step finished successfully |
| `step_failed` | Step failed with error |
| `approval_requested` | Waiting for human approval |
| `approval_granted` | Human approved step |
| `approval_rejected` | Human rejected step |
| `approval_timeout` | Auto-approved after timeout |
| `run_paused` | Run manually paused |
| `run_resumed` | Run resumed after pause |
| `run_completed` | All steps finished |
| `run_cancelled` | Run cancelled |
| `run_retried` | Run retried from failed step |

### Audit Log Format

```json
{
  "timestamp": "2026-02-25T16:30:00Z",
  "eventType": "step_completed",
  "runId": "sop_run_abc123",
  "stepNumber": 2,
  "details": {
    "title": "Create Backup",
    "duration": "45s",
    "output": "Backup created: backup-20260225.sql (2.3GB)"
  }
}
```

## Usage Examples

### Example 1: Production Deployment SOP

Create `.pi/sops/deploy-production/SOP.md`:

```markdown
# Deploy to Production

**Version**: 1.0.0  
**Priority**: high  
**Execution Mode**: step_by_step

## Steps

### Step 1: Pre-deployment Checks

Verify CI/CD pipeline passed and no critical issues in monitoring.

```bash
# Check last build status
curl -H "Authorization: Bearer $GH_TOKEN" \
  https://api.github.com/repos/org/repo/actions/runs?branch=main | jq '.workflow_runs[0].conclusion'

# Check recent error rate
curl https://api.example.com/metrics/errors?since=1h
```

**Approval Required**: Yes  
**Approval Timeout**: 10 minutes

---

### Step 2: Create Database Backup

```bash
npm run db:backup -- --output /backups/prod-$(date +%Y%m%d-%H%M%S).sql
```

**Approval Required**: Yes  
**Approval Timeout**: 15 minutes

---

### Step 3: Deploy

```bash
git fetch origin main
git checkout main
./scripts/deploy.sh --environment production
npm run migrate
```

**Approval Required**: Yes  
**Approval Timeout**: 5 minutes

---

### Step 4: Post-deployment Verification

```bash
# Health check
curl https://api.example.com/health | jq

# Smoke test
npm run test:smoke -- --environment production

# Check logs for errors
npm run logs -- --since 10m --level error
```

**Approval Required**: No
```

Execute:

```bash
node /job/.pi/skills/sop-system/cli.js run deploy-production --param version=2.1.0
```

### Example 2: Incident Response SOP

Create `.pi/sops/incident-response/SOP.md`:

```markdown
# Incident Response

**Version**: 1.0.0  
**Priority**: critical  
**Execution Mode**: supervised

## Steps

### Step 1: Triage

Identify scope and severity of incident.

- Check monitoring dashboards
- Review error logs
- Identify affected users/services

**Approval Required**: No

---

### Step 2: Mitigation

Apply immediate fix to reduce impact.

**Approval Required**: Yes  
**Approval Timeout**: 5 minutes

---

### Step 3: Root Cause Analysis

Investigate and document root cause.

**Approval Required**: No

---

### Step 4: Long-term Fix

Implement permanent solution.

**Approval Required**: Yes  
**Approval Timeout**: 30 minutes

---

### Step 5: Post-Mortem

Document lessons learned and action items.

**Approval Required**: No
```

### Example 3: QA Testing SOP

Create `.pi/sops/qa-testing/SOP.md`:

```markdown
# QA Testing Pipeline

**Version**: 1.0.0  
**Priority**: normal  
**Execution Mode**: auto

## Steps

### Step 1: Unit Tests

```bash
npm test -- --coverage
```

---

### Step 2: Integration Tests

```bash
npm run test:integration
```

---

### Step 3: E2E Tests

```bash
npm run test:e2e -- --headed
```

---

### Step 4: Performance Tests

```bash
npm run test:perf -- --thresholds "p95<500"
```

---

### Step 5: Generate Report

```bash
node scripts/generate-test-report.js
```
```

Execute in auto mode:

```bash
node /job/.pi/skills/sop-system/cli.js run qa-testing
# Runs all steps without approval
```

## Programmatic API

```javascript
const sop = require('/job/.pi/skills/sop-system/sop.js');

// Create and execute SOP
const run = await sop.createRun('deploy-production', {
  params: { environment: 'production', version: '2.1.0' },
  executionMode: 'step_by_step'
});

console.log(`SOP run created: ${run.runId}`);

// Approve a step
await sop.approveStep(run.runId, 1, { comment: 'Tests passed' });

// Get run status
const status = await sop.getRunStatus(run.runId);
console.log(`Current step: ${status.currentStep}/${status.totalSteps}`);

// Get audit log
const audit = await sop.getAuditLog(run.runId);
audit.events.forEach(event => {
  console.log(`${event.timestamp} - ${event.eventType}`);
});
```

## Installation

```bash
# Create SOP directory
mkdir -p /job/.pi/sops

# Activate the skill
cd /job/.pi/skills
ln -s ../../pi-skills/sop-system sop-system

# Install dependencies
cd sop-system
npm install
```

## Dependencies

```json
{
  "uuid": "^9.0.0",
  "node-fetch": "^3.3.2"",
  "cron": "^3.1.0"
}
```

## Configuration

Create `.pi/sops/config.json` (optional):

```json
{
  "defaultExecutionMode": "supervised",
  "approvalTimeoutMins": 30,
  "maxConcurrentRuns": 3,
  "auditRetentionDays": 90,
  "notifications": {
    "onApprovalRequired": true,
    "onStepCompleted": false,
    "onRunCompleted": true,
    "onRunFailed": true
  }
}
```

## Best Practices

### Writing Effective SOPs

1. **Be specific**: Each step should have clear, actionable instructions
2. **Include verification**: Add steps to verify previous steps succeeded
3. **Set appropriate timeouts**: Give humans enough time to respond
4. **Document rollback**: Include rollback procedures for risky steps
5. **Version your SOPs**: Use semantic versioning and update when procedures change

### Approval Gate Guidelines

| Priority | Recommended Mode | Approval Gates |
|----------|-----------------|----------------|
| Critical | step_by_step | All steps |
| High | step_by_step | Risky steps only |
| Normal | supervised | Start + risky steps |
| Low | auto | None |

### Testing SOPs

Before using an SOP in production:

1. **Dry run**: Execute with `--dry-run` to validate structure
2. **Test environment**: Run against staging/dev first
3. **Review audit logs**: Verify all steps logged correctly
4. **Test approval flows**: Ensure approvals work as expected

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SOP not found | Check name matches manifest.json, run `sop-system/cli.js list` |
| Approval timeout | Increase `approvalTimeoutMins` in manifest or approve faster |
| Step fails repeatedly | Check step commands, add error handling |
| Run stuck in awaiting_approval | Manually approve/reject, check notification delivery |
| Audit log missing | Check `.pi/sops/runs/` directory, verify permissions |

## Security Considerations

- SOP files may contain sensitive commands (use GitHub Secrets for credentials)
- Approval gates prevent unauthorized automated actions
- Audit logs provide accountability and traceability
- Consider restricting SOP creation to authorized users
- Review SOPs periodically for outdated procedures

## Future Enhancements

- [ ] Visual SOP editor
- [ ] SOP templating system
- [ ] Conditional step execution (if/else branches)
- [ ] Parallel step execution
- [ ] Integration with external approval systems (Slack, PagerDuty)
- [ ] SOP analytics and metrics dashboard
- [ ] Automatic SOP generation from chat history

## Credits

Based on [ZeroClaw's SOP architecture](https://github.com/zeroclaw-labs/zeroclaw/tree/main/src/sop). Adapted for PopeBot with simplified configuration and enhanced CLI.
