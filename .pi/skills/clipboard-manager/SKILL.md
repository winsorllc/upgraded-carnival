---
name: clipboard-manager
description: Read and write system clipboard content. Use when you need to copy/paste programmatically or transfer text between applications.
---

# Clipboard Manager

Read from and write to the system clipboard using pure Node.js.

## Quick Start

```bash
/job/.pi/skills/clipboard-manager/clipboard.js copy "Hello, World!"
```

## Usage

### Copy to Clipboard
```bash
/job/.pi/skills/clipboard-manager/clipboard.js copy "<text>"
```

### Paste from Clipboard
```bash
/job/.pi/skills/clipboard-manager/clipboard.js paste
```

### Clear Clipboard
```bash
/job/.pi/skills/clipboard-manager/clipboard.js clear
```

### Watch Clipboard
```bash
/job/.pi/skills/clipboard-manager/clipboard.js watch
```

## Examples

```bash
# Copy text
/job/.pi/skills/clipboard-manager/clipboard.js copy "Important text to copy"

# Get clipboard content
/job/.pi/skills/clipboard-manager/clipboard.js paste

# Pipe input to clipboard
echo "text to copy" | /job/.pi/skills/clipboard-manager/clipboard.js copy

# Copy file contents
cat file.txt | /job/.pi/skills/clipboard-manager/clipboard.js copy
```

## When to Use

- Automating copy/paste workflows
- Transferring text between applications
- Capturing clipboard content for processing
- Building clipboard-based integrations
