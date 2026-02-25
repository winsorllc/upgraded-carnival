---
name: sop-runner
description: "Execute Standard Operating Procedures (SOPs) - predefined workflows for repeatable tasks. Use when: following documented procedures."
metadata: { "openclaw": { "emoji": "📋", "requires": { "dir": "sops/" } } }
---

# SOP Runner Skill

Execute Standard Operating Procedures (SOPs) - predefined workflows for repeatable operational tasks. SOPs ensure consistent execution of complex procedures.

## When to Use

✅ **USE this skill when:**
- Documented procedures exist
- Compliance requirements
- Runbook execution
- On-call incident response

❌ **DON'T use this skill when:**
- Ad-hoc one-off tasks
- Procedures still being defined
- Highly dynamic situations

## SOP Format

SOPs are defined in YAML:

```yaml
# sops/deploy-to-prod.yaml
name: Deploy to Production
version: "1.0"
description: Deploy application to production environment

preconditions:
  - type: branch
    value: main
  - type: ci_status
    value: success

steps:
  - id: notify
    name: Notify team
    type: message
    channel: alerts
    message: "Starting production deployment"

  - id: backup
    name: Create database backup
    type: command
    command: "pg_dump > backup_$(date +%s).sql"
    timeout: 300
    onSuccess: continue
    onFailure: abort

  - id: deploy
    name: Deploy application
    type: command
    command: "kubectl apply -f k8s/"
    timeout: 600

  - id: verify
    name: Verify deployment
    type: http
    url: "https://api.example.com/health"
    expectStatus: 200
    retries: 3

  - id: complete
    name: Notify completion
    type: message
    channel: alerts
    message: "Deployment completed successfully"

postconditions:
  - type: rollback_on_failure
```

## Usage

### Execute SOP

```javascript
const { executeSOP } = require('/job/.pi/skills/sop-runner/runner.js');

const result = await executeSOP('deploy-to-prod', {
  params: {
    version: 'v2.1.0',
    environment: 'production'
  },
  notifyChannel: 'alerts'
});

console.log(result.status); // success|failed|aborted
console.log(result.steps); // Step-by-step results
```

### List Available SOPs

```javascript
const { listSOPs } = require('/job/.pi/skills/sop-runner/runner.js');

const sops = await listSOPs();
console.log(sops);
// ['deploy-to-prod', 'backup-database', 'incident-response']
```

### Get SOP Details

```javascript
const { getSOP } = require('/job/.pi/skills/sop-runner/runner.js');

const sop = await getSOP('deploy-to-prod');
console.log(sop.name);
console.log(sop.steps.length);
```

### Resume from Checkpoint

```javascript
const { resumeSOP } = require('/job/.pi/sop-runner/runner.js');

const result = await resumeSOP('backup-database', {
  runId: 'run_abc123',
  fromStep: 'verify'
});
```

## Step Types

**Command** - Execute shell command
```yaml
type: command
command: "npm run build"
timeout: 300
workingDir: "."
```

**HTTP** - Make HTTP request
```yaml
type: http
method: POST
url: "https://api.example.com/deploy"
headers:
  Authorization: Bearer $DEPLOY_TOKEN
body:
  version: "${params.version}"
expectStatus: 200
```

**Message** - Send notification
```yaml
type: message
channel: alerts
template: "SOP {{name}} step {{stepId}} completed"
```

**Agent** - Delegate to AI agent
```yaml
type: agent
agent: reviewer
task: "Review the deployment logs"
context: "${previous_step.output}"
```

**Approval** - Require human approval
```yaml
type: approval
message: "Proceed with production deployment?"
timeout: 600 # seconds
approvers:
  - oncall-lead
  - sre-team
```

**Wait** - Delay execution
```yaml
type: wait
duration: 60 # seconds
```

## Failure Handling

```yaml
steps:
  - id: deploy
    type: command
    command: "kubectl apply -f k8s/"
    onFailure:
      action: rollback
      # or: abort|retry|max:3|continue
    
  - id: rollback
    type: command
    command: "kubectl rollout undo deployment/app"
    onlyIf: previous_step_failed
```

## Execution Context

Each step has access to:
- `${params.*}` - SOP parameters
- `${previous_step.output}` - Previous step output
- `${env.VARIABLE}` - Environment variables
- `${runId}` - Current run ID
- `${startedAt}` - Run start time

## Example: Incident Response

```yaml
# sops/incident-response.yaml
name: Incident Response
version: "2.0"

steps:
  - id: notify
    type: message
    channel: incidents
    message: "🚨 Incident detected! Starting response procedure"

  - id: gather_logs
    type: command
    command: "kubectl logs -l app=${params.service} --tail=200 > logs.txt"

  - id: analyze
    type: agent
    agent: analyst
    task: "Analyze logs for errors"
    context: "${previous_step.output}"

  - id: check_metrics
    type: http
    url: "https://prometheus/api/v1/query"
    params:
      query: "rate(http_requests_total{status='500'}[5m])"

  - id: escalation
    type: approval
    message: "Escalate to on-call engineer?"
    autoApprove:
      condition: "${check_metrics.value > 100}"

  - id: remediation
    type: agent
    agent: remediator
    task: "Suggest remediation steps"
    context: "${analyze.output}"

  - id: report
    type: message
    channel: incidents
    message: "Incident analysis complete"
```

## Running SOPs

```bash
# Execute SOP
node /job/.pi/skills/sop-runner/runner.js --sop deploy-to-prod

# With parameters
node /job/.pi/skills/sop-runner/runner.js \
  --sop deploy-to-prod \
  --params '{"version":"v2.1.0","env":"prod"}'

# Dry run
node /job/.pi/skills/sop-runner/runner.js \
  --sop deploy-to-prod \
  --dry-run

# Resume failed run
node /job/.pi/skills/sop-runner/runner.js \
  --resume run_abc123
```

## Output

```javascript
{
  runId: "run_abc123",
  sopName: "deploy-to-prod",
  status: "success",
  startedAt: "2026-02-25T13:30:00Z",
  completedAt: "2026-02-25T13:35:00Z",
  steps: [
    { id: "notify", status: "success", output: "...", duration: 1200 },
    { id: "backup", status: "success", output: "...", duration: 45000 },
    { id: "deploy", status: "success", output: "...", duration: 120000 },
    { id: "verify", status: "success", output: "...", duration: 5000 }
  ]
}
```
