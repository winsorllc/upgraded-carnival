---
name: schema-cleaner
description: Clean and validate JSON Schemas for LLM tool-calling compatibility. Removes unsupported keywords per provider, resolves $ref entries, and normalizes schemas for cross-provider compatibility.
metadata:
  {
    "thepopebot":
      {
        "emoji": "🧹",
        "version": "1.0.0",
        "features": ["provider-specific", "ref-resolution", "union-flattening", "circular-detection"]
      }
  }
---

# Schema Cleaner — JSON Schema Normalization

Clean JSON Schemas for optimal LLM tool-calling compatibility across different providers.

## Overview

Different LLM providers support different subsets of JSON Schema. This skill:
- **Provider-Specific Cleaning**: Remove keywords unsupported by each provider
- **Reference Resolution**: Inline `$ref` entries from `$defs` and `definitions`
- **Union Flattening**: Convert `anyOf`/`oneOf` with literals into `enum`
- **Nullable Handling**: Strip nullable variants from unions and type arrays
- **Const Conversion**: Convert `const` to single-value `enum`
- **Circular Detection**: Detect and safely handle circular references

## Provider Compatibility Matrix

| Keyword | Gemini | Anthropic | OpenAI | Description |
|---------|--------|-----------|--------|-------------|
| `$ref` | ❌ | ✅ | ✅ | Reference resolution |
| `$defs` | ❌ | ✅ | ✅ | Schema definitions |
| `additionalProperties` | ❌ | ✅ | ✅ | Extra properties |
| `pattern` | ❌ | ✅ | ✅ | Regex validation |
| `minLength` | ❌ | ✅ | ✅ | Minimum string length |
| `maxLength` | ❌ | ✅ | ✅ | Maximum string length |
| `format` | ❌ | ✅ | ✅ | String format |
| `minimum` | ❌ | ✅ | ✅ | Minimum number |
| `maximum` | ❌ | ✅ | ✅ | Maximum number |
| `examples` | ❌ | ✅ | ✅ | Example values |

## API

### Clean for Specific Provider
```javascript
const { cleanSchema } = require('schema-cleaner');

// Clean for Gemini (most restrictive)
const geminiSchema = cleanSchema(dirtySchema, { provider: 'gemini' });

// Clean for Anthropic (moderate)
const anthropicSchema = cleanSchema(dirtySchema, { provider: 'anthropic' });

// Clean for OpenAI (most permissive)
const openaiSchema = cleanSchema(dirtySchema, { provider: 'openai' });
```

### Validate Schema
```javascript
const { validateSchema } = require('schema-cleaner');

const errors = validateSchema(mySchema);
if (errors.length > 0) {
  console.error('Invalid schema:', errors);
}
```

### Resolve References
```javascript
const { resolveRefs } = require('schema-cleaner');

const inlineSchema = resolveRefs(schemaWithRefs);
```

## Usage Examples

### Before and After (Gemini)

**Before:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[a-z]+$"
    },
    "age": {
      "$ref": "#/$defs/Age"
    }
  },
  "$defs": {
    "Age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 150
    }
  }
}
```

**After (Gemini):**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "age": {
      "type": "integer"
    }
  }
}
```

### Complex Schema Cleaning

```javascript
const schema = {
  type: 'object',
  properties: {
    status: {
      anyOf: [
        { const: 'active' },
        { const: 'inactive' },
        { const: 'pending' }
      ]
    },
    metadata: {
      type: ['string', 'null']
    }
  }
};

const cleaned = cleanSchema(schema, { provider: 'gemini' });
// Result:
// {
//   type: 'object',
//   properties: {
//     status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
//     metadata: { type: 'string' }
//   }
// }
```

## CLI Usage

```bash
# Clean a schema file for Gemini
schema-cleaner clean schema.json --provider gemini --output clean-schema.json

# Validate a schema
schema-cleaner validate schema.json

# Check provider compatibility
schema-cleaner check schema.json --all-providers
```

## Advanced Features

### Custom Provider Strategy
```javascript
const { cleanSchema } = require('schema-cleaner');

// Define custom keywords to remove
const customStrategy = {
  remove: ['minLength', 'maxLength', 'pattern', 'description'],
  preserve: ['title', 'default']
};

const cleaned = cleanSchema(schema, { strategy: customStrategy });
```

### Batch Processing
```javascript
const schemas = [tool1Schema, tool2Schema, tool3Schema];
const cleaned = schemas.map(s => cleanSchema(s, { provider: 'gemini' }));
```

## Best Practices

1. **Clean at Runtime**: Clean schemas dynamically based on the current provider
2. **Preserve Descriptions**: Keep `description` fields for better LLM understanding
3. **Test Per Provider**: Validate cleaned schemas work with each target provider
4. **Cache Results**: Cache cleaned schemas to avoid repeated processing
5. **Version Schemas**: Track schema versions for debugging

## Error Messages

The cleaner provides helpful error messages:

```json
{
  "valid": false,
  "errors": [
    {
      "type": "circular_reference",
      "path": "$.properties.parent.properties.child.$ref",
      "message": "Circular reference detected: parent -> child -> parent"
    }
  ]
}
```

## Integration with Tool Definition

```javascript
const { defineTool } = require('thepopebot');
const { cleanSchema } = require('./schema-cleaner');

// Define tool with full JSON Schema
const tool = defineTool({
  name: 'file_write',
  description: 'Write content to a file',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        minLength: 1,
        description: 'File path'
      },
      content: {
        type: 'string',
        description: 'Content to write'
      }
    },
    required: ['path', 'content']
  }
});

// Clean for current provider before registering
const provider = process.env.LLM_PROVIDER || 'anthropic';
const cleanParams = cleanSchema(tool.parameters, { provider });

// Register with cleaned schema
registerTool({ ...tool, parameters: cleanParams });
```
