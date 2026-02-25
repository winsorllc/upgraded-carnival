---
name: File Difference
author: PopeBot
description: Advanced file comparison with three-way merge support. Handles binary files, large files, and recursive directory comparison.
version: "1.0.0"
tags:
  - diff
  - file
  - comparison
  - merge
  - directories
---

# File Difference

Advanced file comparison with three-way merge support. Handles binary files, large files, and recursive directory comparison.

## When to Use

Use the file-difference skill when:
- Comparing files of different types
- Need three-way merge capabilities
- Working with binary files
- Comparing directory structures
- Handling large files efficiently

## Usage Examples

Compare two files:
```bash
node /job/.pi/skills/file-difference/filediff.js compare file1.txt file2.txt
```

Three-way merge:
```bash
node /job/.pi/skills/file-difference/filediff.js merge --base base.txt --ours ours.txt --theirs theirs.txt --output merged.txt
```

Compare directories:
```bash
node /job/.pi/skills/file-difference/filediff.js dirs dir1/ dir2/
```

Check file info:
```bash
node /job/.pi/skills/file-difference/filediff.js info file.txt
```