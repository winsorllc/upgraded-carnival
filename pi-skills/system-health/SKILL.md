---
name: system-health
description: "Run system health checks including CPU, memory, disk, and process status. Use when: user asks about system performance, needs diagnostics, or wants to check resource usage. No API key needed."
metadata:
  openclaw:
    emoji: "💻"
    requires:
      bins:
        - df
        - free
        - top
        - ps
        - uptime
---

# System Health Skill

Check system resource usage and health status.

## When to Use

✅ **USE this skill when:**

- User asks about system performance
- Need to check resource usage
- Diagnose slow performance
- Check disk space
- List running processes

## Commands

### CPU & Load

```bash
# System load average
uptime

# CPU info
cat /proc/cpuinfo | head -20

# Detailed CPU stats
mpstat 1 1 2>/dev/null || top -bn1 | head -15
```

### Memory

```bash
# Memory usage
free -h

# Memory details
cat /proc/meminfo | head -10

# Swap usage
swapon -s
```

### Disk

```bash
# Disk space (human readable)
df -h

# Disk usage by directory
du -sh /* 2>/dev/null | sort -hr | head -10

# Disk inodes
df -i
```

### Processes

```bash
# Top processes by CPU
ps aux --sort=-%cpu | head -15

# Top processes by memory
ps aux --sort=-%mem | head -15

# Running processes count
ps aux | wc -l

# Specific process check
ps aux | grep -E "node|python|docker" | head -10
```

### Network

```bash
# Network connections
ss -tunapl | head -20

# Listening ports
ss -ltnp

# Network interface stats
ip -s link
```

### System Info

```bash
# OS version
cat /etc/os-release

# Kernel version
uname -a

# System uptime
uptime -s
```

### Combined Health Check

```bash
#!/bin/bash
echo "=== System Health Check ==="
echo ""
echo "Uptime: $(uptime -p)"
echo ""
echo "=== Memory ==="
free -h | grep -E "Mem|Swap"
echo ""
echo "=== Disk ==="
df -h / | tail -1
echo ""
echo "=== Top CPU ==="
ps aux --sort=-%cpu | head -6 | tail -5
echo ""
echo "=== Top Memory ==="
ps aux --sort=-%mem | head -6 | tail -5
```

## Notes

- Different commands available on Linux vs macOS
- Use `htop` for interactive monitoring if available
- Check for resource-hungry processes first
