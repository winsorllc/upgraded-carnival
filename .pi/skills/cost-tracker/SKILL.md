---
name: cost-tracker
description: Track and analyze LLM costs across all PopeBot jobs. Use when: (1) user asks about spending, usage costs, or budget, (2) analyzing cost efficiency, (3) comparing models, (4) generating cost reports by time period.
metadata: { "emoji": "💰", "requires": { "bins": ["jq"] } }
---

# Cost Tracker Skill

Track and analyze LLM costs across all PopeBot jobs. This skill provides tools to monitor spending, analyze cost efficiency, and generate budget reports.

## Capabilities

This skill provides a CLI tool for tracking and analyzing costs from session logs:

```bash
# Get current period spending
node /job/.pi/skills/cost-tracker/cost-tracker.js summary

# Get detailed cost breakdown by model, day, job
node /job/.pi/skills/cost-tracker/cost-tracker.js breakdown

# Get job-specific costs
node /job/.pi/skills/cost-tracker/cost-tracker.js job <job-id>

# Get daily cost trend
node /job/.pi/skills/cost-tracker/cost-tracker.js trend

# Compare costs between time periods
node /job/.pi/skills/cost-tracker/cost-tracker.js compare <period1> <period2>
```

## Log Location

Session logs with cost data are stored in `/job/logs/<job-id>/` directories:
- **Pattern**: `/job/logs/<job-id>/*.jsonl`
- Each log entry contains `message.usage.cost.total` field

## Cost Data Structure

From session logs, extract:
- `message.usage.cost.total` - Total cost in USD
- `message.usage.input_tokens` - Input tokens used
- `message.usage.output_tokens` - Output tokens used

## Commands

### Summary - Current Period

```bash
node /job/.pi/skills/cost-tracker/cost-tracker.js summary
```

Output:
```
=== Cost Summary ===
Period: 2026-02-01 to 2026-02-25
Total Jobs: 15
Total Cost: $4.32
Average Cost/Job: $0.29
```

### Breakdown - Detailed Analysis

```bash
node /job/.pi/skills/cost-tracker/cost-tracker.js breakdown
```

Output:
```
=== Cost Breakdown ===
By Model:
  claude-sonnet-4-20250514: $2.50 (58%)
  claude-opus-4-5-20250514: $1.82 (42%)

By Day:
  2026-02-25: $1.20
  2026-02-24: $0.85
  2026-02-23: $1.45

Top Jobs:
  abc123: $0.85 (deploy-api)
  def456: $0.62 (fix-bug)
  ghi789: $0.45 (update-docs)
```

### Job-Specific Costs

```bash
node /job/.pi/skills/cost-tracker/cost-tracker.js job abc123
```

Output:
```
=== Job: abc123 ===
Task: deploy-api
Date: 2026-02-25
Cost: $0.85
Input Tokens: 45,230
Output Tokens: 12,450
Model: claude-sonnet-4-20250514
Duration: 4m 32s
```

### Trend Analysis

```bash
node /job/.pi/skills/cost-tracker/cost-tracker.js trend
```

Output:
```
=== Daily Cost Trend (Last 7 Days) ===
2026-02-25: ████████████ $1.20
2026-02-24: ████████     $0.85
2026-02-23: ████████████ $1.45
2026-02-22: ████         $0.42
2026-02-21: ██████       $0.65
2026-02-20: ██████████   $1.05
2026-02-19: ███          $0.35

Total: $4.97 | Average: $0.71/day
```

### Period Comparison

```bash
node /job/.pi/skills/cost-tracker/cost-tracker.js compare 2026-01 2026-02
```

Output:
```
=== Period Comparison ===
January 2026: $12.50 (45 jobs)
February 2026: $4.32 (15 jobs)

Change: -65.4%
Reason: Shorter average job duration
```

## Period Formats

Supported period formats:
- `YYYY-MM-DD` - Specific date
- `YYYY-MM` - Month
- `YYYY-Www` - Week number
- `last-7d` - Last 7 days
- `last-30d` - Last 30 days
- `this-month` - Current month
- `last-month` - Previous month

## Integration

This skill can be used alongside:
- **session-logs**: For detailed session analysis
- **agent-memory**: To store budget thresholds and alerts
- **llm-secrets**: To check available LLM credentials

## Tips

- Costs are extracted from session JSONL files automatically
- Jobs without cost data are skipped in calculations
- Model names are extracted from log metadata
- Use `jq` for custom queries on raw data
