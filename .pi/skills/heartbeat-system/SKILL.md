---
name: heartbeat-system
description: Periodic health checks and self-monitoring. Runs scheduled diagnostics and reports system status. Inspired by ZeroClaw's HEARTBEAT.md system.
---

# Heartbeat System

Self-monitoring and periodic health checks for the agent. Similar to ZeroClaw's built-in heartbeat system.

## Capabilities

- Run periodic health checks
- Monitor system resources
- Report status to configured channels
- Track uptime and performance metrics
- Run diagnostics on schedule

## Usage

```bash
# Run heartbeat check
/job/.pi/skills/heartbeat-system/heartbeat.js

# Check heartbeat config
/job/.pi/skills/heartbeat-system/heartbeat-config.js

# View heartbeat history
/job/.pi/skills/heartbeat-system/heartbeat-history.js
```

## Configuration

Heartbeat is configured via `config/HEARTBEAT.md` or environment variables.

```yaml
interval_minutes: 30      # How often to run
enabled: true             # Enable/disable
message: "Health check"   # Default message
target: "log"            # Where to report (log, file)
```

## When to Use

- Monitor long-running agents
- Detect resource issues early
- Track system health over time
- Generate periodic status reports