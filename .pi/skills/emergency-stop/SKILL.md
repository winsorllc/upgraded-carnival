---
name: emergency-stop
description: Emergency stop system for halting operations. Kill running tasks, block domains, freeze tools, and manage emergency levels. Inspired by ZeroClaw estop system.
---

# Emergency Stop

Emergency stop system for immediate operation halt.

## Levels

- **kill-all**: Kill all running tasks
- **network-kill**: Cut network connections
- **domain-block**: Block specific domains
- **tool-freeze**: Disable specific tools

## Usage

```bash
# Emergency stop - kill all
./scripts/estop.js --level kill-all

# Block domains
./scripts/estop.js --level domain-block --domain "*.example.com"

# Freeze tool
./scripts/estop.js --level tool-freeze --tool shell

# Resume
./scripts/estop.js --resume

# Status
./scripts/estop.js --status
```

## Examples

| Task | Command |
|------|---------|
| Kill all | `estop.js --level kill-all` |
| Block domain | `estop.js --level domain-block --domain "*.chase.com"` |
| Freeze tool | `estop.js --level tool-freeze --tool browser` |
| Resume | `estop.js --resume` |
| Status | `estop.js --status` |