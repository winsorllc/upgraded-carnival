---
name: system-doctor
description: System health diagnostics and troubleshooting tool. Checks disk space, memory, services, network connectivity, and common configuration issues.
---

# System Doctor

Comprehensive health check system for diagnosing infrastructure issues, inspired by zeroclaw doctor and openclaw doctor commands.

## Setup
```bash
cd {baseDir}
npm install
```

## Usage

### Full System Check
```bash
{baseDir}/doctor.js
```

### Specific Checks
```bash
{baseDir}/doctor.js --disk          # Check disk space only
{baseDir}/doctor.js --memory        # Check memory usage only
{baseDir}/doctor.js --network       # Check network connectivity only
{baseDir}/doctor.js --services      # Check service status only
{baseDir}/doctor.js --docker        # Check Docker status
{baseDir}/doctor.js --git           # Check Git configuration
```

### Output Format
```
╔════════════════════════════════════════════════════════╗
║           System Doctor Diagnostic Report              ║
╚════════════════════════════════════════════════════════╝

✓ Disk Space   45% used (89GB free of 197GB)
✓ Memory       62% used (2.4GB free of 6.3GB)
✓ Network      All endpoints reachable
! Services     2 services not running
  - redis: stopped
  - nginx: stopped
✓ Docker       Running (v24.0.7)
✓ Git          Configured properly

═══════════════════════════════════════════════════════════
Overall Status: ⚠️ WARNING (1 issue found)
═══════════════════════════════════════════════════════════
```

## When to Use
- Troubleshooting system issues
- Routine health checks
- Before deployments
- Debugging service failures
- Monitoring resource constraints
