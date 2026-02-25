---
name: system-doctor
description: System health diagnostics and troubleshooting. Check system status, diagnose issues, and get recommendations for fixes.
---

# System Doctor

System health diagnostics and troubleshooting tool. Inspired by OpenClaw's doctor command, this skill provides comprehensive system health checks and recommendations.

## Setup

No additional setup required. Uses built-in system commands.

## Usage

### Run Full Health Check

```bash
{baseDir}/doctor.js
```

### Run Specific Check

```bash
{baseDir}/doctor.js --check config
{baseDir}/doctor.js --check memory
{baseDir}/doctor.js --check disk
{baseDir}/doctor.js --check network
{baseDir}/doctor.js --check security
{baseDir}/doctor.js --check docker
```

### Verbose Output

```bash
{baseDir}/doctor.js --verbose
```

### JSON Output

```bash
{baseDir}/doctor.js --json
```

## Checks

| Check | Description |
|-------|-------------|
| `config` | Validate configuration files and environment |
| `memory` | Check memory usage and availability |
| `disk` | Check disk space and usage |
| `network` | Check network connectivity |
| `security` | Check security settings |
| `docker` | Check Docker status and containers |

## Output Format

```json
{
  "status": "healthy",
  "checks": {
    "config": { "status": "pass", "details": "..." },
    "memory": { "status": "pass", "details": "..." },
    "disk": { "status": "warning", "details": "..." },
    "network": { "status": "pass", "details": "..." },
    "security": { "status": "pass", "details": "..." },
    "docker": { "status": "pass", "details": "..." }
  },
  "recommendations": []
}
```

## Status Levels

- **pass**: System is healthy
- **warning**: Minor issues detected, should be addressed
- **error**: Critical issues detected, needs immediate attention
- **skip**: Check could not be performed

## When to Use

- Troubleshooting issues with the agent
- Checking system health before running jobs
- Diagnosing failures or errors
- Verifying system readiness
