---
name: file-watcher
description: Watch files and directories for changes. Automatically trigger actions when files are created, modified, or deleted. Inspired by ZeroClaw's trait-driven architecture and OpenClaw's automation tools.
---

# File Watcher

Monitor files and directories for changes with automatic action triggers.

## Capabilities

- Watch files for changes (create, modify, delete, move)
- Run commands when changes are detected
- Throttle notifications to prevent spam
- Multiple watchers can run simultaneously
- JSON output for programmatic use

## Usage

```bash
# Watch a file for changes
/job/.pi/skills/file-watcher/watcher.js watch /path/to/file.txt --action "echo 'File changed!'"

# Watch a directory recursively
/job/.pi/skills/file-watcher/watcher.js watch /path/to/dir --recursive --action "echo 'Directory changed!'"

# Watch with custom throttle (milliseconds)
/job/.pi/skills/file-watcher/watcher.js watch /path/to/file.txt --throttle 1000 --action "echo 'Changed!'"

# List active watchers
/job/.pi/skills/file-watcher/watcher.js list

# Stop a watcher
/job/.pi/skills/file-watcher/watcher.js stop <watcher-id>

# Stop all watchers
/job/.pi/skills/file-watcher/watcher.js stop-all
```

## Output Format

```json
{
  "id": "watcher-uuid",
  "path": "/path/to/file",
  "event": "modify",
  "timestamp": "2026-02-25T10:00:00.000Z"
}
```

## Notes

- Uses Node.js fs.watch for efficient file system monitoring
- Throttle prevents rapid-fire triggers on bulk changes
- Action command receives event details via environment variables
- Storage file keeps track of active watchers in /tmp/file-watchers.json