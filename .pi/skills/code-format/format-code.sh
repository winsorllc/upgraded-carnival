#!/bin/bash
# Code formatting tool
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: format-code.sh <file> [options]

Options:
  --language <lang>   Specify language (auto-detect from extension)
  --stdin            Read from stdin
  --out <file>       Write to file (default: stdout)
  --check            Check if formatting needed (exit 1 if not formatted)
  --diff             Show diff instead of formatted output
  --indent <n>       Indentation size (default: language-specific)
  --languages        List supported languages
  -h, --help         Show this help

Examples:
  format-code.sh script.py
  format-code.sh config.json --indent 4
  format-code.sh --stdin --language js < code.js
  format-code.sh script.py --check
EOF
    exit 2
}

# Detect language from file extension
detect_language() {
    local file="$1"
    local ext="${file##*.}"
    case "$ext" in
        py) echo "python" ;;
        js|mjs|cjs) echo "javascript" ;;
        ts|tsx) echo "typescript" ;;
        json) echo "json" ;;
        yaml|yml) echo "yaml" ;;
        md|markdown) echo "markdown" ;;
        html|htm) echo "html" ;;
        css|scss|sass) echo "css" ;;
        sql) echo "sql" ;;
        sh|bash) echo "shell" ;;
        *) echo "unknown" ;;
    esac
}

# Default values
FILE=""
LANGUAGE=""
STDIN=false
OUT=""
CHECK=false
DIFF=false
INDENT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --language)
            shift
            LANGUAGE="$1"
            ;;
        --stdin)
            STDIN=true
            ;;
        --out)
            shift
            OUT="$1"
            ;;
        --check)
            CHECK=true
            ;;
        --diff)
            DIFF=true
            ;;
        --indent)
            shift
            INDENT="$1"
            ;;
        --languages)
            echo "Supported languages:"
            echo "  python    (.py)"
            echo "  javascript (.js, .mjs, .cjs)"
            echo "  typescript (.ts, .tsx)"
            echo "  json      (.json)"
            echo "  yaml      (.yaml, .yml)"
            echo "  markdown  (.md, .markdown)"
            echo "  html      (.html, .htm)"
            echo "  css       (.css, .scss, .sass)"
            echo "  sql       (.sql)"
            echo "  shell     (.sh, .bash)"
            exit 0
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$FILE" ]]; then
                FILE="$1"
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

# Detect language if not specified
if [[ -z "$LANGUAGE" ]] && [[ -n "$FILE" ]]; then
    LANGUAGE=$(detect_language "$FILE")
fi

# Format based on language
format_python() {
    local input="$1"
    python3 << PYEOF
import sys
import ast
import re

input_code = """$input"""

# Try black first, then autopep8, then basic formatting
try:
    import black
    formatted = black.format_str(input_code, mode=black.FileMode())
except ImportError:
    try:
        import autopep8
        formatted = autopep8.fix_code(input_code)
    except ImportError:
        # Basic formatting
        formatted = input_code
        lines = formatted.split('\n')
        formatted = '\n'.join(line.rstrip() for line in lines)

print(formatted, end='')
PYEOF
}

format_json() {
    local input="$1"
    local indent="${INDENT:-2}"
    python3 -c "import sys, json; print(json.dumps(json.loads(sys.stdin.read()), indent=$indent, ensure_ascii=False))" <<< "$input"
}

format_yaml() {
    local input="$1"
    local indent="${INDENT:-2}"
    python3 << PYEOF
import sys
try:
    import yaml
    data = yaml.safe_load("""$input""")
    print(yaml.dump(data, indent=$indent, default_flow_style=False, allow_unicode=True), end='')
except ImportError:
    print("PyYAML not installed. Install with: pip install pyyaml", file=sys.stderr)
    sys.exit(1)
PYEOF
}

format_js() {
    local input="$1"
    # Try prettier first
    if command -v prettier &>/dev/null; then
        echo "$input" | prettier --stdin-filepath script.js 2>/dev/null || echo "$input"
    else
        # Basic JS formatting
        python3 << PYEOF
import re

code = """$input"""
# Basic formatting: fix some spacing
code = re.sub(r'\s*{\s*', ' {\n  ', code)
code = re.sub(r'\s*}\s*', '\n}\n', code)
code = re.sub(r';\s*', ';\n', code)
print(code)
PYEOF
    fi
}

format_sql() {
    local input="$1"
    python3 << PYEOF
try:
    import sqlparse
    print(sqlparse.format("""$input""", reindent=True), end='')
except ImportError:
    print("""$input""")
PYEOF
}

# Get input
INPUT=$(get_input)

# Format
case "$LANGUAGE" in
    python)
        FORMATTED=$(format_python "$INPUT")
        ;;
    json)
        FORMATTED=$(format_json "$INPUT")
        ;;
    yaml)
        FORMATTED=$(format_yaml "$INPUT")
        ;;
    javascript|typescript)
        FORMATTED=$(format_js "$INPUT")
        ;;
    sql)
        FORMATTED=$(format_sql "$INPUT")
        ;;
    *)
        # Unknown language - output as-is
        FORMATTED="$INPUT"
        ;;
esac

# Handle check mode
if [[ "$CHECK" == "true" ]]; then
    if [[ "$INPUT" == "$FORMATTED" ]]; then
        exit 0
    else
        echo "File needs formatting" >&2
        exit 1
    fi
fi

# Handle diff mode
if [[ "$DIFF" == "true" ]]; then
    diff <(echo "$INPUT") <(echo "$FORMATTED") || true
    exit 0
fi

# Output
if [[ -n "$OUT" ]]; then
    echo "$FORMATTED" > "$OUT"
    echo "Formatted: $OUT" >&2
else
    echo "$FORMATTED"
fi