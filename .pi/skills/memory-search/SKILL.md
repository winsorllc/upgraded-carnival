---
name: memory-search
description: Store and retrieve agent memories across jobs. Enables long-term context, learning from past interactions, and building agent knowledge bases. Based on OpenClaw's memory-core architecture.
---

# Memory Search Skill

File-backed memory system that allows PopeBot agents to store, search, and retrieve memories across jobs. Inspired by OpenClaw's memory-core plugin.

## When to Activate

Activate this skill when:

- You need to remember information across multiple jobs
- You want to build a knowledge base that persists between sessions
- You need to search past conversations or decisions
- You're building agents that learn from experience
- The user asks to "remember" something or "search memories"

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  PopeBot Agent                                           │
│  "Remember this pattern" / "What did we learn about X?" │
└─────────────────────┬───────────────────────────────────┘
                      │ Tool calls
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Memory Search Skill                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ memory_store │  │ memory_search│  │ memory_get   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│         └─────────────────┼─────────────────┘           │
│                           ▼                             │
│              ┌────────────────────────┐                │
│              │  File-based Index      │                │
│              │  - memories/index.json │                │
│              │  - memories/{id}.json  │                │
│              └────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

## Commands

Via the `memory` CLI or tool calls:

### Store a Memory

```bash
# Store with automatic tagging
memory store "The user prefers TypeScript over JavaScript for new projects"

# Store with custom tags
memory store "API rate limit is 100 requests/minute" --tags api,limits,rate-limiting

# Store with metadata
memory store "Database connection uses SSL on production" --category infrastructure --priority high
```

### Search Memories

```bash
# Full-text search
memory search "TypeScript configuration"

# Search by tag
memory search --tag api

# Search by category
memory search --category infrastructure

# Combined search
memory search "rate limit" --tag api --limit 5

# Search with date range
memory search "deployment" --after 2026-01-01 --before 2026-02-25
```

### Get Specific Memory

```bash
# Get by ID
memory get mem_abc123

# Get recent memories
memory recent --count 10

# Get memories by tag
memory tagged api,limits
```

### List/Delete Memories

```bash
# List all memories
memory list

# List with filters
memory list --tag api --category infrastructure

# Delete a memory
memory delete mem_abc123

# Delete by tag
memory delete --tag obsolete

# Clear all memories (confirmation required)
memory clear --confirm
```

## Tool Calls (Agent Integration)

The skill exposes these tool calls for the Pi agent:

```
memory_store(content, tags, category, priority)
  - Store a new memory
  - content: string (required) - The memory content
  - tags: string[] (optional) - Tags for categorization
  - category: string (optional) - Category name
  - priority: string (optional) - 'low', 'medium', 'high' (default: 'medium')
  - Returns: { success: true, id: 'mem_abc123', timestamp: '2026-02-25T15:00:00Z' }

memory_search(query, tags, category, limit, after, before)
  - Search memories
  - query: string (optional) - Full-text search query
  - tags: string[] (optional) - Filter by tags
  - category: string (optional) - Filter by category
  - limit: number (optional) - Max results (default: 10)
  - after: string (optional) - ISO date filter
  - before: string (optional) - ISO date filter
  - Returns: { success: true, results: [{ id, content, tags, category, priority, timestamp, relevance }], total: number }

memory_get(id)
  - Get a specific memory by ID
  - id: string (required)
  - Returns: { success: true, memory: { id, content, tags, category, priority, timestamp, metadata } }

memory_recent(count)
  - Get recent memories
  - count: number (optional, default: 10)
  - Returns: { success: true, memories: [...] }

memory_delete(id)
  - Delete a memory
  - id: string (required)
  - Returns: { success: true, deleted: 'mem_abc123' }

memory_list(tags, category, limit)
  - List memories with optional filters
  - tags: string[] (optional)
  - category: string (optional)
  - limit: number (optional, default: 50)
  - Returns: { success: true, memories: [...], total: number }
```

## File Structure

Memories are stored in `.pi/memories/`:

```
.pi/memories/
├── index.json           # Search index (tag → memory IDs, category → memory IDs)
├── mem_abc123.json      # Individual memory files
├── mem_def456.json
└── ...
```

### Memory File Format

```json
{
  "id": "mem_abc123",
  "content": "The user prefers TypeScript over JavaScript for new projects",
  "tags": ["preferences", "typescript", "languages"],
  "category": "user-preferences",
  "priority": "medium",
  "timestamp": "2026-02-25T15:00:00Z",
  "metadata": {
    "job_id": "job_abc123",
    "source": "agent",
    "version": 1
  }
}
```

### Index Format

```json
{
  "tags": {
    "typescript": ["mem_abc123", "mem_def456"],
    "api": ["mem_ghi789"]
  },
  "categories": {
    "user-preferences": ["mem_abc123"],
    "infrastructure": ["mem_ghi789"]
  },
  "created_at": "2026-02-25T15:00:00Z",
  "updated_at": "2026-02-25T16:30:00Z"
}
```

