---
name: sop-runner
description: Standard Operating Procedure (SOP) runner with steps, conditions, approval gates, and audit logging. Define workflows in YAML/TOML and execute them with tracking.
---

# SOP Runner

Execute Standard Operating Procedures with step-by-step workflows, conditions, and approval gates.

## Features

- **steps**: Define sequential or parallel steps
- **conditions**: Conditional execution based on variables
- **approvals**: Human approval gates before proceeding
- **audit**: Full audit trail of execution
- **variables**: Dynamic variables and outputs
- **retries**: Automatic retry on failure
- **timeout**: Step timeouts
- **rollback**: Rollback on failure

## Usage

```bash
# Define an SOP in YAML/TOML format and run it
./scripts/sop-run.js --file ./deploy-sop.yaml

# List available SOPs
./scripts/sop-run.js --list

# Validate an SOP
./scripts/sop-run.js --file ./sop.yaml --validate

# Run with variables
./scripts/sop-run.js --file ./sop.yaml --var environment=production --var version=1.0.0

# Show execution audit
./scripts/sop-run.js --audit --id sop-2024-001
```

## SOP Definition Format (YAML)

```yaml
name: deploy-production
version: "1.0"
description: "Deploy application to production"

trigger:
  type: manual  # manual, cron, webhook
  
steps:
  - name: validate
    description: "Validate deployment package"
    command: ./scripts/validate.sh
    timeout: 60
    
  - name: approval
    description: "Request production deployment approval"
    type: approval
    approvers: ["ops-team"]
    timeout: 3600  # 1 hour
    
  - name: deploy
    description: "Deploy to production"
    command: ./scripts/deploy.sh {{version}}
    depends_on: [validate, approval]
    timeout: 300
    retries: 3
    
  - name: verify
    description: "Verify deployment health"
    command: ./scripts/health-check.sh
    depends_on: deploy
    timeout: 60
    on_failure: rollback

rollback:
  - name: rollback-deploy
    command: ./scripts/rollback.sh {{version}}
```

## Examples

| Task | Command |
|------|---------|
| Run SOP | `sop-run.js --file deploy.yaml` |
| List SOPs | `sop-run.js --list` |
| Validate | `sop-run.js --file sop.yaml --validate` |
| With vars | `sop-run.js --file deploy.yaml --var env=prod` |
| Show audit | `sop-run.js --audit --id 123` |
| Dry run | `sop-run.js --file sop.yaml --dry-run` |

## Notes

- SOPs can trigger on manual, cron, or webhook events
- Variables use `{{variable}}` syntax
- Approval gates pause execution until approved
- Full audit trail saved to `.sop/audit/`
- Supports step dependencies for parallel execution
- Rollback steps execute on failure if configured