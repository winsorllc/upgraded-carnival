---
name: cost-tracker
description: Track LLM API costs in real-time across multiple providers. Monitor token usage, spending limits, budget alerts, and cost attribution per job or task.
metadata:
  {
    "thepopebot":
      {
        "emoji": "💰",
        "version": "1.0.0",
        "features": ["multi-provider", "real-time-tracking", "budget-alerts", "cost-attribution"]
      }
  }
---

# Cost Tracker — LLM API Cost Monitoring

Track and monitor API costs across multiple LLM providers with real-time budget alerts.

## Overview

This skill provides:
- **Multi-Provider Tracking**: Anthropic, OpenAI, Google, and custom providers
- **Real-Time Monitoring**: Track costs as they happen
- **Budget Alerts**: Get notified when approaching spending limits
- **Cost Attribution**: Track costs per job, task, or project
- **Historical Reports**: Generate spending reports and trends
- **Provider Comparison**: Compare costs across different providers

## Pricing Configuration

Configure provider pricing in `config/pricing.json`:

```json
{
  "providers": {
    "anthropic": {
      "claude-sonnet-4-5-20250929": {
        "input": 0.000003,
        "output": 0.000015,
        "currency": "USD"
      },
      "claude-opus-4-0-20250514": {
        "input": 0.000015,
        "output": 0.000075,
        "currency": "USD"
      }
    },
    "openai": {
      "gpt-4o": {
        "input": 0.0000025,
        "output": 0.00001,
        "currency": "USD"
      },
      "gpt-4o-mini": {
        "input": 0.00000015,
        "output": 0.0000006,
        "currency": "USD"
      }
    },
    "google": {
      "gemini-2.0-flash": {
        "input": 0.0000001,
        "output": 0.0000004,
        "currency": "USD"
      },
      "gemini-2.0-pro": {
        "input": 0.00000125,
        "output": 0.000005,
        "currency": "USD"
      }
    }
  },
  "budgets": {
    "daily": 10.00,
    "weekly": 50.00,
    "monthly": 200.00
  },
  "alerts": {
    "thresholds": [0.5, 0.75, 0.9],
    "channels": ["telegram", "discord"]
  }
}
```

## API

### Track a Token Usage
```javascript
const { trackUsage } = require('./cost-tracker');

await trackUsage({
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250929',
  input_tokens: 1500,
  output_tokens: 800,
  job_id: 'job-12345'
});

// Returns: { cost: 0.0165, currency: 'USD' }
```

### Get Current Spending
```javascript
const { getSpending } = require('./cost-tracker');

const spending = await getSpending('daily');
console.log(`Spent $${spending.amount} of $${spending.budget}`);
console.log(`Remaining: $${spending.remaining}`);
```

### Get Cost by Job
```javascript
const { getJobCost } = require('./cost-tracker');

const jobCost = getJobCost('job-12345');
console.log(`Job cost: $${jobCost.total}`);
console.log(`Breakdown:`, jobCost.breakdown);
```

### Generate Report
```javascript
const { generateReport } = require('./cost-tracker');

const report = await generateReport({
  period: 'weekly',
  group_by: 'provider'
});
```

## Budget Alerts

Configure alerts at spending thresholds:

```javascript
const { setAlert } = require('./cost-tracker');

setAlert({
  type: 'threshold',
  threshold: 0.8,  // Alert at 80% of budget
  channels: ['telegram', 'email'],
  message: 'Warning: 80% of monthly budget used!'
});
```

## Real-Time Dashboard

```javascript
const { getDashboard } = require('./cost-tracker');

const dashboard = getDashboard();
console.log(dashboard);
// {
//   today: { spent: 2.45, budget: 10.00, remaining: 7.55 },
//   this_week: { spent: 18.30, budget: 50.00, remaining: 31.70 },
//   this_month: { spent: 89.50, budget: 200.00, remaining: 110.50 },
//   top_models: [...],
//   top_jobs: [...]
// }
```

## Cost Attribution

Track costs by job, user, or project:

```javascript
// Track with context
await trackUsage({
  provider: 'openai',
  model: 'gpt-4o',
  input_tokens: 2000,
  output_tokens: 500,
  job_id: 'job-12345',
  user_id: 'user-789',
  project: 'research-agent'
});

// Get costs by project
const projectCost = getCostByProject('research-agent');
```

## CLI Usage

```bash
# Show current spending
cost-tracker status

# Show detailed dashboard
cost-tracker dashboard

# Show costs for a specific job
cost-tracker job --id job-12345

# Generate monthly report
cost-tracker report --period monthly

# Reset counters
cost-tracker reset --period daily
```

## Output Format

### Daily Status
```
💰 Cost Tracker Status

Today (2026-02-25)
  Spent:     $2.45 / $10.00 (24.5%)
  Remaining: $7.55

This Week
  Spent:     $18.30 / $50.00 (36.6%)
  Remaining: $31.70

This Month
  Spent:     $89.50 / $200.00 (44.8%)
  Remaining: $110.50

Top Models (today):
  1. claude-sonnet-4-5: $1.20
  2. gpt-4o-mini: $0.85
  3. gemini-2.0-flash: $0.40
```

## Best Practices

1. **Set Conservative Budgets**: Start low and adjust based on usage patterns
2. **Monitor Daily**: Check spending daily to catch unexpected spikes
3. **Attribute Costs**: Always track job_id for cost attribution
4. **Alert Early**: Set alerts at 50%, 75%, and 90% thresholds
5. **Review Weekly**: Analyze weekly reports to optimize model usage

## Integration with Agent

```javascript
// In agent code
const { trackUsage, shouldThrottle } = require('./cost-tracker');

async function callLLM(prompt, options) {
  // Check if we should throttle
  if (shouldThrottle()) {
    throw new Error('Cost limit reached. Throttling requests.');
  }
  
  // Make API call
  const response = await provider.complete(prompt, options);
  
  // Track usage
  await trackUsage({
    provider: options.provider,
    model: options.model,
    input_tokens: response.usage.prompt_tokens,
    output_tokens: response.usage.completion_tokens,
    job_id: options.job_id
  });
  
  return response;
}
```

## Cost Estimation

Estimate costs before making expensive calls:

```javascript
const { estimateCost } = require('./cost-tracker');

const estimate = estimateCost({
  provider: 'anthropic',
  model: 'claude-opus-4-0-20250514',
  estimated_input: 10000,
  estimated_output: 2000
});

console.log(`Estimated cost: $${estimate.cost}`);
// Estimated cost: $0.30
```

## Export Data

Export spending data for analysis:

```javascript
const { exportData } = require('./cost-tracker');

const csv = await exportData({
  format: 'csv',
  period: 'monthly',
  columns: ['timestamp', 'provider', 'model', 'input_tokens', 'output_tokens', 'cost', 'job_id']
});

fs.writeFileSync('spending-report.csv', csv);
```
