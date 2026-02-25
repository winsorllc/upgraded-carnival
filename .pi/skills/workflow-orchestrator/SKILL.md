---
name: workflow-orchestrator
description: |
  Declarative workflow orchestration for multi-agent tasks. Activate when users need to
  coordinate multiple agent jobs, run parallel tasks, or create reusable automation pipelines.
---

# Workflow Orchestrator Skill

Execute declarative workflow files that orchestrate multiple PopeBot agent jobs. This skill brings OpenProse-style workflow orchestration to PopeBot's job-based architecture.

## When to Activate

Activate this skill when the user:

- Wants to run multiple agent jobs in sequence or parallel
- Needs to coordinate tasks with dependencies
- Wants to create reusable automation pipelines
- Asks to run a `.workflow` file
- Mentions "workflow orchestration" or "multi-agent workflow"

## Workflow File Format

Workflows use YAML-like syntax with clear structure:

```yaml
# Example: Code review workflow
name: "PR Review Pipeline"
description: "Review PR, check for bugs, suggest improvements"

inputs:
  - name: pr_number
    required: true
    description: "Pull request number to review"

agents:
  reviewer:
    personality: |
      You are a thorough code reviewer focused on security, best practices, and maintainability.
  tester:
    personality: |
      You are a QA engineer focused on edge cases and test coverage.
  documenter:
    personality: |
      You are a technical writer who creates clear documentation.

steps:
  # Sequential steps run one after another
  - name: review_code
    agent: reviewer
    prompt: |
      Review pull request #{{pr_number}} for:
      - Security issues
      - Code quality
      - Best practices
    output: review_report

  # Parallel steps run concurrently
  - name: parallel_tests
    parallel:
      - name: unit_tests
        agent: tester
        prompt: "Check test coverage for PR #{{pr_number}}"
        output: test_report
      
      - name: integration_tests
        agent: tester
        prompt: "Check integration tests for PR #{{pr_number}}"
        output: integration_report

  # Conditional execution
  - name: write_summary
    agent: documenter
    prompt: |
      Write a PR summary based on:
      - Review: {{review_report}}
      - Tests: {{test_report}}
      - Integration: {{integration_report}}
    if: "**all previous steps succeeded**"
    output: final_summary

outputs:
  - review_report
  - test_report
  - integration_report
  - final_summary
```

## Commands

### Run a Workflow

```bash
# Run a local workflow file
workflow run my-workflow.workflow

# Run with inputs
workflow run my-workflow.workflow --input pr_number=123

# Run a remote workflow
workflow run https://example.com/workflow.workflow
```

### Compile/Validate

```bash
# Validate workflow syntax without running
workflow compile my-workflow.workflow
```

### List Available Workflows

```bash
# Show workflows in current directory
workflow list
```

## Execution Model

The workflow orchestrator:

1. **Parses** the workflow file
2. **Validates** syntax and required inputs
3. **Creates** agent definitions with custom personalities
4. **Executes** steps according to dependencies:
   - Sequential steps wait for previous completion
   - Parallel steps spawn multiple jobs concurrently
   - Conditional steps evaluate AI-determined conditions
5. **Collects** outputs from each step
6. **Reports** final results

## Job Management

Each workflow step creates a PopeBot job:

- Jobs are created in `job/workflow-{workflow_id}-{step_name}` branches
- Job results are stored in `/job/tmp/workflows/{workflow_id}/{step_name}/`
- Failed steps can be retried individually
- Workflows can be paused for approval gates

## Approval Gates

Insert approval checkpoints in workflows:

```yaml
steps:
  - name: draft_email
    agent: assistant
    prompt: "Draft a response to the customer complaint"
    output: email_draft

  - name: approval_gate
    type: approval
    prompt: "Send this email?"
    data: "{{email_draft}}"
    on_approve:
      - name: send_email
        agent: assistant
        prompt: "Send the approved email"
    on_reject:
      - name: revise_email
        agent: assistant
        prompt: "Revise the email based on feedback"
```

## Error Handling

```yaml
steps:
  - name: risky_operation
    agent: assistant
    prompt: "Do something that might fail"
    retry:
      max_attempts: 3
      backoff: exponential
    on_error:
      - name: handle_error
        agent: assistant
        prompt: "Handle this error: {{error_message}}"
```

## Variable Substitution

Use `{{variable_name}}` to reference:

- Workflow inputs: `{{pr_number}}`
- Step outputs: `{{review_report}}`
- Previous step data in parallel blocks

## Configuration

```yaml
# In config/WORKFLOWS.json (optional)
{
  "default_timeout": 600,
  "max_parallel_jobs": 5,
  "workspace": "/job/tmp/workflows",
  "notification_channel": "telegram"
}
```

## Examples

### Multi-Agent Research

```yaml
name: "Research Deep Dive"
inputs:
  - name: topic
    required: true

steps:
  - name: initial_research
    parallel:
      - agent: researcher
        prompt: "Research {{topic}} from technical perspective"
        output: tech_research
      - agent: researcher
        prompt: "Research {{topic}} market applications"
        output: market_research
  
  - name: synthesize
    agent: analyst
    prompt: |
      Synthesize findings:
      Technical: {{tech_research}}
      Market: {{market_research}}
    output: final_report
```

### CI/CD Pipeline

```yaml
name: "Release Pipeline"
inputs:
  - name: version
    required: true

steps:
  - name: build
    agent: builder
    prompt: "Build version {{version}} and run tests"
  
  - name: security_scan
    agent: security
    prompt: "Scan {{version}} for vulnerabilities"
    parallel: true
  
  - name: approval
    type: approval
    prompt: "Deploy version {{version}}?"
  
  - name: deploy
    agent: deployer
    prompt: "Deploy {{version}} to production"
    if: "**approval granted**"
```

## State Management

Workflow state persists in:

- `/job/tmp/workflows/{workflow_id}/state.json` - Current execution state
- `/job/tmp/workflows/{workflow_id}/steps/` - Individual step results
- `/job/tmp/workflows/{workflow_id}/logs/` - Execution logs

## API Integration

Workflows can be triggered via:

```bash
# Via PopeBot chat
/workflow run my-workflow.workflow

# Via API
curl -X POST /api/create-job \
  -H "x-api-key: YOUR_KEY" \
  -d '{"job": "workflow run my-workflow.workflow --input key=value"}'
```

## When NOT to Use

- Single simple tasks (use direct agent jobs)
- Tasks requiring continuous human interaction
- Real-time data processing
- Tasks under 30 seconds (overhead not justified)

## File Locations

| File | Location | Purpose |
|------|----------|---------|
| Skill files | Same dir as this SKILL.md | Documentation and executor |
| User workflows | Workspace `*.workflow` files | User-created workflows |
| State | `/job/tmp/workflows/` | Runtime state and results |
| Config | `config/WORKFLOWS.json` (optional) | Global settings |
