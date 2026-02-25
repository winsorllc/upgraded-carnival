---
name: markdown-tools
description: Process and transform markdown documents. Convert to HTML, extract headings, generate TOC, check links. Use when working with documentation or markdown content.
---

# Markdown Tools

Process, transform, and analyze markdown documents.

## Quick Start

```bash
/job/.pi/skills/markdown-tools/markdown.js toc README.md
```

## Usage

### Generate Table of Contents
```bash
/job/.pi/skills/markdown-tools/markdown.js toc <file.md>
```

### Convert to HTML
```bash
/job/.pi/skills/markdown-tools/markdown.js html <file.md> <output.html>
```

### Extract Headings
```bash
/job/.pi/skills/markdown-tools/markdown.js headings <file.md>
```

### Extract Links
```bash
/job/.pi/skills/markdown-tools/markdown.js links <file.md>
```

### Word Count
```bash
/job/.pi/skills/markdown-tools/markdown.js count <file.md>
```

### Check Broken Links
```bash
/job/.pi/skills/markdown-tools/markdown.js check-links <file.md>
```

### Strip Markdown
```bash
/job/.pi/skills/markdown-tools/markdown.js strip <file.md>
```

## Commands

| Command | Description |
|---------|-------------|
| `toc` | Generate table of contents |
| `html` | Convert to HTML |
| `headings` | Extract heading hierarchy |
| `links` | List all links |
| `check-links` | Verify internal links exist |
| `count` | Word/character count |
| `strip` | Remove markdown formatting |

## Output Formats

- **toc**: Markdown formatted list with anchor links
- **html**: Valid HTML document
- **headings**: JSON array of heading objects
- **links**: JSON array of link objects
- **check-links**: Report of valid/broken links
- **count**: JSON with stats

## Examples

```bash
# Generate TOC for README
/job/.pi/skills/markdown-tools/markdown.js toc README.md

# Convert to HTML
/job/.pi/skills/markdown-tools/markdown.js html article.md article.html

# Extract all headings
/job/.pi/skills/markdown-tools/markdown.js headings docs.md

# Check for broken internal links
/job/.pi/skills/markdown-tools/markdown.js check-links README.md

# Get word count
/job/.pi/skills/markdown-tools/markdown.js count blog-post.md

# Strip formatting (get plain text)
/job/.pi/skills/markdown-tools/markdown.js strip notes.md
```

## Table of Contents Format

```markdown
## Table of Contents

- [Heading 1](#heading-1)
  - [Subheading 1.1](#subheading-11)
- [Heading 2](#heading-2)
```

## When to Use

- Processing documentation files
- Generating README table of contents
- Converting markdown to HTML
- Validating documentation links
- Analyzing markdown content structure
