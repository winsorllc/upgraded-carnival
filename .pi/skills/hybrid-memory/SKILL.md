---
name: hybrid-memory
description: Full-stack hybrid memory system with vector + keyword search. Stores embeddings in SQLite with FTS5 for BM25 keyword search and cosine similarity. Enables semantic memory recall for agents.
version: 1.0.0
author: PopeBot
---

# Hybrid Memory Skill

A self-contained hybrid memory system inspired by ZeroClaw's architecture. Combines vector embeddings (semantic search) with FTS5 keyword search (BM25 scoring) for powerful memory recall.

## Purpose

Give agents persistent memory with:
- **Semantic search** - Find memories by meaning, not just keywords
- **Keyword search** - Traditional BM25 text search via SQLite FTS5
- **Hybrid scoring** - Weighted combination of vector and keyword similarity
- **Zero external dependencies** - Pure SQLite + local embeddings

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Hybrid Memory                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Markdown   │  │   Chunker    │  │  Embedding API   │  │
│  │    Input     │ ─│>  (preserve  │─>│  (configurable)  │  │
│  │              │  │   headings)  │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│           │                                    │            │
│           ▼                                    ▼            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 SQLite Database                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐ │  │
│  │  │ memories    │  │fts5 memories│  │embedding_cache│ │  │
│  │  │(id,content, │  │(content,    │  │(hash,vector)  │ │  │
│  │  │ vector_blob)│  │  metadata)   │  │               │ │  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Hybrid Search Engine                     │  │
│  │         (cosine similarity + BM25 merge)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Setup

```bash
cd /job/.pi/skills/hybrid-memory
npm install
```

## Configuration

Set in your environment or `.env`:

```bash
# Required: OpenAI API key for embeddings (or use local embedding model)
OPENAI_API_KEY=sk-...

# Optional: Embedding model (default: text-embedding-3-small)
EMBEDDING_MODEL=text-embedding-3-small

# Optional: Vector weight in hybrid scoring (0-1, default: 0.7)
HYBRID_VECTOR_WEIGHT=0.7

# Optional: Database path (default: /job/data/hybrid-memory.db)
HYBRID_MEMORY_DB_PATH=/job/data/hybrid-memory.db
```

## Commands

### Initialize Database

```bash
memory-init
```

Creates SQLite database with:
- `memories` table (id, content, vector_blob, metadata, created_at)
- `memories_fts` FTS5 virtual table for full-text search
- `embedding_cache` table for LRU caching

### Store Memory

```bash
memory-store "Your memory content here" --tags project,meeting
memory-store -f /path/to/file.md --source "Documentation"
```

Options:
- `--tags` - Comma-separated tags for filtering
- `--source` - Source attribution
- `--id` - Custom memory ID

### Search Memories

```bash
# Semantic search (vector only)
memory-search "authentication middleware"

# Keyword search (BM25)
memory-search "authentication middleware" --mode keyword

# Hybrid search (default)
memory-search "authentication middleware" --mode hybrid

# With filters
memory-search "deployment" --tags production --limit 10
```

### Recall (Semantic + Contextual)

```bash
# Find most relevant memories for current context
memory-recall "How do I configure the database?"

# Top-K with threshold
memory-recall "error handling" --top-k 5 --threshold 0.7
```

### Memory Management

```bash
# List recent memories
memory-list --limit 20

# Delete memory
memory-delete <memory-id>

# Export memories
memory-export --format json > memories.json
memory-export --format markdown > memories.md

# Get stats
memory-stats
```

## Tools Added

When this skill is active, the agent gains access to:

### `memory_recall`

Recall relevant memories based on query context.

```javascript
// Use in agent prompt for contextual memory
memory_recall({
  query: "How did I implement authentication?",
  top_k: 5,
  threshold: 0.6
})
```

### `memory_store`

Store new memories with automatic embedding.

```javascript
memory_store({
  content: "User prefers TypeScript over JavaScript",
  tags: ["preferences", "user-profile"],
  source: "conversation"
})
```

### `memory_search`

Search stored memories.

```javascript
memory_search({
  query: "database configuration",
  mode: "hybrid",  // "vector", "keyword", "hybrid"
  limit: 10
})
```

