---
name: health-check
description: System health monitoring and diagnostics. Use when: (1) checking system resources (CPU, memory, disk), (2) monitoring service health and uptime, (3) running health checks on endpoints, (4) alerting on service failures.
---

# Health Check Skill

System health monitoring and diagnostics for servers, containers, and services.

## When to Use

✅ **USE this skill when:**
- Checking CPU, memory, disk usage
- Monitoring service health and uptime
- Running health checks on HTTP endpoints
- Detecting failing services
- Creating health monitoring dashboards
- Alerting on resource thresholds

❌ **DON'T use this skill when:**
- Deep system debugging → use system-doctor skill
- Performance profiling → use specialized tools

## Setup

```bash
# Install dependencies (if needed)
# Most tools are built-in (ps, df, free, curl)
```

## Common Commands

### System Resources

```bash
# Quick CPU and memory overview
health-check.js system

# Detailed system info
health-check.js system --json

# Disk usage
health-check.js disk

# Disk usage for specific path
health-check.js disk /home
```

### Service Health

```bash
# Check if a service is running
health-check.js service nginx

# Check multiple services
health-check.js service nginx mysql redis

# Check service status (systemd)
health-check.js service nginx --systemd
```

### HTTP Endpoints

```bash
# Basic health check
health-check.js endpoint https://example.com/health

# Check with custom expected status
health-check.js endpoint https://api.example.com/health --expected 200

# Check response time
health-check.js endpoint https://example.com --timing
```

### Docker Containers

```bash
# List container health
health-check.js docker

# Check specific container
health-check.js docker nginx
```

### Process Monitoring

```bash
# Top processes by CPU
health-check.js top --cpu

# Top processes by memory
health-check.js top --mem

# Find process by name
health-check.js process nginx
```

### Network

```bash
# Check port availability
health-check.js port 80

# Check multiple ports
health-check.js port 80 443 3000

# Check if host is reachable
health-check.js ping example.com
```

### Comprehensive Health

```bash
# Full system health report
health-check.js report

# Quick status summary
health-check.js status
```

## Scripting Examples

### Monitor multiple endpoints

```bash
#!/bin/bash
ENDPOINTS=(
    "https://api.example.com/health"
    "https://admin.example.com/health"
    "https://cdn.example.com/health"
)

for url in "${ENDPOINTS[@]}"; do
    result=$(health-check.js endpoint "$url" --json)
    status=$(echo "$result" | jq -r '.status')
    if [ "$status" != "ok" ]; then
        echo "ALERT: $url is down!"
    fi
done
```

### Alert on high resource usage

```bash
#!/bin/bash
THRESHOLD=90

cpu=$(health-check.js system --json | jq -r '.cpu.usage')
mem=$(health-check.js system --json | jq -r '.memory.usage')

if [ "$cpu" -gt "$THRESHOLD" ]; then
    echo "ALERT: CPU at ${cpu}%"
fi

if [ "$mem" -gt "$THRESHOLD" ]; then
    echo "ALERT: Memory at ${mem}%"
fi
```

### Wait for service to be ready

```bash
#!/bin/bash
# Wait for endpoint to be healthy
for i in {1..30}; do
    if health-check.js endpoint https://api.example.com/health --quiet; then
        echo "Service is ready!"
        exit 0
    fi
    sleep 2
done
echo "Service failed to become ready"
exit 1
```

## Output Formats

- Default: Human-readable colored output
- `--json`: JSON output for scripting
- `--quiet`: Exit code only (0 = healthy, 1 = unhealthy)
- `--timing`: Include response time metrics

## Thresholds

Default thresholds:
- CPU: 80% warning, 90% critical
- Memory: 80% warning, 90% critical  
- Disk: 85% warning, 95% critical
- HTTP response time: 5s warning, 10s critical

## Notes

- Uses built-in system tools (ps, df, free, etc.)
- Docker commands require Docker CLI
- HTTP checks follow redirects by default
- All checks are read-only (no mutations)
