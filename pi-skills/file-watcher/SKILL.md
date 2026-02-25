---
name: file-watcher
description: "Watch files and directories for changes. Execute commands on change. Support for create, modify, delete events. No API key required."
---

# File Watcher Skill

Monitor files and directories for changes and trigger actions when changes occur.

## When to Use

✅ **USE this skill when:**

- "Watch for file changes"
- "Run command when file changes"
- "Monitor directory for new files"
- "Execute script on file create"
- "Watch multiple files for changes"

## When NOT to Use

❌ **DON'T use this skill when:**

- One-time file check → use test/read commands
- Scheduled monitoring → use cron
- Need persistent logging → use dedicated monitoring

## Commands

### Watch Directory

```bash
{baseDir}/watch.sh <directory> --command "echo 'Changed'"
{baseDir}/watch.sh ./src --command "npm run build"
{baseDir}/watch.sh ./logs --command "./process.sh" --pattern "*.log"
```

### Watch Single File

```bash
{baseDir}/watch.sh --file config.json --command "echo 'Config changed'"
{baseDir}/watch.sh --file /var/log/app.log --command "tail -5 /var/log/app.log"
```

### Watch Multiple Files

```bash
{baseDir}/watch.sh --files "file1.txt,file2.txt,file3.txt" --command "echo 'Changed'"
{baseDir}/watch.sh --files-from list.txt --command "echo 'Changed'"
```

### Event Types

```bash
{baseDir}/watch.sh ./src --command "make" --events create,modify,delete
{baseDir}/watch.sh ./src --command "make" --events create
{baseDir}/watch.sh ./src --command "make" --events modify
```

### Background Mode

```bash
{baseDir}/watch.sh ./src --command "make" --daemon
{baseDir}/watch.sh ./src --command "make" --pidfile /tmp/watcher.pid
```

### Debounce

```bash
{baseDir}/watch.sh ./src --command "npm run build" --debounce 2
{baseDir}/watch.sh ./src --command "npm run build" --debounce-file
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--command CMD` | Command to run on change | Required |
| `--file FILE` | Watch single file | None |
| `--files "F1,F2,..."` | Watch multiple files | None |
| `--files-from FILE` | Read file list from file | None |
| `--pattern GLOB` | File pattern to match | `*` |
| `--events TYPES` | Events: create,modify,delete | all |
| `--recursive` | Watch subdirectories | true |
| `--no-recursive` | Don't recurse | false |
| `--debounce SECS` | Debounce time | 0 |
| `--debounce-file` | Debounce per file | false |
| `--daemon` | Run in background | false |
| `--pidfile FILE` | PID file for daemon | None |
| `--timeout SECS` | Stop after N seconds | None |
| `--quiet` | Suppress output | false |
| `--verbose` | Show all events | false |

## Events

| Event | Description |
|-------|-------------|
| `create` | File or directory created |
| `modify` | File content modified |
| `delete` | File or directory deleted |
| `move` | File moved (renamed) |
| `access` | File accessed (read) |
| `attrib` | File attributes changed |

## Output Format

```
[2026-02-25 20:41:00] MODIFY /path/to/file.txt
Running: echo 'Changed'
...
[2026-02-25 20:41:01] CREATE /path/to/newfile.txt
Running: echo 'Changed'
...
```

With `--json`:
```json
{"event": "MODIFY", "file": "/path/to/file.txt", "timestamp": "2026-02-25T20:41:00Z", "command_output": "..."}
```

## Examples

**Watch and rebuild:**
```bash
{baseDir}/watch.sh ./src --command "npm run build" --debounce 1
```

**Watch for new log files:**
```bash
{baseDir}/watch.sh ./logs --command "./new-log.sh" --events create
```

**Watch config and restart:**
```bash
{baseDir}/watch.sh --file config.json --command "pm2 restart app"
```

**Watch multiple files:**
```bash
{baseDir}/watch.sh --files "config.json,.env,package.json" --command "npm run build"
```

**Watch in background:**
```bash
{baseDir}/watch.sh ./src --command "make" --daemon --pidfile /tmp/watcher.pid
```

**Watch for deleted files:**
```bash
{baseDir}/watch.sh ./uploads --command "echo 'File deleted'" --events delete
```

## Debouncing

The `--debounce` option prevents rapid-fire commands:

- `--debounce N`: Wait N seconds after the last event before running the command
- `--debounce-file`: Track debounce per file independently

```bash
# Wait 2 seconds after last change
{baseDir}/watch.sh ./src --command "build.sh" --debounce 2

# Debounce per file (each file gets its own timer)
{baseDir}/watch.sh ./src --command "process.sh" --debounce-file --debounce 1
```

## Notes

- Uses inotifywait (Linux) or fswatch (macOS) when available
- Falls back to polling on systems without native support
- Command receives `$FILE` and `$EVENT` environment variables
- Recursive by default for directories
- Can watch thousands of files efficiently
- Clean shutdown with SIGTERM or SIGINT

## Dependencies

- Linux: `inotifywait` (inotify-tools package)
- macOS: `fswatch` (brew install fswatch)
- Both: Polling fallback with 1-second interval