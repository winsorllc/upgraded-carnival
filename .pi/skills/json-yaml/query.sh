#!/bin/bash
# Query JSON and YAML files with jq-like syntax
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: query.sh <file> <query> [options]

Options:
  --format <fmt>     Output format: json, yaml, value (default: json)
  --raw              Output raw values (strings without quotes)
  -h, --help         Show this help

Query Syntax (similar to jq):
  .                  Root object
  .key               Access property
  .[0]               Access array index
  .[]                Iterate array
  .[] | .key         Map property
  .[] | select(.id)  Filter
  length             Get length
  keys               Get keys
  values             Get values

Examples:
  query.sh data.json '.users[0].name'
  query.sh data.yaml '.config.settings'
  query.sh data.json '.items | length'
  query.sh data.json '.users[] | .name' --raw
EOF
    exit 2
}

# Default values
FILE=""
QUERY=""
FORMAT="json"
RAW=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --format)
            shift
            FORMAT="$1"
            ;;
        --raw)
            RAW=true
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$FILE" ]]; then
                FILE="$1"
            elif [[ -z "$QUERY" ]]; then
                QUERY="$1"
            fi
            ;;
    esac
    shift
done

if [[ -z "$FILE" ]]; then
    echo "Error: File required" >&2
    usage
fi

if [[ -z "$QUERY" ]]; then
    echo "Error: Query required" >&2
    usage
fi

if [[ ! -f "$FILE" ]]; then
    echo "Error: File not found: $FILE" >&2
    exit 1
fi

# Detect format and query
EXT="${FILE##*.}"

python3 << PYEOF
import sys
import json

try:
    # Read file
    with open("$FILE", 'r') as f:
        content = f.read()
    
    # Parse based on extension
    ext = "$EXT"
    query = "$QUERY"
    output_format = "$FORMAT"
    raw_output = $RAW
    
    if ext in ("yaml", "yml"):
        try:
            import yaml
            data = yaml.safe_load(content)
        except ImportError:
            print("Error: PyYAML not installed. Install with: pip install pyyaml", file=sys.stderr)
            sys.exit(1)
    else:
        data = json.loads(content)
    
    # Simple query implementation
    def query_path(data, path):
        result = data
        
        # Parse jq-like query
        parts = path.replace('|', '.').replace(' ', '').split('.')
        
        for part in parts:
            if not part:
                continue
            
            if part == 'length':
                if isinstance(result, (list, dict, str)):
                    result = len(result)
                else:
                    result = 0
            elif part == 'keys':
                if isinstance(result, dict):
                    result = list(result.keys())
                else:
                    result = []
            elif part == 'values':
                if isinstance(result, dict):
                    result = list(result.values())
                else:
                    result = result
            elif part == '[]':
                if isinstance(result, list):
                    result = result
                else:
                    result = []
            elif part.startswith('[') and part.endswith(']'):
                # Array index
                idx = int(part[1:-1])
                if isinstance(result, list) and 0 <= idx < len(result):
                    result = result[idx]
                else:
                    result = None
            elif part.startswith('select('):
                # Filter - simplified implementation
                # select(.id) -> filter where id exists
                field = part[8:-1]  # Remove 'select(' and ')'
                if isinstance(result, list):
                    result = [item for item in result if isinstance(item, dict) and field in item]
            else:
                # Property access
                if isinstance(result, dict) and part in result:
                    result = result[part]
                else:
                    result = None
        
        return result
    
    result = query_path(data, query)
    
    # Output
    if raw_output and isinstance(result, str):
        print(result)
    elif output_format == "value":
        if isinstance(result, (str, int, float, bool)):
            print(result)
        else:
            print(json.dumps(result, indent=2))
    elif output_format == "yaml":
        try:
            import yaml
            print(yaml.dump(result, default_flow_style=False))
        except:
            print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(json.dumps(result, indent=2, ensure_ascii=False))

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF