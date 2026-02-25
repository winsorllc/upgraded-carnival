#!/usr/bin/env node
/**
 * JSON Processor Skill - JSON manipulation and validation
 */

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function writeJson(filePath, data, indent = 2) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, indent));
}

function validateJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return { valid: true, file: filePath, errors: [] };
  } catch (e) {
    return { 
      valid: false, 
      file: filePath, 
      errors: [{ message: e.message, position: e.message.match(/position (\d+)/)?.[1] }]
    };
  }
}

function formatJson(filePath, indent = 2) {
  const data = readJson(filePath);
  return JSON.stringify(data, null, parseInt(indent) || 2);
}

function minifyJson(filePath) {
  const data = readJson(filePath);
  return JSON.stringify(data);
}

function getValueByPath(obj, pathStr) {
  const parts = pathStr.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    
    // Handle array notation: users[*], users[0], users[n]
    const arrayMatch = part.match(/^([^\[]+)(?:\[(\*|\d+|n)\])?$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      const idx = arrayMatch[2];
      
      current = current[key];
      if (current === undefined) return undefined;
      
      if (idx === '*') {
        // Wildcard - return all items
        return Array.isArray(current) ? current : [current];
      } else if (idx !== undefined) {
        // Specific index
        const index = parseInt(idx);
        if (Array.isArray(current) && index < current.length) {
          current = current[index];
        } else {
          return undefined;
        }
      }
    } else {
      current = current[part];
    }
  }
  
  return current;
}

