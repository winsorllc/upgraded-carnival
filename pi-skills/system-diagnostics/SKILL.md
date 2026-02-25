---
name: system-diagnostics
description: "Comprehensive system health diagnostics and troubleshooting. Run checks for CPU, memory, disk, network, services, logs, and common issues. Inspired by ZeroClaw's doctor command."
---

# System Diagnostics

Run comprehensive system health checks and diagnose common issues.

## When to Use

✅ **USE this skill when:**

- System is running slow or hanging
- Need to check resource usage
- Services aren't starting
- Network connectivity issues
- General health check

## When NOT to Use

❌ **DON'T use this skill when:**

- Need real-time monitoring → use system-monitor skill
- Need to fix issues → this is read-only diagnostics

## Usage

### Full System Check

```bash
system-diag
```

### Specific Checks

```bash
# CPU and load
system-diag cpu

# Memory
system-diag memory

# Disk
system-diag disk

# Network
system-diag network

# Services
system-diag services

# Docker
system-diag docker

# Logs
system-diag logs

# Security
system-diag security

# Summary only
system-diag summary
```

## Checks Performed

### CPU Check
- Load average (1, 5, 15 min)
- CPU usage per core
- Top CPU processes

### Memory Check
- Total/used/free memory
- Swap usage
- Top memory processes
- OOM killer activity (dmesg)

### Disk Check
- Disk usage per mount
- Inode usage
- I/O wait
- Largest directories

### Network Check
- Network
 interfaces- Active connections
- DNS resolution
- Latency to common hosts

### Services Check
- Failed systemd services
- Running services
- Port bindings

### Docker Check
- Running containers
- Container resource usage
- Docker daemon status

### Log Check
- Recent errors in syslog
- Last boot errors
- Application errors

### Security Check
- Failed SSH logins
- Open ports
- SELinux/AppArmor status
- Firewall status

## Examples

### Quick health summary

```bash
system-diag summary
```

### Investigate high load

```bash
system-diag cpu
system-diag memory
```

### Check disk space

```bash
system-diag disk
```

### Network troubleshooting

```bash
system-diag network
```

### Service issues

```bash
system-diag services
```

## Output Format

Results are color-coded:
- 🔴 **Critical** - Immediate attention needed
- 🟡 **Warning** - Should be addressed
- 🟢 **OK** - Normal
- 🔵 **Info** - Informational

## Notes

- Read-only diagnostics only
- No changes are made to the system
- Some checks require sudo (disk, logs)
- Works on Linux and macOS
