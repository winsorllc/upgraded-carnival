---
name: log-analyzer
description: Analyze log files for patterns, errors, and statistics. Extract insights from application and system logs.
---

# Log Analyzer

Analyze log files to find patterns, errors, warnings, and generate statistics. Useful for debugging and monitoring.

## Setup
No dependencies required.

## Usage

### Basic analysis
```bash
{baseDir}/analyze.sh /var/log/app.log
```

### Analyze with specific patterns
```bash
{baseDir}/analyze.sh app.log --errors      # Show only errors
{baseDir}/analyze.sh app.log --warnings    # Show only warnings
{baseDir}/analyze.sh app.log --summary     # Summary statistics only
```

### Analyze recent entries
```bash
{baseDir}/analyze.sh app.log --tail 1000   # Last 1000 lines
```

### Filter by time range
```bash
{baseDir}/analyze.sh app.log --since "2024-01-01" --until "2024-01-31"
```

### Custom pattern search
```bash
{baseDir}/analyze.sh app.log --pattern "authentication"
```

### Output
```
╔════════════════════════════════════════════════════════════════╗
║                      LOG ANALYSIS REPORT                       ║
╚════════════════════════════════════════════════════════════════╝

File: app.log
Lines Analyzed: 15,423
Time Range: 2024-01-15 08:00:00 to 2024-01-15 18:30:45

LEVEL DISTRIBUTION
──────────────────
  12,340  INFO     ######
     892  WARN     #
     156  ERROR    
      35  FATAL    

TOP ERROR PATTERNS
─────────────────
   87  Database timeout        2.3%
   45  Connection refused      1.2%
   12  Authentication failed   0.3%

UNIQUE ERROR MESSAGES (last 5)
──────────────────────────────
  ERROR: Failed to connect to database (15:32:12)
  ERROR: Request timeout exceeded (15:33:44)
  ... (156 total unique errors)

RECENT WARNINGS
───────────────
  [15:45:12] DeprecationWarning: Buffer() is deprecated
  [15:46:03] High memory usage detected: 89%

══════════════════════════════════════════════════════════════════
```

## When to Use
- Debugging production issues
- Analyzing application logs
- Finding error patterns
- Monitoring log file health
- Pre-deployment checks
