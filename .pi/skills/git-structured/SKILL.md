---
name: git-structured
description: "Safe Git operations with JSON output. Use when: managing repository state, commits, branches. NOT for: destructive operations without approval."
metadata: { "openclaw": { "emoji": "🔀", "requires": { "bins": ["git"], "env": ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL"] } } }
---

# Git Structured Skill

Perform safe, structured Git operations with JSON output. Provides read-only and write operations with safety checks.

## When to Use

✅ **USE this skill when:**
- Checking repository status
- Making commits
- Managing branches
- Viewing history and diffs
- Stash operations

❌ **DON'T use this skill when:**
- Destructive operations without backup
- Force pushing to protected branches
- Rewriting history on shared branches

## Usage

### Status

```javascript
const { git } = require('/job/.pi/skills/git-structured/git.js');

const status = await git('status');
console.log(status);
// {
//   branch: "main",
//   staged: [{ path: "src/index.js", status: "M" }],
//   unstaged: [],
//   untracked: ["new-file.md"],
//   clean: false
// }
```

### Diff

```javascript
const diff = await git('diff', {
  cached: false,
  files: "src/"
});
console.log(diff);
// {
//   files: [{
//     path: "src/index.js",
//     hunks: [
//       { start: 10, lines: "+ console.log('new');" }
//     ]
//   }]
// }
```

### Log

```javascript
const log = await git('log', {
  maxEntries: 10,
  format: "short"
});
console.log(log);
// [
//   { hash: "abc123", author: "John", date: "2026-02-25", message: "Fix bug" },
//   ...
// ]
```

### Add & Commit

```javascript
await git('add', { files: ["src/index.js", "src/utils.js"] });

const commit = await git('commit', {
  message: "Add new feature",
  all: false // use -a flag
});
console.log(commit);
// { hash: "def456", changedFiles: 2 }
```

### Branch

```javascript
// List branches
const branches = await git('branch');
// { current: "main", branches: ["main", "feature", "bugfix"] }

// Create branch
await git('checkout', {  
  newBranch: "feature/new-ui",
  startPoint: "main"
});

// Switch branch
await git('checkout', { branch: "main" });
```

### Push & Pull

```javascript
const push = await git('push', {
  remote: "origin",
  branch: "feature",
  setUpstream: true
});

const pull = await git('pull', {
  remote: "origin",
  rebase: false
});
```

### Stash

```javascript
await git('stash', { action: 'push', message: 'WIP' });
await git('stash', { action: 'list' });
await git('stash', { action: 'pop', index: 0 });
```

## API

```javascript
git(operation, options = {})
```

**Operations:** `status`, `diff`, `log`, `add`, `commit`, `branch`, `checkout`, `push`, `pull`, `stash`, `reset`, `revert`

**Options vary by operation:**
```javascript
// Diff options
{ cached: true, files: "src/" }

// Commit options  
{ message: "msg", all: true, amend: false }

// Checkout options
{ branch: "main" } or { newBranch: "feature", startPoint: "main" }
```

## Safety Features

### Injection Prevention
- Argument sanitization
- No shell expansion
- Blocked dangerous flags (`--exec=`, `--upload-pack=`)

### Write Access Control
- Configurable autonomy levels
- Approval required for destructive operations
- Audit logging

### Protected Branches
```javascript
const PROTECTED = ['main', 'master', 'develop', 'release/*'];

if (PROTECTED.some(p => branchMatches(p, targetBranch))) {
  throw new Error('Cannot force-push to protected branch');
}
```

## Examples

### Feature Branch Workflow

```javascript
// Check current state
const status = await git('status');
if (!status.clean) {
  await git('stash', { action: 'push', message: 'WIP before feature' });
}

// Create feature branch
await git('checkout', {
  newBranch: 'feature/user-auth',
  startPoint: 'main'
});

// Make changes, then commit
await git('add', { files: ['src/auth.js'] });
await git('commit', { message: 'Add authentication module' });

// Push feature branch
await git('push', {
  remote: 'origin',
  branch: 'feature/user-auth',
  setUpstream: true
});
```

### Review Changes

```javascript
// Get diff of staged changes
const stagedDiff = await git('diff', { cached: true });

// Get log of recent commits
const recentLog = await git('log', { maxEntries: 5 });

// Check if branch is up to date
await git('fetch', { remote: 'origin' });
const behindAhead = await git('rev-list', {
  leftRight: true,
  range: 'HEAD...origin/main'
});
```

### Undo Changes

```javascript
// Unstage file
await git('reset', { file: 'src/index.js' });

// Discard working changes
await git('checkout', { file: 'src/index.js' });

// Amend last commit
await git('commit', { amend: true, message: 'Updated message' });

// Soft reset (keep changes staged)
await git('reset', { to: 'HEAD~1', soft: true });

// Hard reset (dangerous!)
await git('reset', { to: 'HEAD~1', hard: true, approved: true });
```

## Error Handling

```javascript
try {
  await git('commit', { message: '' });
} catch (error) {
  if (error.code === 'EMPTY_COMMIT') {
    console.log('Cannot create empty commit');
  } else if (error.code === 'CONFLICT') {
    console.log('Merge conflict detected');
  } else if (error.code === 'UNCOMMITTED_CHANGES') {
    console.log('Stash or commit changes first');
  }
}
```

## Bash CLI

```bash
# Status
node /job/.pi/skills/git-structured/git.js --op status

# Diff
node /job/.pi/skills/git-structured/git.js --op diff --cached

# Commit
node /job/.pi/skills/git-structured/git.js \
  --op commit \
  --message "Add feature" \
  --files "src/*.js"

# Branch
node /job/.pi/skills/git-structured/git.js \
  --op checkout \
  --new-branch feature/test \
  --start-point main
```

## Output Formats

All operations return structured JSON for easy parsing:

**Status:**
```json
{
  "branch": "main",
  "staged": [{"path": "file.js", "status": "M"}],
  "unstaged": [],
  "untracked": [],
  "clean": false
}
```

**Diff:**
```json
{
  "files": [
    {
      "path": "src/index.js",
      "hunks": [
        {
          "start": 10,
          "changes": [
            {"type": "add", "line": "+ new code"},
            {"type": "remove", "line": "- old code"}
          ]
        }
      ]
    }
  ]
}
```

**Log:**
```json
[
  {
    "hash": "abc123def456",
    "shortHash": "abc123d",
    "author": "John Doe",
    "email": "john@example.com",
    "date": "2026-02-25T13:30:00Z",
    "message": "Add new feature"
  }
]
```
