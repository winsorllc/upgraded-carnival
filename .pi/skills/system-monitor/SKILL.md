---
name: system-monitor
description: Comprehensive system health monitoring with CPU, memory, disk, network stats and alerting. Inspired by ZeroClaw heartbeat system.
---

# System Monitor Skill

Comprehensive system health monitoring with real-time metrics, alerting, and automated actions. Inspired by ZeroClaw's heartbeat system.

## Setup

No additional setup required. Uses Node.js built-in modules and system commands.

## Usage

### Get current system status

```bash
{baseDir}/system-monitor.js status
```

### Get detailed CPU information

```bash
{baseDir}/system-monitor.js cpu
```

### Get memory information

```bash
{baseDir}/system-monitor.js memory
```

### Get disk usage

```bash
{baseDir}/system-monitor.js disk
```

### Get network statistics

```bash
{baseDir}/system-monitor.js network
```

### Get process list

```bash
{baseDir}/system-monitor.js processes --limit 10
```

### Run health check with thresholds

```bash
{baseDir}/system-monitor.js health --cpu 90 --memory 85 --disk 95
```

### Start monitoring daemon

```bash
{baseDir}/system-monitor.js monitor --interval 30 --cpu 90 --memory 85
```

### Run diagnostics

```bash
{baseDir}/system-monitor.js doctor
```

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `--interval` | Monitoring interval (seconds) | 60 |
| `--cpu` | CPU alert threshold (%) | 90 |
| `--memory` | Memory alert threshold (%) | 85 |
| `--disk` | Disk alert threshold (%) | 95 |
| `--limit` | Process list limit | 20 |

## Alert Actions

When thresholds are exceeded, the monitor can:
- Log warnings to console
- Send notifications (via notification-hub skill)
- Execute custom commands
- Write to status file

## Health Indicators

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| CPU Usage | < 70% | 70-90% | > 90% |
| Memory Usage | < 75% | 75-85% | > 85% |
| Disk Usage | < 80% | 80-95% | > 95% |
| Load Average | < CPU cores | CPU-CPU×2 | > CPU×2 |

## Example Use Cases

- Background health monitoring for servers
- Resource alerting for containers
- Process management and diagnostics
- Daily health snapshots