## Usage in Agent Prompt

When this skill is active, include this context:

```
## Memory System

You have access to a hybrid memory system (vector + keyword search) via:

- `memory_recall(query, top_k?, threshold?)` - Recall relevant context
- `memory_store(content, tags?, source?)` - Store new memories
- `memory_search(query, mode?, limit?)` - Search memories

Use memory_recall() to:
- Remember previous conversations
- Find relevant code patterns
- Access stored documentation
- Maintain context across sessions

Use memory_store() to:
- Save user preferences
- Store discovered patterns
- Remember decisions made
- Document important findings

The hybrid search combines:
- Semantic similarity (70% weight): Finds by meaning
- BM25 keyword scoring (30% weight): Finds by exact words
```

## Technical Details

### Embedding Strategy

- **Chunking**: Paragraph-level with heading preservation
- **Model**: OpenAI text-embedding-3-small (1536 dimensions)
- **Normalization**: L2-normalized for cosine similarity
- **Caching**: Hash-based embedding cache (SHA-256 of content)

### Hybrid Scoring

```
final_score = (vector_weight * vector_score) + 
              (keyword_weight * bm25_score_normalized)

Example weights:
- vector_weight = 0.7 (semantic meaning)
- keyword_weight = 0.3 (exact word matches)
```

### Similarity Search

Vector similarity uses cosine distance on normalized embeddings:

```sql
SELECT id, content, 
       (vector_dot_product(embedding, :query_vec)) as similarity
FROM memories
ORDER BY similarity DESC
LIMIT :limit
```

### FTS5 BM25 Scoring

```sql
SELECT rowid, bm25(memories_fts, 1.2, 0.75) as score
FROM memories_fts
WHERE memories_fts MATCH :query
ORDER BY score DESC
```

## File Structure

```
.pi/skills/hybrid-memory/
├── SKILL.md                 # This file
├── package.json
├── lib/
│   ├── db.js               # SQLite connection + schema
│   ├── embeddings.js       # OpenAI embedding client
│   ├── chunker.js          # Text chunking logic
│   ├── search.js           # Vector + keyword + hybrid search
│   └── cache.js            # Embedding cache management
├── bin/
│   ├── memory-init.js      # Initialize database
│   ├── memory-store.js     # Store memories CLI
│   ├── memory-search.js    # Search memories CLI
│   ├── memory-recall.js    # Recall with context
│   ├── memory-list.js      # List memories
│   ├── memory-delete.js    # Delete memory
│   ├── memory-export.js    # Export to various formats
│   └── memory-stats.js     # Database statistics
└── tests/
    └── memory.test.js      # Test suite
```

## Performance Characteristics

| Metric | Expected |
|--------|----------|
| Embedding latency | ~100-300ms (OpenAI API) |
| Vector search | <10ms for 10k memories |
| Keyword search | <50ms for 10k memories |
| Storage per memory | ~6KB (1536 dims * 4 bytes) |
| Database size | ~60MB for 10k memories |

## When to Use

- **Long-running conversations** - Maintain context across sessions
- **Code knowledge bases** - Remember patterns and decisions
- **Documentation search** - Semantic doc retrieval
- **User preferences** - Remember how users like things done
- **Research accumulation** - Build knowledge over time

## Integration Example

```javascript
// In agent workflow:

// 1. Before answering, recall relevant context
const relevant = memory_recall({
  query: userQuestion,
  top_k: 3
});

// 2. Include context in LLM prompt
const prompt = `
  Previous relevant context:
  ${relevant.map(m =>m.content).join('\n---\n')}
  
  User question: ${userQuestion}
`;

// 3. After answering, store the exchange
memory_store({
  content: `Q: ${userQuestion}\nA: ${answer}`,
  tags: ["conversation", "q-and-a"],
  source: "agent-session"
});
```

## Inspiration

This skill is inspired by ZeroClaw's memory architecture:
- "Full-Stack Memory System" - Zero overhead, custom implementation
- "Hybrid Merge" - Weighted combination of vector + keyword
- "Safe Reindex" - Atomic rebuilds with no downtime
