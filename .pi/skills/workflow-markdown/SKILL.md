---
name: workflow-markdown
description: Execute markdown-based agent workflows (.agent/workflows/*.md). Reads YAML frontmatter, parses executable code blocks, and runs tasks with full context awareness. Inspired by OpenClaw's agent workflow system.
version: 1.0.0
author: PopeBot (adapted from OpenClaw)
tags: ["workflows", "markdown", "literate-programming", "automation"]
---

# Workflow Markdown - Literate Agent Workflows

A markdown-based workflow execution system that combines documentation with executable instructions. Enables agents to read, understand, and execute complex multi-step workflows from human-readable markdown files.

## Inspiration

This skill is adapted from **OpenClaw's** `.agent/workflows/` pattern, which allows agents to:
- Document workflows in markdown
- Embed executable code blocks
- Parse frontmatter for metadata
- Maintain context across workflow steps

## Purpose

When enabled, this skill allows the agent to:
1. **Discover** - Find markdown workflow files in `.agent/workflows/`
2. **Parse** - Extract YAML frontmatter and executable blocks
3. **Execute** - Run code blocks with context preservation
4. **Report** - Generate execution reports

## File Structure

```
.agent/workflows/
├── README.md                    # Workflow documentation
├── update-dependencies.md       # Example: dependency update workflow
├── deploy-production.md         # Example: deployment workflow
└── onboard-new-project.md       # Example: project setup workflow
```

## Workflow File Format

```markdown
---
name: Update Dependencies
description: Update project dependencies safely
tags: ["maintenance", "dependencies"]
context:
  required_files: ["package.json"]
  working_directory: "."
---

# Update Dependencies Workflow

This workflow updates project dependencies in a safe, controlled manner.

## Step 1: Check Prerequisites

First, verify we have the required files:

```shell:check
ls package.json
```

## Step 2: Backup Current State

```shell:backup
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup 2>/dev/null || echo "No lockfile"
```

## Step 3: Update Dependencies

Check for outdated packages:

```shell:outdated
npm outdated 2>/dev/null || echo "npm outdated completed"
```

## Step 4: Install Updates

```shell:update
npm update
```

## Step 5: Verify

Run tests to verify everything works:

```shell:test
npm test
```

## Step 6: Report Results

```javascript:report
console.log("Dependencies updated successfully!");
console.log("Review the changes and commit if tests pass.");
```
```

## Syntax

### Frontmatter (YAML)

| Field | Description | Required |
|-------|-------------|----------|
| `name` | Human-readable workflow name | Yes |
| `description` | What this workflow does | Yes |
| `tags` | Array of category tags | No |
| `context` | Execution context settings | No |
| `context.required_files` | Files that must exist | No |
| `context.working_directory` | Where to execute | No |
| `requires_confirmation` | Confirm before destructive steps | No |

### Code Blocks

Code blocks can be labeled with a step identifier:

<pre>
```language:step-id
```
</pre>

Available languages:
- `shell` or `bash` - Execute shell commands
- `javascript` or `js` - Execute JavaScript (Node.js)
- `python` or `py` - Execute Python (if python3 available)
- `json` - Data that can be referenced
- `yaml` - Configuration data

### Special Step Identifiers

- `check` - Validation steps
- `setup` - Preparation steps
- `teardown` - Cleanup steps
- `report` - Final reporting

## Tools Added

### `workflow_list`

List available workflows.

```javascript
// List all workflows
workflows = await workflow_list({})

// Filter by tag
workflows = await workflow_list({ tag: "maintenance" })

// Show details
workflows = await workflow_list({ verbose: true })
```

### `workflow_run`

Execute a workflow.

```javascript
// Run by name
await workflow_run({ name: "Update Dependencies" })

// Run with variables
await workflow_run({ 
  name: "Update Dependencies",
  variables: { 
    target_version: "latest",
    skip_tests: false 
  }
})

// Dry run (parse only)
await workflow_run({ 
  name: "Update Dependencies",
  dryRun: true 
})
```

### `workflow_validate`

Validate a workflow file without executing.

```javascript
validation = await workflow_validate({ name: "Update Dependencies" })
// Returns: { valid: true/false, errors: [...], warnings: [...] }
```

### `workflow_template`

Create a new workflow from a template.

```javascript
await workflow_template({ 
  name: "New Workflow",
  description: "What this does",
  path: ".agent/workflows/new-workflow.md"
})
```

## Usage in Agent Prompt

```
## Workflow Markdown - Literate Workflow System

You have access to a markdown-based workflow execution system inspired by OpenClaw.

### Available Workflows

{{workflows}}

### Usage

**List workflows:**
```javascript
const workflows = await workflow_list({})
```

**Run a workflow:**
```javascript
await workflow_run({ name: "Update Dependencies" })
```

**Run with variables:**
```javascript
await workflow_run({ 
  name: "Update Dependencies",
  variables: { target_version: "18.x" }
})
```

### Workflow Locations

Default search paths:
- `.agent/workflows/*.md`
- `.pi/workflows/*.md`
- `workflows/*.md`

### Variable Substitution

Workflows support variable substitution:

```shell:update
npm install {{package_name}}@{{version}}
```

Pass variables in workflow_run:
```javascript
await workflow_run({ 
  name: "Install Package",
  variables: { 
    package_name: "express",
    version: "^4.18.0"
  }
})
```

## Configuration

Create `WORKFLOW_CONFIG.md` in your project root:

```markdown
# Workflow Configuration

## Search Paths
- .agent/workflows/
- .pi/workflows/
- custom/workflows/

## Default Variables
- NODE_ENV: production
- CI: true

## Hooks
- pre_run: .agent/hooks/pre-run.sh
- post_run: .agent/hooks/post-run.sh
```

## Output and Logging

Workflow execution produces:
- Step-by-step execution log
- Exit codes for each step
- Captured output from each block
- Timing information
- Final report

## Error Handling

- Non-zero exit codes stop execution (unless step marked as `optional`)
- Errors are captured with full context
- Recovery steps can be defined
- Rollback commands supported

## Security

- Shell commands are validated before execution
- Dangerous patterns flagged for review
- Restricted commands configurable
- Working directory sandboxing

## Best Practices

1. **Document every step** - The markdown should explain WHY, not just WHAT
2. **Use meaningful step IDs** - Makes logs readable
3. **Include validation steps** - Check prerequisites before execution
4. **Add teardown/cleanup** - Ensure rollback capability
5. **Version your workflows** - Track changes to workflow files

## Integration with Other Skills

### With multi-agent-orchestrator

```javascript
// Delegate workflow steps to specialized agents
await parallel_delegates({
  tasks: workflow.steps.map(step => ({
    agent: step.agent_type || "general",
    task: step.description
  }))
})
```

### With secure-sandbox

```javascript
// Run workflow in sandbox
await sandbox_exec({
  command: `workflow-run ${workflow.name}`,
  allow_list: workflow.allowed_commands
})
```

### With browser-tools

```javascript
// Workflows can include browser automation
await page.goto('{{deployment_url}}')
await page.verify('h1', 'Welcome')
```

## Examples

### Simple Workflow

```markdown
---
name: Check Health
description: Verify system health checks pass
---

# Health Check

## Check Disk Space

```shell:disk
df -h | grep -E "Filesystem|/dev/" | head -5
```

## Check Memory

```shell:memory
free -h
```

## Check Node Version

```shell:node
node --version
```
```

### Complex Workflow with Variables

```markdown
---
name: Deploy to Environment
description: Deploy application to target environment
requires_confirmation: true
---

# Deploy to {{environment}}

## Prerequisites

Target environment: **{{environment}}**
Version: **{{version}}**

## Verify Build

```shell:build
npm run build:{{environment}}
```

## Deploy

```shell:deploy
npm run deploy -- --env={{environment}} --version={{version}}
```

## Verify Deployment

```shell:verify
curl -s {{health_check_url}} | grep "healthy"
```
```

Run with:
```javascript
await workflow_run({ 
  name: "Deploy to Environment",
  variables: {
    environment: "staging",
    version: "1.2.3",
    health_check_url: "https://staging.example.com/health"
  }
})
```

## Performance

| Metric | Expected |
|--------|----------|
| Parse workflow | <50ms |
| Shell step | Depends on command |
| JavaScript step | <1s typical |
| Full workflow | Varies by complexity |

## Error Handling

- **Parse errors**: Report file and line number
- **Missing variables**: Prompt for values or fail
- **Command errors**: Capture stderr, exit code, context
- **Timeout**: Configurable per-step timeouts

## Future Enhancements

- [ ] Conditional steps (if/then logic)
- [ ] Loops and iteration
- [ ] Parallel step execution
- [ ] Workflow composition (import/include)
- [ ] Interactive prompts for missing vars
- [ ] Step retry logic
- [ ] Workflow dependencies
- [ ] Result caching

## License

MIT - Adapted from OpenClaw's agent workflow system
