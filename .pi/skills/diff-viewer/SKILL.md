---
name: Diff Viewer
description: Generate VS Code diffs and side-by-side comparisons. Shows file differences in a navigable format, creates unified diffs, and generates VS Code-compatible diff files. Inspired by OpenClaw's diff.ts extension.
author: PopeBot
version: 1.0.0
tags:
  - diff
  - comparison
  - vscode
  - file-tools
---

# Diff Viewer

Generate VS Code-compatible diffs and file comparisons. Shows file differences in a navigable format.

## Capabilities

- Generate unified diffs between files
- Side-by-side file comparison
- VS Code diff file generation (*.diff, *.patch)
- Directory comparison
- Git-style diff output
- Inline vs side-by-side visualization
- Word-by-word diff highlighting
- Export diffs to various formats

## When to Use

Use the diff-viewer skill when:
- Comparing two versions of a file
- Generating patch files for code review
- Visualizing changes between configurations
- Creating before/after comparisons
- Need to see line-by-line differences

## Usage Examples

### Compare two files
```bash
node /job/.pi/skills/diff-viewer/diff.js file1.txt file2.txt
```

### Generate patch file
```bash
node /job/.pi/skills/diff-viewer/diff.js --patch old.txt new.txt --output changes.patch
```

### Compare directories
```bash
node /job/.pi/skills/diff-viewer/diff.js --dir /path/to/dir1 /path/to/dir2
```

### Unified diff format
```bash
node /job/.pi/skills/diff-viewer/diff.js --unified old.txt new.txt
```

### Context lines
```bash
node /job/.pi/skills/diff-viewer/diff.js --context 5 old.txt new.txt
```
