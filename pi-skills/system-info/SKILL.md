---
name: system-info
description: Run comprehensive system diagnostics. Check system status, diagnose issues, analyze logs, check resource usage, and get recommendations for fixes. Inspired by ZeroClaw's doctor tool.
metadata:
  {
    "requires": { "bins": ["df", "free", "top"] }
  }
---

# System Info (Diagnostics)

Run comprehensive system diagnostics. Check system status, diagnose issues, analyze logs, check resource usage, and get recommendations for fixes.

## Trigger

Use this skill when:
- System is running slowly or behaving strangely
- Need to check resource usage (CPU, memory, disk)
- Want to diagnose errors or failures
- Need to check running processes
- Network connectivity issues
- Need system health report

## Quick Start

### Run full diagnostics

```bash
system-info diagnose
system-info --full
```

### Check specific subsystems

```bash
# CPU and memory
system-info resources

# Disk usage
system-info disk

# Network
system-info network

# Running processes
system-info processes

# System logs
system-info logs
```

## Diagnostic Categories

### Resources (CPU, Memory, Disk)

```bash
system-info resources
```

Shows:
- CPU usage per core
- Memory usage (used/free/available)
- Disk usage per mount point
- Load average
- Top memory/CPU processes

### Network

```bash
system-info network
```

Shows:
- Network interfaces and IPs
- Connection status
- DNS resolution
- Gateway connectivity
- Open ports

### Processes

```bash
system-info processes
system-info processes --sort cpu
system-info processes --sort memory
```

Shows:
- Top processes by CPU/memory
- Zombie processes
- High resource consumers

### Disk

```bash
system-info disk
```

Shows:
- Disk usage per filesystem
- Inode usage
- Largest directories
- Disk I/O stats

### Logs

```bash
system-info logs
system-info logs --lines 100
system-info logs --pattern error
```

Shows:
- Recent system messages
- Error entries
- Custom pattern filtering

### Security

```bash
system-info security
```

Shows:
- Open ports
- Failed login attempts
- SELinux/AppArmor status
- Recent sudo commands

## Options

| Option | Description |
|--------|-------------|
| `--full` | Run all diagnostic checks |
| `--output <file>` | Save report to file |
| `--format text\|json` | Output format |
| `--lines <n>` | Number of log lines to show |
| `--pattern <regex>` | Filter logs by pattern |

## Output Example

```
=== System Diagnostics ===

CPU: 4 cores, 45% used
Memory: 8GB total, 5.2GB used (65%)
Disk: 50GB used (62%) on /
Load: 1.2, 0.8, 0.5

Network: eth0 up, 192.168.1.100
Processes: 142 running

Warnings:
- High memory usage (>65%)
- Disk usage above 60%

Recommendations:
- Consider restarting memory-intensive services
- Clean up old log files
```

## Use Cases

1. **Slow system** - Check CPU/memory/disk for bottlenecks
2. **Out of disk** - Find large files and directories
3. **Network issues** - Verify connectivity and DNS
4. **Crashes** - Check logs for error messages
5. **Security audit** - Review open ports and login attempts
6. **Health check** - Get overview of system status

## Tools Used

- `top`, `htop` - Process info
- `df`, `du` - Disk usage
- `free` - Memory info
- `netstat`, `ss` - Network info
- `dmesg`, `journalctl` - System logs
- `ps` - Process list
- `uptime` - System uptime

## Notes

- Requires standard Unix utilities
- Some checks may need root/sudo
- Network checks require connectivity
