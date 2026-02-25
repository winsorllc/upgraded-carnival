---
name: health-monitor
description: Monitor agent health, performance, and resource usage. Track system metrics, detect anomalies, and send alerts when thresholds are exceeded.
metadata:
  {
    "thepopebot":
      {
        "emoji": "💚",
        "version": "1.0.0",
        "features": ["health-checks", "metric-tracking", "anomaly-detection", "alerting"]
      }
  }
---

# Health Monitor — System Health & Performance Monitoring

Monitor agent health, performance metrics, and resource usage with automated alerting.

## Overview

This skill provides:
- **Health Checks**: Ping services, check disk space, memory usage
- **Metric Collection**: Track CPU, memory, disk, network over time
- **Anomaly Detection**: Detect unusual patterns in metrics
- **Automated Alerting**: Send alerts when thresholds exceeded
- **Uptime Tracking**: Monitor service availability
- **Performance Reports**: Generate health reports

## Metrics Tracked

- System: CPU%, memory usage, disk space, load average
- Process: Node.js heap, event loop lag, active handles
- Application: Job queue depth, error rate, response time
- External: API latency, dependency health

## Configuration

```json
{
  "checks": [
    {
      "name": "disk-space",
      "type": "metric",
      "threshold": 90,
      "unit": "%",
      "interval": "*/5 * * * *"
    },
    {
      "name": "api-latency",
      "type": "http",
      "url": "https://api.anthropic.com",
      "threshold_ms": 5000
    }
  ],
  "alerts": {
    "channels": ["telegram"],
    "quiet_hours": { "start": "22:00", "end": "08:00" }
  }
}
```

## API

```javascript
const { checkHealth, getMetrics, getUptime } = require('./health-monitor');

// Run health checks
const health = await checkHealth();

// Get current metrics
const metrics = getMetrics('last_hour');

// Get uptime percentage
const uptime = getUptime('daily'); // "99.5%"
```
