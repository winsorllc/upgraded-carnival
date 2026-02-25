---
name: file-watcher
description: Monitor files and directories for changes using chokidar. Use when you need to react to file modifications, watch for new uploads, or trigger actions on file events.
---

# File Watcher

Monitor files and directories for changes and trigger actions when modifications occur.

## Quick Start

```bash
/job/.pi/skills/file-watcher/watch.js /path/to/watch
```

## Usage

### Watch Directory
```bash
/job/.pi/skills/file-watcher/watch.js <path>
```

### Watch with Pattern
```bash
/job/.pi/skills/file-watcher/watch.js <path> --pattern "*.md"
```

### Watch with Command
```bash
/job/.pi/skills/file-watcher/watch.js <path> --on-change "echo 'File changed'"
```

### One-Shot Mode (exit after first change)
```bash
/job/.pi/skills/file-watcher/watch.js <path> --once
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--pattern` | * | Glob pattern to filter files |
| `--ignore` | node_modules,... | Paths to ignore |
| `--recursive` | true | Watch subdirectories |
| `--once` | false | Exit after first change |
| `--on-change` | null | Command to run on change |
| `--on-add` | null | Command to run on file add |
| `--on-unlink` | null | Command to run on file delete |
| `--timeout` | 100 | Timeout for batch changes (ms) |

## Events Monitored

- **add**: File created
- **change**: File modified
- **unlink**: File deleted
- **addDir**: Directory created
- **unlinkDir**: Directory deleted

## Output Format

Each event outputs JSON:
```json
{
  "event": "change",
  "path": "/path/to/file.txt",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "stats": {
    "size": 1234,
    "mtime": "2024-01-15T10:30:00.000Z"
  }
}
```

## Examples

```bash
# Watch markdown files
/job/.pi/skills/file-watcher/watch.js ./docs --pattern "*.md"

# Watch and run build command
/job/.pi/skills/file-watcher/watch.js ./src --on-change "npm run build"

# Watch once and exit
/job/.pi/skills/file-watcher/watch.js /tmp/uploads --once

# Watch for new JSON files
/job/.pi/skills/file-watcher/watch.js ./data --pattern "*.json" --on-add "./process-new-file.sh"

# Ignore node_modules
/job/.pi/skills/file-watcher/watch.js ./project --ignore "**/node_modules/**"
```

## Use Cases

- Auto-rebuild on source file changes
- Process uploaded files automatically
- Sync directories when files change
- Trigger notifications on important file updates
- Monitor log files for errors

## When to Use

- Need to react to file system changes
- Automated build/workflow triggers
- Monitoring upload directories
- File synchronization tasks
- Change detection and alerting
