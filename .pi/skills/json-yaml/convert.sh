#!/bin/bash
# Convert between JSON, YAML, and TOML formats
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: convert.sh <file> --to <format> [options]

Options:
  --to <format>      Target format: json, yaml, toml
  --out <file>       Output file (default: stdout)
  --indent <N>       Indentation size (default: 2)
  -h, --help         Show this help

Examples:
  convert.sh config.json --to yaml
  convert.sh config.yaml --to json
  convert.sh config.toml --to json --out config.json
EOF
    exit 2
}

# Default values
FILE=""
TO_FORMAT=""
OUT=""
INDENT=2

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --to)
            shift
            TO_FORMAT="$1"
            ;;
        --out)
            shift
            OUT="$1"
            ;;
        --indent)
            shift
            INDENT="$1"
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
    echo "Error: Input file required" >&2
    usage
fi

if [[ -z "$TO_FORMAT" ]]; then
    echo "Error: --to format required" >&2
    usage
fi

if [[ ! -f "$FILE" ]]; then
    echo "Error: File not found: $FILE" >&2
    exit 1
fi

# Detect input format
EXT="${FILE##*.}"
case "$EXT" in
    json) FROM_FORMAT="json" ;;
    yaml|yml) FROM_FORMAT="yaml" ;;
    toml) FROM_FORMAT="toml" ;;
    *) FROM_FORMAT="json" ;;
esac

# Convert
python3 << PYEOF
import sys
import json

try:
    # Read input
    with open("$FILE", 'r') as f:
        content = f.read()
    
    # Parse input
    if "$FROM_FORMAT" == "yaml":
        try:
            import yaml
            data = yaml.safe_load(content)
        except ImportError:
            print("Error: PyYAML not installed. Install with: pip install pyyaml", file=sys.stderr)
            sys.exit(1)
    elif "$FROM_FORMAT" == "toml":
        try:
            import tomli
            data = tomli.loads(content)
        except ImportError:
            import tomllib
            data = tomllib.loads(content)
    else:
        data = json.loads(content)
    
    # Convert to output format
    to_format = "$TO_FORMAT"
    
    if to_format == "json":
        output = json.dumps(data, indent=$INDENT, ensure_ascii=False)
    elif to_format in ("yaml", "yml"):
        try:
            import yaml
            output = yaml.dump(data, default_flow_style=False, indent=$INDENT, allow_unicode=True)
        except ImportError:
            print("Error: PyYAML not installed. Install with: pip install pyyaml", file=sys.stderr)
            sys.exit(1)
    elif to_format == "toml":
        # Convert to TOML (requires tomli_w or manual conversion)
        def to_toml(data, indent=0):
            lines = []
            prefix = "  " * indent
            
            if isinstance(data, dict):
                # Handle tables
                for key, value in data.items():
                    if isinstance(value, dict) and not all(isinstance(v, (str, int, float, bool)) for v in value.values()):
                        # Nested table
                        lines.append(f"\n[{key}]")
                        lines.append(to_toml(value, indent + 1))
                    elif isinstance(value, list) and value and isinstance(value[0], dict):
                        # Array of tables
                        for item in value:
                            lines.append(f"\n[[{key}]]")
                            lines.append(to_toml(item, indent + 1))
                    else:
                        # Key-value pair
                        lines.append(f"{key} = {repr_toml(value)}")
            elif isinstance(data, list):
                for i, item in enumerate(data):
                    lines.append(to_toml(item, indent))
            
            return "\n".join(lines)
        
        def repr_toml(value):
            if isinstance(value, str):
                return f'"{value}"'
            elif isinstance(value, bool):
                return "true" if value else "false"
            elif isinstance(value, (int, float)):
                return str(value)
            elif isinstance(value, list):
                return "[" + ", ".join(repr_toml(v) for v in value) + "]"
            elif isinstance(value, dict):
                return "{" + ", ".join(f"{k} = {repr_toml(v)}" for k, v in value.items()) + "}"
            return str(value)
        
        output = to_toml(data)
    else:
        print(f"Error: Unknown output format: {to_format}", file=sys.stderr)
        sys.exit(1)
    
    if "$OUT":
        with open("$OUT", 'w') as f:
            f.write(output)
        print(f"Converted to: $OUT")
    else:
        print(output)

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF