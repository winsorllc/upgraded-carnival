---
name: oracle
description: Best practices for using the oracle CLI (prompt + file bundling, engines, sessions). Use when you need to offload complex reasoning to another model with full repo context.
---

# oracle

Bundle prompts + files for "one-shot" requests to external models with full repo context.

## Install

```bash
npm install -g @steipete/oracle
# Or use: npx -y @steipete/oracle
```

## Main Use Case

Default: `--engine browser` with GPT-5.2 Pro in ChatGPT.

This is the "long think" path: ~10 minutes to ~1 hour is normal. Expect a stored session you can reattach to.

## Recommended Defaults

```bash
--engine browser
--model gpt-5.2-pro  # or "5.2 Pro"
```

## Golden Path

1. Pick a tight file set (fewest files containing the truth)
2. Preview payload + token spend: `--dry-run` + `--files-report`
3. Use browser mode for GPT-5.2 Pro workflow
4. If timeout: reattach to stored session (don't re-run)

## Commands

```bash
# Help
oracle --help

# Dry run to preview tokens
oracle --files "src/*.ts" --dry-run --files-report

# Browser mode (default, opens ChatGPT)
oracle --files "src/*.ts" --prompt "Explain this code"

# API mode (direct API call)
oracle --engine api --files "src/*.ts" --prompt "Explain this code"

# With specific model
oracle --model gpt-5.2-pro --files "src/*.ts" --prompt "Review this"

# Reattach to session
oracle --session <session-id>
```

## Options

| Flag | Description |
|------|-------------|
| `--engine` | browser or api |
| `--model` | Model name |
| `--files` | Files to include |
| `--prompt` | Your question/prompt |
| `--dry-run` | Preview without sending |
| `--files-report` | Show token breakdown |
| `--session` | Reattach to session |

## Tips

- Use minimal file sets - only include files that contain the truth
- Use `--dry-run` to estimate cost before running
- Browser mode stores sessions - reattach if timeout
- Output is advisory - verify against code + tests
