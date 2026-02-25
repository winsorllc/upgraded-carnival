---
name: hybrid-memory
description: Hybrid vector + keyword (BM25) search combining semantic similarity with keyword matching for comprehensive memory retrieval.
---

# Hybrid Memory Search

A hybrid search system that combines vector embeddings for semantic similarity with FTS5 full-text search for keyword matching. Inspired by ZeroClaw's memory architecture.

## Setup

No additional setup required. Uses SQLite for both vector storage and FTS5.

## Usage

### Store a memory with automatic embedding

```bash
{baseDir}/hybrid-memory.js store "user preference: prefers dark mode"
```

### Search memories (hybrid: vector + keyword)

```bash
{baseDir}/hybrid-memory.js search "dark mode preference"
```

### Search using only semantic (vector) similarity

```bash
{baseDir}/hybrid-memory.js search-vector "dark mode"
```

### Search using only keyword matching

```bash
{baseDir}/hybrid-memory.js search-keyword "dark mode"
```

### List all memories

```bash
{baseDir}/hybrid-memory.js list
```

### Delete a memory

```bash
{baseDir}/hybrid-memory.js delete <id>
```

### Rebuild the index

```bash
{baseDir}/hybrid-memory.js reindex
```

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `--vector-weight` | Weight for vector similarity (0-1) | 0.7 |
| `--keyword-weight` | Weight for BM25 keyword scoring (0-1) | 0.3 |
| `--limit` | Maximum results to return | 10 |

## How It Works

1. **Vector Search**: Uses embeddings stored as BLOB in SQLite with cosine similarity
2. **Keyword Search**: Uses SQLite FTS5 with BM25 scoring
3. **Hybrid Merge**: Combines both scores with configurable weights

## Requirements

- SQLite with FTS5 support (standard in modern SQLite)
- OpenAI API key for embeddings (via `OPENAI_API_KEY` env var)

## Example Use Cases

- Store and retrieve conversation context
- Knowledge base search with both semantic and keyword matching
- Personal memory with weighted recall
