---
name: model-usage
description: Track and analyze LLM usage costs per model, session, and time period. Use when: (1) you need to report on job costs, (2) track LLM spending across sessions, (3) compare costs between different models or providers, (4) generate cost reports for billing or optimization.
---

# Model Usage Tracker

Track and analyze LLM usage costs across sessions, models, and time periods. This skill helps you understand how much is being spent on different AI models.

## When to Use

- User asks "how much did this job cost?" or "what's our LLM usage?"
- After completing a job, record the cost for tracking
- Generate reports on LLM spending by model, provider, or time period
- Compare costs between different models to optimize spending
- Budget tracking and cost attribution per project/team

## How It Works

This skill provides scripts to:
1. **Record** usage data from LLM API calls (Anthropic, OpenAI, Google)
2. **Query** usage statistics by model, provider, date range
3. **Report** cost summaries with breakdowns

## Usage

### Record a Cost Entry

```bash
# Record a single cost entry
node /job/pi-skills/model-usage/scripts/record.js --model claude-3-5-sonnet-20241022 --provider anthropic --input 150000 --output 3000 --cost 3.50

# Record with session/job ID for tracking
node /job/pi-skills/model-usage/scripts/record.js --model claude-3-5-sonnet-20241022 --provider anthropic --input 150000 --output 3000 --cost 3.50 --job-id job-123

# Record with timestamps
node /job/pi-skills/model-usage/scripts/record.js --model gpt-4o --provider openai --input 100000 --output 2000 --cost 2.00 --timestamp "2026-02-25T10:00:00Z"
```

### Query Usage

```bash
# Get total cost across all time
node /job/pi-skills/model-usage/scripts/query.js

# Get cost by model
node /job/pi-skills/model-usage/scripts/query.js --by model

# Get cost by provider
node /job/pi-skills/model-usage/scripts/query.js --by provider

# Get cost for a specific time period
node /job/pi-skills/model-usage/scripts/query.js --from 2026-01-01 --to 2026-02-28

# Get cost for a specific job/session
node /job/pi-skills/model-usage/scripts/query.js --job-id job-123

# Output as JSON
node /job/pi-skills/model-usage/scripts/query.js --format json
```

### Calculate Cost from API Response

```bash
# Calculate cost from Anthropic API response (requires ANTHROPIC_API_KEY)
ANTHROPIC_API_KEY=sk-ant-api03-xxx node /job/pi-skills/model-usage/scripts/calculate.js --provider anthropic --model claude-3-5-sonnet-20241022 --input-tokens 150000 --output-tokens 3000

# Calculate cost from OpenAI API response (requires OPENAI_API_KEY)
OPENAI_API_KEY=sk-xxx node /job/pi-skills/model-usage/scripts/calculate.js --provider openai --model gpt-4o --input-tokens 100000 --output-tokens 2000
```

### Cost Report

```bash
# Generate a formatted cost report
node /job/pi-skills/model-usage/scripts/report.js

# Report for specific period
node /job/pi-skills/model-usage/scripts/report.js --period 30d

# Export to JSON for external tools
node /job/pi-skills/model-usage/scripts/report.js --format json
```

## Data Storage

Usage data is stored in JSON files in `/job/data/model-usage/`:

- `usage.jsonl` - One JSON record per line (append-only log)
- `summary.json` - Aggregated statistics (regenerated on query)

## Cost Calculation

The skill uses standard pricing models (prices may vary, verify with providers):

### Anthropic (2024-2025)
| Model | Input ($/M) | Output ($/M) |
|-------|-------------|--------------|
| claude-3-5-sonnet-20241022 | $3.00 | $15.00 |
| claude-3-opus-20240229 | $15.00 | $75.00 |
| claude-3-sonnet-20240229 | $3.00 | $15.00 |
| claude-3-haiku-20240307 | $0.25 | $1.25 |

### OpenAI
| Model | Input ($/M) | Output ($/M) |
|-------|-------------|--------------|
| gpt-4o | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4-turbo | $10.00 | $30.00 |
| gpt-3.5-turbo | $0.50 | $1.50 |

### Google
| Model | Input ($/M) | Output ($/M) |
|-------|-------------|--------------|
| gemini-1.5-pro | $1.25 | $5.00 |
| gemini-1.5-flash | $0.075 | $0.30 |

## Integration with Jobs

For PopeBot jobs, record costs automatically at job completion:

```bash
# At end of job, record the cost
echo "Recording job cost..."
node /job/pi-skills/model-usage/scripts/record.js \
  --model "$LLM_MODEL" \
  --provider "$LLM_PROVIDER" \
  --input "$INPUT_TOKENS" \
  --output "$OUTPUT_TOKENS" \
  --cost "$TOTAL_COST" \
  --job-id "$JOB_ID"
```

## Output Format

### Query Output (text)
```
Model Usage Summary
====================
Total Cost: $127.50

By Model:
  claude-3-5-sonnet-20241022: $85.00 (67%)
  gpt-4o: $42.50 (33%)

By Provider:
  anthropic: $85.00 (67%)
  openai: $42.50 (33%)

By Job:
  job-123: $45.00
  job-124: $40.00
  job-125: $42.50
```

### Query Output (JSON)
```json
{
  "totalCost": 127.50,
  "byModel": {
    "claude-3-5-sonnet-20241022": 85.00,
    "gpt-4o": 42.50
  },
  "byProvider": {
    "anthropic": 85.00,
    "openai": 42.50
  },
  "period": {
    "from": "2026-01-01",
    "to": "2026-02-28"
  }
}
```

## Examples

### Example 1: Post-Job Cost Recording
After completing a coding job that used Claude Sonnet:

```bash
$ node /job/pi-skills/model-usage/scripts/record.js \
  --model claude-3-5-sonnet-20241022 \
  --provider anthropic \
  --input 245000 \
  --output 8500 \
  --job-id abc-123

✓ Recorded: claude-3-5-sonnet-20241022 (anthropic) - $7.88 for job abc-123
```

### Example 2: Weekly Cost Report
```bash
$ node /job/pi-skills/model-usage/scripts/report.js --period 7d

╔════════════════════════════════════════════════════════════╗
║           LLM Usage Report - Last 7 Days                  ║
╠════════════════════════════════════════════════════════════╣
║  Total Cost:      $127.50                                  ║
║  Total Input:     1,250,000 tokens                         ║
║  Total Output:    45,000 tokens                            ║
╠════════════════════════════════════════════════════════════╣
║  By Model:                                                ║
║    claude-3-5-sonnet    $85.00   (67%)                   ║
║    gpt-4o               $42.50   (33%)                   ║
╠════════════════════════════════════════════════════════════╣
║  By Provider:                                             ║
║    anthropic            $85.00   (67%)                   ║
║    openai               $42.50   (33%)                   ║
╚════════════════════════════════════════════════════════════╝
```

### Example 3: Query by Job
```bash
$ node /job/pi-skills/model-usage/scripts/query.js --job-id abc-123 --format json
{
  "jobId": "abc-123",
  "model": "claude-3-5-sonnet-20241022",
  "provider": "anthropic",
  "inputTokens": 245000,
  "outputTokens": 8500,
  "cost": 7.88,
  "timestamp": "2026-02-25T10:00:00Z"
}
```

## Requirements

- Node.js 18+
- No external dependencies (uses built-in fs, path, crypto)

## Notes

- Prices are based on provider documentation at time of skill creation
- Always verify current pricing with official provider docs
- For accurate tracking, record costs at job completion
- Use `--job-id` to attribute costs to specific jobs for billing
- Data persists in `/job/data/model-usage/` - backed up with repo
