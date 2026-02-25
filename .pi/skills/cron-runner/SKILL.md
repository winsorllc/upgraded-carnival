---
name: cron-runner
description: Manage and run cron jobs programmatically. Create, list, run, and schedule cron tasks.
---

# Cron Runner

Manage and run cron jobs programmatically. Create, list, execute, and schedule cron tasks with a simple API.

## Setup

No additional setup required. Uses system cron or file-based scheduling.

## Usage

### Add a Cron Job

```bash
{baseDir}/cron-runner.js --add --name "daily-backup" --schedule "0 2 * * *" --command "backup.sh"
```

### List Cron Jobs

```bash
{baseDir}/cron-runner.js --list
```

### Run a Cron Job Now

```bash
{baseDir}/cron-runner.js --run "daily-backup"
```

### Remove a Cron Job

```bash
{baseDir}/cron-runner.js --remove "daily-backup"
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--add` | Add a new cron job | No |
| `--name` | Job name | For add |
| `--schedule` | Cron schedule expression | For add |
| `--command` | Command to run | For add |
| `--list` | List all cron jobs | No |
| `--run` | Run a job immediately | No |
| `--remove` | Remove a cron job | No |
| `--enable` | Enable a disabled job | No |
| `--disable` | Disable a job without removing | No |

## Cron Schedule Format

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
- `0 2 * * *` - Daily at 2am
- `*/15 * * * *` - Every 15 minutes
- `0 9 * * 1-5` - Weekdays at 9am
- `0 0 1 * *` - First day of every month

## When to Use

- Scheduling recurring tasks
- Managing backup jobs
- Running periodic maintenance
- Creating custom scheduling logic
