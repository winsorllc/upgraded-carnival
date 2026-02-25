---
name: cron-advanced
description: Enhanced cron management with pause/resume, task history, and scheduled job monitoring. Inspired by ZeroClaw cron system with add-every, add-at, pause, and resume capabilities.
---

# Cron Advanced

Enhanced cron system with pause/resume, history, and monitoring.

## Features

- **list**: View all scheduled tasks
- **add**: Add cron schedule
- **add-at**: Add one-time task at specific time
- **add-every**: Add recurring task with interval
- **remove**: Remove scheduled task
- **pause**: Pause a task
- **resume**: Resume a paused task
- **history**: View task execution history
- **run-now**: Execute task immediately

## Usage

```bash
# List all tasks
./scripts/cron-adv.js --command list

# Add standard cron
./scripts/cron-adv.js --command add --name backup --schedule "0 2 * * *" --command "./backup.sh"

# Add one-time at specific time
./scripts/cron-adv.js --command add-at --name reminder --time "2026-02-25T14:00:00Z" --command "notify"

# Add every N minutes
./scripts/cron-adv.js --command add-every --name check --interval 300 --command "./check.sh"

# Pause task
./scripts/cron-adv.js --command pause --id task-001

# Resume task
./scripts/cron-adv.js --command resume --id task-001

# View history
./scripts/cron-adv.js --command history --id task-001

# Run now
./scripts/cron-adv.js --command run-now --id task-001
```

## Examples

| Task | Command |
|------|---------|
| List tasks | `cron-adv.js --command list` |
| Daily backup | `cron-adv.js --add --name backup --schedule "0 2 * * *" --command backup.sh` |
| Every 5 min | `cron-adv.js --add-every --name check --interval 300 --command check.sh` |
| One-time | `cron-adv.js --add-at --name once --time "2026-02-25T14:00:00Z" --command notify` |
| Pause | `cron-adv.js --pause --id task-001` |
| History | `cron-adv.js --history --id task-001` |
| Run now | `cron-adv.js --run-now --id task-001` |

## Notes

- Schedules use standard cron syntax
- Task state: active, paused, completed, failed
- History saved to `.cron/history/`
- Supports environment variables in commands