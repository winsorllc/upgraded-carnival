---
name: session-file-tracker
description: Track and quickly access files read, written, or edited during the agent session. Use when you want to see all files modified in the current job, navigate to a specific file, or get a summary of session activity.
---

# Session File Tracker

A skill that tracks all files read, written, or edited during the agent session. Provides quick access to file history and enables rapid navigation to previously touched files.

## Usage

This skill automatically tracks all file operations. Use these commands:

```bash
{baseDir}/session-files.js list              # List all tracked files
{baseDir}/session-files.js recent [n]        # Show n most recent files (default: 10)
{baseDir}/session-files.js changed           # Show files with uncommitted changes
{baseDir}/session-files.js open <path>       # Open file in editor
{baseDir}/session-files.js diff <path>       # Show git diff for a file
{baseDir}/session-files.js summary           # Show session activity summary
```

## How It Works

1. **Automatic Tracking**: The skill hooks into session events to track:
   - `read` operations → files that have been read
   - `write` operations → files that have been created/modified
   - `edit` operations → files that have been edited

2. **Metadata Collection**: For each operation, it captures:
   - File path
   - Operation type (read/write/edit)
   - Timestamp
   - Operation count per file

3. **Session Persistence**: File history persists across the current session branch

## Features

- **List View**: Shows all files with operation badges (R=read, W=written, E=edited)
- **Recent Files**: Quick access to the most recently touched files
- **Uncommitted Changes**: Shows which files have been modified but not committed
- **Quick Open**: Opens any tracked file in VS Code
- **Git Diff**: Shows changes for any tracked file
- **Activity Summary**: Provides statistics on file operations

## Example Output

```
=== Session Files (12 files) ===

[RW] config/SOUL.md           (2 operations, last: 10:30 AM)
[R]  src/index.ts            (1 operation, last: 10:25 AM)
[WE] package.json            (3 operations, last: 10:32 AM)
[R]  tests/test.ts           (1 operation, last: 10:28 AM)

Use: session-files.js open <path> to open a file
Use: session-files.js diff <path> to see changes
```

## Integration

This skill integrates with the Pi coding agent by:
1. Using session events to monitor tool calls
2. Maintaining an in-memory index of file operations
3. Providing CLI commands for quick access

## When to Use

- When you've worked with many files and need to find one quickly
- Before committing, to see all files that were modified
- To get an overview of what the agent did in the session
- To quickly navigate back to a file you were working on
