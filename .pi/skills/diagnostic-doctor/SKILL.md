---
name: Diagnostic Doctor
description: Self-diagnostic health check and system troubleshooting tool. Performs comprehensive system diagnostics, validates configuration, checks dependencies, and provides actionable recommendations. Inspired by ZeroClaw's doctor command.
author: PopeBot
version: 1.0.0
tags:
  - diagnostic
  - health-check
  - troubleshooting
  - system-validation
---

# Diagnostic Doctor

Self-diagnostic health check and system troubleshooting tool. Performs comprehensive system diagnostics similar to ZeroClaw's `doctor` command.

## Capabilities

- System health checks (disk, memory, processes)
- Dependency validation
- Configuration file validation
- Network connectivity tests
- Service status checks
- Security configuration audits
- Performance benchmarking
- Automated troubleshooting recommendations

## When to Use

Use the diagnostic-doctor skill when:
- Something isn't working correctly
- Before/after major changes
- Periodic health monitoring
- Troubleshooting failures
- Validating new installations

## Usage Examples

### Run all diagnostics
```bash
node /job/.pi/skills/diagnostic-doctor/doctor.js --all
```

### Check specific areas
```bash
# System resources only
node /job/.pi/skills/diagnostic-doctor/doctor.js --system

# Configuration validation
node /job/.pi/skills/diagnostic-doctor/doctor.js --config

# Network connectivity
node /job/.pi/skills/diagnostic-doctor/doctor.js --network

# Security audit
node /job/.pi/skills/diagnostic-doctor/doctor.js --security
```

### Generate report
```bash
node /job/.pi/skills/diagnostic-doctor/doctor.js --all --report doctor-report.json
```

## Output Format

Results are returned with:
- Status: OK, WARNING, ERROR, or INFO
- Category: System, Config, Network, Security, Performance
- Message: Human-readable description
- Recommendation: Actionable fix (for issues)
