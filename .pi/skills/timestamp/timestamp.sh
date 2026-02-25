#!/bin/bash
# Timestamp utility - convert dates, times, and formats
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: timestamp.sh <command> [options]

Commands:
  now              Get current timestamp
  convert <value>  Convert timestamp to various formats
  relative <expr>  Parse relative time expression
  diff <a> <b>     Calculate difference between two timestamps
  parse <date>     Parse date string to timestamp

Options:
  --format <fmt>   Output format: unix, iso, date, time, datetime, human
  --utc            Use UTC timezone (default)
  --local          Use local timezone
  --unit <unit>    Unit for diff: seconds, minutes, hours, days
  -h, --help       Show this help

Examples:
  timestamp.sh now
  timestamp.sh now --format iso
  timestamp.sh convert 1704067200
  timestamp.sh convert "2024-01-01" --format unix
  timestamp.sh relative "2 hours ago"
  timestamp.sh relative "tomorrow at noon"
  timestamp.sh diff "2024-01-01" "2024-01-10" --unit days
EOF
    exit 2
}

# Default values
COMMAND="${1:-}"
shift || true

FORMAT="datetime"
USE_UTC=true
UNIT="seconds"

# Parse options
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --format)
            shift
            FORMAT="$1"
            ;;
        --utc)
            USE_UTC=true
            ;;
        --local)
            USE_UTC=false
            ;;
        --unit)
            shift
            UNIT="$1"
            ;;
        -*)
            # Unknown option, might be handled by command
            break
            ;;
    esac
    shift || true
done

# Process command
python3 << PYEOF
import sys
import json
from datetime import datetime, timezone, timedelta
import re

tz = timezone.utc if $USE_UTC else None

def parse_timestamp(value):
    """Parse various timestamp formats."""
    value = str(value).strip()
    
    # Unix timestamp
    if value.isdigit():
        ts = int(value)
        # Detect seconds vs milliseconds
        if ts > 1e12:  # Likely milliseconds
            ts = ts / 1000
        return datetime.fromtimestamp(ts, tz=tz)
    
    # ISO 8601
    if 'T' in value or re.match(r'\d{4}-\d{2}-\d{2}', value):
        # Handle various ISO formats
        for fmt in [
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%dT%H:%M:%S%z',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d',
        ]:
            try:
                dt = datetime.strptime(value.replace('Z', '+00:00'), fmt)
                return dt.replace(tzinfo=tz) if tz else dt
            except:
                continue
    
    # Common date formats
    for fmt in [
        '%B %d, %Y',       # January 1, 2024
        '%b %d, %Y',       # Jan 1, 2024
        '%m/%d/%Y',        # 01/01/2024
        '%d/%m/%Y',        # 01/01/2024
        '%Y/%m/%d',        # 2024/01/01
        '%d %B %Y',        # 01 January 2024
        '%B %d %Y',        # January 01 2024
    ]:
        try:
            dt = datetime.strptime(value, fmt)
            return dt.replace(tzinfo=tz) if tz else dt
        except:
            continue
    
    raise ValueError(f"Unable to parse: {value}")

