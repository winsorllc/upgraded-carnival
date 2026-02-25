---
name: component-health
description: Track and monitor component health status with in-memory health registry. Use for monitoring service components, tracking uptime, and providing health snapshots for load balancers.
metadata:
  {
    "thepopebot":
      {
        "emoji": "🏥",
        "os": ["linux", "darwin"],
        "requires": {},
        "install": []
      }
  }
---

# Component Health Monitor

Track and monitor the health status of various system components with a centralized registry.

## Overview

This skill provides a health monitoring system for tracking:
- Component status (ok, error, degraded, starting)
- Uptime tracking
- Error history
- Restart counts
- Health snapshots for external monitoring

## Usage

### Mark Component Healthy

```bash
health mark ok <component-name>
```

### Mark Component Error

```bash
health mark error <component-name> "Error description"
```

### Mark Component Degraded

```bash
health mark degraded <component-name> "Performance degraded"
```

### Get Health Snapshot

```bash
health snapshot
```

### Get Specific Component Status

```bash
health status <component-name>
```

### List All Components

```bash
health list
```

### Reset Component

```bash
health reset <component-name>
```

## API Usage

```javascript
const { HealthMonitor } = require('./index.js');

const monitor = new HealthMonitor();

// Mark a component as healthy
monitor.markOk('database');
monitor.markOk('cache');

// Mark an error
monitor.markError('api', 'Connection timeout');

// Get full snapshot
const snapshot = monitor.getSnapshot();
console.log(snapshot);
```

## Health States

| State | Description |
|-------|-------------|
| `ok` | Component is healthy |
| `error` | Component has failed |
| `degraded` | Component is working but with issues |
| `starting` | Component is initializing |
| `unknown` | Component not registered |

## Environment Variables

- `HEALTH_PORT`: Port for health HTTP server (optional)
- `HEALTH_PATH`: Path for health endpoint (default: `/health`)

## Integration with Load Balancers

The health snapshot can be served via HTTP for load balancer health checks:

```javascript
// Example Express route
app.get('/health', (req, res) => {
  const snapshot = healthMonitor.getSnapshot();
  const hasErrors = Object.values(snapshot.components)
    .some(c => c.status === 'error');
  
  res.status(hasErrors ? 503 : 200).json(snapshot);
});
```

## Notes

- All timestamps are in RFC3339 format
- Component states persist in memory (not persisted to disk)
- Use `reset` to clear a component's error state after fixing
- Health data includes PID and uptime for process-level monitoring
