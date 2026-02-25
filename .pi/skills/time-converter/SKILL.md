---
name: time-converter
description: Convert between timezones, format timestamps, calculate durations, and parse date/time strings. Timezone-aware conversion with UTC support.
---

# Time Converter

Convert and format dates, times, and durations.

## Features

- **Format**: Convert timestamps to different formats
- **Timezone**: Convert between timezones
- **Duration**: Calculate time differences
- **Parse**: Parse various date formats
- **Now**: Get current time in any timezone
- **Unix**: Convert between Unix timestamps and ISO dates

## Usage

```bash
# Current time
./scripts/time.js now
./scripts/time.js now --timezone America/New_York

# Convert timestamp
./scripts/time.js convert "2024-03-15T12:00:00Z" --to "America/Los_Angeles"

# Format date
./scripts/time.js format "2024-03-15T12:00:00Z" --format "YYYY-MM-DD"

# Calculate duration
./scripts/time.js duration "2024-01-01T00:00:00Z" --to "2024-12-31T23:59:59Z"

# Unix timestamp
./scripts/time.js unix 1709836800
./scripts/time.js to-unix "2024-03-15T12:00:00Z"
```

## Examples

| Task | Command |
|------|---------|
| Current UTC | `./scripts/time.js now` |
| Time in NY | `./scripts/time.js now -z America/New_York` |
| Convert timezone | `./scripts/time.js convert "2024-03-15 12:00" -f UTC -t Europe/London` |
| Format date | `./scripts/time.js format "2024-03-15" -f "MMM DD, YYYY"` |
| Duration | `./scripts/time.js duration "2024-01-01" -to "2024-03-15"` |
| Unix to ISO | `./scripts/time.js unix 1704067200` |
| ISO to Unix | `./scripts/time.js to-unix "2024-01-01T00:00:00Z"` |

## Supported Timezones

Common timezone identifiers:
- UTC, GMT
- America/New_York, America/Los_Angeles
- Europe/London, Europe/Berlin, Europe/Paris
- Asia/Tokyo, Asia/Shanghai, Asia/Singapore
- Australia/Sydney, Pacific/Auckland

## Format Tokens

| Token | Description | Example |
|-------|-------------|---------|
| YYYY | 4-digit year | 2024 |
| MM | Month (01-12) | 03 |
| DD | Day (01-31) | 15 |
| HH | Hour (00-23) | 12 |
| mm | Minutes (00-59) | 30 |
| ss | Seconds (00-59) | 45 |
| MMM | Month abbreviation | Mar |
| ddd | Day abbreviation | Fri |

## Output Format

```json
{
  "input": "2024-03-15T12:00:00Z",
  "formatted": "2024-03-15T12:00:00.000Z",
  "utc": "2024-03-15T12:00:00.000Z",
  "epoch_ms": 1710504000000,
  "locale": "Fri Mar 15 2024 12:00:00 GMT+0000",
  "components": {
    "year": 2024,
    "month": 3,
    "day": 15,
    "hour": 12,
    "minute": 0,
    "second": 0,
    "millisecond": 0
  }
}
```

## Notes

- Dates without timezone are assumed UTC
- Supports ISO 8601 format
- Unix timestamps in milliseconds
- Duration calculations include all time units
