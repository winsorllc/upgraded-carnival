---
name: cron-manager
description: "Schedule and manage cron jobs. Use when: user needs to create, list, remove, or test scheduled tasks."
---

# Cron Manager Skill

Schedule and manage cron jobs.

## When to Use

- Create new scheduled tasks
- List existing cron jobs
- Remove scheduled tasks
- Test cron expressions
- Convert human-readable schedules to cron

## Cron Basics

### Cron Expression Format
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
* * * * *
```

### Common Patterns

| Schedule | Cron | Description |
|----------|------|-------------|
| Every minute | `* * * * *` | Run every minute |
| Every hour | `0 * * * *` | Run at minute 0 of every hour |
| Daily at midnight | `0 0 * * *` | Run at midnight |
| Daily at 9am | `0 9 * * *` | Run at 9am |
| Weekly on Sunday | `0 0 * * 0` | Run at midnight Sunday |
| Monthly | `0 0 1 * *` | Run at midnight on 1st |
| Every 5 minutes | `*/5 * * * *` | Run every 5 minutes |
| Every 30 minutes | `*/30 * * * *` | Run every 30 minutes |

## Manage Cron Jobs

### List User Crontab
```bash
# List current crontab
crontab -l

# List for specific user
crontab -l -u username
```

### Add Cron Job
```bash
# Edit crontab
crontab -e

# Add from command line
(crontab -l 2>/dev/null; echo "0 9 * * * /path/to/script.sh") | crontab -
```

### Remove Cron Job
```bash
# Remove all crontabs
crontab -r

# Remove for specific user
crontab -r -u username
```

### Specific Operations

```bash
# Run job immediately (test)
/path/to/script.sh

# Check cron service status
systemctl status cron  # or crond

# View cron logs
journalctl -u cron     # systemd
tail -f /var/log/cron # other systems
```

## Cron Utilities

### Validate Cron Expression
```bash
# Using Python
python3 -c "
from croniter import croniter
import sys
if len(sys.argv) > 1:
    expr = sys.argv[1]
    if croniter.is_valid(expr):
        print('Valid cron expression')
        # Show next 5 runs
        cron = croniter(expr)
        for i in range(5):
            print(cron.get_next())
    else:
        print('Invalid cron expression')
"

# Using online tools or crontab.guru
curl -s "https://crontab.guru/0+9+*+*+*" 
```

### Human-Readable Conversion
```bash
# Using python-crontab
python3 -c "
from crontab import CronSitemap
c = CronSitemap('0 9 * * *')
print(c.human_readable)
"
```

## Script Examples

### Backup Script Schedule
```bash
# Add daily backup at 2am
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1") | crontab -
```

### Log Cleanup
```bash
# Clean logs older than 7 days, daily at 3am
(crontab -l 2>/dev/null; echo "0 3 * * * find /var/log -name '*.log' -mtime +7 -delete") | crontab -
```

### Health Check
```bash
# Check every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * curl -s https://example.com/health") | crontab -
```

## Special Characters

| Character | Meaning |
|-----------|---------|
| `*` | Any value |
| `,` | List (1,3,5) |
| `-` | Range (1-5) |
| `/` | Step (*/15 = every 15) |

## Notes

- Cron jobs run with user's default shell
- Use absolute paths for scripts
- Redirect output to log files
- Consider timezone (cron uses system TZ)
- Thepopebot uses `config/CRONS.json` for job scheduling
