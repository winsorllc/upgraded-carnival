#!/usr/bin/env node

/**
 * Schema Cleaner — JSON Schema Normalization
 * 
 * Cleans JSON Schemas for LLM tool-calling compatibility across providers.
 */

const fs = require('fs');
const path = require('path');

/**
 * Keywords that Gemini rejects for tool schemas
 */
const GEMINI_UNSUPPORTED = [
  '$ref', '$schema', '$id', '$defs', 'definitions',
  'additionalProperties', 'patternProperties',
  'minLength', 'maxLength', 'pattern', 'format',
  'minimum', 'maximum', 'multipleOf',
  'minItems', 'maxItems', 'uniqueItems',
  'minProperties', 'maxProperties',
  'examples'
];

/**
 * Keywords that should always be preserved (metadata)
 */
const META_KEYS = ['description', 'title', 'default'];

/**
 * Clean schema for a specific provider
 */
function cleanSchema(schema, options = {}) {
  const { provider = 'gemini', visited = new Set() } = options;
  
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  
  // Deep clone to avoid mutating original
  let result = JSON.parse(JSON.stringify(schema));
  
  // Detect circular references via $id
  if (result.$id) {
    if (visited.has(result.$id)) {
      return { type: 'object', description: '[Circular reference detected]' };
    }
    visited.add(result.$id);
  }
  
  // Resolve $ref entries
  if (result.$ref) {
    const resolved = resolveRef(result.$ref, schema);
    if (resolved) {
      result = { ...resolved };
    }
  }
  
  // Inlining $defs and definitions
  if (result.$defs || result.definitions) {
    const defs = { ...result.$defs, ...result.definitions };
    result = inlineDefs(result, defs);
  }
  
  // Flatten anyOf/oneOf with literals to enum
  result = flattenUnions(result);
  
  // Handle nullable types
  result = handleNullable(result);
  
  // Convert const to enum
  if (result.const !== undefined) {
    result.enum = [result.const];
    delete result.const;
  }
  
  // Remove unsupported keywords based on provider
  const keywordsToRemove = getKeywordsToRemove(provider);
  for (const key of keywordsToRemove) {
    if (key in result) {
      delete result[key];
    }
  }
  
  // Recursively clean nested properties
  if (result.properties) {
    const cleanedProps = {};
    for (const [key, value] of Object.entries(result.properties)) {
      cleanedProps[key] = cleanSchema(value, { provider, visited: new Set(visited) });
    }
    result.properties = cleanedProps;
  }
  
  if (result.items) {
    result.items = cleanSchema(result.items, { provider, visited: new Set(visited) });
  }
  
  if (result.additionalItems) {
    result.additionalItems = cleanSchema(result.additionalItems, { provider, visited: new Set(visited) });
  }
  
  if (result.anyOf) {
    result.anyOf = result.anyOf.map(s => cleanSchema(s, { provider, visited: new Set(visited) }));
  }
  
  if (result.oneOf) {
    result.oneOf = result.oneOf.map(s => cleanSchema(s, { provider, visited: new Set(visited) }));
  }
  
  if (result.allOf) {
    result.allOf = result.allOf.map(s => cleanSchema(s, { provider, visited: new Set(visited) }));
  }
  
  return result;
}

/**
 * Resolve a $ref to its definition
 */
function resolveRef(ref, rootSchema) {
  if (!ref.startsWith('#')) {
    return null; // External refs not supported
  }
  
  const parts = ref.slice(1).split('/').slice(1); // Remove # and empty first element
  let current = rootSchema;
  
  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return null;
    }
    current = current[part];
  }
  
  return current;
}

/**
 * Inline $defs and definitions into the schema
 */
function inlineDefs(schema, defs) {
  if (!schema.$ref) {
    // Recursively process all properties
    const result = { ...schema };
    
    if (result.properties) {
      result.properties = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        result.properties[key] = inlineDefs(value, defs);
      }
    }
    
    if (result.items) {
      result.items = inlineDefs(result.items, defs);
    }
    
    if (result.anyOf) {
      result.anyOf = result.anyOf.map(s => inlineDefs(s, defs));
    }
    
    if (result.oneOf) {
      result.oneOf = result.oneOf.map(s => inlineDefs(s, defs));
    }
    
    // Remove $defs and definitions
    delete result.$defs;
    delete result.definitions;
    
    return result;
  }
  
  // Resolve the ref
  const resolved = resolveRef(schema.$ref, { $defs: defs, definitions: defs });
  if (resolved) {
    // Return resolved schema without $ref
    const { $ref, ...rest } = schema;
    return { ...inlineDefs(resolved, defs), ...rest };
  }
  
  return schema;
}

