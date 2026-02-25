#!/usr/bin/env node
/**
 * Base64 Tool - Encode/decode Base64 data
 */

const fs = require('fs');
const path = require('path');

function parseArgs(args) {
  const result = {
    command: null,
    text: null,
    file: null,
    output: null,
    urlSafe: false,
    help: false
  };
  
  result.command = args[0];
  
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--text': result.text = args[++i]; break;
      case '--file': result.file = args[++i]; break;
      case '--output': result.output = args[++i]; break;
      case '--url-safe': result.urlSafe = true; break;
      case '--help': result.help = true; break;
    }
  }
  
  return result;
}

function toUrlSafe(base64) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafe(base64) {
  let str = base64.replace(/-/g, '+').replace(/_/g, '/');
  // Restore padding
  while (str.length % 4 !== 0) str += '=';
  return str;
}

function encode(data, urlSafe) {
  const base64 = Buffer.from(data).toString('base64');
  return urlSafe ? toUrlSafe(base64) : base64;
}

function decode(data, urlSafe) {
  try {
    const base64 = urlSafe ? fromUrlSafe(data) : data;
    return Buffer.from(base64, 'base64');
  } catch (e) {
    console.error(`Decode error: ${e.message}`);
    return null;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.help || !args.command) {
    console.log(`Usage: base64.js <encode|decode> [options]
Options:
  --text <string>    Text to process
  --file <path>     File to process
  --output <path>  Save output to file
  --url-safe        Use URL-safe Base64`);
    process.exit(0);
  }
  
  let inputData = null;
  
  // Get input data
  if (args.file) {
    try {
      inputData = fs.readFileSync(args.file);
    } catch (e) {
      console.error(`Error reading file: ${e.message}`);
      process.exit(1);
    }
  } else if (args.text !== null) {
    inputData = Buffer.from(args.text, 'utf8');
  } else {
    // Read from stdin
    const chunks = [];
    let result = '';
    try {
      result = fs.readFileSync(0, 'utf8');
    } catch (e) {
      // No stdin
    }
    if (result) {
      inputData = Buffer.from(result.trim(), 'utf8');
    }
  }
  
  if (!inputData) {
    console.error('Error: No input provided. Use --text, --file, or pipe data.');
    process.exit(1);
  }
  
  let output = null;
  
  switch (args.command) {
    case 'encode': {
      // Binary data encodes directly, text needs conversion
      output = encode(inputData, args.urlSafe);
      break;
    }
    
    case 'decode': {
      try {
        const str = inputData.toString('utf8');
        output = decode(str, args.urlSafe);
        if (!output) {
          process.exit(1);
        }
      } catch (e) {
        console.error(`Error: ${e.message}`);
        process.exit(1);
      }
      break;
    }
    
    default: {
      console.error(`Unknown command: ${args.command}`);
      process.exit(1);
    }
  }
  
  if (args.output) {
    try {
      fs.writeFileSync(args.output, output);
      console.log(`Output written to: ${args.output}`);
    } catch (e) {
      console.error(`Error writing file: ${e.message}`);
      process.exit(1);
    }
  } else {
    // Handle binary vs text output
    if (args.command === 'encode') {
      console.log(output);
    } else {
      // Try to output as UTF-8, otherwise note binary
      try {
        const str = output.toString('utf8');
        console.log(str);
      } catch (e) {
        process.stdout.write(output);
      }
    }
  }
}

main();