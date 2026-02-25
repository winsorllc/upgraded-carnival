---
name: delegate-agent
description: Delegate complex subtasks to sub-agents (Claude Code, Pi, or custom). Spawn parallel agent workflows for research, coding, or complex multi-step tasks. Inspired by ZeroClaw's delegate tool.
version: 1.0.0
author: zeroclaw-inspired
tags:
  - delegate
  - sub-agent
  - agent
  - parallel
  - workflow
  - claude-code
capabilities:
  - Spawn sub-agents for parallel execution
  - Delegate to Claude Code, Pi, or custom agents
  - Multi-agent workflows with handoffs
  - Sub-agent result aggregation and
  - Timeout resource controls
  - Agent pool management
requires: []
environment:
  DEFAULT_DELEGATE_AGENT: "pi"
  MAX_PARALLEL_AGENTS: "3"
  SUB_AGENT_TIMEOUT_SECONDS: "300"
---

# Delegate Agent Skill

This skill enables delegating complex subtasks to sub-agents for parallel execution. It's inspired by ZeroClaw's delegate tool and allows spawning multiple agents to work on different parts of a task simultaneously.

## Overview

The delegate agent can:
- Spawn multiple sub-agents for parallel work
- Use different agents for different tasks (Claude Code, Pi, custom)
- Aggregate results from multiple agents
- Manage agent pools and resources
- Handle timeouts and failures gracefully

## Commands

### Delegate a task
```
delegate <agent> "<prompt>" [--timeout <seconds>] [--context <context>]
```
Delegate a task to a sub-agent.

### Spawn multiple agents
```
delegate spawn <count> <agent> "<prompt>" [--timeout <seconds>]
```
Spawn multiple agents for parallel work.

### List running agents
```
delegate list
```
List all running sub-agents.

### Kill an agent
```
delegate kill <agent_id>
```
Terminate a running sub-agent.

### Wait for results
```
delegate wait <agent_ids...>
```
Wait for specific agents to complete.

### Get agent status
```
delegate status <agent_id>
```
Get status of a specific agent.

## Agent Types

| Agent | Description | Best For |
|-------|-------------|----------|
| `pi` | Pi coding agent | Code writing, refactoring |
| `claude` | Claude Code | Complex reasoning, analysis |
| `custom` | Custom agent | Task-specific agents |

## Usage Examples

### Simple delegation
```bash
delegate pi "Write a function to parse JSON"
```

### Parallel execution
```bash
# Analyze different aspects in parallel
delegate spawn 3 pi "Analyze the frontend code for bugs"
delegate spawn 3 pi "Analyze the backend code for bugs"
delegate spawn 3 pi "Analyze the tests for coverage"
```

### With timeout
```bash
delegate claude "Research the latest AI developments" --timeout 120
```

### Aggregate results
```bash
delegate wait agent-123 agent-456 agent-789
```

## Configuration

```bash
# Default agent to use
DEFAULT_DELEGATE_AGENT=pi

# Maximum parallel agents
MAX_PARALLEL_AGENTS=3

# Default timeout
SUB_AGENT_TIMEOUT_SECONDS=300
```

## Result Format

```json
{
  "agent_id": "delegate-abc123",
  "agent": "pi",
  "status": "completed",
  "result": "The sub-agent's output...",
  "duration_ms": 45000,
  "error": null
}
```

## Best Practices

1. **Break large tasks** into smaller subtasks that can run in parallel
2. **Set appropriate timeouts** based on task complexity
3. **Provide context** to sub-agents for better results
4. **Handle failures** gracefully with try/catch
5. **Aggregate results** from multiple agents for final output

## Integration

```javascript
import { DelegateAgent } from './delegate-agent.js';

const delegate = new DelegateAgent({
  maxParallel: 3,
  timeout: 300000
});

// Delegate a single task
const result = await delegate.run('pi', 'Write a unit test for function X');

// Spawn parallel tasks
const agents = await delegate.spawn(3, 'pi', 'Analyze file Y');

// Wait for completion
const results = await delegate.wait(agents.map(a => a.id));
```
