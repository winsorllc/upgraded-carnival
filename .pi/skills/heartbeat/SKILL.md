---
name: heartbeat
description: Periodic self-monitoring and health check system for autonomous agents. Runs scheduled health diagnostics, reports system status, and performs proactive maintenance tasks.
version: 1.0.0
author: PopeBot
---

# Heartbeat Skill

A self-monitoring system inspired by ZeroClaw's heartbeat architecture. This skill enables agents to perform periodic health checks, system diagnostics, and proactive maintenance without external triggers.

## Purpose

The heartbeat system allows an agent to:
- Monitor its own health and resources
- Report status periodically
- Perform routine maintenance tasks
- Alert on anomalies or issues
- Stay "alive" and responsive

## Key Concepts

### Heartbeat Types
- **health**: System health check (disk, memory, process status)
- **report**: Generate and send status reports
- **maintenance**: Perform cleanup, optimization, or updates
- **custom**: User-defined heartbeat tasks

### Configuration

The heartbeat is configured via `HEARTBEAT.md` in the workspace root:

```markdown
# Heartbeat Configuration

- health: Check system health every 30 minutes
- report: Send status report every day at 9 AM
- maintenance: Run cleanup every Sunday at 2 AM
```

## Tools Added

When this skill is active, the agent gains access to:

### `heartbeat_schedule`

Schedule a new heartbeat task.

```javascript
// Schedule a health check every 30 minutes
heartbeat_schedule({
  name: "health-check",
  type: "health",
  interval: "30m",
  enabled: true
})
```

### `heartbeat_run`

Manually trigger a heartbeat task.

```javascript
// Run a specific heartbeat
heartbeat_run({ name: "health-check" })

// Run all enabled heartbeats
heartbeat_run({ all: true })
```

### `heartbeat_list`

List configured heartbeat tasks.

```javascript
heartbeat_list({})
```

### `heartbeat_status`

Check the status and results of heartbeat tasks.

```javascript
// Get status of all heartbeats
heartbeat_status({})

// Get status of specific heartbeat
heartbeat_status({ name: "health-check" })
```

## Usage in Agent Prompt

When this skill is active, include this context in your system prompt:

```
## Heartbeat System

You have access to a periodic self-monitoring system (heartbeat). Use it to:
- Monitor system health and resources
- Generate periodic status reports
- Perform routine maintenance

Available commands:
- `heartbeat_schedule` - Schedule a new recurring check
- `heartbeat_run` - Manually run a heartbeat task
- `heartbeat_list` - Show all configured heartbeats
- `heartbeat_status` - Check heartbeat status and results

Create HEARTBEAT.md in the workspace root to define your heartbeat tasks.
```

## Integration with PopeBot

This skill integrates with PopeBot's cron system by:
1. Reading heartbeat definitions from HEARTBEAT.md
2. Converting them to cron-compatible schedules
3. Storing heartbeat status in the logs directory

## File Structure

```
.pi/skills/heartbeat/
├── SKILL.md           # This file
├── lib/
│   ├── scheduler.js   # Heartbeat scheduling logic
│   ├── runners.js     # Built-in heartbeat runners
│   └── status.js      # Status tracking
└── templates/
    └── HEARTBEAT.md   # Example configuration
```