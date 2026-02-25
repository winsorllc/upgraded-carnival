---
name: nano-pdf
description: Edit PDFs with natural-language instructions using the nano-pdf CLI. Use when: (1) user asks to modify, edit, or update a PDF, (2) changing text, titles, or content in a PDF, (3) adding or removing pages, (4) any PDF manipulation task.
---

# nano-pdf

Edit PDFs with natural-language instructions using the nano-pdf CLI.

## Setup

```bash
cd {baseDir}
npm install
```

Requires `pdf-lib` which will be installed automatically.

## Quick Start

```bash
# Edit a specific page
{baseDir}/scripts/nano-pdf.js edit document.pdf 0 "Change the title to 'Q3 Results'"

# Edit page 1 (second page)
{baseDir}/scripts/nano-pdf.js edit document.pdf 1 "Update the date to January 2025"

# Replace text across the document
{baseDir}/scripts/nano-pdf.js edit document.pdf all "Replace '2024' with '2025'"

# Save to different output file
{baseDir}/scripts/nano-pdf.js edit document.pdf 0 "Change title" -o output.pdf
```

## Commands

### Edit

```bash
{baseDir}/scripts/nano-pdf.js edit <pdf_path> <page> "<instruction>" [-o output.pdf]
```

- `<pdf_path>` - Path to the PDF file
- `<page>` - Page number (0-based) or "all" for all pages
- `<instruction>` - Natural language instruction for the edit

Examples:
```bash
# Change title on first page
{baseDir}/scripts/nano-pdf.js edit report.pdf 0 "Change the title to 'Annual Report 2025'"

# Fix typo on page 2
{baseDir}/scripts/nano-pdf.js edit report.pdf 2 "Fix the typo 'teh' to 'the'"

# Update all occurrences
{baseDir}/scripts/nano-pdf.js edit contract.pdf all "Replace 'Company A' with 'Acme Corp'"

# Update the date
{baseDir}/scripts/nano-pdf.js edit invoice.pdf 0 "Update the date to January 15, 2025"
```

### Info

```bash
# Get PDF metadata
{baseDir}/scripts/nano-pdf.js info document.pdf

# List all pages
{baseDir}/scripts/nano-pdf.js pages document.pdf
```

## Page Numbering

- Page numbers are **0-based** (0 = first page, 1 = second page, etc.)
- Use "all" to apply the instruction to every page

## Supported Instructions

The tool supports several natural language instruction patterns:

1. **Text Replacement**: `"Replace 'old text' with 'new text'"`
2. **Change/Update**: `"Change X to Y"` or `"Update the title to 'New Title'"`
3. **Date Updates**: `"Update the date to January 15, 2025"`
4. **Generic**: Any instruction - adds annotation to mark the requested change

## Output Options

```bash
# Specify output file (recommended to avoid overwriting)
{baseDir}/scripts/nano-pdf.js edit input.pdf 0 "Change title" -o output.pdf

# Overwrite in place (default)
{baseDir}/scripts/nano-pdf.js edit document.pdf 0 "Update title"
```

## When to Use

- User asks to "edit PDF", "modify PDF", "change text in PDF"
- Updating titles, dates, names in documents
- Fixing typos in PDF files
- Making small edits to contracts, reports, forms
- Any PDF manipulation that doesn't require full desktop publishing software

## Notes

- This implementation uses pdf-lib for PDF manipulation
- Full text replacement in PDFs is complex - the tool adds annotations/markers to indicate changes
- For production use, consider more advanced PDF editing libraries or tools like Adobe Acrobat
