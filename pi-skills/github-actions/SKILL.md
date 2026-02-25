---
name: github-actions
description: Monitor, manage, and analyze GitHub Actions workflows. Use when: checking CI/CD status, viewing workflow run logs, rerunning failed jobs, or analyzing build performance.
---

# GitHub Actions Skill

Monitor and manage GitHub Actions workflows and runs.

## When to Use

✅ **USE this skill when:**

- Check CI status of a PR or branch
- View failed workflow run logs
- Rerun failed jobs
- Analyze workflow performance
- Cancel running workflows
- Get workflow run details

## When NOT to Use

❌ **DON'T use this skill when:**

- Creating or modifying workflows → edit workflow files directly
- Managing secrets → use GitHub settings
- Repository management → use gh CLI directly

## Requirements

- `gh` CLI authenticated with GitHub

## Setup

```bash
# Authenticate
gh auth login

# Verify
gh auth status
```

## Usage

### Check Workflow Status

```bash
# List recent workflow runs
gh-actions-status.sh

# Check specific repo
gh-actions-status.sh --repo owner/repo

# Filter by status
gh-actions-status.sh --status failed
gh-actions-status.sh --status success
gh-actions-status.sh --status running
```

### View Run Details

```bash
# Get run details
gh-actions-view.sh <run-id>

# View only failed steps
gh-actions-logs.sh <run-id> --failed
```

### Manage Runs

```bash
# Rerun failed jobs
gh-actions-rerun.sh <run-id>

# Cancel running workflow
gh-actions-cancel.sh <run-id>
```

### Workflow Analytics

```bash
# Get workflow statistics
gh-actions-stats.sh --repo owner/repo

# Check run duration
gh-actions-duration.sh <run-id>
```

## Commands

### gh-actions-status.sh

List recent workflow runs.

```bash
./gh-actions-status.sh [options]

Options:
  --repo NAME      Repository (default: current)
  --status STATE  Filter: success, failure, cancelled, pending, running
  --limit N       Number of runs (default: 10)
  --branch NAME   Filter by branch
```

### gh-actions-view.sh

View workflow run details.

```bash
./gh-actions-view.sh <run-id> [options]

Options:
  --repo NAME     Repository
  --json          Output as JSON
```

### gh-actions-logs.sh

View workflow run logs.

```bash
./gh-actions-logs.sh <run-id> [options]

Options:
  --repo NAME     Repository
  --failed        Show only failed steps
  --step N        Show specific step
```

### gh-actions-rerun.sh

Rerun a workflow.

```bash
./gh-actions-rerun.sh <run-id> [options]

Options:
  --repo NAME     Repository
  --failed        Rerun only failed jobs
```

### gh-actions-cancel.sh

Cancel a running workflow.

```bash
./gh-actions-cancel.sh <run-id> [options]

Options:
  --repo NAME     Repository
```

## Examples

### Check All PR CI Status

```bash
gh-actions-status.sh --repo owner/repo --branch main
```

### Rerun Failed Job

```bash
gh run rerun 1234567890 --failed
gh-actions-rerun.sh 1234567890 --failed
```

### Quick Status Check

```bash
# One-liner for current repo
gh run list --limit 5 --json name,status,conclusion
```

### Get Failed Run URL

```bash
gh run view 1234567890 --json url | jq -r '.url'
```

## Notes

- Requires `gh` CLI with proper authentication
- Rate limits apply for API calls
- Use `--json` for programmatic consumption
- Workflows must be enabled in the repository
