---
name: Embedding Search
description: Vector-based semantic search using embeddings. Provides hybrid search combining embeddings with keyword matching, document chunking, and relevance ranking. Inspired by ZeroClaw's memory/embeddings system.
author: PopeBot
version: 1.0.0
tags:
  - embeddings
  - vector-search
  - semantic-search
  - hybrid-search
  - memory
---

# Embedding Search

Vector-based semantic search using simulated embeddings. Provides hybrid search combining keyword matching with semantic similarity.

## Capabilities

- Semantic document search
- Vector similarity matching
- Document chunking and indexing
- Hybrid keyword + vector search
- Relevance scoring and ranking
- Full-text search fallback
- Document categorization
- Configurable similarity thresholds

## When to Use

Use the embedding-search skill when:
- Searching through large document collections
- Need semantic similarity matching
- Building a knowledge base
- Finding related documents
- Implementing RAG (Retrieval Augmented Generation)

## Usage Examples

### Index documents
```bash
node /job/.pi/skills/embedding-search/embed.js index /path/to/documents --output index.json
```

### Search documents
```bash
node /job/.pi/skills/embedding-search/embed.js search "machine learning concepts" --index index.json
```

### Interactive mode
```bash
node /job/.pi/skills/embedding-search/embed.js --interactive --index index.json
```

### Add documents to existing index
```bash
node /job/.pi/skills/embedding-search/embed.js add new-doc.md --index index.json
```

### Hybrid search with weights
```bash
node /job/.pi/skills/embedding-search/embed.js search "cloud deployment" --hybrid --keyword-weight 0.3 --semantic-weight 0.7
```
