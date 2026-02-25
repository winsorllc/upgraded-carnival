#!/bin/bash
# Log Analyzer - Analyze log files for patterns and errors
set -euo pipefail

# Default values
LOG_FILE=""
ERRORS=false
ERRORS_ONLY=false
ERROR_PATTERN="ERROR|Error|error|FATAL|Fatal|fatal|CRITICAL|Critical|critical|FAIL|Fail|fail|Exception|exception|EXCEPTION"
PATTERN=""
COUNT_PATTERN=false
CONTEXT=0
TIME_START=""
TIME_END=""
LAST_DURATION=""
HOURLY=false
TIMELINE=false
STATS=false
COUNT_BY=""
UNIQUE_FIELD=""
TOP_N=""
TOP_FIELD=""
LOG_FORMAT="auto"
CUSTOM_REGEX=""
OUTPUT_FORMAT="text"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") <logfile> [options]

Analyze log files for patterns, errors, and statistics.

Log File:
  logfile                  Path to log file (supports .gz compression)

Analysis Options:
  --summary               Show summary overview
  --errors                Show error entries
  --errors-only           Only show errors (hide others)
  --error-pattern REGEX   Custom error pattern (default: ERROR|FAIL|Exception)
  --pattern REGEX         Search for pattern
  --count                 Count pattern matches
  --context N             Show N lines of context

Time Options:
  --time-range START END  Filter by time range (YYYY-MM-DD HH:MM)
  --last DURATION         Last N duration (1h, 24h, 7d, 30d)
  --hourly               Group by hour
  --timeline              Show events timeline

Statistics:
  --stats                 Show statistics
  --count-by FIELD        Count by field
  --unique FIELD          Unique values in field
  --top N FIELD           Top N values by field

Format:
  --format FORMAT         Log format: auto, apache, nginx, json, syslog, custom
  --regex REGEX           Custom regex for format
  --output FORMAT         Output: text, json, csv

Other:
  --help                  Show this help message

Examples:
  $(basename "$0") app.log --summary
  $(basename "$0") app.log --errors --last 1h
  $(basename "$0") access.log --count-by ip --top 10
  $(basename "$0") app.log --pattern "user:\d+" --count
EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --summary)
            STATS=true
            shift
            ;;
        --errors)
            ERRORS=true
            shift
            ;;
        --errors-only)
            ERRORS_ONLY=true
            ERRORS=true
            shift
            ;;
        --error-pattern)
            ERROR_PATTERN="$2"
            shift 2
            ;;
        --pattern)
            PATTERN="$2"
            shift 2
            ;;
        --count)
            COUNT_PATTERN=true
            shift
            ;;
        --context)
            CONTEXT="$2"
            shift 2
            ;;
        --time-range)
            TIME_START="$2"
            TIME_END="$3"
            shift 3
            ;;
        --last)
            LAST_DURATION="$2"
            shift 2
            ;;
        --hourly)
            HOURLY=true
            shift
            ;;
        --timeline)
            TIMELINE=true
            shift
            ;;
        --stats)
            STATS=true
            shift
            ;;
        --count-by)
            COUNT_BY="$2"
            shift 2
            ;;
        --unique)
            UNIQUE_FIELD="$2"
            shift 2
            ;;
        --top)
            TOP_N="$2"
            TOP_FIELD="$3"
            shift 3
            ;;
        --format)
            LOG_FORMAT="$2"
            shift 2
            ;;
        --regex)
            CUSTOM_REGEX="$2"
            shift 2
            ;;
        --output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            if [[ -z "$LOG_FILE" ]]; then
                LOG_FILE="$1"
            fi
            shift
            ;;
    esac
done

# Validate
if [[ -z "$LOG_FILE" ]]; then
    echo "Error: Log file required" >&2
    usage
fi

if [[ ! -f "$LOG_FILE" ]]; then
    echo "Error: File not found: $LOG_FILE" >&2
    exit 2
fi

# Detect log format
detect_format() {
    local file="$1"
    local first_lines
    first_lines=$(head -20 "$file" 2>/dev/null || cat "$file" | head -20)
    
    # Check if JSON
    if echo "$first_lines" | grep -qE '^\s*\{.*\}\s*$'; then
        echo "json"
        return
    fi
    
    # Check for Apache combined log format
    if echo "$first_lines" | grep -qE '^[0-9.]+ - - \[[0-9]+/[A-Za-z]+/[0-9]+:[0-9]+:[0-9]+:[0-9]+ [+-][0-9]+\]'; then
        echo "apache"
        return
    fi
    
    # Check for Nginx log format
    if echo "$first_lines" | grep -qE '^[0-9.]+ - - \[[0-9]+/[A-Za-z]+/[0-9]+:[0-9]+:[0-9]+:[0-9]+ \+[0-9]+\]'; then
        echo "nginx"
        return
    fi
    
    # Check for syslog format
    if echo "$first_lines" | grep -qE '^[A-Z][a-z]{2} [ 0-9][0-9] [0-9]{2}:[0-9]{2}:[0-9]{2}'; then
        echo "syslog"
        return
    fi
    
    # Default: plain text with timestamps
    echo "plain"
}

