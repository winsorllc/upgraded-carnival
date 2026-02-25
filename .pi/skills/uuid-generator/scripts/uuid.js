#!/usr/bin/env node
/**
 * UUID Generator - Generate UUIDs in various formats
 */
const crypto = require('crypto');

function parseArgs(args) {
  const result = {
    version: '4',
    count: 1,
    format: 'standard',
    help: args.includes('--help')
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--version': result.version = args[++i]; break;
      case '-v': result.version = args[++i]; break;
      case '--count': result.count = parseInt(args[++i]) || 1; break;
      case '-n': result.count = parseInt(args[++i]) || 1; break;
      case '--format': result.format = args[++i]; break;
      case '-f': result.format = args[++i]; break;
    }
  }
  
  return result;
}

function showHelp() {
  console.log(`Usage: uuid.js [options]
Options:
  --version, -v <num>   UUID version (4, 1, nil) [default: 4]
  --count, -n <num>     Number to generate [default: 1]
  --format, -f <fmt>   Format: standard, short, uppercase

Examples:
  uuid.js                    # Generate one v4 UUID
  uuid.js -n 5               # Generate 5 UUIDs
  uuid.js -v 1               # Generate v1 (time-based)
  uuid.js -f short           # No dashes`);
}

// Generate v4 UUID (random)
function uuidv4() {
  const bytes = crypto.randomBytes(16);
  // Set version (4) and variant (10)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

// Generate v1-like UUID (time-based with random node)
function uuidv1() {
  const now = Date.now();
  const timeLow = now & 0xffffffff;
  const timeMid = (now >> 32) & 0xffff;
  const timeHigh = ((now >> 48) & 0x0fff) | 0x1000;
  
  const clockSeq = crypto.randomBytes(2).readUInt16BE(0) & 0x3fff | 0x8000;
  const node = crypto.randomBytes(6);
  
  return [
    timeLow.toString(16).padStart(8, '0'),
    timeMid.toString(16).padStart(4, '0'),
    timeHigh.toString(16).padStart(4, '0'),
    clockSeq.toString(16).padStart(4, '0'),
    node.toString('hex')
  ].join('-').toLowerCase();
}

function formatUuid(uuid, format) {
  switch (format) {
    case 'short': return uuid.replace(/-/g, '');
    case 'uppercase': return uuid.toUpperCase();
    case 'upper': return uuid.toUpperCase();
    default: return uuid;
  }
}

function generateSingle(version, format) {
  let uuid;
  switch (version) {
    case '4': uuid = uuidv4(); break;
    case '1': uuid = uuidv1(); break;
    case 'nil': uuid = '00000000-0000-0000-0000-000000000000'; break;
    default: uuid = uuidv4();
  }
  return formatUuid(uuid, format);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.help) {
    showHelp();
    process.exit(0);
  }
  
  const results = [];
  for (let i = 0; i < args.count; i++) {
    results.push(generateSingle(args.version, args.format));
  }
  
  if (args.count > 1 && args.format === 'json') {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(results.join('\n'));
  }
}

main();