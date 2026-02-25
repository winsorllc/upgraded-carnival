---
name: json-processor
description: JSON manipulation and validation tool. Transform, query, validate, and format JSON data. Similar to jq but with easier syntax.
---

# JSON Processor

JSON manipulation, validation, and transformation utilities.

## Capabilities

- Validate JSON syntax
- Format/prettify JSON or minify
- Query JSON using dot-notation paths
- Transform JSON with custom operations
- Merge multiple JSON files
- Convert JSON to/from CSV, TOML, YAML
- Get/set values by path
- Filter arrays with conditions
- Generate JSON schemas
- Calculate statistics on JSON arrays

## Usage

```bash
# Validate JSON
/job/.pi/skills/json-processor/json.js validate file.json

# Format JSON
/job/.pi/skills/json-processor/json.js format file.json --indent 2

# Minify JSON
/job/.pi/skills/json-processor/json.js minify file.json

# Query a value
/job/.pi/skills/json-processor/json.js query file.json "users.0.name"

# Set a value
/job/.pi/skills/json-processor/json.js set file.json "users.0.email" "new@email.com"

# Merge files
/job/.pi/skills/json-processor/json.js merge file1.json file2.json -o output.json

# Filter array
/job/.pi/skills/json-processor/json.js filter file.json "users[age>=18]"

# Convert formats
/job/.pi/skills/json-processor/json.js convert file.json --to csv
/job/.pi/skills/json-processor/json.js convert file.csv --to json

# Statistics on data
/job/.pi/skills/json-processor/json.js stats file.json "users.*.age"

# Generate schema
/job/.pi/skills/json-processor/json.js schema file.json
```

## Output Format

```json
{
  "valid": true,
  "errors": [],
  "result": {...}
}
```

## Query Syntax

- `users` - Get users array
- `users.0` - First user
- `users.0.name` - Name of first user
- `users[*].name` - All user names
- `users[n].name` - User name at index n

## Filter Conditions

- `users[age>18]` - Users with age > 18
- `users[name~=john]` - Users with name containing "john" (case insensitive)
- `users[active=true]` - Active users

## Notes

- All operations preserve Unicode
- Merge supports deep merge with --deep flag
- CSV conversion supports headers option
- Query supports wildcards for arrays