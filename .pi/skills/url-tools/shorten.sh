#!/bin/bash
# URL Shortening Tool - Shorten URLs using free services
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: shorten.sh <url> [options]

Options:
  --service <name>    Service to use: isgd (default), vgd, tinyurl, cleanuri
  --custom <slug>     Custom slug (v.gd only)
  -h, --help          Show this help

Examples:
  shorten.sh "https://example.com/very/long/url"
  shorten.sh "https://example.com" --service=vgd --custom=myslug
  shorten.sh "https://example.com" --service=tinyurl
EOF
    exit 2
}

# Default values
URL=""
SERVICE="isgd"
CUSTOM=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --service\=*)
            SERVICE="${1#*=}"
            ;;
        --custom)
            shift
            CUSTOM="$1"
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

# URL encode the URL using node
ENCODED_URL=$(node -e "console.log(encodeURIComponent('$URL'))" 2>/dev/null || echo "$URL" | sed 's/ /+/g')

# Shorten based on service
case "$SERVICE" in
    isgd)
        SHORT_URL=$(curl -s "https://is.gd/create.php?format=simple&url=${ENCODED_URL}")
        ;;
    vgd)
        if [[ -n "$CUSTOM" ]]; then
            SHORT_URL=$(curl -s "https://v.gd/create.php?format=simple&url=${ENCODED_URL}&shorturl=${CUSTOM}")
        else
            SHORT_URL=$(curl -s "https://v.gd/create.php?format=simple&url=${ENCODED_URL}")
        fi
        ;;
    tinyurl)
        SHORT_URL=$(curl -s "https://tinyurl.com/api-create.php?url=${URL}")
        ;;
    cleanuri)
        RESULT=$(curl -s -X POST "https://cleanuri.com/api/v1/shorten" -d "url=${URL}")
        SHORT_URL=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result_url',''))" 2>/dev/null || echo "$RESULT")
        ;;
    *)
        echo "Unknown service: $SERVICE" >&2
        echo "Available: isgd, vgd, tinyurl, cleanuri" >&2
        exit 1
        ;;
esac

if [[ -z "$SHORT_URL" ]] || [[ "$SHORT_URL" == *"Error"* ]]; then
    echo "Error: Failed to shorten URL" >&2
    exit 1
fi

echo "Original: $URL"
echo "Short: $SHORT_URL"