#!/bin/bash
# Download files from URLs
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: download.sh <url> [options]

Options:
  --out <path>       Output file path (default: auto-detect from URL)
  --timeout <sec>    Timeout in seconds (default: 60)
  --resume           Resume interrupted download
  --progress         Show progress bar
  -h, --help         Show this help

Examples:
  download.sh "https://example.com/file.pdf"
  download.sh "https://example.com/archive.zip" --out /tmp/archive.zip
  download.sh "https://example.com/large.iso" --resume --progress
EOF
    exit 2
}

# Default values
URL=""
OUT=""
TIMEOUT=60
RESUME=false
PROGRESS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --out)
            shift
            OUT="$1"
            ;;
        --timeout)
            shift
            TIMEOUT="$1"
            ;;
        --resume)
            RESUME=true
            ;;
        --progress)
            PROGRESS=true
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

# Auto-detect output filename
if [[ -z "$OUT" ]]; then
    OUT=$(basename "$URL" | sed 's/?.*//' | sed 's/#.*//')
    if [[ -z "$OUT" ]] || [[ "$OUT" == "/" ]]; then
        OUT="download"
    fi
fi

# Create output directory
mkdir -p "$(dirname "$OUT")" 2>/dev/null || true

# Build curl arguments
CURL_ARGS=(-L --connect-timeout "$TIMEOUT" --max-time "$((TIMEOUT * 10))")

if [[ "$RESUME" == "true" ]]; then
    CURL_ARGS+=(-C -)
fi

if [[ "$PROGRESS" == "true" ]]; then
    CURL_ARGS+=(--progress-bar)
else
    CURL_ARGS+=(-s)
fi

# Download
echo "Downloading: $URL"
echo "Output: $OUT"

curl "${CURL_ARGS[@]}" -o "$OUT" "$URL"

# Get file size
SIZE=$(du -h "$OUT" | cut -f1)
echo "Downloaded: $SIZE"