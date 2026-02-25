---
name: service-manager
description: Manage background services and daemons. Install, start, stop, and monitor background processes. Inspired by ZeroClaw's `zeroclaw service` commands.
---

# Service Manager

Manage background services and daemons. Similar to ZeroClaw's service management.

## Capabilities

- Install services
- Start/stop/restart services
- Check service status
- View service logs
- Service health monitoring

## Usage

```bash
# Check service status
/job/.pi/skills/service-manager/service-status.js

# List running processes
/job/.pi/skills/service-manager/service-list.js

# Check process health
/job/.pi/skills/service-manager/service-health.js [pid]
```

## Inspired By

- ZeroClaw: `zeroclaw service install/start/stop/status/uninstall`