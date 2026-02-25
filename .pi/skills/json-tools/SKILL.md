---
name: json-tools
description: Parse, validate, format, and transform JSON data. Query with paths, merge objects, convert formats. Use when working with JSON APIs or configuration files.
---

# JSON Tools

Process and transform JSON data with various operations.

## Quick Start

```bash
/job/.pi/skills/json-tools/json.js validate data.json
```

## Usage

### Validate JSON
```bash
/job/.pi/skills/json-tools/json.js validate <file.json>
```

### Format/Pretty Print
```bash
/job/.pi/skills/json-tools/json.js format <file.json>
```

### Query with Path
```bash
/job/.pi/skills/json-tools/json.js query <file.json> "data.users[0].name"
```

### Extract Keys
```bash
/job/.pi/skills/json-tools/json.js keys <file.json>
```

### Merge JSON Files
```bash
/job/.pi/skills/json-tools/json.js merge file1.json file2.json
```

### Convert to CSV
```bash
/job/.pi/skills/json-tools/json.js tocsv <file.json>
```

### Convert CSV to JSON
```bash
/job/.pi/skills/json-tools/json.js tojson <file.csv>
```

### Filter Array
```bash
/job/.pi/skills/json-tools/json.js filter <file.json> "age > 18"
```

## Path Syntax

- `key` - Access object property
- `key.subkey` - Nested property
- `array[0]` - Array index
- `array[*]` - All array elements
- `array[?(@.age>18)]` - Filter (where supported)

## Examples

```bash
# Validate JSON syntax
/job/.pi/skills/json-tools/json.js validate config.json

# Pretty print with 2-space indent
/job/.pi/skills/json-tools/json.js format data.json

# Query specific value
/job/.pi/skills/json-tools/json.js query api-response.json "data.user.profile.name"

# Get all top-level keys
/job/.pi/skills/json-tools/json.js keys package.json

# Merge two configuration files (deep merge)
/job/.pi/skills/json-tools/json.js merge base.json override.json

# Convert array of objects to CSV
/job/.pi/skills/json-tools/json.js tocsv users.json

# Filter array by condition
/job/.pi/skills/json-tools/json.js filter products.json "price < 100"
```

## When to Use

- Validating JSON from APIs
- Querying large JSON responses
- Converting between JSON and CSV
- Merging configuration files
- Extracting specific data from JSON
