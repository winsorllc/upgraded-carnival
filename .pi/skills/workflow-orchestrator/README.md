# Workflow Orchestrator Skill

Declarative workflow orchestration for multi-agent PopeBot tasks.

## Installation

```bash
cd /job/.pi/skills/workflow-orchestrator
npm install
```

## Quick Start

### Validate a workflow

```bash
./workflow-executor.js compile /job/tmp/test-workflow.workflow
```

### Run a workflow

```bash
./workflow-executor.js run /job/tmp/test-workflow.workflow --input topic="AI agents"
```

### List workflows

```bash
./workflow-executor.js list
```

## Features

- **Sequential execution** - Steps run in order with data passing
- **Parallel execution** - Multiple agents work concurrently
- **Approval gates** - Pause for human approval before continuing
- **Error handling** - Retry logic and error recovery
- **Variable substitution** - Use outputs as inputs for later steps

## Workflow Syntax

```yaml
name: "My Workflow"
description: "What it does"

inputs:
  - name: my_input
    required: true

agents:
  my_agent:
    personality: "Define custom agent personality"

steps:
  # Sequential step
  - name: step1
    agent: my_agent
    prompt: "Do something with {{my_input}}"
    output: result1

  # Parallel steps
  - name: parallel_step
    parallel:
      - agent: my_agent
        prompt: "Task A"
      - agent: my_agent
        prompt: "Task B"

  # Approval gate
  - name: approval
    type: approval
    prompt: "Approve this?"

outputs:
  - result1
```

## Integration with PopeBot

This skill integrates with PopeBot's job architecture:

1. Each workflow step creates a PopeBot job
2. Jobs are tracked in workflow state
3. Results are collected and passed between steps
4. Workflow state persists across executions

## Test Workflows

Two example workflows are included:

- `/job/tmp/test-workflow.workflow` - Simple parallel research pipeline
- `/job/tmp/code-review.workflow` - PR review with approval gates

## API

### Commands

| Command | Description |
|---------|-------------|
| `workflow run <file>` | Execute a workflow |
| `workflow compile <file>` | Validate syntax |
| `workflow list` | List available workflows |
| `workflow help` | Show help |

### Exit Codes

- `0` - Success
- `1` - Error (validation, execution, etc.)

## State Management

Workflow state is stored in `/job/tmp/workflows/{workflow_id}/`:

```
{workflow_id}/
├── state.json          # Current execution state
├── steps/
│   └── {step_name}/
│       └── details.json
└── logs/
```

## Future Enhancements

- Remote workflow loading from URLs
- Integration with PopeBot API for real job creation
- Advanced error handling with retry strategies
- Workflow templates library
- Web UI for workflow monitoring
- Telegram integration for approval notifications
