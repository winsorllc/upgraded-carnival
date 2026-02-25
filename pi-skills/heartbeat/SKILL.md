---
name: heartbeat
description: Periodic self-monitoring and task execution based on HEARTBEAT.md. The agent reads this file and executes listed tasks on a schedule. Use when you need the agent to periodically check emails, review calendars, or perform routine maintenance tasks.
metadata:
  {
    "thepopebot":
      {
        "emoji": "💓",
        "os": ["linux", "darwin"],
        "requires": { "files": ["HEARTBEAT.md"] },
        "install": []
      }
  }
---

# Heartbeat Task Runner

The heartbeat system runs periodic background tasks defined in `HEARTBEAT.md`. It provides self-monitoring and scheduled maintenance capabilities.

## HEARTBEAT.md Format

Create a `HEARTBEAT.md` file in your workspace with tasks listed as bullet points:

```markdown
# Periodic Tasks

Add tasks below (one per line, starting with `- `). The agent will 
check this file on each heartbeat tick.

- Check my email for important messages
- Review calendar for upcoming events in the next 24 hours
- Check the weather forecast for my location
- Review recent GitHub notifications
- Clean up temporary files older than 7 days
- Check system health metrics
- Review recent logs for errors
```

## Configuration

### Environment Variables

- `HEARTBEAT_INTERVAL_MINUTES`: How often to run heartbeat (default: 15, min: 5)
- `HEARTBEAT_ENABLED`: Set to `false` to disable (default: `true`)
- `HEARTBEAT_FILE`: Path to heartbeat file (default: `HEARTBEAT.md`)

### Example Configuration

```bash
HEARTBEAT_INTERVAL_MINUTES=15
HEARTBEAT_ENABLED=true
HEARTBEAT_FILE=HEARTBEAT.md
```

## Usage

### Start Heartbeat Daemon

```bash
heartbeat start
```

### Run Heartbeat Once

```bash
heartbeat run
```

### Show Current Tasks

```bash
heartbeat tasks
```

### Add Task

```bash
heartbeat add "Check stock prices"
```

### Remove Task

```bash
heartbeat remove "Check stock prices"
```

### View Heartbeat History

```bash
heartbeat history
```

## How It Works

1. **Startup**: Heartbeat reads `HEARTBEAT.md` and parses tasks
2. **Interval**: Runs every 15 minutes (configurable)
3. **Execution**: Each task is executed as a simple agent job
4. **Results**: Task results are logged to `logs/heartbeat/`
5. **Persistence**: Execution history is stored in `data/heartbeat.json`

## Task Output

Each heartbeat task execution creates:
- A log entry with timestamp
- Success/failure status
- Output summary (truncated to 1000 chars)

## Notes

- Tasks should be simple, quick operations (under 5 minutes each)
- Failed tasks don't stop other tasks from running
- Duplicate task lines are ignored
- Lines starting with `#` are treated as comments
