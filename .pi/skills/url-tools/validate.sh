#!/bin/bash
# URL Validation Tool - Check if URL is valid and reachable
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: validate.sh <url> [options]

Options:
  --check-reachability   Check if URL is reachable (HEAD request)
  --timeout <sec>        Timeout in seconds (default: 10)
  -h, --help             Show this help

Examples:
  validate.sh "https://example.com"
  validate.sh "https://example.com" --check-reachability
EOF
    exit 2
}

# Default values
URL=""
CHECK_REACHABILITY=false
TIMEOUT=10

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --check-reachability)
            CHECK_REACHABILITY=true
            ;;
        --timeout)
            shift
            TIMEOUT="$1"
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

# Parse URL with Node.js
PARSED=$(node -e "
const url = '$URL';
try {
    const parsed = new URL(url);
    console.log('Scheme:', parsed.protocol.replace(':', ''));
    console.log('Host:', parsed.host);
    console.log('Path:', parsed.pathname || '/');
    if (parsed.search) console.log('Query:', parsed.search);
    if (parsed.hash) console.log('Fragment:', parsed.hash);
    console.log('VALID');
} catch (e) {
    console.log('INVALID:', e.message);
    process.exit(1);
}
" 2>&1)

if echo "$PARSED" | grep -q "INVALID"; then
    echo "URL: $URL"
    echo "$PARSED"
    exit 1
fi

echo "URL: $URL"
echo "$PARSED"

# Check reachability if requested
if [[ "$CHECK_REACHABILITY" == "true" ]]; then
    echo ""
    echo "Checking reachability..."
    
    STATUS=$(curl -sI --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "$URL" -o /dev/null -w "%{http_code}" 2>/dev/null || echo "000")
    
    if [[ "$STATUS" == "000" ]]; then
        echo "Reachability: FAILED (connection error)"
        exit 1
    elif [[ "$STATUS" =~ ^2[0-9]{2}$ ]]; then
        echo "Reachability: OK (HTTP $STATUS)"
    elif [[ "$STATUS" =~ ^3[0-9]{2}$ ]]; then
        echo "Reachability: REDIRECT (HTTP $STATUS)"
    else
        echo "Reachability: ERROR (HTTP $STATUS)"
    fi
fi