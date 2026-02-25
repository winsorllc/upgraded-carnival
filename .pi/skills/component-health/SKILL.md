---
name: component-health
description: "Track component health status with in-memory health registry. Use for monitoring service components, tracking uptime, and providing health snapshots for load balancers."
homepage: https://github.com/zeroclaw-labs/zeroclaw
metadata:
  {
    "thepopebot":
      {
        "emoji": "💚",
      },
  }
---

# Component Health

Track component health status with an in-memory health registry.

## Overview

This module provides a simple in-memory health tracking system for monitoring the health of various service components. It tracks:
- Component status (ok, error, starting)
- Last successful check timestamp
- Last error message
- Restart count

## Usage

### JavaScript/Node.js

```javascript
const health = require('./component-health');

function checkDatabase() {
  try {
    // Check database connection
    health.markComponentOk('database');
    return true;
  } catch (error) {
    health.markComponentError('database', error.message);
    return false;
  }
}

// Get health snapshot
const snapshot = health.getSnapshot();
console.log(snapshot);

// Get JSON health status
const json = health.getSnapshotJson();
```

### Command Line

```bash
# Mark component as healthy
component-health ok database

# Mark component as errored
component-health error database "Connection refused"

# Get health snapshot
component-health status

# Get JSON output
component-health status --json
```

## API

### Functions

| Function | Description |
|----------|-------------|
| `markComponentOk(name)` | Mark a component as healthy |
| `markComponentError(name, error)` | Mark a component as errored with error message |
| `bumpComponentRestart(name)` | Increment restart count for a component |
| `getSnapshot()` | Get full health snapshot |
| `getSnapshotJson()` | Get health snapshot as JSON |

### Health Snapshot Format

```json
{
  "pid": 12345,
  "updated_at": "2025-02-25T12:00:00.000Z",
  "uptime_seconds": 3600,
  "components": {
    "database": {
      "status": "ok",
      "updated_at": "2025-02-25T12:00:00.000Z",
      "last_ok": "2025-02-25T12:00:00.000Z",
      "last_error": null,
      "restart_count": 0
    }
  }
}
```

## Use Cases

- **Load balancer health checks**: Return health snapshot for `/health` endpoint
- **Service monitoring**: Track individual component health over time
- **Incident response**: Quickly see which components are failing
- **Restart tracking**: Monitor how many times a component has restarted

## Notes

- All data is in-memory (resets on restart)
- For persistent health tracking, use with a database or file storage
- Designed for quick health checks, not long-term analytics
