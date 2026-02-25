#!/bin/bash
# HTTP Request Tool - Make HTTP requests with enhanced output
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: request.sh <method> <url> [options]

Methods:
  GET, POST, PUT, PATCH, DELETE

Options:
  --data <json>         Request body (JSON string)
  --file <path>          Read request body from file
  --form <data>          Form data or file upload (@filename)
  --header <header>      Custom header (can be repeated)
  --auth <type:creds>    Authentication: bearer:TOKEN or basic:user:pass
  --timeout <sec>        Request timeout (default: 30)
  --json                 Format JSON response
  --verbose              Show request/response details
  --follow               Follow redirects
  --max-redirects <n>    Max redirects (default: 5)
  --out <file>           Save response to file
  -h, --help             Show this help

Examples:
  request.sh GET "https://api.example.com/data" --json
  request.sh POST "https://api.example.com/create" --data '{"name":"test"}'
  request.sh GET "https://api.example.com" --auth bearer:TOKEN
  request.sh POST "https://api.example.com/upload" --form "file=@data.pdf"
EOF
    exit 2
}

# Default values
METHOD=""
URL=""
DATA=""
FILE=""
FORM=""
HEADERS=()
AUTH=""
TIMEOUT=30
JSON=false
VERBOSE=false
FOLLOW=false
MAX_REDIRECTS=5
OUT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --data)
            shift
            DATA="$1"
            ;;
        --file)
            shift
            FILE="$1"
            ;;
        --form)
            shift
            FORM="$1"
            ;;
        --header)
            shift
            HEADERS+=("-H" "$1")
            ;;
        --auth)
            shift
            AUTH="$1"
            ;;
        --timeout)
            shift
            TIMEOUT="$1"
            ;;
        --json)
            JSON=true
            ;;
        --verbose)
            VERBOSE=true
            ;;
        --follow)
            FOLLOW=true
            ;;
        --max-redirects)
            shift
            MAX_REDIRECTS="$1"
            ;;
        --out)
            shift
            OUT="$1"
            ;;
        GET|POST|PUT|PATCH|DELETE)
            METHOD="$1"
            ;;
        http://*|https://*)
            URL="$1"
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$METHOD" ]]; then
                METHOD="$1"
            elif [[ -z "$URL" ]]; then
                URL="$1"
            fi
            ;;
    esac
    shift
done

if [[ -z "$METHOD" ]]; then
    echo "Error: HTTP method required" >&2
    usage
fi

if [[ -z "$URL" ]]; then
    echo "Error: URL required" >&2
    usage
fi

# Build curl arguments
CURL_ARGS=("-X" "$METHOD" "-s" "-S")

# Add timeout
CURL_ARGS+=("--connect-timeout" "$TIMEOUT" "--max-time" "$TIMEOUT")

# Follow redirects
if [[ "$FOLLOW" == "true" ]]; then
    CURL_ARGS+=("-L" "--max-redirs" "$MAX_REDIRECTS")
fi

# Add headers
for header in "${HEADERS[@]}"; do
    CURL_ARGS+=("-H" "$header")
done

# Add authentication
if [[ -n "$AUTH" ]]; then
    AUTH_TYPE="${AUTH%%:*}"
    AUTH_VALUE="${AUTH#*:}"
    
    case "$AUTH_TYPE" in
        bearer)
            CURL_ARGS+=("-H" "Authorization: Bearer $AUTH_VALUE")
            ;;
        basic)
            CURL_ARGS+=("-u" "$AUTH_VALUE")
            ;;
        *)
            echo "Error: Unknown auth type: $AUTH_TYPE" >&2
            exit 1
            ;;
    esac
fi

# Add request body
if [[ -n "$DATA" ]]; then
    CURL_ARGS+=("-d" "$DATA")
    # Auto-add JSON content type if not already set
    if [[ "$DATA" == "{"* ]] && ! printf '%s\n' "${HEADERS[@]}" | grep -q "Content-Type"; then
        CURL_ARGS+=("-H" "Content-Type: application/json")
    fi
elif [[ -n "$FILE" ]]; then
    if [[ ! -f "$FILE" ]]; then
        echo "Error: File not found: $FILE" >&2
        exit 1
    fi
    CURL_ARGS+=("-d" "@$FILE")
    if [[ "$FILE" == *.json ]] && ! printf '%s\n' "${HEADERS[@]}" | grep -q "Content-Type"; then
        CURL_ARGS+=("-H" "Content-Type: application/json")
    fi
elif [[ -n "$FORM" ]]; then
    CURL_ARGS+=("-F" "$FORM")
fi

# Verbose output
if [[ "$VERBOSE" == "true" ]]; then
    echo "Request:" >&2
    echo "  Method: $METHOD" >&2
    echo "  URL: $URL" >&2
    if [[ -n "$DATA" ]]; then
        echo "  Body: $DATA" >&2
    fi
    echo "" >&2
fi

# Make request
if [[ -n "$OUT" ]]; then
    # Save to file
    CURL_ARGS+=("-o" "$OUT")
    curl "${CURL_ARGS[@]}" "$URL"
    echo "Response saved to: $OUT"
else
    # Output to stdout
    RESPONSE=$(curl "${CURL_ARGS[@]}" "$URL" 2>&1)
    
    if [[ "$JSON" == "true" ]]; then
        # Format JSON
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    else
        echo "$RESPONSE"
    fi
fi