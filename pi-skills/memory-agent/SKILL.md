---
name: memory-agent
description: "Persistent semantic memory for storing, retrieving, and searching context across conversations. Use when: (1) user mentions something from a previous conversation, (2) you need to recall project context, preferences, or domain knowledge, (3) building persistent knowledge bases, (4) cross-session learning."
---

# Memory Agent

Persistent semantic memory system using SQLite + embeddings for storing and retrieving context across conversations.

## Setup

```bash
cd {baseDir}/scripts
npm install better-sqlite3
```

The memory database is stored at `~/.thepopebot/memory.db`.

## Usage

### Store a memory

```bash
{baseDir}/scripts/memory-store.js "store" "User prefers TypeScript over JavaScript for all new projects"
```

### Search memories

```bash
{baseDir}/scripts/memory-search.js "TypeScript preferences"
```

### List all memories

```bash
{baseDir}/scripts/memory-list.js
```

### Delete a memory

```bash
{baseDir}/scripts/memory-delete.js "<id from list>"
```

## Trigger Patterns

Use this skill when:
- User mentions "remember", "I told you before", "earlier we discussed"
- User asks "what do you know about X" or "do you remember"
- User provides preferences or context that should persist
- Building project-specific knowledge bases

## Storage Format

Memories are stored with:
- `id`: Unique identifier
- `content`: The memory text
- `created_at`: Timestamp
- `source`: Where the memory came from (e.g., "chat", "project")

## Best Practices

1. **Store key decisions**: "User wants feature X, don't suggest alternatives"
2. **Store preferences**: "Always use Tailwind, not CSS modules"
3. **Store context**: "This is a Next.js project with App Router"
4. **Store relationships**: "X is the lead developer, Y handles deployment"

## Notes

- No API keys needed - uses local SQLite storage
- Memories are NOT visible to the LLM by default - only retrieved when searched
- Keep memories concise and actionable
