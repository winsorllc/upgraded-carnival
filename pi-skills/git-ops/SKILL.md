---
name: git-ops
description: Safe git operations with JSON output. Provides structured repository management including branch, commit, diff, and PR operations.
metadata:
  {
    "zeroclaw":
      {
        "emoji": "🔀",
        "requires": { "bins": ["git", "gh"] },
      },
  }
---

# Git Operations

Safe, structured git operations with JSON output for programmatic consumption.

## When to Use

✅ **USE this skill when:**

- Creating branches, commits, and pull requests
- Viewing git history, diffs, and status
- Managing repository state
- GitHub CLI integration

## When NOT to Use

❌ **DON'T use this skill when:**

- Basic read-only operations (use shell git directly)
- Complex merges that require human review
- Force operations on shared branches

## Commands

### Status

```bash
git status --porcelain
git status -sb
```

### Branching

```bash
# Create and switch to new branch
git checkout -b feature/new-feature

# List branches
git branch -a

# Delete branch
git branch -d branch-name
```

### Commits

```bash
# Stage all changes
git add -A

# Commit with message
git commit -m "Add new feature"

# Amend last commit
git commit --amend -m "New message"

# Interactive rebase
git rebase -i HEAD~3
```

### History

```bash
# Log with graph
git log --oneline --graph --all

# Show file history
git log --follow -p filename

# Blame
git blame filename
```

### Diff

```bash
# Working tree diff
git diff

# Staged changes
git diff --cached

# Between branches
git diff main..feature-branch
```

### Remote

```bash
# Fetch all
git fetch --all

# Pull with rebase
git pull --rebase

# Push
git push origin branch-name
```

### GitHub Integration (gh CLI)

```bash
# List PRs
gh pr list

# Create PR
gh pr create --title "Feature" --body "Description"

# View PR status
gh pr status

# Check PR diff
gh pr diff pr-number

# Merge PR
gh pr merge pr-number --squash
```

## Security

This tool sanitizes git arguments to prevent command injection:
- Blocks dangerous options like `--exec=`, `--upload-pack=`, `--receive-pack=`
- Blocks config injection via `-c`
- Blocks shell metacharacters (`$()`, backticks, `|`, `;`, `>`)

## JSON Output

For scripting, use:
```bash
git status --porcelain=2
git log --format='{"hash":"%H","message":"%s","author":"%an"}'
```

## Notes

- Always use `--force-with-lease` instead of `--force` when pushing
- Prefer squashing commits before merging PRs
- Use meaningful commit messages
