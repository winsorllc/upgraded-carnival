---
name: session-manager
description: Manage conversation sessions with persistence, pruning, and context management for long-running agent interactions.
---

# Session Manager Skill

Manage conversation sessions with persistence, pruning, and context management. Inspired by OpenClaw's session model with main sessions, group isolation, and activation modes.

## Setup

No additional setup required. Sessions are stored in SQLite database.

## Usage

### Create a new session

```bash
{baseDir}/session-manager.js create "My Task"
```

### List all sessions

```bash
{baseDir}/session-manager.js list
```

### Resume a session

```bash
{baseDir}/session-manager.js resume <session-id>
```

### Add message to session

```bash
{baseDir}/session-manager.js add <session-id> user "Hello, assistant!"
```

### Get session history

```bash
{baseDir}/session-manager.js history <session-id>
```

### Search sessions

```bash
{baseDir}/session-manager.js search "keyword"
```

### Prune old sessions

```bash
{baseDir}/session-manager.js prune --older-than 30d
```

### Delete a session

```bash
{baseDir}/session-manager.js delete <session-id>
```

### Get session statistics

```bash
{baseDir}/session-manager.js stats
```

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `--older-than` | Prune sessions older than (e.g., 30d, 7d) | - |
| `--limit` | Maximum results | 50 |

## Session Features

- **Persistence**: Sessions survive restarts
- **Search**: Full-text search across sessions
- **Pruning**: Auto-delete old sessions
- **Statistics**: Track session usage
- **Context**: Maintain conversation history

## Session Metadata

Each session tracks:
- ID, title, created/updated timestamps
- Message count, token estimate
- Starred/favorite status
- Active/inactive state

## Example Use Cases

- Long-running multi-turn conversations
- Task-specific session isolation
- Conversation history search
- Memory-efficient session cleanup
