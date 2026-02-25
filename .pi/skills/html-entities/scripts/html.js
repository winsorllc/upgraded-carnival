#!/usr/bin/env node
/**
 * HTML Entities - Encode/decode HTML special characters
 */

const namedEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
  '©': '&copy;',
  '®': '&reg;',
  '™': '&trade;',
  '€': '&euro;',
  '£': '&pound;',
  '¥': '&yen;',
  '¢': '&cent;',
  '§': '&sect;',
  '¶': '&para;',
  '•': '&bull;',
  '…': '&hellip;',
  ' ': '&nbsp;',
  '←': '&larr;',
  '↑': '&uarr;',
  '→': '&rarr;',
  '↓': '&darr;'
};

const reverseEntities = Object.fromEntries(
  Object.entries(namedEntities).map(([k, v]) => [v, k])
);

function parseArgs(args) {
  const result = {
    command: args[0],
    text: args[1],
    numeric: args.includes('--numeric'),
    hex: args.includes('--hex'),
    help: args.includes('--help')
  };
  if (args[0] && args[0].startsWith('--text=')) {
    result.text = args[0].split('=')[1];
    result.command = 'encode'; // default
  }
  return result;
}

function encodeHtml(text, numeric, hex) {
  let result = text;
  
  if (numeric) {
    // Use numeric entities for everything
    return text.split('').map(char => {
      const code = char.charCodeAt(0);
      if (code > 127 || char === '&' || char === '<' || char === '>' || char === '"') {
        return hex ? `&#x${code.toString(16)};` : `&#${code};`;
      }
      return char;
    }).join('');
  }
  
  // Use named entities where available
  for (const [char, entity] of Object.entries(namedEntities)) {
    result = result.split(char).join(entity);
  }
  
  return result;
}

function decodeHtml(text) {
  let result = text;
  
  // Decode numeric entities (decimal and hex)
  result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Decode named entities
  for (const [entity, char] of Object.entries(reverseEntities)) {
    result = result.split(entity).join(char);
  }
  
  return result;
}

function showHelp() {
  console.log(`Usage: html.js <encode|decode> <text> [options]
Options:
  --numeric   Use numeric entities (default: named)
  --hex       Use hexadecimal numeric entities

Examples:
  html.js encode "5 < 10"
  html.js decode "&lt;div&gt;"
  html.js encode "hello" --numeric`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.help || (!args.command || (args.command !== 'encode' && args.command !== 'decode'))) {
    showHelp();
    process.exit(args.help ? 0 : 1);
  }
  
  if (!args.text) {
    console.error('Error: No text provided');
    showHelp();
    process.exit(1);
  }
  
  if (args.command === 'encode') {
    console.log(encodeHtml(args.text, args.numeric, args.hex));
  } else {
    console.log(decodeHtml(args.text));
  }
}

main();