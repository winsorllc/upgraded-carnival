---
name: system-monitor
description: System diagnostics and health monitoring. Provides system status, disk usage, memory stats, process health checks, and Docker container status. Inspired by ZeroClaw's doctor and status commands.
---

# System Monitor

Comprehensive system diagnostics and health monitoring tools for the agent runtime environment.

## Capabilities

- System health checks (disk, memory, CPU)
- Docker container status monitoring
- Process health validation
- Service status reporting
- Diagnostic report generation

## Usage

```bash
# Run full system diagnostics
/job/.pi/skills/system-monitor/system-doctor.js

# Get quick system status
/job/.pi/skills/system-monitor/system-status.js

# Check disk usage
/job/.pi/skills/system-monitor/disk-check.js

# Check memory usage
/job/.pi/skills/system-monitor/memory-check.js

# Check Docker containers
/job/.pi/skills/system-monitor/docker-check.js --all
```

## When to Use

- Before starting long-running tasks to ensure system health
- When troubleshooting issues that might be resource-related
- To generate periodic health reports
- To validate environment configuration

## Output Format

All tools output structured JSON that can be parsed programmatically or displayed in human-readable format.

Example output:
```json
{
  "healthy": true,
  "checks": {
    "disk": { "healthy": true, "usage": 45.2, "free_gb": 120.5 },
    "memory": { "healthy": true, "usage": 62.1, "available_mb": 2048 },
    "docker": { "healthy": true, "containers": 3, "running": 3 }
  },
  "timestamp": "2026-02-25T09:40:54Z"
}
```