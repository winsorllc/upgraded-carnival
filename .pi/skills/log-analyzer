---
name: log-analyzer
description: "Analyze log files for patterns, errors, statistics. Parse common log formats, extract insights, generate reports. No API key required."
---

# Log Analyzer Skill

Parse and analyze log files for patterns, errors, trends, and statistics.

## When to Use

✅ **USE this skill when:**

- "Analyze this log file"
- "Find errors in logs"
- "Extract patterns from logs"
- "Statistics from log file"
- "Count log entries by type"

## When NOT to Use

❌ **DON'T use this skill when:**

- Real-time log streaming → use file-watcher + tail
- Structured data analysis → use json-yaml-query
- Log shipping → use log forwarders

## Commands

### Basic Analysis

```bash
{baseDir}/analyze.sh <logfile>
{baseDir}/analyze.sh /var/log/app.log
{baseDir}/analyze.sh app.log --summary
```

### Error Analysis

```bash
{baseDir}/analyze.sh app.log --errors
{baseDir}/analyze.sh app.log --errors-only
{baseDir}/analyze.sh app.log --error-count
{baseDir}/analyze.sh app.log --error-pattern "Failed|Error|Exception"
```

### Pattern Matching

```bash
{baseDir}/analyze.sh app.log --pattern "user: \d+"
{baseDir}/analyze.sh app.log --pattern "error|warning" --count
{baseDir}/analyze.sh app.log --pattern "Exception" --context 3
```

### Time-based Analysis

```bash
{baseDir}/analyze.sh app.log --time-range "2024-01-01" "2024-01-02"
{baseDir}/analyze.sh app.log --last 1h
{baseDir}/analyze.sh app.log --last 24h
{baseDir}/analyze.sh app.log --hourly
{baseDir}/analyze.sh app.log --timeline
```

### Log Formats

```bash
{baseDir}/analyze.sh access.log --format apache
{baseDir}/analyze.sh nginx.log --format nginx
{baseDir}/analyze.sh app.log --format json
{baseDir}/analyze.sh syslog --format syslog
{baseDir}/analyze.sh app.log --format custom --regex '\[(.*?)\] (\w+): (.*)'
```

### Statistics

```bash
{baseDir}/analyze.sh app.log --stats
{baseDir}/analyze.sh app.log --count-by level
{baseDir}/analyze.sh app.log --count-by hour
{baseDir}/analyze.sh app.log --unique "ip"
{baseDir}/analyze.sh app.log --top 10 error
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--summary` | Show summary overview | false |
| `--errors` | Show error entries | false |
| `--errors-only` | Only show errors (hide others) | false |
| `--error-pattern REGEX` | Custom error pattern | built-in |
| `--pattern REGEX` | Search for pattern | None |
| `--count` | Count pattern matches | false |
| `--context N` | Show N lines of context | 0 |
| `--time-range START END` | Filter by time range | None |
| `--last DURATION` | Last N duration (e.g., 1h, 24h, 7d) | None |
| `--hourly` | Group by hour | false |
| `--timeline` | Show events timeline | false |
| `--stats` | Show statistics | false |
| `--count-by FIELD` | Count by field | None |
| `--unique FIELD` | Unique values in field | None |
| `--top N FIELD` | Top N values by field | None |
| `--format FORMAT` | Log format: apache, nginx, json, syslog, custom | auto-detect |
| `--regex REGEX` | Custom regex for format | None |
| `--output FORMAT` | Output format: text, json, csv | text |

## Log Formats

### Apache Combined Log
```
127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326
```
Auto-detected. Use `--format apache`.

### Nginx Log
```
127.0.0.1 - - [10/Oct/2000:13:55:36 +0000] "GET / HTTP/1.1" 200 612 "-" "Mozilla/5.0"
```
Auto-detected. Use `--format nginx`.

### JSON Log
```json
{"timestamp": "2024-01-01T00:00:00Z", "level": "INFO", "message": "Started"}
```
Auto-detected. Use `--format json`.

### Syslog
```
Jan  1 00:00:00 hostname process[pid]: message
```
Auto-detected. Use `--format syslog`.

### Custom Format
Use `--regex` to define custom format with capture groups:
```bash
{baseDir}/analyze.sh app.log --format custom --regex '\[(.*?)\] (\w+): (.*)'
```

## Output Examples

### Summary
```
Log Analysis Summary: app.log
================================
Total lines:     10,000
Date range:     2024-01-01 to 2024-01-02
Log levels:     
  INFO:          8,500 (85%)
  WARNING:       1,000 (10%)
  ERROR:         500 (5%)
Top errors:      
  Connection refused: 200
  Timeout: 150
  Not found: 150
```

### Error Analysis
```
ERROR [2024-01-01 10:23:45] Connection refused to database
  at Database.connect (db.js:45)
  at Application.start (app.js:23)

ERROR [2024-01-01 10:24:01] Failed to process request
  ...
```

### Statistics (JSON)
```json
{
  "file": "app.log",
  "total_lines": 10000,
  "date_range": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-02T00:00:00Z"
  },
  "levels": {
    "INFO": 8500,
    "WARNING": 1000,
    "ERROR": 500
  },
  "top_errors": [
    {"message": "Connection refused", "count": 200},
    {"message": "Timeout", "count": 150}
  ]
}
```

### Timeline
```
00:00 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 500
04:00 ━━━━━━━━━━━━━━━━ 400
08:00 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 700
12:00 ━━━━━━━━━━━━━ 300
16:00 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 600
20:00 ━━━━━━━━━━ 250
```

## Examples

**Quick summary:**
```bash
{baseDir}/analyze.sh /var/log/app.log --summary
```

**Find all errors:**
```bash
{baseDir}/analyze.sh app.log --errors
```

**Count log levels:**
```bash
{baseDir}/analyze.sh app.log --count-by level
```

**Top 10 IPs:**
```bash
{baseDir}/analyze.sh access.log --top 10 ip
```

**Last hour of errors:**
```bash
{baseDir}/analyze.sh app.log --errors --last 1h
```

**Extract JSON field:**
```bash
{baseDir}/analyze.sh app.log --format json --unique userId
```

**Custom pattern:**
```bash
{baseDir}/analyze.sh app.log --pattern "user:\s*(\d+)" --count
```

## Notes

- Auto-detects common log formats
- Handles both compressed (.gz) and uncompressed files
- Can process multiple files with wildcards
- Memory-efficient for large files (streaming)
- Supports date filtering for most formats