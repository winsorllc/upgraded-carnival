#!/bin/bash
# Memory storage and retrieval for agent context
set -euo pipefail

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMORY_DIR="${HOME}/.agent-memory"
MEMORY_FILE="${MEMORY_DIR}/memory.json"

usage() {
    cat >&2 <<'EOF'
Usage: memory.sh <command> [options]

Commands:
  store <key> <value>    Store a key-value pair
  recall <key>           Recall value for key
  forget <key>           Remove a key
  search <query>         Search keys matching query
  categories             List all categories
  stats                  Show memory statistics

Options:
  --category <name>      Category for the operation
  --all                  Apply to all items
  -h, --help             Show this help

Examples:
  memory.sh store "project" "My Project"
  memory.sh store --category "work" "company" "Acme Corp"
  memory.sh recall "project"
  memory.sh recall --category "work"
  memory.sh search "project"
  memory.sh forget "old_key"
  memory.sh categories
  memory.sh stats
EOF
    exit 2
}

# Initialize memory file
init_memory() {
    mkdir -p "$MEMORY_DIR"
    if [[ ! -f "$MEMORY_FILE" ]]; then
        echo '{}' > "$MEMORY_FILE"
    fi
}

# Get memory JSON
get_memory() {
    init_memory
    cat "$MEMORY_FILE"
}

# Set memory JSON
set_memory() {
    echo "$1" > "$MEMORY_FILE"
}

# Parse arguments
COMMAND="${1:-}"
shift || true

CATEGORY=""
KEY=""
VALUE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --category)
            shift
            CATEGORY="$1"
            ;;
        --all)
            CATEGORY="all"
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$KEY" ]]; then
                KEY="$1"
            elif [[ -z "$VALUE" ]]; then
                VALUE="$*"
                break
            fi
            ;;
    esac
    shift
done

case "$COMMAND" in
    store)
        if [[ -z "$KEY" ]] || [[ -z "$VALUE" ]]; then
            echo "Error: Key and value required" >&2
            usage
        fi
        
        init_memory
        
        if [[ -n "$CATEGORY" ]]; then
            python3 << PYEOF
import json
import sys

memory_file = "$MEMORY_FILE"
category = "$CATEGORY"
key = "$KEY"
value = """$VALUE"""

try:
    with open(memory_file, 'r') as f:
        data = json.load(f)
except:
    data = {}

if category not in data:
    data[category] = {}

try:
    parsed = json.loads(value)
    data[category][key] = parsed
except:
    data[category][key] = value

with open(memory_file, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Stored: {category}.{key}")
PYEOF
        else
            python3 << PYEOF
import json

memory_file = "$MEMORY_FILE"
key = "$KEY"
value = """$VALUE"""

try:
    with open(memory_file, 'r') as f:
        data = json.load(f)
except:
    data = {}

try:
    parsed = json.loads(value)
    data[key] = parsed
except:
    data[key] = value

with open(memory_file, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Stored: {key}")
PYEOF
        fi
        ;;
    
    recall)
        init_memory
        
        if [[ "$CATEGORY" == "all" ]] || [[ -z "$KEY" ]]; then
            # Return all memory
            python3 << PYEOF
import json
import sys

memory_file = "$MEMORY_FILE"

try:
    with open(memory_file, 'r') as f:
        data = json.load(f)
    print(json.dumps(data, indent=2))
except:
    print("{}")
PYEOF
        elif [[ -n "$CATEGORY" ]]; then
            # Return category
            python3 << PYEOF
import json
import sys

memory_file = "$MEMORY_FILE"
category = "$CATEGORY"

try:
    with open(memory_file, 'r') as f:
        data = json.load(f)
    if category in data:
        print(json.dumps(data[category], indent=2))
    else:
        print(f"No category: {category}")
except Exception as e:
    print(f"Error: {e}")
PYEOF
        else
            # Return specific key
            python3 << PYEOF
import json
import sys

memory_file = "$MEMORY_FILE"
key = "$KEY"

try:
    with open(memory_file, 'r') as f:
        data = json.load(f)
    if key in data:
        value = data[key]
        if isinstance(value, (dict, list)):
            print(json.dumps(value, indent=2))
        else:
            print(value)
    else:
        print(f"Key not found: {key}")
except Exception as e:
    print(f"Error: {e}")
PYEOF
        fi
        ;;
    
    forget)
        if [[ -z "$KEY" ]] && [[ -z "$CATEGORY" ]]; then
            echo "Error: Key or --category required" >&2
            usage
        fi
        
        if [[ "$CATEGORY" == "all" ]]; then
            # Clear all memory
            echo '{}' > "$MEMORY_FILE"
            echo "Cleared all memory"
        elif [[ -n "$CATEGORY" ]] && [[ -z "$KEY" ]]; then
            # Delete category
            python3 << PYEOF
