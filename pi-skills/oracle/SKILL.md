---
name: oracle
description: Use Oracle CLI to bundle prompts with code context for external AI models. Supports browser automation, API mode, and session management.
metadata:
  {
    "openclaw": {
      "emoji": "🧿",
      "requires": { "bins": ["oracle"] }
    }
  }
---

# Oracle CLI

Bundle prompts with code context for AI models.

## Installation

```bash
npm install -g @steipete/oracle
# or
npx -y @steipete/oracle --help
```

## Usage

Basic query:

```bash
oracle "Explain the auth system"
oracle "Find the login function" --files lib/auth.js
```

With engine:

```bash
oracle --engine browser "Analyze the codebase"
oracle --engine api "Quick question"
```

File selection:

```bash
oracle "Question" --files src/*.js
oracle "Question" --dir lib
oracle "Question" --exclude "**/*.test.js"
```

Dry run:

```bash
oracle --dry-run "Question"
oracle --files-report "Question"
```

Session management:

```bash
oracle --attach session-id
oracle --sessions list
```

## Engines

- `browser`: GPT-5.2 Pro via ChatGPT (long think)
- `api`: Direct API calls (faster)

## Best Practices

1. Use minimal file sets (fewest files = best context)
2. Preview with `--dry-run` before expensive runs
3. Use browser for complex analysis (10 min to 1 hour)
4. Reattach sessions instead of re-running on timeout
