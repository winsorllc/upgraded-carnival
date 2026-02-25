---
name: clipboard
description: Clipboard management for copying and pasting text. Simulates clipboard operations using temporary files (since we don't have display/X11 access).
---

# Clipboard Manager

Simulate clipboard operations for copying and pasting text. Since this runs in a headless environment, operations are stored in a file-based clipboard.

## Capabilities

- Copy text to clipboard
- Paste text from clipboard
- Show clipboard history
- Clear clipboard
- Append/prepend to clipboard
- Copy file contents
- Save clipboard to file

## Usage

```bash
# Copy text to clipboard
/job/.pi/skills/clipboard/clip.js copy "Hello World"

# Copy file contents
/job/.pi/skills/clipboard/clip.js copy-file /path/to/file.txt

# Paste from clipboard
/job/.pi/skills/clipboard/clip.js paste

# Show clipboard contents
/job/.pi/skills/clipboard/clip.js show

# Append to clipboard
/job/.pi/skills/clipboard/clip.js append " Additional text"

# Prepend to clipboard
/job/.pi/skills/clipboard/clip.js prepend "Text before "

# Save clipboard to file
/job/.pi/skills/clipboard/clip.js save /path/to/output.txt

# Clear clipboard
/job/.pi/skills/clipboard/clip.js clear

# Show history
/job/.pi/skills/clipboard/clip.js history

# Get specific history item
/job/.pi/skills/clipboard/clip.js history --index 3
```

## Configuration

- Storage: `/tmp/popebot-clipboard.json`
- Max history: 50 items
- Default clipboard slot: 0

## Notes

- Clipboard persists within the sandbox session
- History is stored for retrieval
- UTF-8 encoding for all text