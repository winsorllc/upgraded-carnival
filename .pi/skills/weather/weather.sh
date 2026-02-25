#!/bin/bash
# Weather skill - fetch weather data from wttr.in
set -euo pipefail

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    cat >&2 <<'EOF'
Usage: weather.sh <location> [options]

Options:
  --format=short    One-line summary (default)
  --format=full     Detailed multi-line output
  --json            JSON output
  --forecast        Show forecast instead of current
  --days=N          Number of days for forecast (1-7)
  -h, --help        Show this help

Examples:
  weather.sh "London"
  weather.sh "New York" --format=full
  weather.sh "Tokyo" --json
  weather.sh "Paris" --forecast --days=3
  weather.sh "JFK" --format=short
EOF
    exit 2
}

# Parse arguments
LOCATION=""
FORMAT="short"
JSON=false
FORECAST=false
DAYS=3

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --format=*)
            FORMAT="${1#*=}"
            ;;
        --format)
            shift
            FORMAT="${1:-short}"
            ;;
        --json)
            JSON=true
            ;;
        --forecast)
            FORECAST=true
            ;;
        --days=*)
            DAYS="${1#*=}"
            ;;
        --days)
            shift
            DAYS="${1:-3}"
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$LOCATION" ]]; then
                LOCATION="$1"
            fi
            ;;
    esac
    shift
done

if [[ -z "$LOCATION" ]]; then
    echo "Error: Location required" >&2
    usage
fi

# URL encode location
ENCODED_LOCATION=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$LOCATION'))" 2>/dev/null || echo "$LOCATION" | sed 's/ /+/g')

# Build URL based on options
if [[ "$JSON" == "true" ]]; then
    # JSON format
    URL="https://wttr.in/${ENCODED_LOCATION}?format=j1"
    curl -s "$URL"
elif [[ "$FORECAST" == "true" ]]; then
    # Forecast view
    URL="https://wttr.in/${ENCODED_LOCATION}?${DAYS}"
    curl -s "$URL"
else
    # Current weather
    case "$FORMAT" in
        short)
            # One-liner: Location: Condition, Temperature
            curl -s "https://wttr.in/${ENCODED_LOCATION}?format=3"
            ;;
        full)
            # Detailed current conditions
            curl -s "https://wttr.in/${ENCODED_LOCATION}?0"
            ;;
        *)
            echo "Unknown format: $FORMAT" >&2
            usage
            ;;
    esac
fi