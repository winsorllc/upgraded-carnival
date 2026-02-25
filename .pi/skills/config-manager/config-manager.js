#!/usr/bin/env node

/**
 * Config Manager - Configuration management with schema validation
 * Inspired by ZeroClaw's config/schema.rs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = process.env.CONFIG_DIR || __dirname;
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const PROFILES_DIR = path.join(CONFIG_DIR, 'profiles');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadConfig() {
  ensureDir(CONFIG_DIR);
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  }
  return {};
}

function saveConfig(config) {
  ensureDir(CONFIG_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getNestedValue(obj, key) {
  const keys = key.split('.');
  let value = obj;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return null;
    }
  }
  return value;
}

function setNestedValue(obj, key, value) {
  const keys = key.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k];
  }
  current[keys[keys.length - 1]] = value;
}

function deleteNestedValue(obj, key) {
  const keys = key.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object') {
      return false;
    }
    current = current[k];
  }
  const lastKey = keys[keys.length - 1];
  if (lastKey in current) {
    delete current[lastKey];
    return true;
  }
  return false;
}

function flattenObject(obj, prefix = '') {
  const result = {};
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], newKey));
    } else {
      result[newKey] = obj[key];
    }
  }
  return result;
}

function loadFromEnv() {
  const config = {};
  const prefix = 'CONFIG_';
  
  for (const [envKey, envValue] of Object.entries(process.env)) {
    if (envKey.startsWith(prefix)) {
      const key = envKey
        .slice(prefix.length)
        .toLowerCase()
        .replace(/_/g, '.');
      setNestedValue(config, key, envValue);
    }
  }
  
  return config;
}

async function cmdSet(options) {
  const { key, value } = options;
  
  if (!key) {
    throw new Error('--key is required');
  }
  
  let parsedValue = value;
  if (value !== undefined) {
    // Try to parse as JSON
    try {
      parsedValue = JSON.parse(value);
    } catch (e) {
      // Keep as string
    }
  }
  
  const config = loadConfig();
  setNestedValue(config, key, parsedValue);
  saveConfig(config);
  
  return { success: true, key, value: parsedValue };
}

async function cmdGet(options) {
  const { key } = options;
  
  if (!key) {
    throw new Error('--key is required');
  }
  
  const config = loadConfig();
  const value = getNestedValue(config, key);
  
  return { key, value, found: value !== null };
}

async function cmdList(options) {
  const { flat, format = 'json' } = options;
  const config = loadConfig();
  
  if (flat) {
    return flattenObject(config);
  }
  
  return config;
}

async function cmdDelete(options) {
  const { key } = options;
  
  if (!key) {
    throw new Error('--key is required');
  }
  
  const config = loadConfig();
  const deleted = deleteNestedValue(config, key);
  
  if (deleted) {
    saveConfig(config);
  }
  
  return { success: deleted, key };
}

async function cmdValidate(options) {
  const { schemaPath } = options;
  
  if (!schemaPath) {
    throw new Error('--schema-path is required');
  }
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }
  
  const config = loadConfig();
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  
  // Basic JSON Schema validation (simplified)
  const errors = [];
  
  function validateValue(value, schema, path) {
    if (schema.type) {
      const typeMap = {
        'string': 'string',
        'number': 'number',
        'integer': 'number',
        'boolean': 'boolean',
        'object': 'object',
        'array': 'array'
      };
      
      const actualType = typeMap[schema.type];
      if (actualType && typeof value !== actualType) {
        errors.push({ path, message: `Expected ${schema.type}, got ${typeof value}` });
      }
    }
    
    if (schema.properties) {
      for (const [prop, propSchema] of Object.entries(schema.properties)) {
        if (value && prop in value) {
          validateValue(value[prop], propSchema, `${path}.${prop}`);
        } else if (schema.required && schema.required.includes(prop)) {
          errors.push({ path: `${path}.${prop}`, message: 'Required property missing' });
        }
      }
    }
  }
  
  validateValue(config, schema, 'root');
  
  return { valid: errors.length === 0, errors };
}

async function cmdLoad(options) {
  const { path: filePath, merge = true } = options;
  
  if (!filePath) {
    throw new Error('--path is required');
  }
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  let loadedConfig;
  
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    // Simple YAML parser for basic cases
    loadedConfig = parseYAML(content);
  } else {
    loadedConfig = JSON.parse(content);
  }
  
  const config = merge ? { ...loadConfig(), ...loadedConfig } : loadedConfig;
  saveConfig(config);
  
  return { success: true, merged: merge, keys: Object.keys(loadedConfig).length };
}

async function cmdProfile(options) {
  const { name, set: setKeyValue } = options;
  
  if (!name) {
    throw new Error('--name is required');
  }
  
  ensureDir(PROFILES_DIR);
  const profilePath = path.join(PROFILES_DIR, `${name}.json`);
  
  if (setKeyValue) {
    // Create or update profile with specific values
    let profile = {};
    if (fs.existsSync(profilePath)) {
      profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    }
    
    const [key, value] = setKeyValue.split('=');
    if (key && value) {
      let parsedValue = value;
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // Keep as string
      }
      setNestedValue(profile, key, parsedValue);
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    }
    
    return { success: true, profile: name, updated: setKeyValue };
  }
  
  // List profiles
  if (!fs.existsSync(PROFILES_DIR)) {
    return { profiles: [] };
  }
  
  const profiles = fs.readdirSync(PROFILES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
  
  return { profiles };
}

async function cmdSwitch(options) {
  const { profile } = options;
  
  if (!profile) {
    throw new Error('--profile is required');
  }
  
  const profilePath = path.join(PROFILES_DIR, `${profile}.json`);
  
  if (!fs.existsSync(profilePath)) {
    throw new Error(`Profile not found: ${profile}`);
  }
  
  const profileConfig = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  const currentConfig = loadConfig();
  
  // Merge profile with current config (profile takes precedence)
  const merged = { ...currentConfig, ...profileConfig };
  saveConfig(merged);
  
  return { success: true, profile, keys: Object.keys(profileConfig).length };
}

async function cmdEnv(options) {
  const config = loadFromEnv();
  
  if (Object.keys(config).length === 0) {
    return { loaded: 0, config: {} };
  }
  
  const currentConfig = loadConfig();
  const merged = { ...currentConfig, ...config };
  saveConfig(merged);
  
  return { loaded: Object.keys(config).length, keys: Object.keys(config) };
}

function parseYAML(content) {
  // Basic YAML parser
  const result = {};
  const lines = content.split('\n');
  let currentKey = '';
  let indent = 0;
  const stack = [{ obj: result, indent: -1 }];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (match) {
      const [, spaces, key, value] = match;
      const currentIndent = spaces.length;
      
      // Find the right parent
      while (stack.length > 1 && stack[stack.length - 1].indent >= currentIndent) {
        stack.pop();
      }
      
      const parent = stack[stack.length - 1].obj;
      
      if (value.trim()) {
        // Value present
        let parsedValue = value.trim();
        if (parsedValue === 'true') parsedValue = true;
        else if (parsedValue === 'false') parsedValue = false;
        else if (!isNaN(parsedValue)) parsedValue = Number(parsedValue);
        
        parent[key.trim()] = parsedValue;
      } else {
        // Object
        parent[key.trim()] = {};
        stack.push({ obj: parent[key.trim()], indent: currentIndent });
      }
    }
  }
  
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    if (command === 'set') {
      const options = {
        key: getArgValue(args, '--key'),
        value: getArgValue(args, '--value')
      };
      
      if (!options.key) {
        console.error('Error: --key is required');
        process.exit(1);
      }
      
      const result = await cmdSet(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'get') {
      const options = {
        key: getArgValue(args, '--key')
      };
      
      if (!options.key) {
        console.error('Error: --key is required');
        process.exit(1);
      }
      
      const result = await cmdGet(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'list') {
      const options = {
        flat: args.includes('--flat'),
        format: getArgValue(args, '--format') || 'json'
      };
      
      const result = await cmdList(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'delete' || command === 'del') {
      const options = {
        key: getArgValue(args, '--key')
      };
      
      if (!options.key) {
        console.error('Error: --key is required');
        process.exit(1);
      }
      
      const result = await cmdDelete(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'validate') {
      const options = {
        schemaPath: getArgValue(args, '--schema-path')
      };
      
      const result = await cmdValidate(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'load') {
      const options = {
        path: getArgValue(args, '--path'),
        merge: !args.includes('--no-merge')
      };
      
      const result = await cmdLoad(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'profile') {
      const options = {
        name: getArgValue(args, '--name'),
        set: getArgValue(args, '--set')
      };
      
      const result = await cmdProfile(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'switch') {
      const options = {
        profile: getArgValue(args, '--profile')
      };
      
      const result = await cmdSwitch(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'env') {
      const result = await cmdEnv({});
      console.log(JSON.stringify(result, null, 2));
      
    } else {
      console.log(`
Config Manager - Configuration management with schema validation

Usage:
  config-manager.js set --key <key> --value <value>
  config-manager.js get --key <key>
  config-manager.js list [options]
  config-manager.js delete --key <key>
  config-manager.js validate --schema-path <path>
  config-manager.js load --path <path>
  config-manager.js profile --name <name> [--set key=value]
  config-manager.js switch --profile <name>
  config-manager.js env

Commands:
  set       Set a configuration value
  get       Get a configuration value
  list      List all configuration
  delete    Delete a configuration key
  validate  Validate against JSON schema
  load      Load configuration from file
  profile   Manage configuration profiles
  switch    Switch to a configuration profile
  env       Load from environment variables

Examples:
  config-manager.js set --key providers.anthropic.api_key --value "sk-xxx"
  config-manager.js get --key providers.anthropic.api_key
  config-manager.js list --flat
  config-manager.js load --path ./config.yaml
  config-manager.js profile --name production --set providers.anthropic.api_key=xxx
  config-manager.js switch --profile production
`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
}

main();