function setValueByPath(obj, pathStr, value) {
  const parts = pathStr.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
    
    if (arrayMatch) {
      const key = arrayMatch[1];
      const idx = parseInt(arrayMatch[2]);
      if (!current[key]) current[key] = [];
      if (!current[key][idx]) current[key][idx] = {};
      current = current[key][idx];
    } else {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }
  
  const lastPart = parts[parts.length - 1];
  const arrayMatch = lastPart.match(/^([^\[]+)\[(\d+)\]$/);
  if (arrayMatch) {
    const key = arrayMatch[1];
    const idx = parseInt(arrayMatch[2]);
    if (!current[key]) current[key] = [];
    current[key][idx] = value;
  } else {
    current[lastPart] = value;
  }
  
  return obj;
}

function mergeJson(filePaths, deep = false) {
  let result = {};
  
  for (const filePath of filePaths) {
    const data = readJson(filePath);
    if (deep) {
      result = deepMerge(result, data);
    } else {
      result = { ...result, ...data };
    }
  }
  
  return result;
}

function deepMerge(target, source) {
  const output = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(output[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  
  return output;
}

function filterArray(data, filterStr) {
  const match = filterStr.match(/^(\w+)\[(.+)\]$/);
  if (!match) return null;
  
  const arrayKey = match[1];
  const condition = match[2];
  const array = data[arrayKey];
  if (!Array.isArray(array)) return null;
  
  // Parse condition: field>=value, field~=value, field=value
  const conditionMatch = condition.match(/^(\w+)([><~=!]+)(.+)$/);
  if (!conditionMatch) return array;
  
  const field = conditionMatch[1];
  const operator = conditionMatch[2];
  const value = conditionMatch[3];
  
  return array.filter(item => {
    const itemValue = item[field];
    const parsedValue = parseFloat(value) || value;
    
    switch (operator) {
      case '>': return Number(itemValue) > Number(parsedValue);
      case '>=': return Number(itemValue) >= Number(parsedValue);
      case '<': return Number(itemValue) < Number(parsedValue);
      case '<=': return Number(itemValue) <= Number(parsedValue);
      case '=': return String(itemValue) === String(parsedValue);
      case '!=': return String(itemValue) !== String(parsedValue);
      case '~=': return String(itemValue).toLowerCase().includes(String(parsedValue).toLowerCase());
      default: return false;
    }
  });
}

function jsonToCsv(data, options = {}) {
  const array = Array.isArray(data) ? data : [data];
  if (array.length === 0) return '';
  
  const { headers = Object.keys(array[0]) } = options;
  const rows = [
    headers.join(','),
    ...array.map(item => 
      headers.map(h => {
        const val = item[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Escape quotes and wrap in quotes if needed
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(',')
    )
  ];
  
  return rows.join('\n');
}

function csvToJson(csvStr) {
  const lines = csvStr.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] !== undefined ? values[i].trim() : '';
    });
    return obj;
  });
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function calculateStats(data, pathStr) {
  const values = getValueByPath(data, pathStr);
  if (!Array.isArray(values)) {
    return { error: 'Path must resolve to an array' };
  }
  
  const numbers = values.filter(v => typeof v === 'number');
  if (numbers.length === 0) {
    return { error: 'No numeric values found' };
  }
  
  const sum = numbers.reduce((a, b) => a + b, 0);
  const sorted = [...numbers].sort((a, b) => a - b);
  const n = numbers.length;
  
  return {
    count: n,
    sum: parseFloat(sum.toFixed(4)),
    mean: parseFloat((sum / n).toFixed(4)),
    min: sorted[0],
    max: sorted[n - 1],
    median: n % 2 === 0 
      ? parseFloat(((sorted[n/2 - 1] + sorted[n/2]) / 2).toFixed(4))
      : sorted[Math.floor(n/2)],
    range: sorted[n - 1] - sorted[0]
  };
}

function generateSchema(data) {
  const inferType = (value) => {
    if (value === null) return { type: 'null' };
    if (Array.isArray(value)) {
      return { type: 'array', items: value.length > 0 ? inferType(value[0]) : {} };
    }
    if (typeof value === 'object') {
      const properties = {};
      for (const [k, v] of Object.entries(value)) {
        properties[k] = inferType(v);
      }
      return { type: 'object', properties };
    }
    return { type: typeof value };
  };
  
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    ...inferType(data)
  };
}

// CLI
const [,, command, ...args] = process.argv;

function showHelp() {
  console.log(`Usage: json.js <command> [args] [options]

Commands:
  validate <file.json>              Validate JSON syntax
  format <file.json> [options]     Prettify JSON
  minify <file.json>              Remove whitespace
  query <file.json> <path>          Get value by path
  set <file.json> <path> <value>  Set value by path (saves to file)
  merge <file1> <file2> [options] Merge JSON files
  filter <file.json> <filter>      Filter arrays
  convert <file> [options]         Convert between formats
  stats <file.json> <path>          Calculate statistics on array
  schema <file.json>               Generate JSON schema

Options:
  --indent <n>          Indentation spaces for format (default: 2)
  --deep               Use deep merge for merge command
  --to <format>        Target format: json, csv
  --output, -o         Output file path
  --in-place, -i       Modify file in place

Examples:
  json.js validate data.json
  json.js format data.json --indent 4
  json.js query data.json "users.0.name"
  json.js set data.json "config.debug" true --in-place
  json.js merge users.json config.json -o combined.json
  json.js filter data.json "users[age>=18]"
  json.js convert data.json --to csv
  json.js stats data.json "prices.*"`);
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    return 0;
  }
  
  let result;
  let outputPath = null;
  let inPlace = false;
  
  try {
    switch (command) {
      case 'validate': {
        if (!args[0]) {
          console.error('Usage: json.js validate <file.json>');
          return 1;
        }
        result = validateJson(args[0]);
        break;
      }
      
      case 'format': {
        if (!args[0]) {
          console.error('Usage: json.js format <file.json>');
          return 1;
        }
        const indentIdx = args.indexOf('--indent');
        const indent = indentIdx >= 0 ? (args[indentIdx + 1] || 2) : 2;
        result = formatJson(args[0], indent);
        break;
      }
      
      case 'minify': {
        if (!args[0]) {
          console.error('Usage: json.js minify <file.json>');
          return 1;
        }
        result = minifyJson(args[0]);
        break;
      }
      
      case 'query': {
        if (!args[0] || !args[1]) {
          console.error('Usage: json.js query <file.json> <path>');
          return 1;
        }
        const data = readJson(args[0]);
        result = getValueByPath(data, args[1]);
        break;
      }
      
      case 'set': {
        if (!args[0] || !args[1] || args.length < 3) {
          console.error('Usage: json.js set <file.json> <path> <value>');
          return 1;
        }
        const data = readJson(args[0]);
        let value = args[2];
        
        // Try to parse as JSON
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string
        }
        
        const updated = setValueByPath(data, args[1], value);
        
        if (args.includes('--in-place') || args.includes('-i')) {
          writeJson(args[0], updated);
          result = { updated: true, file: args[0] };
        } else {
          result = updated;
        }
        break;
      }
      
      case 'merge': {
        const files = [];
        let i = 0;
        while (i < args.length && !args[i].startsWith('-')) {
          files.push(args[i]);
          i++;
        }
        
        if (files.length < 2) {
          console.error('Usage: json.js merge <file1> <file2> [...] [options]');
          return 1;
        }
        
        const deep = args.includes('--deep');
        result = mergeJson(files, deep);
        
        const outputIdx = args.indexOf('-o');
        if (outputIdx >= 0 && args[outputIdx + 1]) {
          outputPath = args[outputIdx + 1];
        }
        break;
      }
      
      case 'filter': {
        if (!args[0] || !args[1]) {
          console.error('Usage: json.js filter <file.json> <filter>');
          return 1;
        }
        const data = readJson(args[0]);
        result = filterArray(data, args[1]);
        break;
      }
      
      case 'convert': {
        if (!args[0]) {
          console.error('Usage: json.js convert <file> --to <format>');
          return 1;
        }
        const toIdx = args.indexOf('--to');
        const toFormat = toIdx >= 0 ? args[toIdx + 1] : 'json';
        const content = fs.readFileSync(args[0], 'utf8');
        const ext = path.extname(args[0]).toLowerCase();
        
        if (ext === '.json' && toFormat === 'csv') {
          const data = JSON.parse(content);
          const csvArray = Array.isArray(data) ? data : [data];
          result = jsonToCsv(csvArray);
        } else if (ext === '.csv' && toFormat === 'json') {
          result = csvToJson(content);
        } else {
          // No conversion needed
          result = JSON.parse(content);
        }
        break;
      }
      
      case 'stats': {
        if (!args[0] || !args[1]) {
          console.error('Usage: json.js stats <file.json> <path>');
          return 1;
        }
        const data = readJson(args[0]);
        result = calculateStats(data, args[1]);
        break;
      }
      
      case 'schema': {
        if (!args[0]) {
          console.error('Usage: json.js schema <file.json>');
          return 1;
        }
        const data = readJson(args[0]);
        result = generateSchema(data);
        break;
      }
      
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        return 1;
    }
    
    if (outputPath) {
      writeJson(outputPath, result);
      console.log(JSON.stringify({ saved: true, file: outputPath }));
    } else {
      console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    }
    
    return 0;
    
  } catch (error) {
    console.error('Error:', error.message);
    return 1;
  }
}

main().then(code => process.exit(code));
