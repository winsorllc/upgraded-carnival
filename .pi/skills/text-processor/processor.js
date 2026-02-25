#!/usr/bin/env node
/**
 * Text Processor Skill - Text transformation utilities
 */

const fs = require('fs');

// Read input from file, argument, or stdin
async function getInput(source) {
  if (!source || source === '-') {
    // Read from stdin
    return new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', reject);
    });
  }
  
  if (fs.existsSync(source)) {
    return fs.readFileSync(source, 'utf8');
  }
  
  // Treat as literal text
  return source;
}

function toUpper(text) {
  return text.toUpperCase();
}

function toLower(text) {
  return text.toLowerCase();
}

function toTitle(text) {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

function toCamelCase(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, chr => chr.toLowerCase());
}

function toSnakeCase(text) {
  return text
    .replace(/([A-Z])/g, '_$1')
    .replace(/\s+/g, '_')
    .replace(/^_/, '')
    .replace(/_+/g, '_')
    .toLowerCase();
}

function toKebabCase(text) {
  return text
    .replace(/([A-Z])/g, '-$1')
    .replace(/\s+/g, '-')
    .replace(/^-/, '')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function calculateStats(text) {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const lines = text.split('\n');
  const chars = text.length;
  
  return {
    characters: chars,
    words: words.length,
    lines: lines.length,
    sentences: sentences.length,
    averageWordLength: words.length > 0 
      ? (words.reduce((sum, w) => sum + w.length, 0) / words.length).toFixed(2)
      : 0,
    averageWordsPerSentence: sentences.length > 0
      ? (words.length / sentences.length).toFixed(2)
      : 0
  };
}

function findAndReplace(text, find, replace, useRegex = false) {
  if (useRegex) {
    const pattern = new RegExp(find, 'g');
    return text.replace(pattern, replace);
  }
  return text.split(find).join(replace);
}

function extractPatterns(text, patternName) {
  const patterns = {
    emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    urls: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}([-a-zA-Z0-9()@:%_\+.~#?&/=]*)/g,
    phones: /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    numbers: /\b\d+\b/g,
    hashtags: /#\w+/g,
    mentions: /@\w+/g,
    dates: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
    ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
  };
  
  const pattern = patterns[patternName];
  if (!pattern) {
    throw new Error(`Unknown pattern: ${patternName}. Available: ${Object.keys(patterns).join(', ')}`);
  }
  
  const matches = text.match(pattern) || [];
  return [...new Set(matches)]; // Remove duplicates
}

function encode(text, method) {
  switch (method) {
    case 'base64':
      return Buffer.from(text, 'utf8').toString('base64');
    case 'url':
      return encodeURIComponent(text);
    case 'hex':
      return Buffer.from(text, 'utf8').toString('hex');
    default:
      throw new Error(`Unknown encoding method: ${method}`);
  }
}

function decode(text, method) {
  switch (method) {
    case 'base64':
      return Buffer.from(text, 'base64').toString('utf8');
    case 'url':
      return decodeURIComponent(text);
    case 'hex':
      return Buffer.from(text, 'hex').toString('utf8');
    default:
      throw new Error(`Unknown decoding method: ${method}`);
  }
}

function calculateMetrics(text) {
  const stats = calculateStats(text);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words);
  
  // Basic readability score (Flesch-Kincaid simplified)
  const sentences = Math.max(1, stats.sentences);
  const syllables = words.reduce((sum, word) => {
    const s = word.match(/[aeiouy]/gi)?.length || 1;
    return sum + Math.max(1, s);
  }, 0);
  
  const fleschKincaid = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
  
  return {
    ...stats,
    uniqueWords: uniqueWords.size,
    lexicalDiversity: words.length > 0 ? (uniqueWords.size / words.length).toFixed(4) : 0,
    readability: {
      fleschKincaid: Math.max(0, Math.min(100, fleschKincaid)).toFixed(1),
      gradeLevel: ((words.length / sentences) * 0.39 + (syllables / words.length) * 11.8 - 15.59).toFixed(1)
    }
  };
}

function calculateDiff(text1, text2) {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const additions = [];
  const deletions = [];
  const unchanged = [];
  
  const maxLen = Math.max(lines1.length, lines2.length);
  
  for (let i = 0; i < maxLen; i++) {
    const line1 = lines1[i];
    const line2 = lines2[i];
    
    if (line1 === undefined) {
      additions.push({ line: i + 1, content: line2 });
    } else if (line2 === undefined) {
      deletions.push({ line: i + 1, content: line1 });
    } else if (line1 !== line2) {
      deletions.push({ line: i + 1, content: line1 });
      additions.push({ line: i + 1, content: line2 });
    } else {
      unchanged.push({ line: i + 1, content: line1 });
    }
  }
  
  return {
    summary: {
      totalLines1: lines1.length,
      totalLines2: lines2.length,
      unchanged: unchanged.length,
      additions: additions.length,
      deletions: deletions.length
    },
    additions,
    deletions,
    unchanged
  };
}

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\t/g, '  ')    // Convert tabs to 2 spaces
    .replace(/ +$/gm, '')    // Remove trailing spaces
    .replace(/\n{3,}/g, '\n\n'); // Collapse multiple blank lines
}

// CLI
const [,, command, ...args] = process.argv;

async function main() {
  if (!command || command === '--help' || command === '-h') {
    console.log(`Usage: processor.js <command> [text/file] [options]

Commands:
  case       Case conversion (--to upper|lower|title)
  format     Format conversion (--to camel|snake|kebab)
  stats      Text statistics
  replace    Find and replace (--find, --replace, --regex)
  extract    Extract patterns (--pattern emails|urls|phones|...)
  encode     Encode text (--method base64|url|hex)
  decode     Decode text (--method base64|url|hex)
  diff       Compare two files (file1 file2)
  metrics    Detailed text metrics
  normalize  Normalize whitespace

Examples:
  processor.js case "Hello World" --to upper
  processor.js stats document.txt
  processor.js replace file.txt --find "old" --replace "new"
  processor.js extract file.txt --pattern emails
  echo "text" | processor.js encode --method base64
  processor.js diff file1.txt file2.txt`);
    return 0;
  }
  
  try {
    let result;
    
    switch (command) {
      case 'case': {
        const input = await getInput(args[0]);
        const toIndex = args.indexOf('--to');
        const to = toIndex >= 0 ? args[toIndex + 1] : 'title';
        
        let converted;
        switch (to) {
          case 'upper': converted = toUpper(input); break;
          case 'lower': converted = toLower(input); break;
          case 'title': converted = toTitle(input); break;
          default:
            console.error(`Unknown case: ${to}`);
            return 1;
        }
        
        result = { operation: 'case', from: to, input: input.slice(0, 50) + '...', result: converted.slice(0, 100) + (converted.length > 100 ? '...' : '') };
        break;
      }
      
      case 'format': {
        const input = await getInput(args[0]);
        const toIndex = args.indexOf('--to');
        const to = toIndex >= 0 ? args[toIndex + 1] : 'camel';
        
        let converted;
        switch (to) {
          case 'camel': converted = toCamelCase(input); break;
          case 'snake': converted = toSnakeCase(input); break;
          case 'kebab': converted = toKebabCase(input); break;
          default:
            console.error(`Unknown format: ${to}`);
            return 1;
        }
        
        result = { operation: 'format', to, result: converted };
        break;
      }
      
      case 'stats': {
        const input = await getInput(args[0] === '--format' ? args[2] : args[0]);
        const includeFull = args.includes('--full');
        result = { 
          operation: 'stats', 
          result: includeFull ? calculateMetrics(input) : calculateStats(input) 
        };
        break;
      }
      
      case 'metrics': {
        const input = await getInput(args[0]);
        result = { operation: 'metrics', result: calculateMetrics(input) };
        break;
      }
      
      case 'replace': {
        const input = await getInput(args[0]);
        const findIndex = args.indexOf('--find');
        const find = findIndex >= 0 ? args[findIndex + 1] : '';
        const replaceIndex = args.indexOf('--replace');
        const replace = replaceIndex >= 0 ? args[replaceIndex + 1] : '';
        const useRegex = args.includes('--regex');
        
        const modified = findAndReplace(input, find, replace, useRegex);
        result = { 
          operation: 'replace', 
          replacements: (input.match(new RegExp(useRegex ? find : escapeRegex(find), 'g')) || []).length,
          result: modified.slice(0, 500) + (modified.length > 500 ? '...' : '')
        };
        break;
      }
      
      case 'extract': {
        const input = await getInput(args[0]);
        const patternIndex = args.indexOf('--pattern');
        const pattern = patternIndex >= 0 ? args[patternIndex + 1] : 'emails';
        
        const extracted = extractPatterns(input, pattern);
        result = { operation: 'extract', pattern, count: extracted.length, results: extracted.slice(0, 50) };
        break;
      }
      
      case 'encode': {
        const input = await getInput(args[0]);
        const methodIndex = args.indexOf('--method');
        const method = methodIndex >= 0 ? args[methodIndex + 1] : 'base64';
        
        result = { operation: 'encode', method, input: input.slice(0, 50), result: encode(input, method) };
        break;
      }
      
      case 'decode': {
        const input = await getInput(args[0]);
        const methodIndex = args.indexOf('--method');
        const method = methodIndex >= 0 ? args[methodIndex + 1] : 'base64';
        
        result = { operation: 'decode', method, result: decode(input, method) };
        break;
      }
      
      case 'diff': {
        if (!args[0] || !args[1]) {
          console.error('Usage: processor.js diff file1 file2');
          return 1;
        }
        const text1 = fs.readFileSync(args[0], 'utf8');
        const text2 = fs.readFileSync(args[1], 'utf8');
        
        result = { operation: 'diff', ...calculateDiff(text1, text2) };
        break;
      }
      
      case 'normalize': {
        const input = await getInput(args[0]);
        result = { operation: 'normalize', result: normalizeWhitespace(input) };
        break;
      }
      
      default:
        console.error(`Unknown command: ${command}`);
        return 1;
    }
    
    console.log(JSON.stringify(result, null, 2));
    return 0;
    
  } catch (error) {
    console.error('Error:', error.message);
    return 1;
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().then(code => process.exit(code));
