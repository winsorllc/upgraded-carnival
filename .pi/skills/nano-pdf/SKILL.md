---
name: nano-pdf
description: Edit PDFs with natural-language instructions using the nano-pdf CLI. Create, modify, and transform PDF documents.
homepage: https://pypi.org/project/nano-pdf/
metadata:
  {
    "popebot":
      {
        "emoji": "📄",
        "requires": { "bins": ["nano-pdf", "uv"], "env": ["OPENAI_API_KEY"] },
        "install":
          [
            {
              "id": "uv",
              "kind": "pip",
              "package": "nano-pdf",
              "bins": ["nano-pdf"],
              "label": "Install nano-pdf via uv/pip",
            },
          ],
      }
  }
---

# nano-pdf

Use `nano-pdf` to apply edits to PDFs using natural-language instructions. This skill provides PDF editing capabilities beyond basic reading.

## Installation

```bash
# Install uv if not present
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install nano-pdf
uv pip install nano-pdf
```

## Quick Start

Edit a specific page:
```bash
nano-pdf edit deck.pdf 1 "Change the title to 'Q3 Results' and fix the typo in the subtitle"
```

## Commands

### Edit PDF Page

```bash
nano-pdf edit <pdf_file> <page_number> "<instruction>"
```

- `page_number`: 0-based or 1-based depending on version
- `instruction`: Natural language description of what to change

Example:
```bash
nano-pdf edit report.pdf 0 "Update the header to 'Annual Report 2026'"
```

### Create PDF from Text

```bash
nano-pdf create --output output.pdf --text "Your content here"
```

### Merge PDFs

```bash
nano-pdf merge --output merged.pdf file1.pdf file2.pdf file3.pdf
```

### Split PDF

```bash
nano-pdf split input.pdf --output-dir ./pages/
```

### Extract Pages

```bash
nano-pdf extract input.pdf --pages 1-5 --output extracted.pdf
```

## Notes

- Page numbers may be 0-based or 1-based; if results look off, try the other
- Requires OPENAI_API_KEY for AI-powered edits
- Always verify the output PDF before distribution
- For complex edits, break into multiple smaller operations

## When to Use

Use this skill when:
- User asks to edit or modify a PDF
- Need to update text in an existing PDF
- Need to merge, split, or extract pages
- Working with reports, presentations, or documents that need updates

## Limitations

- Complex layout changes may require multiple attempts
- Image-heavy PDFs may have limited editability
- Always sanity-check the output before sending
