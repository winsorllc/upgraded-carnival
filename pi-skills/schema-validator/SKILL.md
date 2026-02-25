---
name: schema-validator
description: Validate JSON data against JSON Schema. Use when: you need to validate configuration files, API responses, or any JSON data against a schema. Supports draft-07 and earlier.
metadata:
  {
    "requires": { "bins": ["node"] }
  }
---

# Schema Validator

Validate JSON data against JSON Schema. Useful for validating config files, API responses, and data structures.

## Setup

No additional setup required - uses built-in Node.js modules and JSON Schema validation.

## Usage

### Validate JSON Data

```bash
{baseDir}/schema-validator.js --schema schema.json --data data.json
```

### Validate with Custom Schema

```bash
{baseDir}/schema-validator.js --schema custom-schema.json --data input.json --strict
```

### Check Schema Validity

```bash
{baseDir}/schema-validator.js --check-schema my-schema.json
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--schema` | Path to JSON Schema file | Yes |
| `--data` | Path to JSON data file | Yes* |
| `--stdin` | Read JSON data from stdin | No |
| `--strict` | Fail on additional properties | No |
| `--check-schema` | Only validate the schema itself | No |

## Examples

### Validate Config File

```bash
{baseDir}/schema-validator.js --schema config-schema.json --data config.json
```

### Validate API Response

```bash
curl -s https://api.example.com/data | {baseDir}/schema-validator.js --schema response-schema.json --stdin
```

### Strict Mode (no additional properties)

```bash
{baseDir}/schema-validator.js --schema schema.json --data data.json --strict
```

## Exit Codes

- `0` - Validation passed
- `1` - Validation failed or error

## Common Use Cases

- Validate `package.json` against npm schema
- Validate Docker Compose files
- Validate Kubernetes manifests
- Validate API request/response bodies
