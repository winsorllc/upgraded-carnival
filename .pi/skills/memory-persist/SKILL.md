---
name: memory-persist
description: Persistent key-value memory storage for agents. Store and recall information across conversations and sessions. Use when you need the agent to remember facts, preferences, or data between interactions.
---

# Memory Persist Skill

This skill provides persistent key-value memory storage that survives across agent sessions and conversations.

## When to Use

- You need the agent to remember user preferences across sessions
- You want to store facts or information for later retrieval
- You're building a conversational agent with long-term memory
- You need to persist state between job executions

## Capabilities

- **memory_store**: Store a key-value pair in persistent memory
- **memory_recall**: Search and retrieve memories by query
- **memory_delete**: Remove a memory by key
- **memory_list**: List all stored memories
- **memory_clear**: Clear all memories

## Storage Location

Memories are stored in `~/.thepopebot/memory.json` (or `$HOME/.thepopebot/memory.json`)

## Usage Examples

```javascript
// Store a memory
memory_store('user_name', 'Alice')
// Returns: "Stored: user_name"

// Recall a memory
memory_recall('user')
// Returns: {"user_name": "Alice"}

// Search by value
memory_recall('Alice')
// Returns: {"user_name": "Alice"}

// Delete a memory
memory_delete('user_name')
// Returns: "Deleted: user_name"

// List all memories
memory_list()
// Returns: ["user_name", "favorite_color", ...]

// Clear all memories
memory_clear()
// Returns: "Cleared all memories"
```

## Features

- **Full-text search**: Both keys and values are searched
- **JSON persistence**: Data survives process restarts
- **Case-insensitive**: Search works regardless of case
- **Safe storage**: Invalid JSON is gracefully handled
