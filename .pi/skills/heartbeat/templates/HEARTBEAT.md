# Heartbeat Configuration

This file configures the agent's self-monitoring heartbeat system.
Each line starting with `-` defines a periodic task.

## Health Checks

- health: Check disk space, memory, and job status every 30 minutes
- health: Full system diagnosis every hour

## Status Reports

- report: Generate daily summary at 9 AM
- report: Weekly statistics every Monday at 8 AM

## Maintenance Tasks

- maintenance: Archive old logs every Sunday at 2 AM
- maintenance: Clean up temporary files every day at 3 AM

## Custom Tasks

- custom: Check for updates every day at 10 AM

## Available Heartbeat Types

| Type | Description |
|------|-------------|
| health | Check system health (disk, memory, jobs) |
| report | Generate status reports |
| maintenance | Run cleanup and archival |
| custom | User-defined actions |

## Interval Formats

- `30s` - 30 seconds
- `5m` - 5 minutes
- `1h` - 1 hour
- `1d` - 1 day
- `1w` - 1 week

You can also use natural language:
- "every 30 minutes"
- "every hour"
- "every day at 9 AM"
- "every Sunday at 2 AM"