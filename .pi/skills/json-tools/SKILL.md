---
name: json-tools
description: "JSON manipulation and processing. Use when: user needs to parse, validate, transform, query, or format JSON data."
---

# JSON Tools Skill

JSON manipulation and processing tools.

## When to Use

- Parse and validate JSON
- Extract data from JSON
- Transform JSON structure
- Pretty print or minify JSON
- Query JSON with jq

## Validate JSON

### Check if Valid JSON
```bash
# Using Python
python3 -c "import json, sys; json.load(sys.stdin)" < file.json

# Using jq
jq . file.json >/dev/null 2>&1 && echo "Valid" || echo "Invalid"

# Using node
node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))" < file.json
```

## Pretty Print

### Format JSON
```bash
# Python pretty print
python3 -m json.tool data.json

# jq pretty print
cat data.json | jq .

# Node pretty print
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(0,'utf8')), null, 2))" < data.json
```

### Minify JSON
```bash
# Minify (remove whitespace)
cat data.json | jq -c .

# Python minify
python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" < data.json
```

## Extract Data

### Get Keys
```bash
# Top-level keys
cat data.json | jq 'keys'

# Nested keys
cat data.json | jq '.user | keys'
```

### Get Values
```bash
# Get specific field
cat data.json | jq '.name'

# Get nested field
cat data.json | jq '.user.address.city'

# Get array elements
cat data.json | jq '.items[0]'

# Get all array items
cat data.json | jq '.items[]'
```

### Filter Arrays
```bash
# Filter by value
cat data.json | jq '.items[] | select(.price > 100)'

# Map to specific field
cat data.json | jq '.items[] | .name'

# Count items
cat data.json | jq '.items | length'
```

## Transform JSON

### Rename Keys
```bash
# Rename 'name' to 'title'
cat data.json | jq '. + {title: .name} | del(.name)'
```

### Add/Remove Fields
```bash
# Add field
cat data.json | jq '. + {newField: "value"}'

# Remove field
cat data.json | jq 'del(.unwantedField)'

# Update field
cat data.json | jq '.count += 1'
```

### Merge Objects
```bash
# Merge two objects
echo '{}' | jq -s '.[0] * .[1]' file1.json file2.json
```

## Convert Formats

### JSON to CSV
```bash
# Simple JSON array to CSV
cat data.json | jq -r '.[] | [.name, .email, .age] | @csv'

# With header
echo "name,email,age" > output.csv
cat data.json | jq -r '.[] | [.name, .email, .age] | @csv' >> output.csv
```

### CSV to JSON
```bash
# Using Python
python3 -c "
import csv, json, sys
reader = csv.DictReader(sys.stdin)
print(json.dumps(list(reader), indent=2))
" < data.csv

# Using jq (if dealing with array)
cat data.json | jq -c '.[]' | csvjson -d
```

### JSON to YAML
```bash
# Using Python
python3 -c "
import json, yaml, sys
print(yaml.dump(json.load(sys.stdin)))
" < data.json

# Using yq
cat data.json | yq -y .
```

## Query Examples

### API Response Parsing
```bash
# Get array of IDs
curl -s api.example.com/data | jq '.[].id'

# Filter by status
curl -s api.example.com/data | jq '.[] | select(.status == "active")'

# Group by field
curl -s api.example.com/data | jq 'group_by(.category)'
```

### Complex Queries
```bash
# Multiple fields
cat data.json | jq '{name: .user.name, email: .user.email}'

# Conditional
cat data.json | jq 'if .active then "active" else "inactive" end'

# Default values
cat data.json | jq '.name // "Unknown"'
```

## Useful jq Flags

| Flag | Description |
|------|-------------|
| `-r` | Raw output (no quotes) |
| `-c` | Compact output |
| `-M` | Monochrome |
| `-f` | Read filter from file |
| `-s` | Slurp (read all input) |

## Examples

**Count items:**
```bash
cat data.json | jq '.items | length'
```

**Extract unique values:**
```bash
cat data.json | jq '[.items[].category] | unique'
```

**Sum values:**
```bash
cat data.json | jq '[.items[].price] | add'
```

**Convert to lines:**
```bash
cat data.json | jq -c '.items[]'
```
