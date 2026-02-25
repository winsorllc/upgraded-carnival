---
name: heartbeat-monitor
description: Self-monitoring and periodic task execution. Run tasks periodically, monitor system health, and report status. Inspired by ZeroClaw's heartbeat engine.
version: 1.0.0
author: zeroclaw-inspired
tags:
  - heartbeat
  - monitoring
  - tasks
  - cron
  - health
capabilities:
  - Run tasks periodically on a schedule
  - Monitor system health metrics
  - Send alerts on health issues
  - Track task execution history
  - Self-diagnostic checks
requires: []
environment:
  HEARTBEAT_INTERVAL_MINUTES: "5"
  HEARTBEAT_ENABLED: "true"
  HEARTBEAT_TASKS_FILE: "./heartbeat-tasks.md"
---

# Heartbeat Monitor Skill

This skill provides self-monitoring and periodic task execution. It's inspired by ZeroClaw's heartbeat engine and can run tasks periodically, monitor health, and send alerts.

## Overview

The heartbeat monitor:
- Runs tasks periodically at configurable intervals
- Monitors system health metrics
- Tracks task execution history
- Sends alerts on failures
- Provides a self-diagnostic system

## Commands

### Start heartbeat
```
heartbeat start [--interval <minutes>]
```
Start the heartbeat monitor.

### Stop heartbeat
```
heartbeat stop
```
Stop the heartbeat monitor.

### Show status
```
heartbeat status
```
Show current heartbeat status and last tick.

### List tasks
```
heartbeat tasks
```
List all configured heartbeat tasks.

### Add task
```
heartbeat add <task> [--schedule <cron>] [--enabled true|false]
```
Add a new heartbeat task.

### Remove task
```
heartbeat remove <id>
```
Remove a heartbeat task.

### Run now
```
heartbeat run-now <id>
```
Run a specific task immediately.

### Show history
```
heartbeat history [--task <id>] [--limit <n>]
```
Show execution history for tasks.

## Task Format

Tasks are defined in HEARTBEAT.md or via the CLI:

```markdown
# Heartbeat Tasks

- Check system health
- Review calendar for upcoming events
- Check email for important messages
```

## Task Scheduling

Tasks can have different schedules:

```bash
# Run every heartbeat tick (default 5 min)
heartbeat add "Check system health"

# Run daily at 9am
heartbeat add "Daily summary" --schedule "0 9 * * *"

# Run every hour
heartbeat add "Hourly check" --schedule "0 * * * *"
```

## Health Monitoring

The heartbeat includes built-in health checks:

- **Memory usage** - Alert if > 80%
- **Disk usage** - Alert if > 90%
- **CPU usage** - Alert if > 90% sustained
- **Process health** - Check if critical processes running

## Usage Examples

```bash
# Start heartbeat with 5-minute interval
heartbeat start --interval 5

# Add a health check task
heartbeat add "Check memory usage"

# Run all tasks now
heartbeat run-now all

# Check status
heartbeat status

# View history
heartbeat history --limit 20
```

## Integration

Use in your agent:

```javascript
import { Heartbeat } from './heartbeat-monitor.js';

const hb = new Heartbeat({
  intervalMinutes: 5,
  onTask: async (task) => {
    console.log(`Running task: ${task}`);
    // Execute task logic
  }
});

hb.start();
```

## Alerts

Configure alerts in HEARTBEAT.md:

```markdown
# Heartbeat Alerts

## Memory Alert
If memory_usage > 80%, send alert to #ops

## Disk Alert
If disk_usage > 90%, send alert to #ops
```

## Status File

Heartbeat writes status to `heartbeat-status.json`:

```json
{
  "running": true,
  "lastTick": "2024-01-15T10:30:00Z",
  "tasks": {
    "total": 5,
    "running": 2,
    "failed": 0
  }
}
```
