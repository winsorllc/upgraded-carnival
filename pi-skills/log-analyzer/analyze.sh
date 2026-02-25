#!/bin/bash
#
# Log Analyzer - Analyze log files for patterns and insights
#

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Defaults
LOG_FILE=""
TAIL_LINES=""
SHOW_ERRORS=false
SHOW_WARNINGS=false
SHOW_SUMMARY=false
SHOW_STATS=false
PATTERN=""
SINCE=""
UNTIL=""

default_date_format="%Y-%m-%d %H:%M:%S"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tail|-n)
      TAIL_LINES="$2"
      shift 2
      ;;
    --errors|-e)
      SHOW_ERRORS=true
      shift
      ;;
    --warnings|-w)
      SHOW_WARNINGS=true
      shift
      ;;
    --summary|-s)
      SHOW_SUMMARY=true
      shift
      ;;
    --stats)
      SHOW_STATS=true
      shift
      ;;
    --pattern|-p)
      PATTERN="$2"
      shift 2
      ;;
    --since)
      SINCE="$2"
      shift 2
      ;;
    --until)
      UNTIL="$2"
      shift 2
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    -*)
      echo -e "${RED}Unknown option: $1${RESET}"
      show_help
      exit 1
      ;;
    *)
      if [ -z "$LOG_FILE" ]; then
        LOG_FILE="$1"
      fi
      shift
      ;;
  esac
done

show_help() {
  echo "Usage: analyze.sh <log-file> [options]"
  echo
  echo "Options:"
  echo "  --tail, -n <n>        Analyze last n lines"
  echo "  --errors, -e          Show only errors"
  echo "  --warnings, -w        Show only warnings"
  echo "  --summary, -s         Summary statistics only"
  echo "  --stats               Show detailed statistics"
  echo "  --pattern, -p <pat>   Search for pattern"
  echo "  --since <date>        Filter entries since date"
  echo "  --until <date>        Filter entries until date"
  echo "  --help, -h            Show this help"
}

print_header() {
  echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}║${BOLD}                      LOG ANALYSIS REPORT                       ${RESET}${CYAN}║${RESET}"
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}"
  echo
}

# Check if file exists
if [ -z "$LOG_FILE" ]; then
  echo -e "${RED}Error: No log file specified${RESET}"
  show_help
  exit 1
fi

if [ ! -f "$LOG_FILE" ]; then
  echo -e "${RED}Error: File not found: $LOG_FILE${RESET}"
  exit 1
fi

# Determine how to read the file
read_cmd="cat"
if [ -n "$TAIL_LINES" ]; then
  read_cmd="tail -n $TAIL_LINES"
fi

count_pattern() {
  local pattern="$1"
  $read_cmd "$LOG_FILE" 2>/dev/null | grep -c "$pattern" || echo "0"
}

extract_timestamps() {
  $read_cmd "$LOG_FILE" 2>/dev/null | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1
}

# Get total lines
TOTAL_LINES=$($read_cmd "$LOG_FILE" 2>/dev/null | wc -l)

# Count log levels
INFO_COUNT=$(count_pattern -i "info\\|information\\|\[INFO\\]\\|\bINFO\\s")
WARN_COUNT=$(count_pattern -i "warn\\|warning\\|\[WARN\\]\\|\bWARN\\s")
ERROR_COUNT=$(count_pattern -i "error\\|exception\\|\[ERROR\\]\\|\bERROR\\s\\|fail\\|failed\\|failure\\|\[ERR\\]")
FATAL_COUNT=$(count_pattern -i "fatal\\|critical\\|\[FATAL\\]\\|\[CRIT\\]")
DEBUG_COUNT=$(count_pattern -i "debug\\|\[DEBUG\\]")

# Get time range
FIRST_TS=$($read_cmd "$LOG_FILE" 2>/dev/null | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1)
LAST_TS=$($read_cmd "$LOG_FILE" 2>/dev/null | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}:[0-9]{2}' | tail -1)

# Output
print_header

echo -e "${BOLD}File:${RESET} ${BLUE}$LOG_FILE${RESET}"
echo -e "${BOLD}Lines Analyzed:${RESET} $(echo $TOTAL_LINES | tr -d ' ')"
if [ -n "$FIRST_TS" ]; then
  echo -e "${BOLD}Time Range:${RESET} $FIRST_TS to $LAST_TS"
fi
echo

# Show only errors mode
if [ "$SHOW_ERRORS" = true ]; then
  echo -e "${BOLD}${RED}ERRORS FOUND:${RESET}"
  echo -e "${CYAN}────────────────────────────────────────────────────────────────────${RESET}"
  $read_cmd "$LOG_FILE" 2>/dev/null | grep -iE "error|exception|fail|failed|\[ERR\]" | tail -20 | while read line; do
    # Colorize error lines
    if echo "$line" | grep -qiE "error|exception|fail"; then
      echo -e "${RED}$line${RESET}"
    else
      echo "$line"
    fi
  done
  exit 0
fi