## Usage Examples

### Example 1: Remember User Preferences

```javascript
const memory = require('/job/.pi/skills/memory-search/memory.js');

// Store a preference
await memory.store({
  content: "User prefers concise responses with code examples",
  tags: ['preferences', 'communication-style'],
  category: 'user-preferences',
  priority: 'high'
});

// Later, retrieve preferences
const prefs = await memory.search({
  query: 'preferences',
  tags: ['communication-style']
});
```

### Example 2: Build Project Knowledge Base

```javascript
// Store discoveries during a job
await memory.store({
  content: "The API uses cursor-based pagination with 'next_cursor' field",
  tags: ['api', 'pagination', 'project-knowledge'],
  category: 'project-alpha',
  priority: 'medium'
});

await memory.store({
  content: "Database migrations are in /db/migrations, run with npm run migrate",
  tags: ['database', 'migrations', 'project-knowledge'],
  category: 'project-alpha',
  priority: 'high'
});

// Search for project knowledge
const knowledge = await memory.search({
  tags: ['project-knowledge'],
  category: 'project-alpha'
});
```

### Example 3: Learn from Past Mistakes

```javascript
// Store a lesson learned
await memory.store({
  content: "Do not use npm install --save, use npm install (saves by default in npm 5+)",
  tags: ['lessons-learned', 'npm', 'mistakes'],
  category: 'best-practices',
  priority: 'high'
});

// Before starting a new task, check for relevant lessons
const lessons = await memory.search({
  query: 'npm install',
  tags: ['lessons-learned']
});
```

### Example 4: Cross-Job Context

```javascript
// Job 1: Research phase
await memory.store({
  content: "Competitor analysis: Company X uses React, Company Y uses Vue",
  tags: ['research', 'competitive-analysis'],
  category: 'market-research',
  priority: 'medium'
});

// Job 2: Implementation phase (different job, same memory)
const research = await memory.search({
  tags: ['competitive-analysis'],
  category: 'market-research'
});
// Now the implementation agent knows the competitive landscape
```

## Configuration

Create `.pi/memories/config.json` (optional):

```json
{
  "maxMemories": 10000,
  "autoTag": true,
  "defaultCategory": "general",
  "defaultPriority": "medium",
  "searchRelevance": {
    "tagMatch": 3,
    "categoryMatch": 2,
    "contentMatch": 1
  },
  "retention": {
    "enabled": false,
    "deleteAfterDays": 90,
    "archiveAfterDays": 30
  }
}
```

## Search Algorithm

The search uses a simple relevance scoring system:

1. **Tag match**: +3 points per matching tag
2. **Category match**: +2 points if category matches
3. **Content match**: +1 point per matching word in content
4. **Priority boost**: high=+2, medium=+1, low=+0
5. **Recency bonus**: +0.1 points per day within last 7 days

Results are sorted by relevance score (descending).

## Installation

```bash
# Activate the skill
cd /job/.pi/skills
ln -s ../../pi-skills/memory-search memory-search

# Install dependencies
cd memory-search
npm install
```

## Dependencies

```json
{
  "natural": "^6.0.4",
  "node-fetch": "^3.3.2"
}
```

## Testing

```bash
# Run test suite
node /job/.pi/skills/memory-search/test.js

# Run integration test
node /job/.pi/skills/memory-search/test.js --integration
```

## When to Use

- Building agents that need long-term memory
- Projects spanning multiple jobs
- Learning from past mistakes and successes
- Storing user preferences
- Building knowledge bases
- Cross-session context sharing

## When NOT to Use

- Single-job tasks with no future relevance
- Storing sensitive credentials (use GitHub Secrets)
- Large binary data (use file storage instead)
- Real-time data that changes frequently

## Security Considerations

- Memories are stored in plaintext files (not encrypted)
- Do not store passwords, API keys, or sensitive data
- Memory files are included in git by default (can be gitignored)
- Consider adding `.pi/memories/` to `.gitignore` for sensitive projects

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Memory not found | Check memory ID format (mem_xxxxxx) |
| Search returns no results | Try broader query or check tag spelling |
| Index out of sync | Run `memory rebuild-index` |
| Memory file corrupted | Check JSON syntax in memory file |

## Future Enhancements

- [ ] Vector search with embeddings
- [ ] Memory compression/archiving
- [ ] Cross-agent memory sharing
- [ ] Memory expiration
- [ ] Memory versioning
- [ ] SQLite backend option

## Credits

Inspired by [OpenClaw's memory-core plugin](https://github.com/openclaw/openclaw/tree/main/extensions/memory-core). Reimplemented for PopeBot with enhanced search and CLI interface.
