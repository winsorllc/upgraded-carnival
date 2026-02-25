---
name: agent-memory
description: Persistent long-term memory for the agent. Store facts, preferences, and context that the agent can recall across jobs and sessions. Uses categories: 'core' (permanent facts), 'daily' (session notes), 'conversation' (chat context).
metadata:
  {
    "emoji": "🧠",
    "requires": { "bins": ["sqlite3"] },
  }
---

# Agent Memory Skill

This skill gives the agent a persistent long-term memory system. It can store important facts, user preferences, project context, and retrieve them later when relevant.

## Capabilities

The agent has access to two tools:

### 1. memory_store

Store information in long-term memory with categories for organization.

**Parameters:**
- `key` (required): Unique identifier for this memory (e.g., 'user_prefers_dark_mode', 'project_api_endpoint')
- `content` (required): The information to remember
- `category` (optional): Memory category - 'core' (permanent facts), 'daily' (session notes), 'conversation' (chat context). Default: 'core'

**Example:**
```
Tool: memory_store
Parameters: {"key": "user_timezone", "content": "User lives in Pacific Time (UTC-8)", "category": "core"}
```

### 2. memory_recall

Search and retrieve memories by keyword or phrase.

**Parameters:**
- `query` (required): Keywords or phrase to search for
- `limit` (optional): Maximum results to return (default: 5)

**Example:**
```
Tool: memory_recall
Parameters: {"query": "user preferences", "limit": 3}
```

## CLI Usage

This skill provides a command-line tool that the agent can invoke:

```bash
# Store a memory
node /job/.pi/skills/agent-memory/memory-tool.js store <key> <content> [category]

# Recall memories by query
node /job/.pi/skills/agent-memory/memory-tool.js recall <query> [limit]

# List all memories (optionally by category)
node /job/.pi/skills/agent-memory/memory-tool.js list [category] [limit]

# Delete a memory by key
node /job/.pi/skills/agent-memory/memory-tool.js delete <key>
```

**Examples:**

```bash
# Store user preference (permanent)
node memory-tool.js store user_timezone "Pacific Time (UTC-8)" core

# Store session note (temporary)
node memory-tool.js store session_goal "Fix authentication bug" daily

# Store conversation context
node memory-tool.js store meeting_notes "Discussed API redesign" conversation

# Search memories
node memory-tool.js recall user
node memory-tool.js recall project 3

# List all memories
node memory-tool.js list
node memory-tool.js list core

# Delete a memory
node memory-tool.js delete user_timezone
```

## Storage Location

Memories are stored in `/job/data/memory.sqlite` - a local SQLite database that persists across all agent jobs.