# Parse timestamp from log line
parse_timestamp() {
    local line="$1"
    
    # Try ISO format
    if echo "$line" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1; then
        return
    fi
    
    # Try common log format [10/Oct/2000:13:55:36]
    if echo "$line" | grep -oE '\[[0-9]+/[A-Za-z]+/[0-9]+:[0-9]+:[0-9]+:[0-9]+' | sed 's/\[//'; then
        return
    fi
    
    # Try syslog format Jan  1 00:00:00
    if echo "$line" | grep -oE '^[A-Z][a-z]{2} [ 0-9][0-9] [0-9]{2}:[0-9]{2}:[0-9]{2}'; then
        return
    fi
    
    echo ""
}

# Extract log level from line
extract_level() {
    local line="$1"
    
    # Try common level patterns
    if echo "$line" | grep -oiE '\b(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL|TRACE)\b' | head -1 | tr '[:lower:]' '[:upper:]'; then
        return
    fi
    
    # Try HTTP status
    local status
    status=$(echo "$line" | grep -oE '" [0-9]{3} ' | grep -oE '[0-9]{3}' | head -1)
    if [[ -n "$status" ]]; then
        if [[ "$status" -ge 500 ]]; then
            echo "ERROR"
        elif [[ "$status" -ge 400 ]]; then
            echo "WARNING"
        else
            echo "INFO"
        fi
        return
    fi
    
    echo "UNKNOWN"
}

# Extract field from JSON
extract_json_field() {
    local line="$1"
    local field="$2"
    echo "$line" | jq -r ".$field // empty" 2>/dev/null || echo ""
}

# Extract field from common log format
extract_log_field() {
    local line="$1"
    local field="$2"
    local format="$3"
    
    case "$format" in
        apache|nginx)
            case "$field" in
                ip)
                    echo "$line" | grep -oE '^[0-9.]+' | head -1
                    ;;
                method)
                    echo "$line" | grep -oE '"[A-Z]+ ' | tr -d '"' | tr -d ' ' | head -1
                    ;;
                path)
                    echo "$line" | grep -oE '"[A-Z]+ [^ ]+' | sed 's/"[A-Z]* //' | tr -d '"' | head -1
                    ;;
                status)
                    echo "$line" | grep -oE '" [0-9]{3} ' | grep -oE '[0-9]{3}' | head -1
                    ;;
                size)
                    echo "$line" | grep -oE '" [0-9]{3} [0-9]+' | grep -oE '[0-9]+$' | head -1
                    ;;
                user_agent)
                    echo "$line" | grep -oE '"[^"]*"$' | tr -d '"' | head -1
                    ;;
            esac
            ;;
        *)
            # Try JSON extraction
            extract_json_field "$line" "$field"
            ;;
    esac
}

# Filter by time
filter_by_time() {
    local lines="$1"
    local start="$2"
    local end="$3"
    
    # This is simplified - real implementation would parse timestamps
    # For now, pass through
    echo "$lines"
}

# Filter by last duration
filter_by_last() {
    local lines="$1"
    local duration="$2"
    
    local seconds
    case "$duration" in
        *h) seconds=$(( ${duration%h} * 3600 )) ;;
        *d) seconds=$(( ${duration%d} * 86400 )) ;;
        *m) seconds=$(( ${duration%m} * 60 )) ;;
        *) seconds="$duration" ;;
    esac
    
    local cutoff
    cutoff=$(date -d "$seconds seconds ago" +%s 2>/dev/null || date -v-${seconds}S +%s 2>/dev/null)
    
    # For now, return all lines (would need timestamp parsing)
    echo "$lines"
}

# Generate summary
generate_summary() {
    local file="$1"
    local total_lines
    total_lines=$(wc -l < "$file" | tr -d ' ')
    local format
    format="${LOG_FORMAT}"
    [[ "$format" == "auto" ]] && format=$(detect_format "$file")
    
    # Count by level
    local error_count=0
    local warn_count=0
    local info_count=0
    local other_count=0
    
    while IFS= read -r line; do
        local level
        level=$(extract_level "$line")
        case "$level" in
            ERROR|FATAL|CRITICAL) ((error_count++)) ;;
            WARN|WARNING) ((warn_count++)) ;;
            INFO) ((info_count++)) ;;
            *) ((other_count++)) ;;
        esac
        [[ $((error_count + warn_count + info_count + other_count)) -ge 1000 ]] && break
    done < "$file"
    
    # Approximate based on sample
    local samples=$((error_count + warn_count + info_count + other_count))
    error_count=$((error_count * total_lines / samples))
    warn_count=$((warn_count * total_lines / samples))
    info_count=$((info_count * total_lines / samples))
    other_count=$((total_lines - error_count - warn_count - info_count))
    
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        cat << EOF
{
  "file": "$file",
  "total_lines": $total_lines,
  "format": "$format",
  "levels": {
    "error": $error_count,
    "warning": $warn_count,
    "info": $info_count,
    "other": $other_count
  }
}
EOF
    else
        echo "Log Analysis Summary: $file"
        echo "================================"
        echo "Total lines:     $total_lines"
        echo "Detected format: $format"
        echo ""
        echo "Log Levels:"
        printf "  %-10s %s (%.1f%%)\n" "ERROR:" "$error_count" "$(echo "$error_count * 100 / $total_lines" | bc -l 2>/dev/null || echo '0')"
        printf "  %-10s %s (%.1f%%)\n" "WARNING:" "$warn_count" "$(echo "$warn_count * 100 / $total_lines" | bc -l 2>/dev/null || echo '0')"
        printf "  %-10s %s (%.1f%%)\n" "INFO:" "$info_count" "$(echo "$info_count * 100 / $total_lines" | bc -l 2>/dev/null || echo '0')"
        printf "  %-10s %s\n" "OTHER:" "$other_count"
    fi
}

