---
name: document-indexer
description: Index and search documents. Similar to ZeroClaw's SQLite hybrid search and OpenClaw's memory system. Supports full-text search, keyword extraction, and document categorization.
---

# Document Indexer

Document indexing and search capability inspired by ZeroClaw's memory system.

## Capabilities

- Index text files and documents
- Full-text search
- Extract keywords
- Categorize documents
- Document summaries

## Usage

```bash
# Index a document
/job/.pi/skills/document-indexer/index-add.js /path/to/file.txt "Category"

# Search documents
/job/.pi/skills/document-indexer/index-search.js "search query"

# List indexed documents
/job/.pi/skills/document-indexer/index-list.js

# Delete from index
/job/.pi/skills/document-indexer/index-remove.js document-id

# Get document summary
/job/.pi/skills/document-indexer/index-summarize.js document-id
```

## Configuration

Index stored at `/tmp/document-index.jsonl`

## Inspired By

- ZeroClaw: SQLite hybrid search with FTS5
- OpenClaw: Markdown files memory backend