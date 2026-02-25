---
name: system-monitor
description: Comprehensive system health monitoring with CPU, memory, disk, network stats and alerting. Inspired by ZeroClaw heartbeat system.
metadata:
  {
    "openclaw": {
      "emoji": "💓",
      "requires": { "platform": "linux" }
    }
  }
---

# System Monitor

Monitor system health and performance.

## Metrics

- **CPU**: Usage, load average, per-core stats
- **Memory**: Used, free, cached, swap
- **Disk**: Usage, I/O stats, mount points
- **Network**: Bandwidth, connections, interfaces
- **Processes**: Top consumers, zombie detection
- **Temperature**: CPU/system temps (if available)

## Usage

Quick status:

```bash
system-monitor status
system-monitor status --json
```

Detailed metrics:

```bash
system-monitor cpu
system-monitor memory
system-monitor disk
system-monitor network
```

Monitoring:

```bash
system-monitor watch          # Continuous monitoring
system-monitor alert --cpu 90 # Alert threshold
system-monitor history        # View past metrics
```

## Alerts

Configure thresholds:
- CPU usage: `--cpu N%`
- Memory: `--memory N%`
- Disk: `--disk N%`
- Load: `--load N`

Alerts can trigger:
- Console output
- Webhook notification
- Custom script

## Integration

Use with cron for periodic checks:
```bash
*/5 * * * * system-monitor status --json >> /var/log/monitor.log
```
