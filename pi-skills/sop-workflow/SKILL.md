---
name: sop-workflow
description: Standard Operating Procedure workflow execution with approval gates. Define multi-step procedures, execute them with state management, and require human approval at specified checkpoints. Inspired by ZeroClaw's SOP system.
version: 1.0.0
author: zeroclaw-inspired
tags:
  - workflow
  - sop
  - approval
  - procedure
  - automation
capabilities:
  - Define SOPs with steps and approval gates
  - Execute SOPs with state tracking
  - Require approval before critical steps
  - Resume SOPs from checkpoints
  - Track SOP execution history
requires: []
environment:
  SOP_DIR: "./sops"
  SOP_STATE_DIR: "./sop-state"
---

# SOP Workflow Skill

This skill provides Standard Operating Procedure (SOP) workflow execution with approval gates. It allows defining multi-step procedures, executing them with state management, and requiring human approval at specified checkpoints.

## Commands

### Create a new SOP
```
sop create <name> --steps <step1,step2,...> --approvals <step1,step3,...>
```
Creates a new SOP with specified steps and approval gates.

### List all SOPs
```
sop list
```
Lists all available SOPs.

### Show SOP details
```
sop show <name>
```
Shows the details of a specific SOP including steps and approval gates.

### Execute an SOP
```
sop execute <name> [--vars KEY=VALUE,...]
```
Executes an SOP from the beginning or resumes from the last checkpoint.

### Approve an SOP step
```
sop approve <name> --step <step_number> [--notes <approval_notes>]
```
Manually approve a gated step in an SOP.

### Reject an SOP step
```
sop reject <name> --step <step_number> --reason <reason>
```
Reject a step and optionally halt the SOP.

### Check SOP status
```
sop status <name>
```
Shows the current status of an SOP execution including pending approvals.

### Get pending approvals
```
sop pending
```
Lists all SOPs and steps that require approval.

## SOP Format

SOPs are defined in YAML format:

```yaml
name: Deploy Application
description: Production deployment procedure
version: "1.0"

# Steps define the procedure
steps:
  - id: 1
    name: Pre-deployment checks
    command: ./scripts/pre-deploy-check.sh
    requires_approval: false

  - id: 2
    name: Build artifact
    command: npm run build
    requires_approval: false

  - id: 3
    name: Deploy to staging
    command: ./scripts/deploy.sh staging
    requires_approval: true
    approvers:
      - deploy-lead
      - security-team

  - id: 4
    name: Verify staging
    command: ./scripts/verify.sh staging
    requires_approval: false

  - id: 5
    name: Deploy to production
    command: ./scripts/deploy.sh production
    requires_approval: true
    approvers:
      - deploy-lead
      - security-team
      - product-owner

# Variables that can be passed at execution time
variables:
  - name: ENVIRONMENT
    required: true
    default: staging
  - name: VERSION
    required: true
```

## State Management

The skill maintains state in `sop-state/`:
- `<sop-name>.json` - Current execution state
- `<sop-name>.history.jsonl` - Execution history

State includes:
- Current step
- Completed steps with outputs
- Pending approvals
- Variables passed at execution
- Start/end timestamps

## Approval Workflow

1. When an SOP reaches a step with `requires_approval: true`, execution pauses
2. The step's output is captured but not applied
3. Approvers are notified (via configured channels)
4. An approver must run `sop approve` or `sop reject`
5. On approval, execution continues to the next step
6. On rejection, execution halts (can be resumed after addressing issues)

## Examples

Create an SOP for code review and deployment:
```bash
sop create deploy-prod \
  --steps "build,test,security-scan,staging-deploy,staging-verify,prod-deploy" \
  --approvals "security-scan,prod-deploy"
```

Execute with variables:
```bash
sop execute deploy-prod --vars VERSION=v1.2.3,ENVIRONMENT=production
```

Approve a step:
```bash
sop approve deploy-prod --step 3 --notes "Security scan passed, approved for staging"
```

Check status:
```bash
sop status deploy-prod
```
