---
name: git-health
description: Git repository health diagnostics. Checks commit history, branch status, remote configuration, and common git issues.
---

# Git Health Check

Diagnose Git repository health and configuration issues, inspired by zeroclaw's diagnostic tools.

## Setup
No dependencies required.

## Usage

### Full Repository Check
```bash
{baseDir}/git-health.sh
```

### Check specific aspects
```bash
{baseDir}/git-health.sh --commits    # Check commit quality
{baseDir}/git-health.sh --branches   # Check branch status
{baseDir}/git-health.sh --remotes    # Check remote configuration
{baseDir}/git-health.sh --hooks      # Check git hooks
{baseDir}/git-health.sh --size       # Check repo size
```

### Output
```
╔════════════════════════════════════════════════════════╗
║           Git Repository Health Report                 ║
╚════════════════════════════════════════════════════════╝

✓ Git Initialized       Repository properly initialized
✓ Remote Config         origin: git@github.com:user/repo.git
✓ Main Branch           main branch exists
! Unpushed Commits      3 commits not pushed to origin/main
✓ Commit History        47 commits, last: 2 hours ago
✓ Large Files           No files larger than 10MB
✓ Git Hooks             2 hooks configured
✓ Stash Status          Clean (0 stashes)

═══════════════════════════════════════════════════════════
Overall Status: ⚠️ WARNING (1 issue found)
═══════════════════════════════════════════════════════════
```

## When to Use
- Before submitting PRs
- Troubleshooting git issues
- Repository maintenance
- CI/CD pipeline checks
- Onboarding new developers
