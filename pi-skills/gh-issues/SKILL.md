---
name: gh-issues
description: Auto-fix GitHub issues by spawning parallel sub-agents to implement fixes and open PRs. Use when: user wants to automatically fix bugs/enhancements from GitHub issues, process multiple issues in batch, or watch a repo for new issues and auto-fix them.
metadata:
  requires:
    bins: ["curl", "git", "gh"]
    env: ["GH_TOKEN"]
  primaryEnv: GH_TOKEN
---

# gh-issues — Auto-fix GitHub Issues with Parallel Sub-agents

Automatically fetch GitHub issues, spawn sub-agents to implement fixes, and open pull requests. Supports filtering by labels, milestones, assignees, and watch mode for continuous processing.

## When to Use

✅ **USE this skill when:**
- User wants to automatically fix bugs from GitHub issues
- Processing multiple issues in batch mode
- Setting up continuous issue fixing with watch mode
- User asks to "fix all open bugs" or "process the issue queue"

❌ **DON'T use this skill when:**
- Single issue that needs manual review first
- Issues requiring user input/clarification
- Non-GitHub task trackers (use appropriate tools)

## Installation

```bash
# Requires git, gh CLI, and curl (usually pre-installed)
npm install -g @cli/gh  # If not already installed
```

## Setup

### Token Configuration

The skill needs `GH_TOKEN` environment variable. Check in order:
1. Environment variable: `echo $GH_TOKEN`
2. Config file: `cat ~/.thepopebot/config.json | jq -r '.skills."gh-issues".apiKey'`
3. GitHub secrets (for Docker agent): `AGENT_GH_TOKEN`

### Fork Mode (Optional)

For contributing to repos you don't own:
```bash
# Set up your fork
gh repo fork owner/repo --clone=false
```

## Usage

### Basic Usage

```bash
# Process issues from current repo
node {baseDir}/index.js owner/repo --limit 5

# Process with filters
node {baseDir}/index.js owner/repo --label bug --limit 10 --milestone v1.0

# Watch mode (continuous)
node {baseDir}/index.js owner/repo --watch --interval 5

# Dry run (preview only)
node {baseDir}/index.js owner/repo --dry-run --limit 5
```

### Command Line Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--label` | _(none)_ | Filter by label (e.g., `bug`, `enhancement`) |
| `--limit` | 10 | Max issues to fetch per poll |
| `--milestone` | _(none)_ | Filter by milestone title |
| `--assignee` | _(none)_ | Filter by assignee (`@me` for current user) |
| `--state` | `open` | Issue state: `open`, `closed`, `all` |
| `--fork` | _(none)_ | Your fork (`user/repo`) to push branches from |
| `--watch` | `false` | Keep polling for new issues |
| `--interval` | 5 | Minutes between polls (with `--watch`) |
| `--dry-run` | `false` | Fetch and display only — no sub-agents |
| `--yes` | `false` | Skip confirmation, auto-process all |
| `--model` | _(none)_ | Model for sub-agents (e.g., `claude-sonnet-4-5-20250929`) |
| `--notify-channel` | _(none)_ | Telegram channel ID for PR summaries |

## Architecture

### 6-Phase Workflow

```
Phase 1: Parse Arguments
    ↓
Phase 2: Fetch Issues (GitHub API via curl)
    ↓
Phase 3: Confirm Processing (unless --yes)
    ↓
Phase 4: Spawn Sub-agents (parallel)
    ↓
Phase 5: Monitor & Wait (unless --cron)
    ↓
Phase 6: Handle PR Reviews (if --watch)
```

### Phase 2: Fetch Issues

Uses GitHub REST API directly (no `gh` CLI for fetching):

```bash
curl -s \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/owner/repo/issues?state=open&per_page=10"
```

