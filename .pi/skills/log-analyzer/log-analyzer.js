#!/usr/bin/env node
/**
 * Log Analyzer Skill
 */

const fs = require('fs');
const readline = require('readline');

// Log format regex patterns
const LOG_PATTERNS = {
  nginx: /^(\S+)\s+-\s+\S+\s+\[(.+?)\]\s+"(\S+)\s+(\S+)\s+(\S+)"\s+(\d{3})\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"/,
  apache: /^(\S+)\s+\S+\s+\S+\s+\[(.+?)\]\s+"(\S+)\s+(\S+)\s+(\S+)"\s+(\d{3})\s+(\S+)\s+"([^"]*)"\s+"([^"]*)"/, 
  syslog: /^(\w{3}\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+(\S+)\[?\d*\]?:\s+(.+)/,
  level: /\[(INFO|DEBUG|WARN|WARNING|ERROR|CRITICAL|FATAL)\]/i
};

function parseTimestamp(str) {
  // Try various formats
  const formats = [
    // ISO format
    /^\d{4}-\d{2}-\d{2}T/,
    // Apache/Nginx: 25/Feb/2026:12:34:56 +0000
    /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/,
    // Syslog: Feb 25 12:34:56
    /^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})/
  ];
  
  for (const format of formats) {
    if (format.test(str)) {
      return new Date(str);
    }
  }
  return null;
}

function detectLevel(line) {
  // Common log level patterns
  const match = line.match(/\b(ERROR|WARN|WARNING|INFO|DEBUG|CRITICAL|FATAL|TRACE)\b/i);
  if (match) {
    return match[1].toLowerCase();
  }
  
  // Default based on content
  if (line.includes('error') || line.includes('exception')) return 'error';
  if (line.includes('warn')) return 'warning';
  if (line.includes('debug')) return 'debug';
  return 'info';
}

function detectFormat(line) {
  if (LOG_PATTERNS.nginx.test(line)) return 'nginx';
  if (LOG_PATTERNS.apache.test(line)) return 'apache';
  if (LOG_PATTERNS.syslog.test(line)) return 'syslog';
  try {
    JSON.parse(line);
    return 'json';
  } catch (e) {
    return 'text';
  }
}

async function analyzeLog(filePath, options = {}) {
  const { format = 'auto', from, to, patterns = [] } = options;
  
  const stats = {
    totalLines: 0,
    parsedLines: 0,
    timeRange: { min: null, max: null },
    byLevel: {},
    byHour: {},
    errors: [],
    patterns: {}
  };
  
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  });
  
  let detectedFormat = format;
  
  for await (const line of rl) {
    stats.totalLines++;
    
    // Auto-detect format from first non-empty line
    if (detectedFormat === 'auto' && line.trim()) {
      detectedFormat = detectFormat(line);
    }
    
    // Extract timestamp
    const timestamp = parseTimestamp(line.slice(0, 50));
    if (timestamp) {
      stats.parsedLines++;
      
      // Time range filter
      if (fromDate && timestamp < fromDate) continue;
      if (toDate && timestamp > toDate) continue;
      
      if (!stats.timeRange.min || timestamp < stats.timeRange.min) {
        stats.timeRange.min = timestamp;
      }
      if (!stats.timeRange.max || timestamp > stats.timeRange.max) {
        stats.timeRange.max = timestamp;
      }
      
      // By hour
      const hour = timestamp.getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    }
    
    // Level analysis
    const level = detectLevel(line);
    stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
    
    // Error extraction
    if (level === 'error' || level === 'critical' || level === 'fatal') {
      // Extract error message
      const errorMatch = line.match(/(?:error|exception)[\s\:]+(.{20,100}?)(?:\n|$)/i);
      if (errorMatch) {
        const message = errorMatch[1].trim().slice(0, 100);
        const existing = stats.errors.find(e => e.message === message);
        if (existing) {
          existing.count++;
        } else {
          stats.errors.push({ message, count: 1 });
        }
      }
    }
    
    // Pattern matching
    for (const pattern of patterns) {
      if (line.includes(pattern)) {
        stats.patterns[pattern] = (stats.patterns[pattern] || 0) + 1;
      }
    }
  }
  
  // Sort errors by count
  stats.errors.sort((a, b) => b.count - a.count);
  
  return { format: detectedFormat, stats };
}

