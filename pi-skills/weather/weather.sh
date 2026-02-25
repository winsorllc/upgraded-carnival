#!/bin/bash
# Weather tool - Get current weather and forecasts via wttr.in
# Usage: weather.sh [location] [options]

set -e

LOCATION="${1:-}"
FORMAT="${2:-3}"

if [ -z "$LOCATION" ]; then
    echo "Usage: weather.sh <location> [format]"
    echo "  format 3 = one-line summary (default)"
    echo "  format 0 = current conditions"
    echo "  format v2 = week forecast"
    exit 1
fi

# URL encode the location for spaces
ENCODED_LOCATION=$(echo "$LOCATION" | sed 's/ /+/g')

# Get weather based on format
case "$FORMAT" in
    3)
        # One-line summary
        curl -s "wttr.in/${ENCODED_LOCATION}?format=%l:+%c+%t+(feels+like+%f),+%w+wind,+%h+humidity"
        ;;
    0)
        # Current conditions
        curl -s "wttr.in/${ENCODED_LOCATION}?0"
        ;;
    v2)
        # Week forecast
        curl -s "wttr.in/${ENCODED_LOCATION}?format=v2"
        ;;
    j1)
        # JSON output
        curl -s "wttr.in/${ENCODED_LOCATION}?format=j1"
        ;;
    *)
        # Custom format
        curl -s "wttr.in/${ENCODED_LOCATION}?format=$FORMAT"
        ;;
esac
