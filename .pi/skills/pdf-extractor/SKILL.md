---
name: pdf-extractor
description: Extract text and metadata from PDF files. Supports text extraction, page counting, metadata inspection, and selective page extraction.
---

# PDF Extractor

Extract text, metadata, and content from PDF documents.

## Features

- **text**: Extract all text content from PDF
- **metadata**: Extract document properties (title, author, creation date, etc.)
- **pages**: Get total page count
- **selective**: Extract specific page ranges
- **info**: Get PDF version and encryption status

## Usage

```bash
# Extract all text
./scripts/pdf-extract.js --file ./document.pdf

# Extract specific pages
./scripts/pdf-extract.js --file ./document.pdf --pages "1-5"

# Extract metadata only
./scripts/pdf-extract.js --file ./document.pdf --metadata

# Get page count and info
./scripts/pdf-extract.js --file ./document.pdf --info

# Output as JSON
./scripts/pdf-extract.js --file ./document.pdf --format json
```

## Examples

| Task | Command | Output |
|------|---------|--------|
| Extract text | `pdf-extract.js --file doc.pdf` | Full text content |
| Pages 1-3 | `pdf-extract.js --file doc.pdf --pages 1-3` | Text from pages 1-3 |
| Metadata | `pdf-extract.js --file doc.pdf --metadata` | Document properties |
| Info | `pdf-extract.js --file doc.pdf --info` | Page count, version |
| JSON output | `pdf-extract.js --file doc.pdf --json` | Structured JSON |

## Notes

- Supports most PDF formats (PDF 1.0-1.7)
- Handles encrypted PDFs (prompts for password)
- Memory efficient for large documents
- Preserves text layout where possible