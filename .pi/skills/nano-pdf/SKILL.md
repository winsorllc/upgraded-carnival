---
name: nano-pdf
description: "Edit PDFs with natural-language instructions using the nano-pdf CLI."
homepage: https://pypi.org/project/nano-pdf/
metadata:
  {
    "thepopebot":
      {
        "emoji": "📄",
        "requires": { "bins": ["nano-pdf"] },
      },
  }
---

# nano-pdf

Edit PDFs using natural-language instructions.

## Setup

**Installation:**
```bash
# Using uv (recommended)
uv install nano-pdf

# Using pip
pip install nano-pdf
```

## Usage

### Edit a PDF

```bash
nano-pdf edit input.pdf 1 "Change the title to 'Q3 Results'"
```

### Basic Edits

```bash
# Edit first page (0-indexed)
nano-pdf edit document.pdf 0 "Change the title to 'My Document'"

# Edit specific page
nano-pdf edit document.pdf 2 "Fix the typo in the subtitle"
```

### Arguments

| Argument | Description |
|----------|-------------|
| `input.pdf` | Path to the PDF file |
| `page` | Page number (0-based or 1-based) |
| `instruction` | Natural language instruction |

## Tips

- Page numbers may be 0-based or 1-based depending on version
- Always sanity-check the output PDF before sending
- Works best with clear, specific instructions

## Examples

```bash
# Update a presentation title
nano-pdf edit deck.pdf 0 "Change title to 'Q4 Results'"

# Fix text on page 3
nano-pdf edit report.pdf 2 "Replace '2024' with '2025'"

# Update a form field
nano-pdf edit form.pdf 0 "Fill in 'John Doe' for the name field"
```
