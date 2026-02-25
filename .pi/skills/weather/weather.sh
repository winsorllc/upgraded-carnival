#!/bin/bash
# Weather skill - Get weather information from wttr.in

location="${1:-}"
format="${2:-3}"

if [ -z "$location" ]; then
    echo "Usage: weather <location> [format]"
    echo "  format 3: One-line summary (default)"
    echo "  format 0: Detailed current"
    echo "  format v2: Week forecast"
    echo "  format j1: JSON output"
    exit 1
fi

# URL encode the location
encoded_location=$(echo "$location" | sed 's/ /+/g')

# Get weather based on format
case "$format" in
    3)
        curl -s "wttr.in/${encoded_location}?format=3"
        ;;
    0)
        curl -s "wttr.in/${encoded_location}?0"
        ;;
    v2)
        curl -s "wttr.in/${encoded_location}?format=v2"
        ;;
    j1)
        curl -s "wttr.in/${encoded_location}?format=j1"
        ;;
    *)
        curl -s "wttr.in/${encoded_location}?format=${format}"
        ;;
esac
