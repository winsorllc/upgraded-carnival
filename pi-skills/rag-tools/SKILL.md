---
name: rag-tools
description: Retrieval-Augmented Generation tools for semantic search and document indexing. Supports multiple backends including SQLite, Qdrant, and PostgreSQL.
metadata:
  {
    "zeroclaw":
      {
        "emoji": "🧠",
        "requires": { "env": ["EMBEDDINGS_PROVIDER", "EMBEDDINGS_API_KEY"] },
      },
  }
---

# RAG Tools

Retrieval-Augmented Generation tools for semantic search and document indexing.

## When to Use

✅ **USE this skill when:**

- Searching documents semantically
- Building knowledge bases
- Finding related content across large document collections
- Question answering over private documents

## When NOT to Use

❌ **DON'T use this skill when:**

- Exact keyword search (use grep/ripgrep)
- Small document sets (overhead not worth it)
- Real-time streaming data

## Backends

### SQLite (default, built-in)
- Simple setup, no external dependencies
- Good for small to medium datasets
- BM25 + semantic hybrid search

### Qdrant (vector database)
- Production-grade vector search
- Requires running Qdrant server
- Best for large-scale deployments

### PostgreSQL (with pgvector)
- Use if you already have PostgreSQL
- Requires pgvector extension
- Good for production

## Usage

### Indexing Documents

```bash
# Add document to index
rag add --collection mydocs --file document.txt

# Add with metadata
rag add --collection mydocs --file article.pdf --metadata '{"source": "blog", "author": "John"}'

# Batch add
rag add --collection mydocs --glob "*.txt"
```

### Searching

```bash
# Semantic search
rag search --collection mydocs --query "What is machine learning?"

# Hybrid search (semantic + keyword)
rag search --collection mydocs --query "Python programming" --hybrid

# Search with filters
rag search --collection mydocs --query "AI" --filter 'source=blog'
```

### Managing Collections

```bash
# List collections
rag list

# Show collection info
rag info mydocs

# Delete collection
rag delete mydocs
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EMBEDDINGS_PROVIDER` | Provider: `openai`, `cohere`, `huggingface` |
| `EMBEDDINGS_API_KEY` | API key for embeddings |
| `EMBEDDINGS_MODEL` | Model name (default: provider default) |
| `RAG_BACKEND` | Backend: `sqlite`, `qdrant`, `postgres` |

## Configuration

### Qdrant
```bash
RAG_BACKEND=qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

### PostgreSQL
```bash
RAG_BACKEND=postgres
POSTGRES_URL=postgres://user:pass@localhost/db
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Documents  │────▶│   Chunker    │────▶│ Embeddings │
└─────────────┘     └──────────────┘     └─────────────┘
                                                │
                                                ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Results   │◀────│   Reranker   │◀────│   Vector    │
└─────────────┘     └──────────────┘     │   Store    │
                                          └─────────────┘
```

## Chunking Strategies

| Strategy | Use Case |
|----------|----------|
| Fixed size | General purpose |
| Sentence | NLP-heavy content |
| Paragraph | Long-form text |
| Document | Whole files |

## Notes

- Embedding costs money (~$0.10/1M tokens for OpenAI)
- Indexing is batched for efficiency
- Results can be re-ranked for better quality
