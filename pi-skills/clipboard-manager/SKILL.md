---
name: clipboard-manager
description: Clipboard read, write, and history management. Read/write system clipboard and maintain searchable history of clipboard entries.
version: 1.0.0
author: zeroclaw-inspired
tags:
  - clipboard
  - history
  - copy
  - paste
  - productivity
capabilities:
  - Read current clipboard content
  - Write to clipboard
  - Maintain searchable clipboard history
  - Store text, images, and files
  - Pin important clipboard entries
requires: []
environment:
  CLIPBOARD_DIR: "./clipboard-history"
  CLIPBOARD_MAX_HISTORY: "100"
---

# Clipboard Manager Skill

This skill provides clipboard read, write, and history management. It's useful for maintaining a searchable history of clipboard entries and managing important snippets.

## Commands

### Read current clipboard
```
clipboard read
```
Read the current content from the system clipboard.

### Write to clipboard
```
clipboard write <content>
```
Write content to the system clipboard.

### Show history
```
clipboard history [--limit <n>] [--type <text|image|file>] [--search <query>]
```
Show clipboard history with optional filters.

### Clear history
```
clipboard clear [--all] [--older-than <days>]
```
Clear clipboard history.

### Pin/unpin entry
```
clipboard pin <id>
clipboard unpin <id>
```
Pin or unpin a clipboard entry.

### Copy from history
```
clipboard copy <id>
```
Copy a historical entry back to clipboard.

## Features

- **Cross-platform**: Works on macOS, Linux, and Windows (WSL)
- **Type support**: Text, images, and file paths
- **Search**: Full-text search in clipboard history
- **Pinning**: Pin important entries to prevent deletion
- **Persistence**: History persists across sessions
- **Size limits**: Configurable maximum history size

## Usage Examples

```bash
# Read current clipboard
clipboard read

# Copy text to clipboard
clipboard write "Hello, World!"

# Search clipboard history
clipboard history --search "password"

# Copy previous entry to clipboard
clipboard copy abc123

# Pin an entry
clipboard pin abc123
```
