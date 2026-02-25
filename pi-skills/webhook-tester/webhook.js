#!/usr/bin/env node
/**
 * Webhook Tester - HTTP endpoint testing tool
 * Inspired by OpenClaw webhook automation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function parseArgs(args) {
  const config = {
    url: '',
    method: 'GET',
    headers: {},
    data: null,
    file: null,
    repeat: 1,
    followRedirects: false,
    verbose: false,
    showHeaders: false,
    showBody: false,
    timeout: 30
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      if (!config.url) {
        config.url = arg;
      }
    } else {
      switch (arg) {
        case '--method':
        case '-X':
          config.method = args[++i]?.toUpperCase() || 'GET';
          break;
        case '--header':
        case '-H':
          const header = args[++i];
          if (header?.includes(':')) {
            const [key, ...valueParts] = header.split(':');
            config.headers[key] = valueParts.join(':').trim();
          }
          break;
        case '--data':
        case '-d':
          config.data = args[++i];
          break;
        case '--file':
        case '-f':
          config.file = args[++i];
          break;
        case '--repeat':
          config.repeat = parseInt(args[++i]) || 1;
          break;
        case '--follow-redirects':
        case '-L':
          config.followRedirects = true;
          break;
        case '--verbose':
        case '-v':
          config.verbose = true;
          break;
        case '--show-headers':
        case '-i':
          config.showHeaders = true;
          break;
        case '--show-body':
          config.showBody = true;
          break;
        case '--timeout':
          config.timeout = parseInt(args[++i]) || 30;
          break;
      }
    }
    i++;
  }
  return config;
}

function makeRequest(url, options) {
  const writefmt = '\\n%{http_code}\\n%{time_total}\\n%{size_download}';
  const cmd = ['curl', '-s', '-w', writefmt];
  
  cmd.push('-X', options.method);
  
  for (const [key, value] of Object.entries(options.headers)) {
    cmd.push('-H', `${key}: ${value}`);
  }
  
  if (options.followRedirects) {
    cmd.push('-L');
  }
  
  cmd.push('--connect-timeout', options.timeout.toString());
  cmd.push('--max-time', (options.timeout * 2).toString());
  
  if (options.data) {
    cmd.push('-d', options.data);
  } else if (options.file && fs.existsSync(options.file)) {
    cmd.push('-d', '@' + options.file);
    if (!options.headers['Content-Type']) {
      const ext = path.extname(options.file);
      if (ext === '.json') {
        options.headers['Content-Type'] = 'application/json';
        cmd.push('-H', 'Content-Type: application/json');
      }
    }
  }
  
  cmd.push(url);
  
  const startTime = Date.now();
  try {
    const output = execSync(cmd.join(' '), { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const lines = output.trim().split('\n');
    const httpCode = parseInt(lines[lines.length - 3]) || 0;
    const timeTotal = lines[lines.length - 2];
    const sizeDownload = lines[lines.length - 1];
    
    lines.pop();
    lines.pop();
    lines.pop();
    const body = lines.join('\n');
    
    const endTime = Date.now();
    return {
      success: httpCode >= 200 && httpCode < 400,
      statusCode: httpCode,
      body: body,
      time: endTime - startTime,
      size: parseInt(sizeDownload) || 0
    };
  } catch (e) {
    return {
      success: false,
      statusCode: 0,
      error: e.message || 'Request failed',
      time: 0,
      size: 0
    };
  }
}

function getStatusText(code) {
  const statuses = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  };
  return statuses[code] || '';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function printResult(result, config) {
  if (!result.success) {
    console.log(colors.red + '✗ Request failed' + colors.reset);
    console.log('Error: ' + result.error);
    return;
  }
  
  console.log(`${colors.bold}URL:${colors.reset} ${colors.blue}${config.url}${colors.reset}`);
  console.log(`${colors.bold}Method:${colors.reset} ${config.method}`);
  const statusColor = result.statusCode < 300 ? colors.green :
                      result.statusCode < 400 ? colors.yellow : colors.red;
  console.log(`${colors.bold}Status:${colors.reset} ${statusColor}${result.statusCode} ${getStatusText(result.statusCode)}${colors.reset}`);
  console.log(`${colors.bold}Time:${colors.reset} ${result.time}ms`);
  console.log(`${colors.bold}Size:${colors.reset} ${formatBytes(result.size)}`);
  
  if (config.showHeaders || config.verbose) {
    console.log('\nResponse Body:');
    if (result.body.length > 500) {
      console.log(result.body.substring(0, 500) + '...');
    } else {
      console.log(result.body || '(empty body)');
    }
  }
}

// Main
const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith('--help')) {
  console.log('Usage: webhook.js <url> [options]');
  console.log();
  console.log('Options:');
  console.log('  --method, -X <method>   HTTP method (GET, POST, PUT, DELETE)');
  console.log('  --header, -H <header>   Add header ("Name: Value")');
  console.log('  --data, -d <data>       Request body data');
  console.log('  --file, -f <file>       Read body from file');
  console.log('  --timeout <sec>         Request timeout (default: 30)');
  console.log('  --verbose, -v           Show full details');
  process.exit(1);
}

const config = parseArgs(args);
if (!config.url) {
  console.error(colors.red + 'Error: URL required' + colors.reset);
  process.exit(1);
}

console.log(colors.cyan + `Testing ${config.url}...` + colors.reset);
console.log();

const result = makeRequest(config.url, config);
printResult(result, config);