import json

memory_file = "$MEMORY_FILE"
category = "$CATEGORY"

with open(memory_file, 'r') as f:
    data = json.load(f)

if category in data:
    del data[category]
    with open(memory_file, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Forgot category: {category}")
else:
    print(f"Category not found: {category}")
PYEOF
        else
            # Delete key
            python3 << PYEOF
import json

memory_file = "$MEMORY_FILE"
key = "$KEY"
category = "$CATEGORY" if "$CATEGORY" else None

with open(memory_file, 'r') as f:
    data = json.load(f)

if category:
    if category in data and key in data[category]:
        del data[category][key]
        with open(memory_file, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Forgot: {category}.{key}")
    else:
        print(f"Key not found: {category}.{key}")
else:
    if key in data:
        del data[key]
        with open(memory_file, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Forgot: {key}")
    else:
        print(f"Key not found: {key}")
PYEOF
        fi
        ;;
    
    search)
        if [[ -z "$KEY" ]]; then
            echo "Error: Search query required" >&2
            usage
        fi
        
        python3 << PYEOF
import json

memory_file = "$MEMORY_FILE"
query = "$KEY".lower()

try:
    with open(memory_file, 'r') as f:
        data = json.load(f)
    
    results = []
    
    def search_recursive(obj, path=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                new_path = f"{path}.{k}" if path else k
                if query in k.lower():
                    results.append(f"Key: {new_path}")
                if query in str(v).lower():
                    results.append(f"Value: {new_path} = {v}")
                search_recursive(v, new_path)
    
    search_recursive(data)
    
    if results:
        print("\n".join(results))
    else:
        print(f"No matches found for: {query}")
except Exception as e:
    print(f"Error: {e}")
PYEOF
        ;;
    
    categories)
        python3 << PYEOF
import json

memory_file = "$MEMORY_FILE"

try:
    with open(memory_file, 'r') as f:
        data = json.load(f)
    
    # Get top-level keys
    categories = [k for k in data.keys() if isinstance(data[k], dict)]
    
    if categories:
        print("Categories:")
        for cat in categories:
            count = len(data[cat])
            print(f"  {cat}: {count} items")
    else:
        print("No categories found")
        keys = list(data.keys())
        if keys:
            print(f"Top-level keys: {', '.join(keys[:10])}")
except Exception as e:
    print(f"Error: {e}")
PYEOF
        ;;
    
    stats)
        python3 << PYEOF
import json
import os

memory_file = "$MEMORY_FILE"

try:
    with open(memory_file, 'r') as f:
        data = json.load(f)
    
    def count_items(obj, depth=0):
        count = 0
        if isinstance(obj, dict):
            for v in obj.values():
                count += count_items(v, depth + 1)
            if depth == 0:
                count += len(obj)
        elif isinstance(obj, list):
            count = len(obj)
        else:
            count = 1
        return count
    
    file_size = os.path.getsize(memory_file)
    total_keys = len(data)
    total_items = count_items(data)
    
    print(f"Memory Statistics:")
    print(f"  File: {memory_file}")
    print(f"  Size: {file_size} bytes")
    print(f"  Top-level keys: {total_keys}")
    print(f"  Total items: {total_items}")
    
    categories = [k for k in data.keys() if isinstance(data[k], dict)]
    if categories:
        print(f"  Categories: {len(categories)}")
        for cat in categories[:5]:
            print(f"    - {cat}: {len(data[cat])} items")
except Exception as e:
    print(f"Error: {e}")
PYEOF
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