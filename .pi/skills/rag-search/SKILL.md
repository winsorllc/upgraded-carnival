---
name: rag-search
description: Semantic search using embeddings and vector storage. Search documents semantically using similarity matching.
---

# RAG Search

Semantic search using embeddings and vector storage. Search documents semantically using similarity matching.

## Setup

No additional setup required. Uses in-memory vector storage with optional embedding providers.

## Usage

### Index Documents

```bash
{baseDir}/rag-search.js --index --path ./docs --chunk-size 500
```

### Search Documents

```bash
{baseDir}/rag-search.js --search "how to configure authentication"
```

### Query with Filters

```bash
{baseDir}/rag-search.js --search "deployment steps" --limit 5
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--index` | Index documents | No |
| `--path` | Path to documents | For index |
| `--chunk-size` | Chunk size for splitting | No |
| `--search` | Search query | For search |
| `--limit` | Max results to return | No |
| `--list` | List indexed documents | No |
| `--clear` | Clear index | No |

## Supported Formats

- Plain text (.txt)
- Markdown (.md)
- JSON (.json)
- JavaScript/TypeScript (.js, .ts)
- Python (.py)
- HTML (.html)
- YAML (.yaml, .yml)

## Embedding Providers

- OpenAI (default, requires API key)
- Cohere (requires API key)
- Local (TF-IDF based, no API key needed)

## Output Format

```json
{
  "results": [
    {
      "file": "docs/config.md",
      "chunk": "To configure authentication...",
      "score": 0.92,
      "line": 15
    }
  ]
}
```

## When to Use

- Semantic search across codebase
- Finding relevant documentation
- Knowledge base queries
- RAG applications
