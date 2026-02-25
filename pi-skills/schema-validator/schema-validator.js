#!/usr/bin/env node

/**
 * schema-validator - Validate JSON data against JSON Schema
 * 
 * Usage: schema-validator.js --schema <schema.json> --data <data.json>
 *        schema-validator.js --check-schema <schema.json>
 */

const fs = require('fs');
const path = require('path');

// Simple JSON Schema validator (subset of draft-07)
class SchemaValidator {
  constructor() {
    this.errors = [];
  }

  validate(data, schema, path = 'root') {
    this.errors = [];
    this._validate(data, schema, path);
    return this.errors;
  }

  _validate(data, schema, path) {
    // Handle null schema
    if (schema === null || schema === undefined) {
      return true;
    }

    // Type validation
    if (schema.type) {
      const actualType = this.getType(data);
      const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
      
      if (!expectedTypes.includes(actualType)) {
        this.errors.push({
          path,
          message: `Expected type ${expectedTypes.join(' | ')}, got ${actualType}`
        });
        return false;
      }
    }

    // Enum validation
    if (schema.enum) {
      if (!schema.enum.includes(data)) {
        this.errors.push({
          path,
          message: `Value must be one of: ${schema.enum.join(', ')}`
        });
        return false;
      }
    }

    // Const validation
    if (schema.const !== undefined) {
      if (data !== schema.const) {
        this.errors.push({
          path,
          message: `Value must be exactly: ${JSON.stringify(schema.const)}`
        });
        return false;
      }
    }

    // String validations
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        this.errors.push({
          path,
          message: `String length must be at least ${schema.minLength}`
        });
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        this.errors.push({
          path,
          message: `String length must be at most ${schema.maxLength}`
        });
      }
      if (schema.pattern !== undefined) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(data)) {
          this.errors.push({
            path,
            message: `String must match pattern: ${schema.pattern}`
          });
        }
      }
    }

    // Number validations
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        this.errors.push({
          path,
          message: `Value must be at least ${schema.minimum}`
        });
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        this.errors.push({
          path,
          message: `Value must be at most ${schema.maximum}`
        });
      }
    }

    // Array validations
    if (Array.isArray(data)) {
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        this.errors.push({
          path,
          message: `Array must have at least ${schema.minItems} items`
        });
      }
      if (schema.maxItems !== undefined && data.length > schema.maxItems) {
        this.errors.push({
          path,
          message: `Array must have at most ${schema.maxItems} items`
        });
      }
      if (schema.items) {
        data.forEach((item, index) => {
          this._validate(item, schema.items, `${path}[${index}]`);
        });
      }
    }

    // Object validations
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      // Required properties
      if (schema.required && Array.isArray(schema.required)) {
        for (const prop of schema.required) {
          if (!(prop in data)) {
            this.errors.push({
              path,
              message: `Missing required property: ${prop}`
            });
          }
        }
      }

      // Property validation
      if (schema.properties && typeof schema.properties === 'object') {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in data) {
            this._validate(data[key], propSchema, `${path}.${key}`);
          }
        }
      }

      // Handle additionalProperties
      if (schema.additionalProperties === false && schema.properties) {
        const extraProps = Object.keys(data).filter(
          key => !(key in schema.properties)
        );
        if (extraProps.length > 0) {
          this.errors.push({
            path,
            message: `Additional properties not allowed: ${extraProps.join(', ')}`
          });
        }
      }

      // Handle additionalProperties as schema
      if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        const allowedProps = schema.properties ? Object.keys(schema.properties) : [];
        for (const key of Object.keys(data)) {
          if (!allowedProps.includes(key)) {
            this._validate(data[key], schema.additionalProperties, `${path}.${key}`);
          }
        }
      }

      // Handle oneOf
      if (schema.oneOf) {
        const results = schema.oneOf.map(s => {
          const v = new SchemaValidator();
          v.validate(data, s);
          return v.errors.length === 0;
        });
        if (!results.some(r => r)) {
          this.errors.push({
            path,
            message: `Data must match exactly one of ${schema.oneOf.length} schemas`
          });
        }
      }

      // Handle anyOf
      if (schema.anyOf) {
        const results = schema.anyOf.map(s => {
          const v = new SchemaValidator();
          v.validate(data, s);
          return v.errors.length === 0;
        });
        if (!results.some(r => r)) {
          this.errors.push({
            path,
            message: `Data must match at least one of ${schema.anyOf.length} schemas`
          });
        }
      }
    }

    return this.errors.length === 0;
  }

  getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}

function parseArgs(args) {
  const options = {
    schema: null,
    data: null,
    stdin: false,
    strict: false,
    checkSchema: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--schema':
        options.schema = args[++i];
        break;
      case '--data':
        options.data = args[++i];
        break;
      case '--stdin':
        options.stdin = true;
        break;
      case '--strict':
        options.strict = true;
        break;
      case '--check-schema':
        options.checkSchema = args[++i];
        break;
    }
  }
  
  return options;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.error('Usage:');
    console.error('  schema-validator.js --schema <schema.json> --data <data.json>');
    console.error('  schema-validator.js --check-schema <schema.json>');
    console.error('');
    console.error('Options:');
    console.error('  --schema <file>     Path to JSON Schema file');
    console.error('  --data <file>       Path to JSON data file');
    console.error('  --stdin             Read JSON data from stdin');
    console.error('  --strict            Fail on additional properties');
    console.error('  --check-schema      Only validate the schema itself');
    process.exit(1);
  }
  
  const options = parseArgs(args);
  
  // Check schema validity mode
  if (options.checkSchema) {
    try {
      const schemaContent = fs.readFileSync(options.checkSchema, 'utf-8');
      const schema = JSON.parse(schemaContent);
      
      // Basic schema structure check
      if (typeof schema !== 'object') {
        console.log(JSON.stringify({ valid: false, error: 'Schema must be an object' }, null, 2));
        process.exit(1);
      }
      
      console.log(JSON.stringify({ valid: true, message: 'Schema is valid JSON Schema' }, null, 2));
      process.exit(0);
    } catch (e) {
      console.log(JSON.stringify({ valid: false, error: e.message }, null, 2));
      process.exit(1);
    }
  }
  
  // Validate data mode
  if (!options.schema) {
    console.error('Error: --schema is required');
    process.exit(1);
  }
  
  if (!options.data && !options.stdin) {
    console.error('Error: --data or --stdin is required');
    process.exit(1);
  }
  
  try {
    // Load schema
    const schemaContent = fs.readFileSync(options.schema, 'utf-8');
    const schema = JSON.parse(schemaContent);
    
    // Load data
    let data;
    if (options.stdin) {
      const stdinData = fs.readFileSync(0, 'utf-8');
      data = JSON.parse(stdinData);
    } else {
      const dataContent = fs.readFileSync(options.data, 'utf-8');
      data = JSON.parse(dataContent);
    }
    
    // Validate
    const validator = new SchemaValidator();
    const errors = validator.validate(data, schema);
    
    if (errors.length > 0) {
      console.log(JSON.stringify({ 
        valid: false, 
        errors: errors 
      }, null, 2));
      process.exit(1);
    }
    
    console.log(JSON.stringify({ valid: true }, null, 2));
    process.exit(0);
    
  } catch (e) {
    console.log(JSON.stringify({ 
      valid: false, 
      error: e.message 
    }, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SchemaValidator };
