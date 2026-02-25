---
name: github-ops
description: GitHub REST API operations for repositories, issues, PRs, and actions.
homepage: https://docs.github.com/en/rest
metadata:
  { "openclaw": { "emoji": "🐙", "requires": { "env": ["GH_TOKEN"] }, "primaryEnv": "GH_TOKEN" } }
---

# github-ops

GitHub REST API integration for managing repositories, issues, pull requests, and Actions workflows.

## Setup

1. Create a Personal Access Token at https://github.com/settings/tokens
2. Required scopes: `repo`, `workflow`, `read:user` (minimum)
3. Store in environment: `GH_TOKEN=ghp_xxx`

## API Basics

All requests need:
```bash
curl -H "Authorization: Bearer $GH_TOKEN" \
     -H "Accept: application/vnd.github+json" \
     -H "X-GitHub-Api-Version: 2022-11-28" \
     https://api.github.com/...
```

## Common Operations

### Get authenticated user
```bash
curl -H "Authorization: Bearer $GH_TOKEN" https://api.github.com/user
```

### List user repos
```bash
curl -H "Authorization: Bearer $GH_TOKEN" https://api.github.com/user/repos
```

### Get repo
```bash
curl -H "Authorization: Bearer $GH_TOKEN" https://api.github.com/repos/{owner}/{repo}
```

### Create issue
```bash
curl -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{owner}/{repo}/issues \
  -d '{"title":"Bug report","body":"Description"}'
```

### List issues
```bash
curl -H "Authorization: Bearer $GH_TOKEN" \
  https://api.github.com/repos/{owner}/{repo}/issues?state=open
```

### Get issue
```bash
curl -H "Authorization: Bearer $GH_TOKEN" \
  https://api.github.com/repos/{owner}/{repo}/issues/{number}
```

### Update issue
```bash
curl -X PATCH \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{owner}/{repo}/issues/{number} \
  -d '{"state":"closed"}'
```

### Add comment to issue
```bash
curl -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{owner}/{repo}/issues/{number}/comments \
  -d '{"body":"My comment"}'
```

### Create PR
```bash
curl -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{owner}/{repo}/pulls \
  -d '{"title":"New feature","head":"feature-branch","base":"main"}'
```

### List PRs
```bash
curl -H "Authorization: Bearer $GH_TOKEN" \
  https://api.github.com/repos/{owner}/{repo}/pulls?state=open
```

### Get workflow runs
```bash
curl -H "Authorization: Bearer $GH_TOKEN" \
  https://api.github.com/repos/{owner}/{repo}/actions/runs?status=in_progress
```

### Trigger workflow
```bash
curl -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches \
  -d '{"ref":"main"}'
```

### Add labels to issue
```bash
curl -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{owner}/{repo}/issues/{number}/labels \
  -d '{"labels":["bug","critical"]}'
```

### Remove label from issue
```bash
curl -X DELETE \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{owner}/{repo}/issues/{number}/labels/{label_name}
```

### Get PR reviews
```bash
curl -H "Authorization: Bearer $GH_TOKEN" \
  https://api.github.com/repos/{owner}/{repo}/pulls/{number}/reviews
```

### Create PR review
```bash
curl -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{owner}/{repo}/pulls/{number}/reviews \
  -d '{"body":"LGTM","event":"APPROVE"}'
```

## Notes

- Repository owner/repo format: `owner/repo` (e.g., `octocat/Hello-World`)
- Rate limits: 5000 requests/hour for authenticated users
- All timestamps are ISO 8601 format
