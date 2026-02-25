---
name: session-files
description: "Track and summarize all files read, written, or edited during the current session. Use when: (1) you need to review what files have been modified, (2) the user asks what changed, (3) before wrapping up a job, (4) to get a quick overview of work completed."
---

# Session Files

Track all file operations (read, write, edit) performed during the current session and provide a summary of what files have been touched.

## When to Use

- User asks "what files have you worked on?"
- Before finishing a job, provide a summary of changes
- Review what files were read for context
- Show modified, new, and deleted files
- Quick overview of session progress

## How It Works

This skill scans the git repository to detect all changes made during the current session branch. It:
1. Reads git status to find modified, added, and deleted files
2. Examines commit history on the current branch
3. Provides a summary of all files touched

## Usage

### Command: /session-files

Run this command to get a summary of all files in the current session:

```bash
cd /job && bash /job/pi-skills/session-files/scripts/session-files.sh
```

### Quick Summary

```bash
# Just show file list
cd /job && git status --porcelain

# Show detailed diff stats
cd /job && git diff --stat HEAD~1

# Show all files changed in this branch
cd /job && git diff --name-only main...HEAD
```

## Output Format

The tool outputs:
- **M** = Modified files
- **A** = Added (new) files
- **D** = Deleted files
- **??** = Untracked (new but not added) files

## Examples

### Example 1: Check what's been done
```bash
$ session-files
Session File Summary:
====================
Modified:   3 files
  - src/app.ts
  - src/utils/helper.ts
  - config/settings.json

Added:      2 files
  - src/new-feature.ts
  - tests/new-feature.test.ts

Deleted:    0 files
```

### Example 2: At job completion
Before wrapping up a job, run this to provide the user with a summary of all changes made.

## Integration Tips

- Run at job start to establish a baseline
- Run periodically to track progress
- Run at job end for final summary
- Combine with git log for commit history

## Notes

- Requires git repository
- Works best when session is on a separate branch
- Uses git diff against base branch (main) to find changes
