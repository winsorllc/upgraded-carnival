---
name: log-analyzer
description: Analyze log files, extract patterns, filter by time, and generate metrics. Inspired by ZeroClaw's observability tools and thepopebot's logging system.
---

# Log Analyzer

Parse and analyze log files with pattern matching and metrics.

## Capabilities

- Parse common log formats (Apache, Nginx, Syslog, JSON, custom)
- Filter by time range
- Extract patterns and error counts
- Calculate metrics (requests/hour, error rates)
- Generate summary statistics
- Export filtered results

## Usage

```bash
# Analyze log file
/job/.pi/skills/log-analyzer/log-analyzer.js analyze /var/log/nginx/access.log --format nginx

# Filter by time range
/job/.pi/skills/log-analyzer/log-analyzer.js analyze app.log \
  --from "2026-02-25T00:00:00" --to "2026-02-25T23:59:59"

# Extract errors only
/job/.pi/skills/log-analyzer/log-analyzer.js errors /var/log/syslog

# Search for pattern
/job/.pi/skills/log-analyzer/log-analyzer.js search app.log "ERROR"

# Get summary statistics
/job/.pi/skills/log-analyzer/log-analyzer.js summary app.log

# Filter by level
/job/.pi/skills/log-analyzer/log-analyzer.js summary app.log --level error,critical

# Export to JSON
/job/.pi/skills/log-analyzer/log-analyzer.js analyze app.log --output results.json
```

## Supported Formats

- `nginx` - Nginx access logs
- `apache` - Apache access logs
- `syslog` - System logs
- `json` - JSON structured logs
- `auto` - Auto-detect (default)

## Output Format

```json
{
  "totalLines": 15000,
  "timeRange": ["2026-02-25T00:00:00", "2026-02-25T23:59:59"],
  "byLevel": {
    "info": 12000,
    "warning": 1500,
    "error": 500
  },
  "topErrors": [
    { "message": "Connection timeout", "count": 150 }
  ],
  "metrics": {
    "requestsPerHour": 625,
    "errorRate": 0.033
  }
}
```

## Notes

- Auto-detects timestamps in most formats
- Handles large files efficiently
- Supports regex pattern matching
- Memory-efficient for files > 100MB