/**
 * Flatten anyOf/oneOf unions with literal values to enum
 */
function flattenUnions(schema) {
  if (schema.anyOf || schema.oneOf) {
    const union = schema.anyOf || schema.oneOf;
    
    // Check if all members are simple literals or have const
    const literals = union.map(member => {
      if (member.const !== undefined) return member.const;
      if (member.type && ['string', 'number', 'boolean', 'null'].includes(member.type)) {
        if (member.enum && member.enum.length === 1) return member.enum[0];
      }
      return null;
    });
    
    // If all are literals, convert to enum
    if (literals.every(l => l !== null)) {
      const type = typeof literals[0];
      return {
        type: type === 'string' || type === 'number' || type === 'boolean' ? type : undefined,
        enum: literals
      };
    }
  }
  
  return schema;
}

/**
 * Handle nullable types (type: ['string', 'null'])
 */
function handleNullable(schema) {
  if (Array.isArray(schema.type)) {
    // Remove null from type array
    const nonNullTypes = schema.type.filter(t => t !== 'null');
    if (nonNullTypes.length === 1) {
      schema.type = nonNullTypes[0];
    } else if (nonNullTypes.length === 0) {
      delete schema.type;
    } else {
      schema.type = nonNullTypes;
    }
  }
  
  return schema;
}

/**
 * Get keywords to remove for a specific provider
 */
function getKeywordsToRemove(provider) {
  switch (provider.toLowerCase()) {
    case 'gemini':
    case 'google':
      return GEMINI_UNSUPPORTED;
    case 'anthropic':
      // Anthropic is more permissive, only remove truly unsupported
      return ['$schema', '$id', 'examples'];
    case 'openai':
      // OpenAI is most permissive
      return ['$schema', '$id'];
    default:
      return [];
  }
}

/**
 * Validate a schema (basic validation)
 */
function validateSchema(schema) {
  const errors = [];
  
  if (!schema || typeof schema !== 'object') {
    errors.push('Schema must be an object');
    return errors;
  }
  
  if (schema.type && !['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'].includes(schema.type)) {
    if (!Array.isArray(schema.type)) {
      errors.push(`Invalid type: ${schema.type}`);
    }
  }
  
  if (schema.properties && typeof schema.properties !== 'object') {
    errors.push('properties must be an object');
  }
  
  if (schema.required && !Array.isArray(schema.required)) {
    errors.push('required must be an array');
  }
  
  // Check for circular references
  const visited = new Set();
  if (hasCircularRef(schema, visited)) {
    errors.push('Circular reference detected');
  }
  
  return errors;
}

/**
 * Check for circular references
 */
