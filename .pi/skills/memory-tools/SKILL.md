---
name: memory-tools
description: Persistent memory storage for the agent. Store, recall, and forget information across sessions.
---

# Memory Tools

Persistent memory storage for the agent. Store important information, retrieve it later, and manage the knowledge base.

## Setup

No additional setup required. Uses a JSON file for storage.

## Usage

### Store Information

```bash
{baseDir}/memory-store.js "key" "value"
```

Store information with a key for later retrieval.

### Store with Metadata

```bash
{baseDir}/memory-store.js "key" "value" --tags "tag1,tag2" --category "category"
```

### Recall Information

```bash
{baseDir}/memory-recall.js "key"
```

Recall information by key.

### Search Memory

```bash
{baseDir}/memory-search.js "query"
```

Search memory for entries containing the query.

### List All Keys

```bash
{baseDir}/memory-list.js
```

List all stored memory keys.

### Forget Information

```bash
{baseDir}/memory-forget.js "key"
```

Remove a memory entry by key.

### Clear All Memory

```bash
{baseDir}/memory-clear.js --confirm
```

Clear all stored memories (requires --confirm flag).

## Options

| Command | Option | Description |
|---------|--------|-------------|
| store | `--tags` | Comma-separated tags |
| store | `--category` | Category for organization |
| store | `--ttl` | Time to live in seconds (default: never) |
| recall | `--json` | Output as JSON |
| search | `--limit` | Maximum results (default: 10) |
| clear | `--confirm` | Required flag to confirm clearing |

## Storage

Memory is stored in `~/.thepopebot/memory.json`.

## Use Cases

- Remember user preferences
- Store API keys or configurations
- Keep track of important context
- Build a knowledge base
- Cache frequently accessed data
