#!/bin/bash
# Validate JSON, YAML, and TOML files
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: validate.sh <file> [options]

Options:
  --format <fmt>     Input format: json, yaml, toml (auto-detect)
  --strict           Strict mode - warn on duplicate keys
  -h, --help         Show this help

Examples:
  validate.sh config.json
  validate.sh config.yaml --strict
  validate.sh data.toml
EOF
    exit 2
}

# Default values
FILE=""
FORMAT=""
STRICT=false

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
        --strict)
            STRICT=true
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
            FIRST=$(head -1 "$FILE")
            if echo "$FIRST" | grep -q '^\s*{'; then
                FORMAT="json"
            elif echo "$FIRST" | grep -qE '^\[|^[\w-]+\s*='; then
                FORMAT="toml"
            else
                FORMAT="yaml"
            fi
            ;;
    esac
fi

# Validate
python3 << PYEOF
import sys

try:
    # Read file
    with open("$FILE", 'r') as f:
        content = f.read()
    
    format_type = "$FORMAT"
    strict = $STRICT
    
    # Parse based on format
    if format_type == "json":
        import json
        data = json.loads(content)
        print(f"✓ Valid JSON: $FILE")
        
    elif format_type in ("yaml", "yml"):
        try:
            import yaml
            
            class DuplicateChecker(yaml.SafeLoader):
                pass
            
            def check_duplicates(loader, node, deep=False):
                mapping = {}
                for key_node, value_node in node.value:
                    key = loader.construct_object(key_node, deep=deep)
                    if key in mapping:
                        if strict:
                            print(f"Warning: Duplicate key '{key}' found", file=sys.stderr)
                        else:
                            pass  # Allow duplicates in non-strict mode
                    mapping[key] = value_node
                return loader.construct_mapping(node, deep)
            
            DuplicateChecker.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, check_duplicates)
            
            data = yaml.load(content, Loader=DuplicateChecker)
        except ImportError:
            print("Error: PyYAML not installed. Install with: pip install pyyaml", file=sys.stderr)
            sys.exit(1)
        print(f"✓ Valid YAML: $FILE")
        
    elif format_type == "toml":
        try:
            import tomli
            data = tomli.loads(content)
        except ImportError:
            import tomllib
            data = tomllib.loads(content)
        print(f"✓ Valid TOML: $FILE")
    
    else:
        print(f"Error: Unknown format: {format_type}", file=sys.stderr)
        sys.exit(1)
    
    # Print basic stats
    if isinstance(data, dict):
        print(f"  Keys: {len(data)}")
    elif isinstance(data, list):
        print(f"  Items: {len(data)}")

except json.JSONDecodeError as e:
    print(f"✗ Invalid JSON: $FILE", file=sys.stderr)
    print(f"  Error: {e}", file=sys.stderr)
    sys.exit(1)
except yaml.YAMLError as e:
    print(f"✗ Invalid YAML: $FILE", file=sys.stderr)
    print(f"  Error: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"✗ Invalid {format_type}: $FILE", file=sys.stderr)
    print(f"  Error: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF