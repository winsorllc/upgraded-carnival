---
name: pdf-read
description: "Extract text and metadata from PDF files using pdf-parse. Use when: user uploads a PDF or asks to read/analyze PDF content. NOT for: creating PDFs, editing PDFs, or OCR on scanned documents."
metadata: { "openclaw": { "emoji": "📄", "requires": { "bins": ["node"] } } }
---

# PDF Read Skill

Extract text and metadata from PDF files.

## When to Use

✅ **USE this skill when:**

- User uploads a PDF and asks for summary
- Extract text from a PDF document
- Read PDF metadata (author, title, pages)
- Analyze PDF content

## When NOT to Use

❌ **DON'T use this skill when:**

- Creating or generating PDFs → use reporting tools
- Editing existing PDFs → use PDF manipulation tools
- OCR on scanned images → use OCR/tesseract tools
- Password-protected PDFs → ask user to unlock first

## Installation

```bash
cd /job
npm install pdf-parse
```

## Usage

```javascript
const fs = require('fs');
const pdf = require('pdf-parse');

async function readPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  
  return {
    text: data.text,
    pages: data.numpages,
    info: data.info, // metadata
    version: data.version,
    metadata: data.metadata
  };
}

// Example
const result = await readPDF('/path/to/document.pdf');
console.log(`Pages: ${result.pages}`);
console.log(`Text preview: ${result.text.substring(0, 500)}...`);
```

## Extract Text by Page Range

```javascript
const pdf = require('pdf-parse');
const fs = require('fs');

async function readPDFPages(filePath, startPage, endPage) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer, {
    max: endPage,
    version: 'v2.0.550',
    normalizeWhitespace: true,
  });
  
  return data.text;
}
```

## Get Metadata

```javascript
const result = await readPDF('/path/to/document.pdf');
console.log('Author:', result.info?.Author);
console.log('Title:', result.info?.Title);
console.log('Subject:', result.info?.Subject);
console.log('Keywords:', result.info?.Keywords);
console.log('Creator:', result.info?.Creator);
console.log('Producer:', result.info?.Producer);
console.log('Creation Date:', result.info?.CreationDate);
console.log('Mod Date:', result.info?.ModDate);
```

## Search Text in PDF

```javascript
async function searchInPDF(filePath, searchTerm) {
  const result = await readPDF(filePath);
  const text = result.text;
  const lines = text.split('\n');
  
  const matches = [];
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
      matches.push({
        line: index + 1,
        content: line.trim()
      });
    }
  });
  
  return {
    total_matches: matches.length,
    matches: matches.slice(0, 20) // limit results
  };
}
```

## Extract All Text as Single String

```javascript
async function extractFullText(filePath) {
  const result = await readPDF(filePath);
  // Normalize whitespace for cleaner output
  return result.text.replace(/\s+/g, ' ').trim();
}
```

## Handling Large PDFs

For PDFs with many pages, process in chunks:

```javascript
async function readPDFFirstNPages(filePath, maxPages = 10) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer, { max: maxPages });
  
  return {
    text: data.text,
    total_pages: data.numpages,
    pages_read: Math.min(maxPages, data.numpages)
  };
}
```

## Error Handling

```javascript
async function safeReadPDF(filePath) {
  try {
    const result = await readPDF(filePath);
    return { success: true, ...result };
  } catch (error) {
    if (error.message.includes('password')) {
      return { success: false, error: 'PDF is password-protected' };
    }
    if (error.message.includes('parse')) {
      return { success: false, error: 'Invalid or corrupted PDF' };
    }
    return { success: false, error: error.message };
  }
}
```

## Quick Response Template

**"Read this PDF"**

```javascript
const result = await readPDF(filePath);
return `📄 **PDF Summary**

**Pages:** ${result.pages}
**Title:** ${result.info?.Title || 'N/A'}
**Author:** ${result.info?.Author || 'N/A'}

**Preview (first 500 chars):**
${result.text.substring(0, 500)}...
`;
```

## Notes

- pdf-parse works on most standard PDFs
- Does NOT support OCR for scanned documents
- Does NOT handle password-protected PDFs
- For image-heavy PDFs, text extraction may be limited
- Large PDFs (>100 pages) should be read in chunks
