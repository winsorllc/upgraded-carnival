---
name: git-ops
description: Execute structured git operations with JSON output. Use for repository management tasks like viewing status, commits, branches, diffs, and managing stashes. Provides parsed, machine-readable output instead of raw git text.
---

# Git Operations

Execute structured git operations with JSON output for reliable parsing and automation.

## When to Use

- Check repository status with structured output
- View commit history in JSON format
- Manage branches (list, create, switch, delete)
- View and apply stashes
- Get detailed diff information
- Query repository metadata
- Any git operation where you need structured/parsed output

## Setup

No additional installation required. Requires git to be installed on the system.

## Usage

### Repository Status

```bash
node /job/pi-skills/git-ops/git-ops.js status
```

Returns JSON with branch, staged, unstaged, and untracked files.

### Commit Log

```bash
node /job/pi-skills/git-ops/git-ops.js log --limit 10
```

Returns recent commits with hash, author, date, and message.

### List Branches

```bash
node /job/pi-skills/git-ops/git-ops.js branch
```

Returns all local and remote branches.

### View Diffs

```bash
# Show working tree diff
node /job/pi-skills/git-ops/git-ops.js diff

# Show staged changes
node /job/pi-skills/git-ops/git-ops.js diff --staged

# Compare branches
node /job/pi-skills/git-ops/git-ops.js diff main..HEAD
```

### Stash Operations

```bash
# List stashes
node /job/pi-skills/git-ops/git-ops.js stash list

# Show stash content
node /job/pi-skills/git-ops/git-ops.js stash show 0
```

### Repository Info

```bash
# Get current branch
node /job/pi-skills/git-ops/git-ops.js branch --current

# Get remote URL
node /job/pi-skills/git-ops/git-ops.js remote

# Get commit count
node /job/pi-skills/git-ops/git-ops.js rev-parse --all
```

## Output Format

All commands return JSON:

```json
{
  "success": true,
  "command": "status",
  "data": {
    "branch": "main",
    "tracking": "origin/main",
    "staged": [
      { "path": "file1.js", "status": "M", "description": "modified" }
    ],
    "unstaged": [
      { "path": "file2.js", "status": "M", "description": "modified" }
    ],
    "untracked": ["file3.js"]
  }
}
```

## Common Workflows

### Check Before Commit
```bash
# Check status
node /job/pi-skills/git-ops/git-ops.js status

# View what changed
node /job/pi-skills/git-ops/git-ops.js diff

# Review recent commits
node /job/pi-skills/git-ops/git-ops.js log --limit 5
```

### Branch Management
```bash
# List all branches
node /job/pi-skills/git-ops/git-ops.js branch

# Create new branch
node /job/pi-skills/git-ops/git-ops.js branch --create feature/my-feature

# Switch branch
node /job/pi-skills/git-ops/git-ops.js checkout feature/my-feature
```

### Automation Scripts
```bash
#!/bin/bash
# Check if there are uncommitted changes
STATUS=$(node /job/pi-skills/git-ops/git-ops.js status)
if echo "$STATUS" | jq -e '.data.staged | length > 0' > /dev/null; then
    echo "Changes to commit found"
fi
```

## Security

The tool sanitizes all arguments to prevent command injection:
- Blocks dangerous git options (--exec, --upload-pack, etc.)
- Prevents shell metacharacters (;, |, >, $(), \``)
- Blocks config injection (-c arguments)

## Limitations

- Requires git CLI to be installed
- Some operations require the repository to be git-initialized
- Remote operations may require authentication
- Large repositories may have slower log/diff operations
