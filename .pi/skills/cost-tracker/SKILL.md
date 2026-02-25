---
name: Cost Tracker
author: PopeBot
description: Track API usage costs, token consumption, and resource utilization. Helps monitor and optimize spending across LLM providers and services.
version: "1.0.0"
tags:
  - cost
  - tracking
  - usage
  - monitoring
  - budget
---

# Cost Tracker

Track API usage costs, token consumption, and resource utilization. Helps monitor and optimize spending across services.

## When to Use

Use the cost-tracker skill when you need to:
- Track API and LLM token costs
- Monitor resource utilization
- Set and manage budgets
- Generate cost reports
- Optimize spending

## Usage Examples

Track a request:
```bash
node /job/.pi/skills/cost-tracker/cost.js track --tokens 1000 --model claude-sonnet --cost 0.003
```

View usage report:
```bash
node /job/.pi/skills/cost-tracker/cost.js report --days 7
```

Set budget limit:
```bash
node /job/.pi/skills/cost-tracker/cost.js budget set --daily 10.00
```

Check current budget:
```bash
node /job/.pi/skills/cost-tracker/cost.js budget check
```