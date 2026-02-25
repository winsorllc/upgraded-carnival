---
name: pdf-tools
description: "Extract text from PDF files, merge PDFs, split PDFs, and add watermarks. Uses Python's PyPDF and pdf2image libraries."
---

# PDF Tools Skill

Extract text, merge, split, and manipulate PDF files.

## When to Use

✅ **USE this skill when:**

- "Extract text from this PDF"
- "Merge these PDFs together"
- "Split this PDF into pages"
- "Add watermark to PDF"
- "Convert PDF to images"

## When NOT to Use

❌ **DON'T use this skill when:**

- Creating PDFs from scratch → use reportlab/fpdf
- Complex PDF editing → use dedicated PDF software
- PDF forms → use specialized tools

## Setup

Install required packages:

```bash
pip install pypdf pdf2image pillow
```

For PDF to image conversion, also install poppler:
- macOS: `brew install poppler`
- Linux: `sudo apt install poppler-utils`

## Commands

### Extract Text

```bash
{baseDir}/pdf-text.sh document.pdf
{baseDir}/pdf-text.sh document.pdf --pages 1-5
{baseDir}/pdf-text.sh document.pdf --out extracted.txt
```

### Merge PDFs

```bash
{baseDir}/pdf-merge.sh file1.pdf file2.pdf --out merged.pdf
{baseDir}/pdf-merge.sh *.pdf --out combined.pdf
```

### Split PDF

```bash
{baseDir}/pdf-split.sh document.pdf --out-dir /tmp/pages/
{baseDir}/pdf-split.sh document.pdf --pages 1-3 --out extracted.pdf
```

### Add Watermark

```bash
{baseDir}/pdf-watermark.sh document.pdf --text "CONFIDENTIAL" --out watermarked.pdf
{baseDir}/pdf-watermark.sh document.pdf --image logo.png --out watermarked.pdf
```

### PDF to Images

```bash
{baseDir}/pdf-to-images.sh document.pdf --out-dir /tmp/pages/
{baseDir}/pdf-to-images.sh document.pdf --pages 1-5 --format png
```

### Get PDF Info

```bash
{baseDir}/pdf-info.sh document.pdf
{baseDir}/pdf-info.sh document.pdf --json
```

## Options

- `--pages <range>`: Page range (e.g., `1-5`, `1,3,5`)
- `--out <path>`: Output file path
- `--out-dir <dir>`: Output directory
- `--text <text>`: Watermark text
- `--image <path>`: Watermark image
- `--format <fmt>`: Image format (png, jpg)
- `--json`: Output as JSON

## Examples

**Extract first 10 pages:**
```bash
{baseDir}/pdf-text.sh report.pdf --pages 1-10 --out summary.txt
```

**Merge all PDFs in directory:**
```bash
{baseDir}/pdf-merge.sh *.pdf --out combined.pdf
```

**Split PDF into individual pages:**
```bash
{baseDir}/pdf-split.sh document.pdf --out-dir /tmp/pages/
# Creates: /tmp/pages/page_001.pdf, page_002.pdf, etc.
```

**Add draft watermark:**
```bash
{baseDir}/pdf-watermark.sh document.pdf --text "DRAFT" --out draft.pdf
```

## Notes

- Text extraction works best with text-based PDFs
- Scanned PDFs require OCR (not included)
- Large PDFs may take time to process
- Watermarks are applied to each page