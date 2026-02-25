---
name: json-yaml
description: "Validate, format, and convert between JSON, YAML, and TOML. Parse and query structured data files. No API key required."
---

# JSON/YAML Tools Skill

Validate, format, and convert between JSON, YAML, and TOML formats.

## When to Use

✅ **USE this skill when:**

- "Format this JSON"
- "Validate this YAML file"
- "Convert JSON to YAML"
- "Parse this config file"
- "Query JSON data"

## When NOT to Use

❌ **DON'T use this skill when:**

- Editing files directly → use text editor
- Large data processing → use specialized tools

## Commands

### Validate

```bash
{baseDir}/validate.sh <file>
{baseDir}/validate.sh config.json --format json
{baseDir}/validate.sh config.yaml --format yaml
```

### Format/Prettify

```bash
{baseDir}/format.sh config.json
{baseDir}/format.sh config.yaml --indent 4
{baseDir}/format.sh config.json --compact
```

### Convert

```bash
{baseDir}/convert.sh config.json --to yaml
{baseDir}/convert.sh config.yaml --to json
{baseDir}/convert.sh config.toml --to json
{baseDir}/convert.sh config.json --to toml
```

### Query

```bash
{baseDir}/query.sh data.json '.users[0].name'
{baseDir}/query.sh data.json '.items | length'
{baseDir}/query.sh data.yaml '.config.settings'
```

### Flatten/Unflatten

```bash
{baseDir}/flatten.sh data.json
{baseDir}/unflatten.sh data.json
```

### Merge

```bash
{baseDir}/merge.sh file1.json file2.json --out merged.json
{baseDir}/merge.sh base.yaml overlay.yaml
```

## Output Formats

- **Formatted**: Pretty-printed with indentation
- **Compact**: Single line, no whitespace
- **Flat**: Dot-notation keys

## Examples

**Format JSON file:**
```bash
{baseDir}/format.sh config.json
# Output: Properly indented JSON
```

**Convert YAML to JSON:**
```bash
{baseDir}/convert.sh config.yaml --to json
```

**Query JSON with jq-like syntax:**
```bash
{baseDir}/query.sh data.json '.users[].name'
{baseDir}/query.sh data.json '.items | map(.price) | add'
```

**Validate JSON:**
```bash
{baseDir}/validate.sh config.json
# Output: Valid ✓ or error details
```

## Notes

- Uses Python's json, yaml, and tomli libraries
- Supports YAML 1.2 specification
- Handles circular references in merge
- Query syntax is similar to jq