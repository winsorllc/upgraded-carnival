---
name: session-files
description: Track and summarize all files read, written, or edited during the current session. Use when: (1) you need to review what files have been modified, (2) the user asks what changed, (3) before wrapping up a job, (4) to get a quick overview of work completed, or (5) you want to create a session summary report.
---

# Session Files

Track and summarize all file operations (reads, writes, edits) during the current session. This skill maintains a running log of file activities to provide context about what work has been accomplished.

## When to Use

- User asks "what files have you worked on?" or "what changed?"
- Before wrapping up a job - generate a summary of completed work
- Creating job summary reports
- Understanding the scope of changes made during the session
- Cross-referencing with session logs for complete context

## How It Works

This skill automatically logs file operations to a JSONL file in the session logs directory. Each operation is recorded with:
- **timestamp**: When the operation occurred
- **action**: `read`, `write`, or `edit`
- **path**: Full path to the file
- **summary**: Brief description of what was done

## Usage

### Track a file operation

```bash
# Automatically track file reads/writes
session-files track --action read --path /job/src/main.ts --summary "Loaded main entry point"

# Track writes
session-files track --action write --path /job/output/results.json --summary "Generated analysis results"

# Track edits
session-files track --action edit --path /job/src/config.ts --summary "Updated API endpoint configuration"
```

### Get session summary

```bash
# Get all file operations
session-files list

# Get only writes and edits (what changed)
session-files list --filter changes

# Get operations as JSON for programmatic use
session-files list --json

# Get summary grouped by action type
session-files summary
```

### Search files

```bash
# Find all operations on a specific file
session-files find --path /job/src/main.ts

# Find operations matching a pattern
session-files find --pattern "*.ts"

# Find operations in a directory
session-files find --directory /job/src
```

### Export session report

```bash
# Generate a markdown report
session-files report

# Export to JSON
session-files report --format json

# Include file contents in report
session-files report --include-content
```

## Output Format

### List Output

```
📄 Session Files - 5 operations

📖 READ   /job/src/main.ts          (2 min ago)
          "Loaded main entry point"

📝 WRITE  /job/output/results.json  (5 min ago)
          "Generated analysis results"

✏️  EDIT   /job/src/config.ts        (10 min ago)
          "Updated API endpoint configuration"
```

### Summary Output

```
📊 Session Summary
==================
📖 Reads:     12
✏️  Edits:     8
📝 Writes:    3
─────────────
Total:       23 files

Most Active Directory:
  /job/src/ (15 operations)

File Types:
  .ts:  10
  .js:  5
  .json: 3
  .md:  2
  .yaml: 2
```

### Report Output (Markdown)

```markdown
# Session Report

**Generated:** 2026-02-25 13:45:00 UTC
**Session ID:** abc123

## Files Read (12)

| Time | File | Summary |
|------|------|---------|
| 13:30 | src/main.ts | Loaded main entry point |
| 13:32 | config/app.json | Read application config |

## Files Written (3)

| Time | File | Summary |
|------|------|---------|
| 13:40 | output/results.json | Generated analysis results |

## Files Edited (8)

| Time | File | Summary |
|------|------|---------|
| 13:35 | src/config.ts | Updated API endpoint |
```

## Integration with Other Skills

- **With session-logs**: Get complete context by combining file operations with actual conversation history
- **With voice-output**: Announce session summary when job completes
- **With memory-agent**: Store session summary for future reference

## Session File Location

Tracked operations are stored in:
- **Job logs**: `/job/logs/<job-id>/files.jsonl`
- **Session logs**: For interactive sessions, `~/.thepopebot/sessions/<session-id>/files.jsonl`

## Tips

1. **Early tracking**: Start tracking file operations at the beginning of a job for complete coverage
2. **Descriptive summaries**: Use clear, concise descriptions for each operation
3. **Filter for changes**: Use `--filter changes` to see only what was modified
4. **Combine with grep**: Pipe output to grep for specific file patterns
5. **Auto-track with hooks**: The skill can be integrated with file operation hooks for automatic tracking
