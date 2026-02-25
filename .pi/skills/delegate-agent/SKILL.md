---
name: delegate-agent
description: Spawn sub-agents for parallel task execution. Use when a task can be broken into independent subtasks that can run concurrently.
---

# Delegate Agent

Spawn sub-agents to handle independent subtasks in parallel or sequence. This enables multi-agent workflows where specialized agents handle different aspects of a complex task.

## When to Use

- **Parallel execution**: Multiple independent tasks can run simultaneously
- **Specialized handling**: Different sub-tasks need different expertise/models
- **Isolation**: Sub-task failures shouldn't crash the main agent
- **Parallel research**: Gather information from multiple sources at once

## Setup

No additional setup required. This skill works out of the box.

## Usage

### Spawn a Sub-Agent

```bash
{baseDir}/delegate-spawn.js "research-agent" "Find information about topic" --model claude-sonnet-4-20250514
```

Arguments:
- `name`: Identifier for the sub-agent (for tracking)
- `prompt`: Task description for the sub-agent
- `--model`: Optional model override (defaults to main agent's model)
- `--timeout`: Optional timeout in seconds (default: 300)

### Check Sub-Agent Status

```bash
{baseDir}/delegate-status.js <job-id>
```

### List Active Sub-Agents

```bash
{baseDir}/delegate-list.js
```

### Kill a Sub-Agent

```bash
{baseDir}/delegate-kill.js <job-id>
```

## Examples

### Parallel Research

```javascript
// Research multiple topics in parallel
const topics = ["AI agents", "Rust programming", "Docker containers"];
const agents = topics.map(topic => 
  spawnSubAgent(`research-${topic}`, `Find latest developments in ${topic}`)
);
// Wait for all to complete
const results = await Promise.all(agents.map(a => a.result));
```

### Specialized Handling

```javascript
// Use different models for different tasks
await spawnSubAgent("coder", "Write a REST API", { model: "claude-sonnet-4-20250514" });
await spawnSubAgent("writer", "Write documentation", { model: "claude-haiku-20240307" });
```

## Architecture

The delegate tool:
1. Creates a new job branch `delegate/<uuid>/<agent-name>`
2. Writes the task prompt to `logs/<uuid>/job.md`
3. Triggers GitHub Actions to run the sub-agent
4. Polls for completion and returns results
5. Cleans up the temporary branch

## Security Considerations

- Sub-agents inherit the same permissions as the parent
- API keys are passed to sub-agents (filtered from LLM bash output)
- Sub-agents run in isolated containers
- Activity is logged for audit purposes
