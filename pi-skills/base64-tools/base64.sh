#!/bin/bash
# Base64 Tools - Encode and decode Base64
set -euo pipefail

# Default values
ACTION=""
INPUT=""
INPUT_FILE=""
OUTPUT_FILE=""
URL_SAFE=false
WRAP=76
NO_WRAP=false
IGNORE_GARBAGE=false
VALIDATE=false
OUTPUT_JSON=false

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") <encode|decode> [options]
       $(basename "$0") <encode|decode> --string "text"
       $(basename "$0") <encode|decode> --file <file>

Base64 encoding and decoding.

Commands:
  encode        Encode to base64
  decode        Decode from base64
  validate      Check if valid base64 (decode mode only)

Input Options:
  --string STR       Direct string input
  --file FILE        Read from file
  (stdin)            Read from stdin if no input specified

Output Options:
  --output FILE      Write to file (default: stdout)
  --wrap COLS        Wrap at N columns (default: 76, 0 for no wrap)
  --no-wrap          Don't wrap output (single line)

Encoding Options:
  --url-safe         Use URL-safe variant (-_ instead of +/)

Decoding Options:
  --ignore-garbage   Ignore non-base64 characters

Other Options:
  --json             Output as JSON
  --help             Show this help message

Examples:
  $(basename "$0") encode "Hello World"
  $(basename "$0") decode "SGVsbG8gV29ybGQ="
  $(basename "$0") encode --file image.png --output encoded.txt
  $(basename "$0") encode "user:data" --url-safe
  $(basename "$0") validate "SGVsbG8gV29ybGQ="
EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        encode|decode|validate)
            ACTION="$1"
            shift
            ;;
        --string)
            INPUT="$2"
            shift 2
            ;;
        --file)
            INPUT_FILE="$2"
            shift 2
            ;;
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --url-safe)
            URL_SAFE=true
            shift
            ;;
        --wrap)
            WRAP="$2"
            shift 2
            ;;
        --no-wrap)
            NO_WRAP=true
            shift
            ;;
        --ignore-garbage)
            IGNORE_GARBAGE=true
            shift
            ;;
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            # If no action yet, and it's not a flag, it might be the input
            if [[ -z "$ACTION" ]]; then
                echo "Error: Must specify encode or decode" >&2
                usage
            fi
            # Treat as input string
            if [[ -z "$INPUT" ]]; then
                INPUT="$1"
            fi
            shift
            ;;
    esac
done

# Validate action
if [[ -z "$ACTION" ]]; then
    echo "Error: Must specify encode, decode, or validate" >&2
    usage
fi

# Validate is just decode with validation check
if [[ "$ACTION" == "validate" ]]; then
    VALIDATE=true
    ACTION="decode"
fi

# Get input
INPUT_DATA=""

if [[ -n "$INPUT_FILE" ]]; then
    if [[ ! -f "$INPUT_FILE" ]]; then
        echo "Error: File not found: $INPUT_FILE" >&2
        exit 2
    fi
    INPUT_DATA=$(cat "$INPUT_FILE")
elif [[ -n "$INPUT" ]]; then
    INPUT_DATA="$INPUT"
else
    # Read from stdin
    INPUT_DATA=$(cat)
fi

# Convert URL-safe to standard for decoding
if [[ "$URL_SAFE" == "true" ]] && [[ "$ACTION" == "decode" ]]; then
    INPUT_DATA=$(echo "$INPUT_DATA" | tr '_-' '/+' | tr -d '=')
    # Add back padding if needed
    local len
    len=$(echo -n "$INPUT_DATA" | wc -c)
    local pad=$((4 - (len % 4)))
    if [[ $pad -lt 4 ]]; then
        INPUT_DATA="${INPUT_DATA}$(printf '=%.0s' {1..$pad})"
    fi
fi

# Perform encoding/decoding
RESULT=""
EXIT_CODE=0

if [[ "$ACTION" == "encode" ]]; then
    # Encode
    if [[ "$NO_WRAP" == "true" ]] || [[ "$WRAP" -eq 0 ]]; then
        RESULT=$(echo -n "$INPUT_DATA" | base64 | tr -d '\n')
    else
        RESULT=$(echo -n "$INPUT_DATA" | base64)
        if [[ "$WRAP" -gt 0 ]]; then
            RESULT=$(echo "$RESULT" | fold -w "$WRAP")
        fi
    fi
    
    # Convert to URL-safe if requested
    if [[ "$URL_SAFE" == "true" ]]; then
        RESULT=$(echo "$RESULT" | tr '+/' '-_' | tr -d '=')
    fi
else
    # Decode
    # Ignore garbage if requested
    if [[ "$IGNORE_GARBAGE" == "true" ]]; then
        INPUT_DATA=$(echo "$INPUT_DATA" | tr -cd 'A-Za-z0-9+/=')
    fi
    
    # Validate first
    if [[ "$VALIDATE" == "true" ]]; then
        if echo "$INPUT_DATA" | base64 -d &>/dev/null; then
            echo "Valid base64"
            exit 0
        else
            echo "Invalid base64" >&2
            exit 1
        fi
    fi
    
    # Perform decode
    set +e
    RESULT=$(echo "$INPUT_DATA" | base64 -d 2>&1)
    EXIT_CODE=$?
    set -e
    
    if [[ $EXIT_CODE -ne 0 ]]; then
        echo "Error: Invalid base64 input" >&2
        exit 1
    fi
fi

# Output
if [[ "$OUTPUT_JSON" == "true" ]]; then
    if [[ "$ACTION" == "encode" ]]; then
        cat << EOF
{
  "action": "encode",
  "input": $(echo "$INPUT_DATA" | jq -Rs .),
  "encoded": $(echo "$RESULT" | jq -Rs .),
  "urlSafe": $URL_SAFE
}
EOF
    else
        cat << EOF
{
  "action": "decode",
  "input": $(echo "$INPUT_DATA" | jq -Rs .),
  "decoded": $(echo "$RESULT" | jq -Rs .)
}
EOF
    fi
else
    if [[ -n "$OUTPUT_FILE" ]]; then
        echo -n "$RESULT" > "$OUTPUT_FILE"
        if [[ "$NO_WRAP" != "true" ]] && [[ "$ACTION" == "encode" ]]; then
            # Add newline for readability
            echo "" >> "$OUTPUT_FILE"
        fi
    else
        echo -n "$RESULT"
        if [[ "$NO_WRAP" != "true" ]] && [[ "$ACTION" == "encode" ]] && [[ -t 1 ]]; then
            # Add newline for terminal
            echo ""
        fi
    fi
fi

exit $EXIT_CODE