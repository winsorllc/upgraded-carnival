#!/bin/bash
# Calendar List - List Google Calendar events
# Usage: calendar-list.sh [when] [options]

WHEN="$1"
shift || true

CALENDAR=""
OUTPUT_JSON=false

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --calendar)
            CALENDAR="--calendar $2"
            shift 2
            ;;
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Default to today
WHEN="${WHEN:-today}"

# Check for available calendar tools
if command -v gcalcli &> /dev/null; then
    CMD="gcalcli"
    
    case "$WHEN" in
        today)
            $CMD list $CALENDAR --tsv 2>/dev/null || $CMD agenda today
            ;;
        tomorrow)
            $CMD agenda tomorrow
            ;;
        week)
            $CMD calw
            ;;
        *)
            # Assume it's a date
            $CMD agenda "$WHEN"
            ;;
    esac
    
elif command -v gccli &> /dev/null; then
    CMD="gccli"
    $CMD calendar list "$WHEN"
    
else
    echo "Error: No calendar tool found."
    echo "Install gcalcli: pip install gcalcli"
    echo "Or use gccli from OpenClaw"
    exit 1
fi