# Show errors
show_errors() {
    local file="$1"
    local pattern="$2"
    
    if [[ "$CONTEXT" -gt 0 ]]; then
        grep -i -E "$pattern" -A "$CONTEXT" -B "$CONTEXT" "$file"
    else
        grep -i -E "$pattern" "$file"
    fi
}

# Count pattern matches
count_pattern() {
    local file="$1"
    local pattern="$2"
    local count
    count=$(grep -i -c -E "$pattern" "$file" 2>/dev/null || echo "0")
    echo "$count matches found for pattern: $pattern"
}

# Count by field
count_by_field() {
    local file="$1"
    local field="$2"
    local format="$3"
    
    declare -A counts
    
    while IFS= read -r line; do
        local value
        value=$(extract_log_field "$line" "$field" "$format")
        [[ -n "$value" ]] && ((counts["$value"]++))
    done < "$file"
    
    # Sort by count
    for key in "${!counts[@]}"; do
        echo "${counts[$key]} $key"
    done | sort -rn | head -20
}

# Get unique values
get_unique() {
    local file="$1"
    local field="$2"
    local format="$3"
    
    while IFS= read -r line; do
        extract_log_field "$line" "$field" "$format"
    done < "$file" | sort -u | head -100
}

# Show hourly distribution
show_hourly() {
    local file="$1"
    
    # Extract hours and count
    local hour_counts
    hour_counts=$(grep -oE 'T?[0-9]{2}:[0-9]{2}:[0-9]{2}' "$file" 2>/dev/null | cut -d: -f1 | sed 's/^T//' | sort | uniq -c)
    
    echo "Hourly Distribution:"
    echo "$hour_counts" | while read -r count hour; do
        local bar
        bar=$(printf '━%.0s' $(seq 1 $(($count / 10 + 1)) 2>/dev/null) 2>/dev/null || echo "")
        printf "%02d:00 ━ %s %d\n" "$hour" "$bar" "$count"
    done
}

# Top N analysis
show_top() {
    local file="$1"
    local n="$2"
    local field="$3"
    local format="$4"
    
    echo "Top $n values for field '$field':"
    count_by_field "$file" "$field" "$format" | head -n "$n"
}

# Main analysis
if [[ "$STATS" == "true" ]]; then
    generate_summary "$LOG_FILE"
elif [[ "$ERRORS" == "true" ]]; then
    if [[ "$ERRORS_ONLY" == "true" ]]; then
        show_errors "$LOG_FILE" "$ERROR_PATTERN"
    else
        show_errors "$LOG_FILE" "$ERROR_PATTERN"
    fi
elif [[ -n "$PATTERN" ]]; then
    if [[ "$COUNT_PATTERN" == "true" ]]; then
        count_pattern "$LOG_FILE" "$PATTERN"
    else
        if [[ "$CONTEXT" -gt 0 ]]; then
            grep -i -E "$PATTERN" -A "$CONTEXT" -B "$CONTEXT" "$LOG_FILE"
        else
            grep -i -E "$PATTERN" "$LOG_FILE"
        fi
    fi
elif [[ -n "$COUNT_BY" ]]; then
    format="$LOG_FORMAT"
    [[ "$format" == "auto" ]] && format=$(detect_format "$LOG_FILE")
    echo "Count by $COUNT_BY:"
    count_by_field "$LOG_FILE" "$COUNT_BY" "$format"
elif [[ -n "$UNIQUE_FIELD" ]]; then
    format="$LOG_FORMAT"
    [[ "$format" == "auto" ]] && format=$(detect_format "$LOG_FILE")
    echo "Unique values for $UNIQUE_FIELD:"
    get_unique "$LOG_FILE" "$UNIQUE_FIELD" "$format"
elif [[ -n "$TOP_N" ]]; then
    format="$LOG_FORMAT"
    [[ "$format" == "auto" ]] && format=$(detect_format "$LOG_FILE")
    show_top "$LOG_FILE" "$TOP_N" "$TOP_FIELD" "$format"
elif [[ "$HOURLY" == "true" ]]; then
    show_hourly "$LOG_FILE"
else
    # Default: show summary
    generate_summary "$LOG_FILE"
fi