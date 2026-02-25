#!/bin/bash
# Format and prettify JSON, YAML, and TOML files
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: format.sh <file> [options]

Options:
  --indent <N>       Indentation size (default: 2)
  --compact          Output compact (single line)
  --format <fmt>     Input format: json, yaml, toml (auto-detect)
  --out <file>       Output file (default: stdout)
  -h, --help         Show this help

Examples:
  format.sh config.json
  format.sh config.yaml --indent 4
  format.sh config.json --compact
EOF
    exit 2
}

# Default values
FILE=""
INDENT=2
COMPACT=false
FORMAT=""
OUT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --indent)
            shift
            INDENT="$1"
            ;;
        --compact)
            COMPACT=true
            ;;
        --format)
            shift
            FORMAT="$1"
            ;;
        --out)
            shift
            OUT="$1"
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

if [[ -z "$FILE" ]]; then
    echo "Error: File required" >&2
    usage
fi

if [[ ! -f "$FILE" ]]; then
    echo "Error: File not found: $FILE" >&2
    exit 1
fi

# Auto-detect format
if [[ -z "$FORMAT" ]]; then
    EXT="${FILE##*.}"
    case "$EXT" in
        json) FORMAT="json" ;;
        yaml|yml) FORMAT="yaml" ;;
        toml) FORMAT="toml" ;;
        *)
            # Try to detect from content
            if head -1 "$FILE" | grep -q '{'; then
                FORMAT="json"
            elif head -1 "$FILE" | grep -q '^\w\+\s*:\s*'; then
                FORMAT="yaml"
            else
                FORMAT="json"
            fi
            ;;
    esac
fi

# Format file
python3 << PYEOF
import sys
import json

try:
    # Read file content
    with open("$FILE", 'r') as f:
        content = f.read()
    
    # Parse based on format
    if "$FORMAT" in ("yaml", "yml"):
        try:
            import yaml
            data = yaml.safe_load(content)
        except ImportError:
            print("Error: PyYAML not installed. Install with: pip install pyyaml", file=sys.stderr)
            sys.exit(1)
    elif "$FORMAT" == "toml":
        try:
            import tomli
            data = tomli.loads(content)
        except ImportError:
            # Fallback to tomllib (Python 3.11+)
            import tomllib
            data = tomllib.loads(content)
    else:
        data = json.loads(content)
    
    # Format output
    if $COMPACT:
        output = json.dumps(data, separators=(',', ':'))
    else:
        output = json.dumps(data, indent=$INDENT, ensure_ascii=False)
    
    if "$OUT":
        with open("$OUT", 'w') as f:
            f.write(output)
        print(f"Formatted output written to: $OUT")
    else:
        print(output)

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF