---
name: gemini
description: Gemini CLI for one-shot Q&A, summaries, and generation. Use when you need quick answers, summarization, or content generation using Google's Gemini models.
---

# Gemini CLI

Google Gemini CLI for one-shot Q&A and generation.

## Install

```bash
# macOS
brew install gemini-cli

# Or
npm install -g gemini-cli
```

## Quick Start

```bash
# Simple prompt
gemini "What is quantum computing?"

# With specific model
gemini --model gemini-2.0-flash "Explain this code"

# JSON output
gemini --output-format json "Return a JSON object with name and role fields"
```

## Options

| Flag | Description |
|------|-------------|
| `--model` | Model name (gemini-2.0-flash, etc.) |
| `--output-format` | json, text |
| `--list-extensions` | List available extensions |
| `--version` | Show version |

## Extensions

```bash
# List extensions
gemini --list-extensions

# Manage extensions
gemini extensions install <name>
gemini extensions list
```

## Notes

- If auth required, run `gemini` once interactively
- Avoid `--yolo` for safety
- Best for quick one-shot tasks
