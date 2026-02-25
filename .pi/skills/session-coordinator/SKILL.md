---
name: session-coordinator
description: Coordinate across multiple work sessions. Track active sessions, send messages between sessions, and maintain session history. Inspired by ZeroClaw session and OpenClaw session tools.
---

# Session Coordinator

Manage and coordinate work across multiple agent sessions.

## Features

- **list**: View all active sessions
- **history**: Get session message history
- **send**: Send messages between sessions
- **spawn**: Create new child sessions
- **status**: Check session health and status

## Usage

```bash
# List all active sessions
./scripts/session-coord.js --command list

# Get session history
./scripts/session-coord.js --command history --session session-123

# Send message to another session
./scripts/session-coord.js --command send --to session-123 --message "Continue work on X"

# Create new session
./scripts/session-coord.js --command spawn --name "background-task-1"

# Check session status
./scripts/session-coord.js --command status
```

## Session States

- `active` - Currently running and processing
- `idle` - Running but waiting for input
- `paused` - Suspended, can be resumed
- `completed` - Task finished successfully
- `failed` - Task failed or error occurred

## Examples

| Task | Command |
|------|---------|
| List sessions | `session-coord.js --command list` |
| Session history | `session-coord.js --command history --session abc123` |
| Send message | `session-coord.js --command send --to def456 --msg "Hello"` |
| New session | `session-coord.js --command spawn --name "task"` |
| Check status | `session-coord.js --command status` |

## Notes

- Sessions stored in `.sessions/` directory
- Each session has isolated context
- Messages persisted for audit trail
- Supports parent-child session relationships