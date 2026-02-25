#!/bin/bash
# Text processing utilities
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: text.sh <command> [options]

Commands:
  stats              Count lines, words, characters
  upper              Convert to uppercase
  lower              Convert to lowercase
  title              Convert to title case
  sentence           Convert to sentence case
  trim               Remove leading/trailing whitespace
  dedup              Remove duplicate lines
  strip-blank        Remove blank lines
  normalize-spaces   Normalize multiple spaces to single
  sort               Sort lines
  unique             Get unique lines
  replace            Find and replace
  encode             Encode text (base64, url, html, hex)
  decode             Decode text (base64, url, html, hex)

Options:
  --stdin            Read from stdin
  --out <file>       Write to file
  --regex            Use regex for replace
  --ignore-case      Case-insensitive matching
  --reverse          Reverse sort order
  --numeric          Numeric sort
  --count            Show count with unique
  -h, --help         Show this help

Examples:
  text.sh stats file.txt
  text.sh upper --stdin < file.txt
  text.sh replace file.txt "old" "new"
  text.sh sort --numeric --reverse data.txt
  text.sh encode base64 --stdin <<< "hello"
EOF
    exit 2
}

# Default values
COMMAND="${1:-}"
shift || true

FILE=""
STDIN=false
OUT=""
USE_REGEX=false
IGNORE_CASE=false
REVERSE=false
NUMERIC=false
SHOW_COUNT=false

# Parse arguments while preserving other args
ARGS=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --stdin)
            STDIN=true
            ;;
        --out)
            shift
            OUT="$1"
            ;;
        --regex)
            USE_REGEX=true
            ;;
        --ignore-case)
            IGNORE_CASE=true
            ;;
        --reverse)
            REVERSE=true
            ;;
        --numeric)
            NUMERIC=true
            ;;
        --count)
            SHOW_COUNT=true
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$FILE" ]] && [[ ! "$COMMAND" =~ (replace|encode|decode) ]]; then
                FILE="$1"
            else
                ARGS+=("$1")
            fi
            ;;
    esac
    shift
done

# Get input
get_input() {
    if [[ "$STDIN" == "true" ]]; then
        cat
    elif [[ -n "$FILE" ]]; then
        cat "$FILE"
    else
        echo "Error: No input file or stdin" >&2
        usage
    fi
}

# Output result
output() {
    if [[ -n "$OUT" ]]; then
        cat > "$OUT"
        echo "Output written to: $OUT" >&2
    else
        cat
    fi
}

# Execute command
case "$COMMAND" in
    stats)
        # Count without Python
        if [[ "$STDIN" == "true" ]]; then
            CONTENT=$(cat)
        elif [[ -n "$FILE" ]]; then
            CONTENT=$(cat "$FILE")
        else
            echo "Error: No input file or stdin" >&2
            usage
        fi
        
        LINES=$(echo "$CONTENT" | grep -c . || echo 0)
        WORDS=$(echo "$CONTENT" | wc -w | tr -d ' ')
        CHARS=$(echo "$CONTENT" | wc -c | tr -d ' ')
        CHARS_NO_SPACE=$(echo "$CONTENT" | tr -d ' \n\t' | wc -c | tr -d ' ')
        
        echo "Lines: $LINES"
        echo "Words: $WORDS"
        echo "Characters: $CHARS"
        echo "Characters (no spaces): $CHARS_NO_SPACE"
        ;;

    upper)
        get_input | tr '[:lower:]' '[:upper:]' | output
        ;;

    lower)
        get_input | tr '[:upper:]' '[:lower:]' | output
        ;;

    title)
        get_input | python3 -c "import sys; print(sys.stdin.read().title())" | output
        ;;

    sentence)
        get_input | python3 -c "
import sys
content = sys.stdin.read()
sentences = content.split('. ')
result = '. '.join(s.capitalize() for s in sentences)
print(result, end='')
" | output
        ;;

    trim)
        get_input | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | output
        ;;

    dedup)
        get_input | awk '!seen[$0]++' | output
        ;;

    strip-blank)
        get_input | sed '/^[[:space:]]*$/d' | output
        ;;

    normalize-spaces)
        get_input | sed 's/[[:space:]]\+/ /g' | output
        ;;

    sort)
        SORT_ARGS=""
        [[ "$REVERSE" == "true" ]] && SORT_ARGS="$SORT_ARGS -r"
        [[ "$NUMERIC" == "true" ]] && SORT_ARGS="$SORT_ARGS -n"
        get_input | sort $SORT_ARGS | output
        ;;

    unique)
        if [[ "$SHOW_COUNT" == "true" ]]; then
            get_input | sort | uniq -c | sort -rn | output
        else
            get_input | sort -u | output
        fi
        ;;

    replace)
        if [[ ${#ARGS[@]} -lt 2 ]]; then
            echo "Error: 'replace' requires pattern and replacement" >&2
            usage
        fi
        PATTERN="${ARGS[0]}"
        REPLACEMENT="${ARGS[1]}"
        
        if [[ "$USE_REGEX" == "true" ]]; then
            if [[ "$IGNORE_CASE" == "true" ]]; then
                get_input | sed "s/$PATTERN/$REPLACEMENT/gi" | output
            else
                get_input | sed "s/$PATTERN/$REPLACEMENT/g" | output
            fi
        else
            # Escape special characters for literal replacement
            PATTERN_ESC=$(printf '%s\n' "$PATTERN" | sed 's/[&/\]/\\&/g')
            REPLACEMENT_ESC=$(printf '%s\n' "$REPLACEMENT" | sed 's/[&/\]/\\&/g')
            if [[ "$IGNORE_CASE" == "true" ]]; then
                get_input | sed "s/$PATTERN_ESC/$REPLACEMENT_ESC/gi" | output
            else
                get_input | sed "s/$PATTERN_ESC/$REPLACEMENT_ESC/g" | output
            fi
        fi
        ;;

    encode)
        if [[ ${#ARGS[@]} -lt 1 ]]; then
            echo "Error: 'encode' requires encoding type" >&2
            usage
        fi
        ENCODING="${ARGS[0]}"
        
        case "$ENCODING" in
            base64)
                get_input | base64 | output
                ;;
            url)
                get_input | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=''))" | output
                ;;
            html)
                get_input | python3 -c "import sys, html; print(html.escape(sys.stdin.read()))" | output
                ;;
            hex)
                get_input | xxd -p | tr -d '\n' | output
                ;;
            *)
                echo "Error: Unknown encoding: $ENCODING" >&2
                echo "Available: base64, url, html, hex" >&2
                exit 1
                ;;
        esac
        ;;

    decode)
        if [[ ${#ARGS[@]} -lt 1 ]]; then
            echo "Error: 'decode' requires encoding type" >&2
            usage
        fi
        ENCODING="${ARGS[0]}"
        
        case "$ENCODING" in
            base64)
                get_input | base64 -d | output
                ;;
            url)
                get_input | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read()))" | output
                ;;
            html)
                get_input | python3 -c "import sys, html; print(html.unescape(sys.stdin.read()))" | output
                ;;
            hex)
                get_input | xxd -p -r | output
                ;;
            *)
                echo "Error: Unknown encoding: $ENCODING" >&2
                echo "Available: base64, url, html, hex" >&2
                exit 1
                ;;
        esac
        ;;

    -h|--help)
        usage
        ;;

    "")
        usage
        ;;

    *)
        echo "Unknown command: $COMMAND" >&2
        usage
        ;;
esac