**Query Parameters:**
- `state`: `open`, `closed`, or `all`
- `labels`: Comma-separated list (e.g., `bug,help-wanted`)
- `milestone`: Milestone number or `*` for any
- `assignee`: Username or `@me`
- `per_page`: 1-100 (default 30)
- `sort`: `created`, `updated`, `comments`
- `direction`: `asc` or `desc`

### Phase 4: Spawn Sub-agents

For each issue, spawn a sub-agent with:
- Issue title and description
- Comments thread
- Repo context
- Branch naming convention: `fix/issue-<number>-<slug>`

Example sub-agent prompt:
```
Fix GitHub issue #123: "Button color wrong"

Issue Body:
The submit button uses #ff0000 instead of #00ff00...

Comments:
- User1: Can you also update the hover state?
- Maintainer: This affects all themes

Branch: fix/issue-123-button-color
```

### Phase 5: Monitor PRs

Track sub-agent progress:
- ✅ Branch created
- ✅ Code committed
- ✅ PR opened
- ⏳ Awaiting review
- ✅ Merged / ❌ Closed

## Implementation Structure

```
gh-issues/
├── SKILL.md              # This file
├── index.js              # Main entry point
├── fetch-issues.js       # GitHub API client
├── spawn-agent.js        # Sub-agent spawner
├── monitor-prs.js        # PR status tracker
└── utils/
    ├── repo-parser.js    # Parse owner/repo from args/git remote
    └── token-resolver.js # Resolve GH_TOKEN from env/config
```

## Examples

### Fix All Bug Issues

```javascript
// Process up to 5 issues labeled "bug"
node index.js myorg/myrepo --label bug --limit 5 --yes
```

### Watch Mode for Continuous Fixes

```javascript
// Watch for new issues, process every 5 minutes
node index.js myorg/myrepo --label bug --watch --interval 5 --notify-channel -1002381931352
```

### Contributing to External Repo

```javascript
# Process issues from upstream, push to your fork
node index.js upstream/repo --fork yourname/repo --label "good first issue" --limit 3
```

### Cron Mode (Fire-and-Forget)

```javascript
# Spawn agents and exit (good for cron jobs)
node index.js myorg/myrepo --label bug --cron --limit 10
```

## Error Handling

### Common Issues

1. **Token Expired**: Refresh GH_TOKEN and retry
2. **Rate Limited**: Wait or use `--interval` to space requests
3. **Permission Denied**: Check repo access or use fork mode
4. **Branch Exists**: Append timestamp to branch name
5. **PR Already Open**: Skip or update existing PR

### Retry Logic

```javascript
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function fetchWithRetry(url, options) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === MAX_RETRIES - 1) throw err;
      await sleep(RETRY_DELAY * (i + 1));
    }
  }
}
```

## Best Practices

1. **Start Small**: Test with `--limit 1` first
2. **Use Labels**: Filter to specific issue types
3. **Dry Run First**: Always test with `--dry-run` before full execution
4. **Monitor Closely**: Watch first few PRs before enabling auto-merge
5. **Respect Maintainers**: Don't spam repos with low-quality PRs

## Security Notes

- Never commit GH_TOKEN to git
- Use scoped tokens with minimal permissions
- Review sub-agent code before merging
- Set appropriate `ALLOWED_PATHS` for auto-merge

## Testing

```bash
# Test token resolution
node index.js --dry-run --limit 1

# Test issue fetching (no agents)
node index.js owner/repo --dry-run --limit 5

# Test with single issue
node index.js owner/repo --limit 1 --yes
```

## Integration with PopeBot

This skill integrates with PopeBot's agent system:
- Uses `delegate-task` skill for spawning sub-agents
- Leverages `github-ops` for PR monitoring
- Sends notifications via existing PopeBot channels
- Logs all activity to PopeBot session logs

## References

- [GitHub Issues API](https://docs.github.com/en/rest/issues)
- [GitHub Pull Requests API](https://docs.github.com/en/rest/pulls)
- [GitHub Token Permissions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
