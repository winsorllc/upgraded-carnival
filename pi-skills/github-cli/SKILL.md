---
name: github-cli
description: Comprehensive GitHub CLI operations - repos, issues, PRs, releases, and Actions management
metadata:
  {
    "openclaw": {
      "emoji": "🐙",
      "requires": { "bins": ["gh"] },
      "install": [
        {
          "id": "brew",
          "kind": "brew",
          "formula": "gh",
          "label": "Install gh CLI (brew)"
        }
      ]
    }
  }
---

# GitHub CLI

Use `gh` for comprehensive GitHub operations.

## Authentication

```bash
gh auth login
gh auth status
```

## Repositories

```bash
gh repo list <owner>
gh repo create <name> --public --clone
gh repo fork <owner>/<repo>
gh repo clone <owner>/<repo>
gh repo view <owner>/<repo>
```

## Issues

```bash
gh issue list
gh issue list --state all
gh issue create --title "Bug" --body "Description"
gh issue view <number>
gh issue close <number>
gh issue reopen <number>
gh issue edit <number> --title "New title"
gh issue comment <number> --body "Comment"
```

## Pull Requests

```bash
gh pr list
gh pr create --title "Feature" --body "Description" --base main
gh pr view <number>
gh pr checkout <number>
gh pr merge <number> --squash
gh pr close <number>
gh pr diff <number>
gh pr review <number> --approve
gh pr review <number> --request-changes --body "Needs work"
```

## Releases

```bash
gh release list
gh release create v1.0.0 --title "v1.0.0" --notes "Release notes"
gh release download v1.0.0
gh release view v1.0.0
```

## Actions

```bash
gh run list
gh run view <run-id>
gh run watch <run-id>
gh run rerun <run-id>
gh workflow list
gh workflow run <workflow-file>
gh workflow view <workflow-name>
```

## Gists

```bash
gh gist list
gh gist create <file>
gh gist view <gist-id>
gh gist delete <gist-id>
```

## Searching

```bash
gh search repos "topic:javascript"
gh search issues "bug in:title"
gh search code "function main"
```

## Projects (Beta)

```bash
gh project list
gh project item-list <project-number>
gh project item-add <project-number> --content <issue-url>
```

## Tips

- Use `--json` flag for machine-readable output: `gh issue list --json number,title,state`
- Use `--jq` for filtering: `gh repo list --jq '.[].name'`
- Use `-F` for field flags: `gh issue create -F body.txt`
