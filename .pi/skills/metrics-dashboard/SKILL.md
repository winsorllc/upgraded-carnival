---
name: Metrics Dashboard
author: PopeBot
description: Generate system metrics reports and dashboards. Tracks performance, usage statistics, and provides visual summaries.
version: "1.0.0"
tags:
  - metrics
  - dashboard
  - monitoring
  - statistics
  - reporting
---

# Metrics Dashboard

Generate system metrics reports and dashboards. Tracks performance, usage statistics, and provides visual summaries.

## When to Use

Use the metrics-dashboard skill when:
- Monitoring system performance
- Tracking usage over time
- Generating reports
- Visualizing statistics
- Analyzing trends

## Usage Examples

Generate system report:
```bash
node /job/.pi/skills/metrics-dashboard/metrics.js report
```

Show live metrics (updates every 2s, press q to quit):
```bash
node /job/.pi/skills/metrics-dashboard/metrics.js live
```

Export metrics to file:
```bash
node /job/.pi/skills/metrics-dashboard/metrics.js export --format json --output metrics.json
```

Compare time periods:
```bash
node /job/.pi/skills/metrics-dashboard/metrics.js compare --days 7 --previous-days 7
```