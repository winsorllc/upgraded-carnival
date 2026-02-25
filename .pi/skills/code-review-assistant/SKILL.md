---
name: code-review-assistant
description: "Automated code review assistant that analyzes GitHub pull requests and code changes. Use when: (1) user shares a GitHub PR URL and wants a code review, (2) you need to review code for bugs, security issues, or best practices, (3) performing automated code quality checks before merging, (4) analyzing code diffs for potential improvements."
---

# Code Review Assistant

Automated code review assistant that analyzes GitHub pull requests, code diffs, and files for bugs, security issues, code quality, and best practices.

## When to Use

✅ **USE this skill when:**

- User shares a GitHub PR URL and asks for a review
- User wants to analyze code changes for bugs or issues
- You need to check code for security vulnerabilities
- Performing pre-merge code quality checks
- Analyzing code for best practices and improvements
- User wants feedback on a specific file or diff

❌ **DON'T use this skill when:**

- The user just wants a summary of what changed (use summarize)
- User wants to merge PRs automatically (use git-ops for that)
- Code is too large to analyze in one pass (ask user to narrow focus)

## Setup

No additional setup required. Uses:
- `gh` CLI for GitHub PR fetching (must be authenticated)
- LLM for intelligent code analysis

Verify GitHub authentication:
```bash
gh auth status
```

## Usage

### Review a GitHub Pull Request

```bash
node /job/.pi/skills/code-review-assistant/review.js "https://github.com/owner/repo/pull/123"
```

### Review from a branch diff

```bash
node /job/.pi/skills/code-review-assistant/review.js --branch "feature-branch"
```

### Review specific files

```bash
node /job/.pi/skills/code-review-assistant/review.js --files "src/index.ts" "src/utils.ts"
```

### Review from pasted diff

```bash
node /job/.pi/skills/code-review-assistant/review.js --diff "diff content here"
```

### Review with specific focus

```bash
node /job/.pi/skills/code-review-assistant/review.js --focus security "https://github.com/owner/repo/pull/123"
node /job/.pi/skills/code-review-assistant/review.js --focus bugs "https://github.com/owner/repo/pull/123"
node /job/.pi/skills/code-review-assistant/review.js --focus best-practices "https://github.com/owner/repo/pull/123"
```

### JSON output (for automation)

```bash
node /job/.pi/skills/code-review-assistant/review.js --json "https://github.com/owner/repo/pull/123"
```

### Quick inline check (for use in other skills)

```bash
node /job/.pi/skills/code-review-assistant/quick-check.js "const x = 1;" javascript
```

## Focus Areas

The review can focus on specific areas:

| Focus | Description |
|-------|-------------|
| `security` | Security vulnerabilities, injection risks, exposed secrets |
| `bugs` | Logic errors, null pointer risks, race conditions |
| `best-practices` | Code style, performance, maintainability |
| `performance` | Performance issues, memory leaks, inefficient algorithms |
| `all` (default) | Full review covering all areas |

## Output Format

### Human-readable (default)

```
============================================================
Code Review: PR #123 - Add user authentication
============================================================
Repo: owner/repo
Author: @developer
Files changed: 3
Additions: 150 | Deletions: 20

--- Security Issues ---
⚠️ [HIGH] auth.js:45 - Hardcoded API key detected
   Consider using environment variables instead
   
✅ No other security issues found

--- Bugs ---
🐛 [MEDIUM] login.js:78 - Missing null check on user object
   Add defensive check before accessing user.email
   
🔍 [LOW] utils.js:12 - Unused variable 'temp'

--- Best Practices ---
💡 [LOW] auth.js:90 - Consider using const instead of let
   Variable 'token' is never reassigned

--- Summary ---
Overall: 1 high priority, 1 medium priority, 2 low priority issues
Recommendation: Address high and medium issues before merging
```

### JSON output

```json
{
  "pr": {
    "url": "https://github.com/owner/repo/pull/123",
    "title": "Add user authentication",
    "repo": "owner/repo",
    "author": "@developer",
    "filesChanged": 3,
    "additions": 150,
    "deletions": 20
  },
  "issues": [
    {
      "severity": "high",
      "category": "security",
      "file": "auth.js",
      "line": 45,
      "message": "Hardcoded API key detected",
      "suggestion": "Consider using environment variables instead"
    },
    {
      "severity": "medium",
      "category": "bugs",
      "file": "login.js",
      "line": 78,
      "message": "Missing null check on user object",
      "suggestion": "Add defensive check before accessing user.email"
    }
  ],
  "summary": {
    "total": 4,
    "high": 1,
    "medium": 1,
    "low": 2,
    "recommendation": "Address high and medium issues before merging"
  }
}
```

## Common Workflows

### Quick PR Review
```
User: Can you review this PR? https://github.com/owner/repo/pull/456
Agent: [Uses code-review-assistant to fetch PR and analyze]
```

### Pre-merge Check
```
User: Run a security check on my branch before I submit
Agent: [Uses code-review-assistant with --focus security on branch]
```

### Code Quality Review
```
User: What's the code quality like in these files?
Agent: [Uses code-review-assistant with --focus best-practices on files]
```

## Integration with Other Skills

- **With git-ops**: Get branch diffs and feed to review
- **With pr-description-generator**: After review, generate PR description
- **With memory-agent**: Store review findings for future reference
- **With email-agent**: Email review results to team

## Limitations

- Requires `gh` CLI authentication for GitHub PRs
- Large PRs may be truncated for analysis
- Cannot review binary files or very large changesets
- Some patterns may be false positives (LLM analysis)

## Tips

1. **For large PRs**: Ask user to narrow focus to specific files
2. **For security**: Use `--focus security` for targeted reviews
3. **For automation**: Use `--json` for CI/CD integration
4. **For quick checks**: Use `quick-check.js` for inline code snippets
