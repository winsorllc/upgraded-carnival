---
name: github-issues
description: Manage GitHub issues via CLI. Use when: (1) listing, creating, or updating GitHub issues, (2) adding labels or assignees, (3) closing or reopening issues, (4) commenting on issues.
---

# GitHub Issues Skill

Manage GitHub issues directly via the GitHub API.

## When to Use

✅ **USE this skill when:**
- Listing, creating, or updating GitHub issues
- Adding labels or assignees
- Closing or reopening issues
- Commenting on issues

❌ **DON'T use this skill when:**
- PR management → use GitHub skill
- Complex automation → use gh-issues skill

## Setup

Set environment variable:
```bash
export GH_TOKEN="your-github-token"
```

Or use `--token` flag with commands.

## Common Commands

### List Issues

```bash
# List open issues
github-issues.js list owner/repo

# List issues with labels
github-issues.js list owner/repo --label bug

# List all issues (open and closed)
github-issues.js list owner/repo --state all

# JSON output
github-issues.js list owner/repo --json
```

### Get Issue

```bash
# Get issue details
github-issues.js get owner/repo 42

# Include comments
github-issues.js get owner/repo 42 --comments
```

### Create Issue

```bash
# Create a new issue
github-issues.js create owner/repo "Issue title" --body "Description"

# With labels
github-issues.js create owner/repo "Bug report" --label bug --label critical

# With assignee
github-issues.js create owner/repo "Fix this" --assignee username
```

### Update Issue

```bash
# Update title
github-issues.js update owner/repo 42 --title "New title"

# Update body
github-issues.js update owner/repo 42 --body "New description"

# Add labels
github-issues.js update owner/repo 42 --add-label enhancement

# Remove labels
github-issues.js update owner/repo 42 --remove-label bug

# Assign user
github-issues.js update owner/repo 42 --assignee username
```

### Close/Reopen Issue

```bash
# Close an issue
github-issues.js close owner/repo 42

# Reopen an issue
github-issues.js reopen owner/repo 42
```

### Comments

```bash
# Add comment
github-issues.js comment owner/repo 42 "This is a comment"

# List comments
github-issues.js comments owner/repo 42
```

### Search

```bash
# Search issues
github-issues.js search "repo:owner/repo is:issue bug"
```

## Scripting Examples

### Close all issues with label

```bash
#!/bin/bash
# Close all issues with 'stale' label
issues=$(github-issues.js list owner/repo --label stale --json | jq -r '.[].number')

for issue in $issues; do
    github-issues.js close owner/repo $issue
done
```

### Create issue from template

```bash
#!/bin/bash
github-issues.js create owner/repo "Bug: $title" \
    --body "## Description
$description

## Steps to Reproduce
1. 
2. 

## Expected Behavior
" \
    --label bug
```

## Notes

- Requires GitHub token with repo scope
- All operations use GitHub REST API
- Rate limits: 5000 requests/hour for authenticated requests