def parse_relative(expr):
    """Parse relative time expressions."""
    expr = expr.lower().strip()
    now = datetime.now(tz)
    
    # Common patterns
    patterns = [
        (r'(\d+)\s*seconds?\s*ago', lambda m: now - timedelta(seconds=int(m.group(1)))),
        (r'(\d+)\s*minutes?\s*ago', lambda m: now - timedelta(minutes=int(m.group(1)))),
        (r'(\d+)\s*hours?\s*ago', lambda m: now - timedelta(hours=int(m.group(1)))),
        (r'(\d+)\s*days?\s*ago', lambda m: now - timedelta(days=int(m.group(1)))),
        (r'(\d+)\s*weeks?\s*ago', lambda m: now - timedelta(weeks=int(m.group(1)))),
        (r'in\s*(\d+)\s*seconds?', lambda m: now + timedelta(seconds=int(m.group(1)))),
        (r'in\s*(\d+)\s*minutes?', lambda m: now + timedelta(minutes=int(m.group(1)))),
        (r'in\s*(\d+)\s*hours?', lambda m: now + timedelta(hours=int(m.group(1)))),
        (r'in\s*(\d+)\s*days?', lambda m: now + timedelta(days=int(m.group(1)))),
        (r'in\s*(\d+)\s*weeks?', lambda m: now + timedelta(weeks=int(m.group(1)))),
        (r'now', lambda m: now),
        (r'today', lambda m: now.replace(hour=0, minute=0, second=0, microsecond=0)),
        (r'tomorrow', lambda m: (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)),
        (r'yesterday', lambda m: (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)),
        (r'next\s*week', lambda m: (now + timedelta(days=7-now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)),
        (r'last\s*week', lambda m: (now - timedelta(days=now.weekday()+7)).replace(hour=0, minute=0, second=0, microsecond=0)),
    ]
    
    for pattern, handler in patterns:
        match = re.match(pattern, expr)
        if match:
            return handler(match)
    
    raise ValueError(f"Unable to parse relative time: {expr}")

def format_output(dt):
    """Format datetime to specified format."""
    format_type = "$FORMAT"
    use_utc = $USE_UTC
    
    if use_utc:
        dt = dt.astimezone(timezone.utc)
    elif tz is None:
        dt = dt.astimezone()
    
    if format_type == "unix":
        return str(int(dt.timestamp()))
    elif format_type == "iso":
        return dt.strftime('%Y-%m-%dT%H:%M:%SZ' if use_utc else '%Y-%m-%dT%H:%M:%S%z')
    elif format_type == "date":
        return dt.strftime('%Y-%m-%d')
    elif format_type == "time":
        return dt.strftime('%H:%M:%S')
    elif format_type == "human":
        return dt.strftime('%A, %B %d, %Y at %I:%M %p')
    else:  # datetime
        return dt.strftime('%Y-%m-%d %H:%M:%S')

command = "$COMMAND"

try:
    if command == "now":
        dt = datetime.now(tz)
        print(format_output(dt))
    
    elif command == "convert":
        if not $@:
            print("Error: Value required for convert", file=sys.stderr)
            sys.exit(1)
        value = " ".join($@.split())
        dt = parse_timestamp(value)
        print(format_output(dt))
    
    elif command == "relative":
        if not $@:
            print("Error: Expression required for relative", file=sys.stderr)
            sys.exit(1)
        expr = " ".join($@.split())
        dt = parse_relative(expr)
        print(format_output(dt))
    
    elif command == "diff":
        args = $@.split()
        if len(args) < 2:
            print("Error: Two timestamps required for diff", file=sys.stderr)
            sys.exit(1)
        
        # Parse 'now' as current time
        a_str, b_str = args[0], args[1]
        a = parse_timestamp(a_str) if a_str != 'now' else datetime.now(tz)
        b = parse_timestamp(b_str) if b_str != 'now' else datetime.now(tz)
        
        diff = abs(b - a)
        unit = "$UNIT"
        
        total_seconds = int(diff.total_seconds())
        
        if unit == "days":
            result = total_seconds // 86400
            print(f"{result} days")
        elif unit == "hours":
            result = total_seconds // 3600
            print(f"{result} hours")
        elif unit == "minutes":
            result = total_seconds // 60
            print(f"{result} minutes")
        else:
            print(f"{total_seconds} seconds")
    
    elif command == "parse":
        if not $@:
            print("Error: Date string required for parse", file=sys.stderr)
            sys.exit(1)
        value = " ".join($@.split())
        dt = parse_timestamp(value)
        print(f"Unix: {int(dt.timestamp())}")
        print(f"ISO: {dt.strftime('%Y-%m-%dT%H:%M:%SZ')}")
        print(f"Human: {dt.strftime('%A, %B %d, %Y at %I:%M %p')}")
    
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF