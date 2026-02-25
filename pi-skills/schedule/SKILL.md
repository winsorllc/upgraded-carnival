---
name: schedule
description: Schedule and manage one-time or recurring tasks. Use when you need to schedule commands to run at specific times, after delays, or on a recurring basis.
metadata:
  {
    "requires": { "bins": ["at", "cron"] }
  }
---

# Schedule

Schedule and manage one-time or recurring tasks. Use this skill to schedule commands to run at specific times, after delays, or on a recurring basis.

## Trigger

Use this skill when:
- User wants to schedule a task for later
- Need to run a command after a delay
- Need recurring scheduled tasks
- Need to view or cancel scheduled jobs

## One-Time Scheduling

### Schedule a command to run once

```bash
# Run a command at a specific time
schedule at "14:30" "backup.sh"

# Run a command tomorrow at a specific time
schedule at "tomorrow 10:00" "sync.sh"

# Run a command in X minutes/hours
schedule in "30 minutes" "cleanup.sh"
schedule in "2 hours" "report.sh"

# Run on a specific date
schedule at "2026-03-01 09:00" "monthly-task.sh"
```

### List scheduled one-time jobs

```bash
schedule list
schedule atq
```

### Cancel a scheduled job

```bash
schedule cancel <job-id>
schedule atrm <job-id>
```

## Recurring Scheduling (Cron)

### Quick cron expressions

```bash
# Every minute
schedule cron "* * * * *" "log-stats.sh"

# Every hour
schedule cron "0 * * * *" "hourly-task.sh"

# Every day at midnight
schedule cron "0 0 * * *" "daily-backup.sh"

# Every Monday at 9am
schedule cron "0 9 * * 1" "weekly-report.sh"

# Every month on the 1st
schedule cron "0 0 1 * *" "monthly-task.sh"
```

### Common Cron Patterns

| Pattern | Meaning |
|---------|---------|
| `* * * * *` | Every minute |
| `0 * * * *` | Every hour |
| `0 0 * * *` | Daily at midnight |
| `0 0 * * 0` | Weekly on Sunday |
| `0 0 1 * *` | Monthly on 1st |
| `*/5 * * * *` | Every 5 minutes |
| `0 9-17 * * *` | Every hour from 9am-5pm |

## Script Interface

### Schedule command

```bash
# One-time with 'at'
schedule add "echo 'Hello'" --at "tomorrow 10:00"

# Recurring with 'cron'
schedule add "./script.sh" --cron "0 * * * *"

# With output logging
schedule add "./backup.sh" --cron "0 0 * * *" --log /var/log/backup.log
```

### List scheduled

```bash
schedule list
schedule atq       # one-time jobs
crontab -l         # recurring jobs
```

### Remove scheduled

```bash
schedule remove <id>
crontab -r         # remove all cron jobs
```

## Configuration

### Working Directory

By default, jobs run in the current working directory. Specify a different directory:

```bash
schedule add "npm run build" --cron "0 0 * * *" --dir /path/to/project
```

### Environment Variables

Pass environment variables to scheduled jobs:

```bash
schedule add "echo $MY_VAR" --cron "0 * * * *" --env "MY_VAR=value"
```

### Output Logging

```bash
# Log stdout and stderr
schedule add "./script.sh" --cron "0 * * * *" --log /path/to/logfile

# Log only errors
schedule add "./script.sh" --cron "0 * * * *" --log /path/to/logfile --errors-only
```

## Permissions

- **at** scheduling requires `at` daemon running and user in `at.allow`
- **cron** scheduling requires `cron` daemon running

### Check permissions

```bash
schedule check-permissions
```

### Install missing (Linux)

```bash
sudo apt install at cron
sudo systemctl enable cron
sudo systemctl start cron
```

## Examples

### Backup database every night at 2am

```bash
schedule add "/usr/local/bin/backup-db.sh" --cron "0 2 * * *" --log /var/log/backup.log
```

### Send reminder in 30 minutes

```bash
schedule in "30 minutes" "notify-send 'Meeting in 30 minutes'"
```

### Weekly report every Friday at 5pm

```bash
schedule add "./generate-report.sh" --cron "0 17 * * 5" --dir /opt/reports
```

## Notes

- Scheduled jobs run in the background
- Check job output in logs after execution
- Use absolute paths for commands and files
- Set appropriate environment variables for scripts
