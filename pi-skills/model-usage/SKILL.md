---
name: model-usage
description: Track and analyze LLM usage costs and token consumption across multiple providers. Monitor API costs, generate cost reports, and track usage patterns over time.
metadata:
  {
    "openclaw": {
      "emoji": "💰",
      "requires": { "env": ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"] }
    }
  }
---

# Model Usage Tracker

Track and analyze LLM usage costs across providers.

## Capabilities

- Record API calls with token counts and costs
- Generate cost reports by provider, model, date range
- Track budget limits and alert when approaching thresholds
- Analyze usage patterns over time
- Export data for billing/audit purposes

## Usage

Record a usage event:

```bash
model-usage record --provider anthropic --model claude-3-5-sonnet-20241022 --input-tokens 1000 --output-tokens 500
```

Generate a report:

```bash
model-usage report --period 30d
```

Check budget status:

```bash
model-usage budget --limit 100
```

## Environment

- `ANTHROPIC_API_KEY`: Anthropic API for token counting
- `OPENAI_API_KEY`: OpenAI API for token counting  
- `MODEL_USAGE_DB`: SQLite database path (default: `~/.model-usage/usage.db`)
