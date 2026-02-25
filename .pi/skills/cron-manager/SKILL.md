---
name: cron-manager
description: Manage scheduled tasks and cron jobs. Create, list, update, remove, and validate cron jobs. Inspired by ZeroClaw, OpenClaw, and thepopebot cron systems.
---

# Cron Manager

Manage scheduled tasks with cron expressions. Similar to crontab but with JSON configuration and validation.

## Capabilities

- List current cron jobs
- Validate cron expressions
- Test when a job will run
- Generate cron expressions
- Check cron job health

## Usage

```bash
# List all cron jobs
/job/.pi/skills/cron-manager/cron-list.js --config /job/config/CRONS.json

# Validate a cron expression
/job/.pi/skills/cron-manager/cron-validate.js "0 9 * * *"

# Test when a job will run next
/job/.pi/skills/cron-manager/cron-next.js "0 */4 * * *"

# Generate cron expression from description
/job/.pi/skills/cron-manager/cron-build.js "every 4 hours on weekdays"
```

## Cron Expression Format

Standard Unix crontab format:
```
# ┌───────────── minute (0 - 59)
# │ ┌───────────── hour (0 - 23)
# │ │ ┌───────────── day of month (1 - 31)
# │ │ │ ┌───────────── month (1 - 12)
# │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
# │ │ │ │ │
# * * * * * command
```

## Examples

| Expression | Description |
|------------|-------------|
| `0 9 * * *` | Daily at 9am |
| `*/15 * * * *` | Every 15 minutes |
| `0 */4 * * *` | Every 4 hours |
| `0 0 * * 0` | Weekly on Sunday |
| `0 9 * * 1-5` | Weekdays at 9am |