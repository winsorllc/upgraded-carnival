---
name: cron-manager
description: Manage cron jobs - list, add, remove, and enable/disable scheduled tasks.
---

# Cron Manager

Manage cron jobs for the agent. List scheduled jobs, add new ones, remove jobs, and enable/disable them.

## Setup

No additional setup required.

## Usage

### List All Cron Jobs

```bash
{baseDir}/cron-manager.js list
```

### Add a Cron Job

```bash
{baseDir}/cron-manager.js add "Daily Report" "0 9 * * *" --job "Generate daily report"
```

### Remove a Cron Job

```bash
{baseDir}/cron-manager.js remove "Daily Report"
```

### Enable/Disable a Job

```bash
{baseDir}/cron-manager.js enable "Daily Report"
{baseDir}/cron-manager.js disable "Daily Report"
```

### Show Next Run Times

```bash
{baseDir}/cron-manager.js next
```

## Options

| Command | Option | Description |
|---------|--------|-------------|
| add | `--job` | Task prompt for agent jobs |
| add | `--command` | Shell command for command jobs |
| add | `--type` | Type: `agent` (default), `command`, or `webhook` |
| add | `--enabled` | Set to `false` to create disabled |

## Cron Expression Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
* * * * *
```

Examples:
- `0 9 * * *` - Daily at 9am
- `0 9 * * 1-5` - Weekdays at 9am
- `*/15 * * * *` - Every 15 minutes
- `0 0 1 * *` - First of every month at midnight

## Configuration

Jobs are stored in `config/CRONS.json`.
