---
name: git-automation
description: Automate Git operations. Create branches, commits, PRs, and manage repositories programmatically.
---

# Git Automation

Automate Git operations including branch management, commits, pull requests, and repository operations.

## Setup

Requires Git installed and configured.

## Usage

### Create a Branch and Commit

```bash
{baseDir}/git-automation.js --branch feature/new-feature --message "Add new feature"
```

### Create a Pull Request

```bash
{baseDir}/git-automation.js --pr --title "New Feature" --body "Description"
```

### List Branches

```bash
{baseDir}/git-automation.js --list-branches
```

### Show Recent Commits

```bash
{baseDir}/git-automation.js --log --count 10
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--branch` | Create and switch to branch | No |
| `--commit` | Commit staged changes | No |
| `--message` | Commit message | No |
| `--pr` | Create pull request | No |
| `--title` | PR title | For PR |
| `--body` | PR body | No |
| `--list-branches` | List all branches | No |
| `--log` | Show commit log | No |
| `--count` | Number of commits to show | No |
| `--push` | Push to remote | No |
| `--all` | Push all branches | No |

## When to Use

- Automated branch creation for jobs
- Creating commits from scripts
- Managing pull requests programmatically
- Repository maintenance tasks
