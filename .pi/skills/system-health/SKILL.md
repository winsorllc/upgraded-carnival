---
name: system-health
description: Monitor system resources, check service health, and generate health reports. Use when you need to check CPU/memory/disk usage, verify API connectivity, monitor running processes, or create system health reports.
metadata:
  {
    "popebot":
      {
        "emoji": "🏥",
        "requires": { "bins": ["curl", "jq"] },
        "install":
          [
            {
              "id": "apt",
              "kind": "apt",
              "package": "jq",
              "bins": ["jq"],
              "label": "Install jq (apt)",
            },
          ],
      },
  }
---

# System Health Monitor

Monitor system resources, check service health, and generate comprehensive health reports.

## When to Use

✅ **USE this skill when:**

- Checking system resource usage (CPU, memory, disk)
- Verifying API/service connectivity
- Monitoring running processes
- Generating periodic health reports
- Debugging performance issues
- Validating system stability before/after deployments

## Commands

### System Resources

```bash
# CPU and memory usage
node /job/.pi/skills/system-health/check-resources.js

# Disk usage
node /job/.pi/skills/system-health/check-disk.js

# All resources (combined report)
node /job/.pi/skills/system-health/check-all.js
```

### Service Health

```bash
# Check specific URL/endpoint
node /job/.pi/skills/system-health/check-service.js --url https://api.example.com/health

# Check multiple endpoints from config
node /job/.pi/skills/system-health/check-services.js

# With timeout (default: 5000ms)
node /job/.pi/skills/system-health/check-service.js --url https://api.example.com --timeout 10000
```

### Process Monitor

```bash
# List top processes by CPU
node /job/.pi/skills/system-health/check-processes.js --sort cpu

# List top processes by memory
node /job/.pi/skills/system-health/check-processes.js --sort memory

# Find specific process
node /job/.pi/skills/system-health/check-processes.js --name node
```

### Full Health Report

```bash
# Generate complete health report (JSON)
node /job/.pi/skills/system-health/health-report.js --format json

# Generate complete health report (human-readable)
node /job/.pi/skills/system-health/health-report.js --format text

# Save report to file
node /job/.pi/skills/system-health/health-report.js --output /job/tmp/health-report.json
```

### API Connectivity

```bash
# Check LLM API connectivity
node /job/.pi/skills/system-health/check-api.js --provider anthropic

# Check GitHub API
node /job/.pi/skills/system-health/check-api.js --provider github

# Check all configured APIs
node /job/.pi/skills/system-health/check-apis.js
```

## Output Format

### Resource Check Example

```json
{
  "timestamp": "2026-02-25T12:00:00Z",
  "cpu": {
    "usage": 23.5,
    "cores": 8,
    "load": [0.5, 0.7, 0.6]
  },
  "memory": {
    "total": 16777216,
    "used": 8388608,
    "free": 8388608,
    "usagePercent": 50.0
  },
  "disk": {
    "total": 500000000000,
    "used": 250000000000,
    "free": 250000000000,
    "usagePercent": 50.0
  }
}
```

### Service Health Example

```json
{
  "url": "https://api.example.com/health",
  "status": "healthy",
  "responseTime": 145,
  "statusCode": 200,
  "timestamp": "2026-02-25T12:00:00Z"
}
```

### Full Health Report Example

```json
{
  "timestamp": "2026-02-25T12:00:00Z",
  "overall": "healthy",
  "resources": { ... },
  "services": [ ... ],
  "apis": [ ... ],
  "alerts": []
}
```

## Health Thresholds

Default alert thresholds (configurable in `config.json`):

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 75% | > 90% |
| Disk Usage | > 80% | > 95% |
| Response Time | > 1000ms | > 5000ms |
| API Error Rate | > 5% | > 20% |

## Configuration

Create `/job/.pi/skills/system-health/config.json`:

```json
{
  "thresholds": {
    "cpuWarning": 70,
    "cpuCritical": 90,
    "memoryWarning": 75,
    "memoryCritical": 90,
    "diskWarning": 80,
    "diskCritical": 95,
    "responseTimeWarning": 1000,
    "responseTimeCritical": 5000
  },
  "services": [
    {
      "name": "Event Handler",
      "url": "http://localhost:3000/api/ping",
      "expectedStatus": 200
    },
    {
      "name": "GitHub API",
      "url": "https://api.github.com",
      "expectedStatus": 200
    }
  ],
  "apis": [
    {
      "name": "Anthropic",
      "env": "ANTHROPIC_API_KEY",
      "checkUrl": "https://api.anthropic.com/v1/models"
    }
  ]
}
```

## Integration with Cron

Schedule periodic health checks:

```json
// config/CRONS.json
{
  "name": "Hourly Health Check",
  "schedule": "0 * * * *",
  "type": "command",
  "command": "node /job/.pi/skills/system-health/health-report.js --output /job/logs/health-$(date +%Y%m%d-%H%M).json",
  "enabled": true
}
```

## Alerts

The skill generates alerts when thresholds are exceeded. Alerts include:

- Metric name and current value
- Threshold that was exceeded
- Timestamp
- Recommended actions

Example alert:
```
[CRITICAL] Disk usage at 96% (threshold: 95%)
Recommended: Clean up /job/tmp/ or expand storage
```
