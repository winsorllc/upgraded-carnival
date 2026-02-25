---
name: coding-agent
description: Use Claude Code (claude), Cursor, or other AI coding agents programmatically. Spawn coding agents for code reviews, refactoring, and bug fixes.
metadata:
  {
    "openclaw": {
      "emoji": "🤖",
      "requires": { "bins": ["claude", "cursor", "github-cli"] }
    }
  }
---

# Coding Agent

Invoke AI coding agents for development tasks.

## Prerequisites

Install Claude Code:
```bash
brew install claude-code
# or
npm install -g @anthropic-ai/claude-code
```

## Usage

Code review:

```bash
coding-agent review --pr <pr-url>
coding-agent review --diff <file>
```

Refactor:

```bash
coding-agent refactor --file <path> --goal "improve performance"
coding-agent refactor --function <name> --pattern "modernize"
```

Bug fix:

```bash
coding-agent fix --issue <description>
coding-agent fix --file <path> --line <number>
```

Generate tests:

```bash
coding-agent test --file <path>
coding-agent test --coverage
```

## Modes

- `review`: Analyze code changes
- `refactor`: Improve code structure
- `fix`: Debug and fix issues
- `test`: Generate test coverage

## Integration

Works with GitHub PRs, local files, or git diffs.
