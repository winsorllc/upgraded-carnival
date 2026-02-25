---
name: json-validator
description: Validate JSON files against schemas. Check JSON formatting, schema compliance, and generate validation reports.
---

# JSON Validator

JSON file validation and formatting tool. Validates JSON syntax, checks against schemas, and can format/fix common issues.

## Setup
```bash
cd {baseDir}
npm install
```

## Usage

### Validate a single file
```bash
{baseDir}/validate.js path/to/file.json
```

### Validate all JSON files in directory
```bash
{baseDir}/validate.js ./data
```

### Validate against schema
```bash
{baseDir}/validate.js data.json --schema schema.json
```

### Format/Fix JSON files
```bash
{baseDir}/validate.js data.json --fix
{baseDir}/validate.js ./data --fix-all
```

### Pretty print JSON
```bash
{baseDir}/validate.js data.json --pretty
```

### Output
```
════════════════════════════════════════════════════════════════
                     JSON VALIDATION REPORT
════════════════════════════════════════════════════════════════

✓ data/config.json
  Valid JSON - 1.2KB

✓ data/settings.json
  Valid JSON - 3.4KB

! data/broken.json
  SyntaxError: Unexpected token } at position 234
  Line 15, Column 8

✓ data/schema.json
  Valid JSON Schema

─────────────────────────────────────────────────────────────────
Total: 4 files (3 valid, 1 error)
════════════════════════════════════════════════════════════════
```

## When to Use
- Validating configuration files
- Checking API responses
- Pre-commit JSON validation
- CI/CD pipeline checks
- Formatting JSON data