# Show only warnings mode
if [ "$SHOW_WARNINGS" = true ]; then
  echo -e "${BOLD}${YELLOW}WARNINGS FOUND:${RESET}"
  echo -e "${CYAN}────────────────────────────────────────────────────────────────────${RESET}"
  $read_cmd "$LOG_FILE" 2>/dev/null | grep -iE "warn|warning|\[WARN\]" | tail -20 | while read line; do
    echo -e "${YELLOW}$line${RESET}"
  done
  exit 0
fi

# Summary/Overview
if [ "$SHOW_SUMMARY" = true ]; then
  echo -e "${BOLD}LEVEL DISTRIBUTION${RESET}"
  echo -e "${CYAN}──────────────────${RESET}"
  
  TOTAL=$((INFO_COUNT + WARN_COUNT + ERROR_COUNT + FATAL_COUNT + DEBUG_COUNT))
  if [ "$TOTAL" -eq 0 ]; then TOTAL=1; fi
  
  INFO_PCT=$(( INFO_COUNT * 100 / TOTAL ))
  WARN_PCT=$(( WARN_COUNT * 100 / TOTAL ))
  ERROR_PCT=$(( ERROR_COUNT * 100 / TOTAL ))
  FATAL_PCT=$(( FATAL_COUNT * 100 / TOTAL ))
  
  printf "  %8s  ${GREEN}%6d${RESET}  %3s%%\n" "INFO" "$INFO_COUNT" "$INFO_PCT"
  printf "  %8s  ${YELLOW}%6d${RESET}  %3s%%\n" "WARN" "$WARN_COUNT" "$WARN_PCT"
  printf "  %8s  ${RED}%6d${RESET}  %3s%%\n" "ERROR" "$ERROR_COUNT" "$ERROR_PCT"
  printf "  %8s  ${RED}%6d${RESET}  %3s%%\n" "FATAL" "$FATAL_COUNT" "$FATAL_PCT"
  echo
  echo -e "${INFO} Total: $TOTAL log entries"
  exit 0
fi

# Full analysis
echo -e "${BOLD}LEVEL DISTRIBUTION${RESET}"
echo -e "${CYAN}──────────────────${RESET}"

BAR_WIDTH=50
TOTAL=$((INFO_COUNT + WARN_COUNT + ERROR_COUNT + FATAL_COUNT + DEBUG_COUNT))
if [ "$TOTAL" -eq 0 ]; then TOTAL=1; fi

# Create bar charts
info_bar=$(printf '%*s' "$(( INFO_COUNT * BAR_WIDTH / TOTAL ))" '' | tr ' ' '#')
warn_bar=$(printf '%*s' "$(( WARN_COUNT * BAR_WIDTH / TOTAL ))" '' | tr ' ' '#')
error_bar=$(printf '%*s' "$(( ERROR_COUNT * BAR_WIDTH / TOTAL ))" '' | tr ' ' '#')
fatal_bar=$(printf '%*s' "$(( FATAL_COUNT * BAR_WIDTH / TOTAL ))" '' | tr ' ' '#')

printf "  ${GREEN}%6d${RESET}  INFO     %s\n" "$INFO_COUNT" "$info_bar"
printf "  ${YELLOW}%6d${RESET}  WARN     %s\n" "$WARN_COUNT" "$warn_bar"
printf "  ${RED}%6d${RESET}  ERROR    %s\n" "$ERROR_COUNT" "$error_bar"
printf "  ${RED}%6d${RESET}  FATAL    %s\n" "$FATAL_COUNT" "$fatal_bar"

# Top error patterns
echo
echo -e "${BOLD}TOP ERROR PATTERNS${RESET}"
echo -e "${CYAN}───────────────────${RESET}"

$read_cmd "$LOG_FILE" 2>/dev/null | grep -i "error\|exception\|fail" | \
  sed 's|/[^/]*:[0-9]*||g' | \
  sort | uniq -c | sort -rn | head -5 | while read count msg; do
  printf "  %5s  %s\n" "$count" "$(echo "$msg" | cut -c1-50)"
done

# Recent entries
if [ "$ERROR_COUNT" -gt 0 ]; then
  echo
  echo -e "${BOLD}RECENT ENTRIES${RESET}"
  echo -e "${CYAN}──────────────${RESET}"
  
  $read_cmd "$LOG_FILE" 2>/dev/null | tail -50 | grep -iE "error|warn|fail" | tail -5 | while read line; do
    # Colorize
    if echo "$line" | grep -qi "error"; then
      echo -e "  ${RED}$line${RESET}"
    elif echo "$line" | grep -qi "warn"; then
      echo -e "  ${YELLOW}$line${RESET}"
    else
      echo "  $line"
    fi
  done
fi

# Pattern search
if [ -n "$PATTERN" ]; then
  echo
  echo -e "${BOLD}PATTERN: \"${PATTERN}\"${RESET}"
  echo -e "${CYAN}────────────────────────────────────────────────────────────────────${RESET}"
  
  PATTERN_COUNT=$(count_pattern "$PATTERN")
  echo -e "  Found ${BLUE}$PATTERN_COUNT${RESET} matches"
  echo
  
  $read_cmd "$LOG_FILE" 2>/dev/null | grep "$PATTERN" | tail -10 | while read line; do
    echo "  $line"
  done
fi

echo
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${RESET}"
