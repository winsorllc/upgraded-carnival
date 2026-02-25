---
name: gh-issues
description: "Fetch and process GitHub issues with auto-fix sub-agents. Use for fetching issues, monitoring for review comments, and spawning agents to fix issues."
homepage: https://github.com/openclaw/openclaw
metadata:
  {
    "thepopebot":
      {
        "emoji": "🔧",
        "requires": { "bins": ["curl", "git", "gh"] },
        "primaryEnv": "GH_TOKEN"
      },
  }
---

# GitHub Issues CLI

Fetch GitHub issues and optionally spawn sub-agents to fix them.

## Setup

1. Set up `GH_TOKEN` environment variable with a GitHub personal access token
2. Ensure `curl`, `git`, and `gh` are available

## Usage

### Fetch Issues

```bash
# List open issues
gh-issues list owner/repo

# Filter by label
gh-issues list owner/repo --label bug

# Filter by assignee
gh-issues list owner/repo --assignee @me

# Limit results
gh-issues list owner/repo --limit 5
```

### Issue Details

```bash
# Get issue details
gh-issues get owner/repo 42

# Get issue comments
gh-issues comments owner/repo 42
```

### Search Issues

```bash
# Search issues
gh-issues search owner/repo "error in console"

# Search with filters
gh-issues search owner/repo "type:issue is:open label:bug"
```

### Auto-fix Mode

```bash
# Process issues with sub-agents (requires sessions_spawn)
gh-issues auto-fix owner/repo --label bug --limit 3

# Dry run (show issues without fixing)
gh-issues auto-fix owner/repo --label enhancement --dry-run
```

### Monitor PR Reviews

```bash
# Check for review comments
gh-issues reviews owner/repo

# Watch mode (poll for new reviews)
gh-issues reviews owner/repo --watch --interval 5
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `--label` | Filter by label |
| `--assignee` | Filter by assignee |
| `--milestone` | Filter by milestone |
| `--limit` | Max issues to return |
| `--state` | Issue state: open, closed, all |
| `--watch` | Keep polling for new issues |
| `--interval` | Minutes between polls (default: 5) |
| `--dry-run` | Show issues without processing |
| `--yes` | Skip confirmation prompts |
| `--fork` | Fork to push branches to |

## Environment

| Variable | Description |
|----------|-------------|
| `GH_TOKEN` | GitHub personal access token |

## Notes

- Uses GitHub REST API via curl
- In fork mode, branches are pushed to the fork and PRs target the source repo
- Supports watch mode for continuous monitoring
- For full auto-fix capabilities, use with delegate-agent skill
