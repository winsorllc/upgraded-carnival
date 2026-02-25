#!/usr/bin/env node

/**
 * JSON Tools Skill
 * Parse, validate, format, and transform JSON data
 */

const fs = require('fs');
const path = require('path');

function parseArgs(args) {
  if (args.length === 0) return { command: null, files: [], extra: [] };
  
  const command = args[0];
  const files = [];
  const extra = [];
  
  for (let i = 1; i < args.length; i++) {
    if (!args[i].startsWith('-')) {
      if (args[i].endsWith('.json') || args[i].endsWith('.csv') || fs.existsSync(args[i])) {
        files.push(args[i]);
      } else {
        extra.push(args[i]);
      }
    }
  }
  
  return { command, files, extra };
}

function readJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function validateJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return { valid: true, message: 'Valid JSON' };
  } catch (e) {
    return { valid: false, message: e.message };
  }
}

function formatJSON(filePath, indent = 2) {
  const data = readJSON(filePath);
  return JSON.stringify(data, null, indent);
}

function queryPath(obj, pathStr) {
  const parts = pathStr.split(/\.|\[(\d+)\]|\[['"]([^'"]+)['"]\]/).filter(Boolean);
  let result = obj;
  
  for (const part of parts) {
    if (result === null || result === undefined) {
      return undefined;
    }
    
    if (/^\d+$/.test(part)) {
      result = result[parseInt(part)];
    } else {
      result = result[part];
    }
  }
  
  return result;
}

function getKeys(obj, depth = 1) {
  if (Array.isArray(obj)) {
    return { type: 'array', length: obj.length };
  }
  
  if (typeof obj !== 'object' || obj === null) {
    return { type: typeof obj };
  }
  
  const keys = Object.keys(obj).map(key => {
    const value = obj[key];
    const type = Array.isArray(value) ? 'array' : typeof value;
    return `${key}: ${type}`;
  });
  
  return keys;
}

function deepMerge(...objects) {
  const result = {};
  
  for (const obj of objects) {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        result[key] = deepMerge(result[key] || {}, obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
  }
  
  return result;
}

function jsonToCSV(data) {
  if (!Array.isArray(data)) {
    data = [data];
  }
  
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

function csvToJSON(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    data.push(obj);
  }
  
  return data;
}

function filterArray(data, condition) {
  if (!Array.isArray(data)) {
    throw new Error('Filter requires an array');
  }
  
  // Simple condition parsing (e.g., "age > 18", "name === 'John'")
  const conditionMatch = condition.match(/^(\w+)\s*(>|<|>=|<=|===|==|!=|!==)\s*(['"]?)([^'"]+)\3$/);
  
  if (!conditionMatch) {
    // Try evaluating as JS expression
    return data.filter(item => {
      try {
        const fn = new Function('item', `return ${condition}`);
        return fn(item);
      } catch (e) {
        return false;
      }
    });
  }
  
  const [, field, operator, , value] = conditionMatch;
  const numValue = parseFloat(value);
  const isNum = !isNaN(numValue);
  
  return data.filter(item => {
    const itemValue = item[field];
    
    switch (operator) {
      case '>': return itemValue > (isNum ? numValue : value);
      case '<': return itemValue < (isNum ? numValue : value);
      case '>=': return itemValue >= (isNum ? numValue : value);
      case '<=': return itemValue <= (isNum ? numValue : value);
      case '===': case '==': return itemValue == value;
      case '!==': case '!=': return itemValue != value;
      default: return false;
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { command, files, extra } = parseArgs(args);
  
  const usage = `Usage: json.js <command> <file> [args]
Commands:
  validate           Check if JSON is valid
  format             Pretty print JSON
  query <file> <path>  Query JSON with dot notation
  keys               List object keys
  merge <files...>   Deep merge JSON files
  tocsv              Convert JSON array to CSV
  tojson <csv>       Convert CSV to JSON
  filter <condition> Filter array elements`;
  
  if (!command || command === '--help') {
    console.log(usage);
    process.exit(0);
  }
  
  try {
    let result;
    
    switch (command) {
      case 'validate': {
        if (files.length === 0) {
          console.error('Error: File required');
          process.exit(1);
        }
        result = validateJSON(files[0]);
        console.log(result.valid ? '✓ Valid JSON' : `✗ Invalid: ${result.message}`);
        process.exit(result.valid ? 0 : 1);
      }
      
      case 'format': {
        if (files.length === 0) {
          console.error('Error: File required');
          process.exit(1);
        }
        result = formatJSON(files[0]);
        console.log(result);
        break;
      }
      
      case 'query': {
        if (files.length === 0 || extra.length === 0) {
          console.error('Error: File and path required');
          process.exit(1);
        }
        const data = readJSON(files[0]);
        result = queryPath(data, extra[0]);
        console.log(typeof result === 'object' ? JSON.stringify(result, null, 2) : result);
        break;
      }
      
      case 'keys': {
        if (files.length === 0) {
          console.error('Error: File required');
          process.exit(1);
        }
        const data = readJSON(files[0]);
        result = getKeys(data);
        if (Array.isArray(result)) {
          result.forEach(k => console.log(k));
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
        break;
      }
      
      case 'merge': {
        if (files.length < 2) {
          console.error('Error: At least 2 files required');
          process.exit(1);
        }
        const objects = files.map(f => readJSON(f));
        result = deepMerge(...objects);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'tocsv': {
        if (files.length === 0) {
          console.error('Error: File required');
          process.exit(1);
        }
        const data = readJSON(files[0]);
        result = jsonToCSV(data);
        console.log(result);
        break;
      }
      
      case 'tojson': {
        if (files.length === 0) {
          console.error('Error: File required');
          process.exit(1);
        }
        const csv = fs.readFileSync(files[0], 'utf8');
        result = csvToJSON(csv);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'filter': {
        if (files.length === 0 || extra.length === 0) {
          console.error('Error: File and condition required');
          process.exit(1);
        }
        const data = readJSON(files[0]);
        result = filterArray(data, extra[0]);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