async function searchLog(filePath, searchPattern, options = {}) {
  const { from, to, maxResults = 1000 } = options;
  const results = [];
  
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  const regex = new RegExp(searchPattern, 'i');
  
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    if (results.length >= maxResults) break;
    
    if (regex.test(line)) {
      const timestamp = parseTimestamp(line.slice(0, 50));
      
      // Time filter
      if (timestamp) {
        if (fromDate && timestamp < fromDate) continue;
        if (toDate && timestamp > toDate) continue;
      }
      
      results.push({
        line: line.slice(0, 500), // Truncate long lines
        timestamp: timestamp?.toISOString(),
        match: line.match(regex)?.[0]
      });
    }
  }
  
  return results;
}

function getErrorLogs(filePath, options = {}) {
  return searchLog(filePath, 'ERROR|CRITICAL|FATAL|Exception', {
    ...options,
    maxResults: options.maxResults || 500
  });
}

function getSummary(filePath) {
  return analyzeLog(filePath);
}

// CLI
const [,, command, filePath, ...args] = process.argv;

async function main() {
  if (!command || command === '--help' || command === '-h') {
    console.log(`Usage: log-analyzer.js <command> <log-file> [options]

Commands:
  analyze <file>     Analyze log file and show statistics
  search <file>     Search for pattern in log
  errors <file>      Extract error entries
  summary <file>    Get summary statistics

Options:
  --format          Log format: nginx, apache, syslog, json, auto (default)
  --from            Start timestamp (ISO format)
  --to              End timestamp (ISO format)
  --level           Filter by level: info, warning, error, critical
  --pattern         Search pattern (for search command)
  --limit           Maximum entries to return (default: 1000)
  --output          Output file path

Examples:
  analyze.js analyze access.log --format nginx
  analyze.js search app.log --pattern "user_id"
  analyze.js errors /var/log/syslog --from "2026-02-25T00:00:00"
  analyze.js summary app.log --output stats.json`);
    return 0;
  }
  
  if (!filePath) {
    console.error('Error: Log file path required');
    return 1;
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return 1;
  }
  
  // Parse arguments
  const options = {
    format: 'auto',
    from: null,
    to: null,
    level: null,
    maxResults: 1000
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--format': options.format = args[++i]; break;
      case '--from': options.from = args[++i]; break;
      case '--to': options.to = args[++i]; break;
      case '--level': options.level = args[++i]; break;
      case '--limit': options.maxResults = parseInt(args[++i]) || 1000; break;
    }
  }
  
  // Get output path
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : null;
  
  try {
    let result;
    
    switch (command) {
      case 'analyze':
        result = await analyzeLog(filePath, options);
        break;
      case 'search':
        const patternIdx = args.indexOf('--pattern');
        const pattern = patternIdx >= 0 ? args[patternIdx + 1] : args[0];
        if (!pattern) {
          console.error('Usage: search <file> --pattern <pattern>');
          return 1;
        }
        result = await searchLog(filePath, pattern, options);
        break;
      case 'errors':
        result = await getErrorLogs(filePath, options);
        break;
      case 'summary':
        result = await getSummary(filePath);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        return 1;
    }
    
    // Filter by level if specified
    if (options.level && Array.isArray(result)) {
      const levels = options.level.split(',').map(l => l.trim().toLowerCase());
      result = result.filter(r => !r.line || levels.some(l => r.line.toLowerCase().includes(l)));
    }
    
    if (outputPath) {
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(JSON.stringify({ saved: true, file: outputPath, entries: Array.isArray(result) ? result.length : undefined }));
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    
    return 0;
    
  } catch (error) {
    console.error('Error:', error.message);
    return 1;
  }
}

main().then(code => process.exit(code)).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
