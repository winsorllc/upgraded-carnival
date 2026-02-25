---
name: json-schema
description: JSON Schema cleaning and validation for LLM tool-calling compatibility. Normalizes schemas across providers like Gemini, OpenAI, Anthropic.
metadata:
  {
    "zeroclaw":
      {
        "emoji": "📋",
      },
  }
---

# JSON Schema Tools

JSON Schema cleaning and validation for LLM tool-calling compatibility.

## Problem

Different LLM providers support different subsets of JSON Schema:
- **Gemini**: Rejects `minLength`, `pattern`, `minimum`, `$ref`, etc.
- **OpenAI**: More permissive but has quirks
- **Anthropic**: Has specific requirements for `properties`

## Solution

This tool normalizes schemas for cross-provider compatibility while preserving semantic intent.

## Usage

### Schema for Clean Specific Provider

```bash
# Clean for Gemini
jsonschema clean --provider gemini --input schema.json

# Clean for OpenAI
jsonschema clean --provider openai --input schema.json

# Clean for Anthropic
jsonschema clean --provider anthropic --input schema.json
```

### Validate Schema

```bash
# Validate JSON
jsonschema validate --schema schema.json --data data.json

# Check if valid
jsonschema is-valid --schema schema.json data.json
```

### Generate Schema

```bash
# From TypeScript
jsonschema from-ts types.ts

# From JSON sample
jsonschema from-json sample.json

# From Go struct
jsonschema from-go struct.go
```

## Supported Transformations

| Transform | Before | After |
|-----------|--------|-------|
| Remove unsupported keywords | `"minLength": 1` | (removed for Gemini) |
| Flatten anyOf/enum | `anyOf: [{type: string}, {type: number}]` | (expanded) |
| Resolve $ref | `$ref: "#/$defs/Age"` | (inlined) |
| Remove nullable | `type: ["string", "null"]` | `type: "string"` |
| Convert const | `const: "foo"` | `enum: ["foo"]` |

## Keywords by Provider

### Gemini (unsupported)
- `$ref`, `$defs`, `definitions`
- `minLength`, `maxLength`
- `pattern`, `format`
- `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`
- `multipleOf`

### OpenAI (unsupported)
- Complex `anyOf`/`oneOf` with objects

### Anthropic (unsupported)
- `$ref` without full resolution

## API Example

```javascript
import { SchemaCleanr } from 'json-schema-tools';

// Clean for Gemini
const geminiSchema = SchemaCleanr.cleanForGemini(dirtySchema);

// Clean for any provider
const cleaned = SchemaCleanr.clean(dirtySchema, {
  removeUnsupported: true,
  flattenAnyOf: true,
  inlineRefs: true,
});
```

## Common Issues

### Error: "Invalid schema - missing required field"
```json
// Fix: Always include type
{ "properties": { "name": {} } }  // ❌
{ "properties": { "name": { "type": "string" } } }  // ✅
```

### Error: "$ref not supported"
```json
// Fix: Inline the reference
{ "age": { "$ref": "#/$defs/Age" } }  // ❌
{ "age": { "type": "integer", "minimum": 0 } }  // ✅
```

### Error: "array type not supported"
```json
// Fix: Use single type
{ "type": ["string", "number"] }  // ❌
{ "type": "string" }  // ✅
```

## Notes

- Always test schemas with actual API calls
- Provider behavior may change without notice
- Keep schemas as simple as possible