function hasCircularRef(schema, visited, path = '') {
  if (!schema || typeof schema !== 'object') return false;
  
  if (schema.$ref) {
    if (visited.has(schema.$ref)) {
      return true;
    }
    visited.add(schema.$ref);
  }
  
  if (schema.$id) {
    if (visited.has(schema.$id)) {
      return true;
    }
    visited.add(schema.$id);
  }
  
  // Recurse through properties
  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      if (hasCircularRef(value, visited, `${path}.properties.${key}`)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Format schema for display
 */
function formatSchema(schema) {
  return JSON.stringify(schema, null, 2);
}

/**
 * Compare schemas and show differences
 */
function compareSchemas(original, cleaned) {
  const orig = JSON.parse(formatSchema(original));
  const clean = JSON.parse(formatSchema(cleaned));
  
  const diff = {
    removed: findRemoved(orig, clean),
    modified: findModified(orig, clean),
    added: findAdded(orig, clean)
  };
  
  return diff;
}

/**
 * Find removed keys
 */
function findRemoved(orig, clean, path = '') {
  const removed = [];
  
  for (const key of Object.keys(orig)) {
    if (META_KEYS.includes(key)) continue;
    
    const currentPath = path ? `${path}.${key}` : key;
    
    if (!(key in clean)) {
      removed.push(currentPath);
    } else if (typeof orig[key] === 'object' && typeof clean[key] === 'object') {
      removed.push(...findRemoved(orig[key], clean[key], currentPath));
    }
  }
  
  return removed;
}

/**
 * Find modified values
 */
function findModified(orig, clean, path = '') {
  const modified = [];
  
  for (const key of Object.keys(orig)) {
    if (META_KEYS.includes(key)) continue;
    
    const currentPath = path ? `${path}.${key}` : key;
    
    if (key in clean && orig[key] !== clean[key]) {
      if (typeof orig[key] !== 'object' || typeof clean[key] !== 'object') {
        modified.push({
          path: currentPath,
          from: orig[key],
          to: clean[key]
        });
      }
    }
  }
  
  return modified;
}

/**
 * Find added keys
 */
function findAdded(orig, clean, path = '') {
  const added = [];
  
  for (const key of Object.keys(clean)) {
    if (META_KEYS.includes(key)) continue;
    
    const currentPath = path ? `${path}.${key}` : key;
    
    if (!(key in orig)) {
      added.push(currentPath);
    }
  }
  
  return added;
}

/**
 * CLI interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'clean':
      const inputFile = args[1];
      const outputFile = args[args.indexOf('--output') + 1] || null;
      const provider = args[args.indexOf('--provider') + 1] || 'gemini';
      
      if (!inputFile) {
        console.error('Usage: schema-cleaner.js clean <input.json> [--provider <provider>] [--output <output.json>]');
        process.exit(1);
      }
      
      const schema = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
      const cleaned = cleanSchema(schema, { provider });
      
      const output = JSON.stringify(cleaned, null, 2);
      
      if (outputFile) {
        fs.writeFileSync(outputFile, output);
        console.log(`✓ Cleaned schema written to ${outputFile}`);
      } else {
        console.log(output);
      }
      break;

    case 'validate':
      const validateFile = args[1];
      
      if (!validateFile) {
        console.error('Usage: schema-cleaner.js validate <schema.json>');
        process.exit(1);
      }
      
      const validateSchemaContent = JSON.parse(fs.readFileSync(validateFile, 'utf-8'));
      const errors = validateSchema(validateSchemaContent);
      
      if (errors.length === 0) {
        console.log('✓ Schema is valid');
      } else {
        console.log('✗ Schema errors:');
        for (const error of errors) {
          console.log(`  - ${error}`);
        }
        process.exit(1);
      }
      break;

    case 'check':
      const checkFile = args[1];
      const allProviders = args.includes('--all-providers');
      
      if (!checkFile) {
        console.error('Usage: schema-cleaner.js check <schema.json> [--all-providers]');
        process.exit(1);
      }
      
      const checkSchema = JSON.parse(fs.readFileSync(checkFile, 'utf-8'));
      const providers = allProviders ? ['gemini', 'anthropic', 'openai'] : ['gemini'];
      
      console.log(`\nSchema Compatibility Check\n`);
      console.log(`Keywords: ${Object.keys(checkSchema).join(', ')}\n`);
      
      for (const provider of providers) {
        const cleaned = cleanSchema(checkSchema, { provider });
        const origSize = JSON.stringify(checkSchema).length;
        const cleanSize = JSON.stringify(cleaned).length;
        
        console.log(`${provider.padEnd(12)} ${cleanSize} bytes (${Math.round(cleanSize/origSize*100)}% of original)`);
      }
      console.log();
      break;

    case 'compare':
      const origFile = args[1];
      const cleanFile = args[2];
      
      if (!origFile || !cleanFile) {
        console.error('Usage: schema-cleaner.js compare <original.json> <cleaned.json>');
        process.exit(1);
      }
      
      const orig = JSON.parse(fs.readFileSync(origFile, 'utf-8'));
      const clean = JSON.parse(fs.readFileSync(cleanFile, 'utf-8'));
      
      const diff = compareSchemas(orig, clean);
      
      console.log('\nSchema Comparison:\n');
      console.log('Removed keys:');
      for (const key of diff.removed) {
        console.log(`  - ${key}`);
      }
      
      if (diff.modified.length > 0) {
        console.log('\nModified values:');
        for (const m of diff.modified) {
          console.log(`  ${m.path}: ${JSON.stringify(m.from)} → ${JSON.stringify(m.to)}`);
        }
      }
      
      if (diff.added.length > 0) {
        console.log('\nAdded keys:');
        for (const key of diff.added) {
          console.log(`  + ${key}`);
        }
      }
      console.log();
      break;

    default:
      console.log(`
Schema Cleaner — JSON Schema Normalization

Usage:
  schema-cleaner.js clean <input.json> [--provider <provider>] [--output <output.json>]
  schema-cleaner.js validate <schema.json>
  schema-cleaner.js check <schema.json> [--all-providers]
  schema-cleaner.js compare <original.json> <cleaned.json>

Providers: gemini (default), anthropic, openai

Examples:
  schema-cleaner.js clean schema.json --provider gemini --output clean.json
  schema-cleaner.js validate schema.json
  schema-cleaner.js check schema.json --all-providers
`);
  }
}

module.exports = {
  cleanSchema,
  validateSchema,
  resolveRef,
  compareSchemas,
  formatSchema,
  GEMINI_UNSUPPORTED
};
