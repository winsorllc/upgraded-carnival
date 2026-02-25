---
name: timestamp
description: "Convert between timestamp formats. Unix timestamps, ISO 8601, relative times, and human-readable dates. No API key required."
---

# Timestamp Skill

Convert between various timestamp formats.

## When to Use

✅ **USE this skill when:**

- "Convert this timestamp to readable date"
- "What time is 1704067200?"
- "Get current timestamp"
- "Parse this date string"
- "Calculate time difference"

## When NOT to Use

❌ **DON'T use this skill when:**

- Scheduling tasks → use cron/system scheduler
- Time zone conversions → use timezone-aware libraries
- Calendar operations → use calendar tools

## Commands

### Current Time

```bash
{baseDir}/timestamp.sh now
{baseDir}/timestamp.sh now --format iso
{baseDir}/timestamp.sh now --format unix
{baseDir}/timestamp.sh now --utc
```

### Convert Timestamp

```bash
{baseDir}/timestamp.sh convert 1704067200
{baseDir}/timestamp.sh convert "2024-01-01T00:00:00Z"
{baseDir}/timestamp.sh convert "January 1, 2024"
{baseDir}/timestamp.sh convert 1704067200 --format iso
```

### Relative Time

```bash
{baseDir}/timestamp.sh relative "2 hours ago"
{baseDir}/timestamp.sh relative "tomorrow"
{baseDir}/timestamp.sh relative "next week"
{baseDir}/timestamp.sh relative "in 3 days"
```

### Time Difference

```bash
{baseDir}/timestamp.sh diff "2024-01-01" "2024-01-10"
{baseDir}/timestamp.sh diff 1704067200 1704153600
{baseDir}/timestamp.sh diff "now" "tomorrow"
```

### Parse Date String

```bash
{baseDir}/timestamp.sh parse "January 1, 2024"
{baseDir}/timestamp.sh parse "2024-01-01 12:00:00"
{baseDir}/timestamp.sh parse "01/01/2024"
```

## Output Formats

| Format | Description | Example |
|--------|-------------|---------|
| `unix` | Unix timestamp | `1704067200` |
| `iso` | ISO 8601 | `2024-01-01T00:00:00Z` |
| `date` | Date only | `2024-01-01` |
| `time` | Time only | `00:00:00` |
| `datetime` | Date and time | `2024-01-01 00:00:00` |
| `human` | Human readable | `Monday, January 1, 2024` |
| `relative` | Relative time | `2 hours ago` |

## Examples

**Get current Unix timestamp:**
```bash
{baseDir}/timestamp.sh now --format unix
# Output: 1704067200
```

**Convert Unix to ISO:**
```bash
{baseDir}/timestamp.sh convert 1704067200 --format iso
# Output: 2024-01-01T00:00:00Z
```

**Get time 2 hours from now:**
```bash
{baseDir}/timestamp.sh relative "in 2 hours"
# Output: 2024-01-01T02:00:00Z
```

**Calculate days between dates:**
```bash
{baseDir}/timestamp.sh diff "2024-01-01" "2024-01-31" --unit days
# Output: 30 days
```

## Notes

- All operations use UTC by default
- Use `--local` for local timezone
- Supports various date formats
- Handles relative time expressions