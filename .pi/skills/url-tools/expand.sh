#!/bin/bash
# URL Expansion Tool - Follow redirects to find destination URL
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: expand.sh <short_url> [options]

Options:
  --follow-all       Follow all redirects (chain)
  --max-redirects N  Maximum redirects to follow (default: 10)
  -h, --help         Show this help

Examples:
  expand.sh "https://is.gd/abc123"
  expand.sh "https://bit.ly/example" --follow-all
EOF
    exit 2
}

# Default values
URL=""
FOLLOW_ALL=false
MAX_REDIRECTS=10

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --follow-all)
            FOLLOW_ALL=true
            ;;
        --max-redirects)
            shift
            MAX_REDIRECTS="$1"
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$URL" ]]; then
                URL="$1"
            fi
            ;;
    esac
    shift
done

if [[ -z "$URL" ]]; then
    echo "Error: URL required" >&2
    usage
fi

if [[ "$FOLLOW_ALL" == "true" ]]; then
    # Follow full redirect chain
    echo "Following redirect chain for: $URL"
    echo ""
    
    CURRENT_URL="$URL"
    COUNT=0
    
    while [[ $COUNT -lt $MAX_REDIRECTS ]]; do
        RESPONSE=$(curl -sI -L "$CURRENT_URL" -w "\n%{url_effective}\n%{http_code}" 2>/dev/null)
        FINAL_URL=$(echo "$RESPONSE" | tail -2 | head -1)
        STATUS=$(echo "$RESPONSE" | tail -1)
        
        if [[ "$CURRENT_URL" == "$FINAL_URL" ]]; then
            echo "Final destination: $FINAL_URL"
            echo "Status: $STATUS"
            break
        fi
        
        echo "Redirect: $CURRENT_URL -> $FINAL_URL"
        CURRENT_URL="$FINAL_URL"
        COUNT=$((COUNT + 1))
    done
    
    if [[ $COUNT -ge $MAX_REDIRECTS ]]; then
        echo "Warning: Maximum redirects ($MAX_REDIRECTS) reached"
    fi
else
    # Single expansion - get final URL
    RESPONSE=$(curl -sI -L "$URL" -w "\n%{url_effective}\n%{http_code}" 2>/dev/null)
    LINES=$(echo "$RESPONSE" | tail -3)
    FINAL_URL=$(echo "$LINES" | head -1)
    STATUS=$(echo "$LINES" | tail -1)
    
    echo "Short URL: $URL"
    echo "Destination: $FINAL_URL"
    echo "Status: $STATUS"
fi