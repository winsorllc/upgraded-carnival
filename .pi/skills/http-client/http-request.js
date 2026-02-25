#!/usr/bin/env node

/**
 * HTTP Client - Full-featured HTTP request tool
 * 
 * Supports GET, POST, PUT, DELETE, PATCH with:
 * - Custom headers
 * - JSON body
 * - Timeout control
 * - Response size limits
 * - JSON response parsing
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const DEFAULT_TIMEOUT = 30; // seconds
const DEFAULT_MAX_SIZE = 1048576; // 1MB

/**
 * Make an HTTP request
 */
function httpRequest(method, urlString, options = {}) {
  return new Promise((resolve, reject) => {
    // Parse URL
    let url;
    try {
      url = new URL(urlString);
    } catch (e) {
      reject(new Error(`Invalid URL: ${urlString}`));
      return;
    }

    // Validate protocol
    if (!['http:', 'https:'].includes(url.protocol)) {
      reject(new Error(`Only http and https protocols are allowed`));
      return;
    }

    // Build headers
    const headers = {
      'User-Agent': 'thepopebot-http-client/1.0',
      ...options.headers
    };

    // Handle JSON body
    if (options.json) {
      const jsonBody = typeof options.json === 'string' 
        ? options.json 
        : JSON.stringify(options.json);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(jsonBody);
    }

    // Request options
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers,
      timeout: (options.timeout || DEFAULT_TIMEOUT) * 1000
    };

    // Choose protocol
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(requestOptions, (res) => {
      const chunks = [];
      let bytesReceived = 0;
      const maxSize = options.maxSize || DEFAULT_MAX_SIZE;

      res.on('data', (chunk) => {
        bytesReceived += chunk.length;
        if (bytesReceived > maxSize) {
          req.destroy();
          reject(new Error(`Response too large: ${bytesReceived} bytes (max: ${maxSize})`));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        
        // Parse response
        const response = {
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          body: body
        };

        // Try to parse JSON
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/json') || body.trim().startsWith('{') || body.trim().startsWith('[')) {
          try {
            response.json = JSON.parse(body);
          } catch (e) {
            // Not valid JSON, that's okay
          }
        }

        resolve(response);
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${options.timeout || DEFAULT_TIMEOUT}s`));
    });

    // Write body if present
    if (options.json) {
      const jsonBody = typeof options.json === 'string' 
        ? options.json 
        : JSON.stringify(options.json);
      req.write(jsonBody);
    }

    req.end();
  });
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {
    method: 'GET',
    url: '',
    options: {
      headers: {},
      timeout: DEFAULT_TIMEOUT,
      maxSize: DEFAULT_MAX_SIZE
    }
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--header' && args[i + 1]) {
      const header = args[i + 1];
      const colonIdx = header.indexOf(':');
      if (colonIdx > 0) {
        const key = header.slice(0, colonIdx).trim();
        const value = header.slice(colonIdx + 1).trim();
        result.options.headers[key] = value;
      }
      i += 2;
    } else if (arg === '--json' && args[i + 1]) {
      result.options.json = args[i + 1];
      i += 2;
    } else if (arg === '--timeout' && args[i + 1]) {
      result.options.timeout = parseInt(args[i + 1], 10);
      i += 2;
    } else if (arg === '--max-size' && args[i + 1]) {
      result.options.maxSize = parseInt(args[i + 1], 10);
      i += 2;
    } else if (!arg.startsWith('--')) {
      if (!result.method || arg === 'GET' || arg === 'POST' || arg === 'PUT' || arg === 'DELETE' || arg === 'PATCH') {
        result.method = arg;
      } else {
        result.url = arg;
      }
      i++;
    } else {
      i++;
    }
  }

  return result;
}

// CLI handling
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('HTTP Client CLI');
  console.log('');
  console.log('Usage: http-request.js <METHOD> <URL> [options]');
  console.log('');
  console.log('Methods: GET, POST, PUT, DELETE, PATCH');
  console.log('');
  console.log('Options:');
  console.log('  --header <key:value>  Add custom header');
  console.log('  --json <body>         Send JSON body');
  console.log('  --timeout <seconds>  Request timeout (default: 30)');
  console.log('  --max-size <bytes>   Max response size (default: 1048576)');
  console.log('');
  console.log('Examples:');
  console.log('  http-request.js GET https://api.example.com');
  console.log('  http-request.js POST https://api.example.com --json \'{"key":"value"}\'');
  console.log('  http-request.js GET https://api.example.com --header "Authorization: Bearer token"');
  process.exit(1);
}

const parsed = parseArgs(args);

if (!parsed.url) {
  console.error('Error: URL is required');
  process.exit(1);
}

httpRequest(parsed.method, parsed.url, parsed.options)
  .then(response => {
    console.log(JSON.stringify(response, null, 2));
  })
  .catch(error => {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  });
