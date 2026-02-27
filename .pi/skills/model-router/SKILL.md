---
name: model-router
description: Route requests between different LLM providers and models. Configure routing rules, fallback providers, and model-specific parameters inspired by ZeroClaw and OpenClaw model routing systems.
---

# Model Router

Configure routing between LLM providers and models with fallback support.

## Features

- **config**: Set up routing rules per task type
- **list**: Show available providers and models
- **route**: Route requests to appropriate model
- **fallback**: Configure fallback providers
- **weights**: Set model usage weights
- **status**: Check provider health

## Usage

```bash
# List available providers
./scripts/model-router.js --command list

# Configure routing
./scripts/model-router.js --command config --task coding --provider anthropic --model claude-sonnet-4

# Set fallback
./scripts/model-router.js --command fallback --primary anthropic --fallback openai,groq

# Check status
./scripts/model-router.js --command status

# Route a request
./scripts/model-router.js --command route --task research --prompt "Explain quantum computing"
```

## Routing Rules

Routing can be based on:
- Task type (coding, research, creative, reasoning)
- Token count
- Model capability
- Provider availability
- Cost optimization

## Examples

| Task | Command |
|------|---------|
| List providers | `model-router.js --command list` |
| Config coding | `model-router.js --config --task coding --provider anthropic --model opus` |
| Set fallback | `model-router.js --fallback --provider anthropic --fallback openai,groq` |
| Check status | `model-router.js --status` |
| Route request | `model-router.js --route --task summarize --file article.txt` |

## Notes

- Supports major providers: OpenAI, Anthropic, Groq, etc.
- Automatic failover to fallback providers
- Cost and quality optimized routing
- Health checks on providers