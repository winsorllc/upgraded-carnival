---
name: diff-tool
description: Compare files or directories and show differences. Supports text files, JSON, and unified diff output.
---

# Diff Tool

Compare files or directories and show differences. Useful for reviewing changes, comparing configurations, or debugging issues.

## Setup

No additional setup required.

## Usage

### Compare Two Files

```bash
{baseDir}/diff.js file1.txt file2.txt
```

### Compare with Unified Format

```bash
{baseDir}/diff.js file1.txt file2.txt --unified 5
```

### Compare Directories

```bash
{baseDir}/diff.js /path/to/dir1 /path/to/dir2
```

### JSON Output

```bash
{baseDir}/diff.js file1.txt file2.txt --json
```

### Ignore Whitespace

```bash
{baseDir}/diff.js file1.txt file2.txt --ignore-space
```

## Options

| Option | Description |
|--------|-------------|
| `--unified <n>` | Show n lines of context (default: 3) |
| `--json` | Output as JSON |
| `--ignore-space` | Ignore whitespace changes |
| `--ignore-case` | Ignore case changes |

## Output Format

### Text Output
```
--- a/file1.txt
+++ b/file2.txt
@@ -1,3 +1,3 @@
 line 1
-line 2
+modified line 2
 line 3
```

### JSON Output
```json
{
  "left": "file1.txt",
  "right": "file2.txt",
  "differences": [
    {
      "type": "modified",
      "line": 2,
      "left": "line 2",
      "right": "modified line 2"
    }
  ]
}
```
