---
name: nano-pdf
description: Edit PDFs with natural-language instructions using the nano-pdf CLI. Use when: user wants to modify text, change titles, fix typos, or make edits to specific pages in a PDF document.
metadata:
  {
    "requires": { "bins": ["nano-pdf"] },
    "install": [
      {
        "id": "uv",
        "kind": "uv",
        "package": "nano-pdf",
        "bins": ["nano-pdf"],
        "label": "Install nano-pdf (uv)"
      },
      {
        "id": "pip",
        "kind": "pip",
        "package": "nano-pdf",
        "bins": ["nano-pdf"],
        "label": "Install nano-pdf (pip)"
      }
    ]
  }
---

# nano-pdf

Edit PDFs with natural-language instructions using the nano-pdf CLI. Ideal for making quick edits to PDF documents without needing complex PDF editors.

## Setup

```bash
# Install via uv (recommended)
uv pip install nano-pdf

# Or via pip
pip install nano-pdf
```

## Usage

### Edit a PDF Page

```bash
{baseDir}/nano-pdf.js edit document.pdf 1 "Change the title to 'Q3 Results'"
```

### Extract Text from PDF

```bash
{baseDir}/nano-pdf.js extract document.pdf
```

### List PDF Pages

```bash
{baseDir}/nano-pdf.js list document.pdf
```

## Options

| Option | Description |
|--------|-------------|
| `edit` | Edit a specific page with natural language |
| `extract` | Extract text from the PDF |
| `list` | List all pages in the PDF |

## Tips

- Page numbers are 0-based or 1-based depending on configuration; if results look off by one, retry with the other
- Always sanity-check the output PDF before sending it out
- Works best with text-based PDFs; scanned images may not be editable
