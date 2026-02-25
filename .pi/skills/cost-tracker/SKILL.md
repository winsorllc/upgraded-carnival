---
name: cost-tracker
description: Track and analyze LLM usage costs. Monitor token usage, API costs, and generate cost reports.
---

# Cost Tracker

Track and analyze LLM usage costs. Monitor token usage, API costs, and generate detailed cost reports across providers.

## Setup

No additional setup required. Uses SQLite for local storage.

## Usage

### Record a Cost Entry

```bash
{baseDir}/cost-tracker.js --record --provider anthropic --model claude-3 --input-tokens 1000 --output-tokens 500 --cost 0.03
```

### Get Cost Summary

```bash
{baseDir}/cost-tracker.js --summary
```

### Get Daily Breakdown

```bash
{baseDir}/cost-tracker.js --daily
```

### Get Provider Breakdown

```bash
{baseDir}/cost-tracker.js --by-provider
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--record` | Record a new cost entry | No |
| `--provider` | LLM provider (anthropic, openai, google, etc.) | For record |
| `--model` | Model name | For record |
| `--input-tokens` | Number of input tokens | For record |
| `--output-tokens` | Number of output tokens | For record |
| `--cost` | Cost in USD | For record |
| `--summary` | Show total cost summary | No |
| `--daily` | Show daily cost breakdown | No |
| `--by-provider` | Show cost by provider | No |
| `--period` | Time period (today, 7d, 30d, all) | No |

## Cost Model Presets

Default cost per 1M tokens:

| Provider | Model | Input ($) | Output ($) |
|----------|-------|-----------|------------|
| anthropic | claude-3.5-sonnet | $3.00 | $15.00 |
| anthropic | claude-3-opus | $15.00 | $75.00 |
| openai | gpt-4o | $2.50 | $10.00 |
| openai | gpt-4-turbo | $10.00 | $30.00 |
| google | gemini-1.5-pro | $1.25 | $5.00 |

## Output Format

```json
{
  "totalCost": 125.50,
  "totalInputTokens": 500000,
  "totalOutputTokens": 250000,
  "requests": 150,
  "period": "30d"
}
```

## When to Use

- Tracking LLM usage costs across jobs
- Analyzing cost by provider or model
- Budget monitoring and alerts
- Generating cost reports for billing
