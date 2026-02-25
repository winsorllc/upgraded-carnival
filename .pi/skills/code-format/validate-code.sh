#!/bin/bash
# Code validation tool
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: validate-code.sh <file> [options]

Options:
  --language <lang>   Specify language (auto-detect from extension)
  --stdin            Read from stdin
  --json             Output validation result as JSON
  -h, --help         Show this help

Examples:
  validate-code.sh script.py
  validate-code.sh config.json
  validate-code.sh --stdin --language python < code.py
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
        sh|bash) echo "shell" ;;
        *) echo "unknown" ;;
    esac
}

# Default values
FILE=""
LANGUAGE=""
STDIN=false
JSON_OUTPUT=false

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
        --json)
            JSON_OUTPUT=true
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

# Validate based on language
validate_python() {
    python3 << 'PYEOF'
import sys
import ast

code = sys.stdin.read()

try:
    ast.parse(code)
    if '__json_output__' in dir():
        print('{"valid": true, "errors": []}')
    else:
        print("✓ Valid Python syntax")
except SyntaxError as e:
    line = e.lineno or 0
    col = e.offset or 0
    msg = e.msg or "Syntax error"
    if '__json_output__' in dir():
        print(f'{{"valid": false, "errors": [{{"line": {line}, "column": {col}, "message": "{msg}"}}]}}')
    else:
        print(f"✗ Syntax error at line {line}, column {col}: {msg}")
    sys.exit(1)
PYEOF
}

validate_json() {
    python3 << 'PYEOF'
import sys
import json

try:
    json.load(sys.stdin)
    print("✓ Valid JSON")
except json.JSONDecodeError as e:
    print(f"✗ JSON error at line {e.lineno}, column {e.colno}: {e.msg}")
    sys.exit(1)
PYEOF
}

validate_yaml() {
    python3 << 'PYEOF'
import sys
try:
    import yaml
    yaml.safe_load(sys.stdin)
    print("✓ Valid YAML")
except yaml.YAMLError as e:
    print(f"✗ YAML error: {e}")
    sys.exit(1)
except ImportError:
    print("PyYAML not installed. Install with: pip install pyyaml", file=sys.stderr)
    sys.exit(1)
PYEOF
}

validate_shell() {
    local input="$1"
    if command -v shellcheck &>/dev/null; then
        shellcheck - < <(echo "$input") || true
    else
        bash -n < <(echo "$input") 2>&1 || {
            echo "✗ Shell syntax error"
            return 1
        }
        echo "✓ Valid shell syntax"
    fi
}

# Get input
INPUT=$(get_input)

# Validate
case "$LANGUAGE" in
    python)
        if [[ "$JSON_OUTPUT" == "true" ]]; then
            echo "$INPUT" | python3 -c "
import sys, ast
try:
    ast.parse(sys.stdin.read())
    print('{\"valid\": true, \"errors\": []}')
except SyntaxError as e:
    print(f'{{\"valid\": false, \"errors\": [{{\"line\": {e.lineno or 0}, \"column\": {e.offset or 0}, \"message\": \"{e.msg}\"}}]}}')
"
        else
            validate_python <<< "$INPUT"
        fi
        ;;
    json)
        validate_json <<< "$INPUT"
        ;;
    yaml)
        validate_yaml <<< "$INPUT"
        ;;
    shell)
        validate_shell "$INPUT"
        ;;
    *)
        echo "Warning: Unknown language '$LANGUAGE', cannot validate" >&2
        echo "Input received"
        ;;
esac