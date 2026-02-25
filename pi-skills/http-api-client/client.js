#!/usr/bin/env node

/**
 * HTTP API Client for PopeBot
 * Makes HTTP requests with authentication, retry logic, rate limiting, and response parsing
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  defaultTimeout: parseInt(process.env.HTTP_API_TIMEOUT || '30000'),
  defaultRetries: parseInt(process.env.HTTP_API_RETRIES || '0'),
  defaultRateLimit: parseRateLimitEnv(process.env.HTTP_API_RATE_LIMIT),
  defaultRetryOn: [429, 500, 502, 503, 504],
  defaultRetryDelay: 1000
};

function parseRateLimitEnv(val) {
  if (!val) return null;
  const [requests, window] = val.split(',').map(Number);
  return { requests, window };
}

// Simple JMESPath-like picker (supports basic dot notation and array indices)
function pickFields(obj, path) {
  const parts = path.split(',').map(p => p.trim());
  const result = {};
  
  for (const p of parts) {
    let value = obj;
    const keys = p.split('.').filter(k => k);
    
    for (const key of keys) {
      if (value === undefined || value === null) break;
      
      // Handle array index like users[0]
      const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        value = value[arrayMatch[1]];
        if (Array.isArray(value)) {
          value = value[parseInt(arrayMatch[2])];
        } else {
          value = undefined;
        }
      } else {
        value = value[key];
      }
    }
    
    // Store with original path as key
    result[p] = value;
  }
  
  return result;
}

// Simple query transform (basic JMESPath-like)
function queryJSON(obj, query) {
  // Basic implementation - for complex queries, consider jmespath package
  try {
    // Handle common patterns
    if (query.includes('[*].')) {
      // Array projection like users[*].{name: name, id: id}
      const match = query.match(/(\w+)\[\*\]\.\{(.+)\}/);
      if (match) {
        const arrayPath = match[1];
        const projections = match[2].split(',').map(p => {
          const [newKey, oldKey] = p.split(':').map(s => s.trim());
          return { newKey, oldKey };
        });
        
        const arr = obj[arrayPath];
        if (!Array.isArray(arr)) return [];
        
        return arr.map(item => {
          const result = {};
          for (const proj of projections) {
            result[proj.newKey] = item[proj.oldKey];
          }
          return result;
        });
      }
    }
    
    // Simple path like users[*].name
    const simpleMatch = query.match(/^(\w+)\[\*\]\.(\w+)$/);
    if (simpleMatch) {
      const arr = obj[simpleMatch[1]];
      if (!Array.isArray(arr)) return [];
      return arr.map(item => item[simpleMatch[2]]);
    }
    
    return obj;
  } catch (e) {
    return obj;
  }
}

// Rate limiter
class RateLimiter {
  constructor(requests, windowMs) {
    this.requests = requests;
    this.windowMs = windowMs;
    this.queue = [];
  }
  
  async acquire() {
    const now = Date.now();
    this.queue = this.queue.filter(t => now - t < this.windowMs);
    
    if (this.queue.length >= this.requests) {
      const oldest = this.queue[0];
      const waitTime = this.windowMs - (now - oldest);
      if (waitTime > 0) {
        await sleep(waitTime);
        return this.acquire();
      }
    }
    
    this.queue.push(now);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Parse args
function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: client.js <method> <url> [options]');
    console.error('Methods: get, post, put, patch, delete, head');
    process.exit(1);
  }
  
  const method = args[0].toLowerCase();
  const url = args[1];
  
  const options = {
    headers: {},
    retries: CONFIG.defaultRetries,
    retryDelay: CONFIG.defaultRetryDelay,
    retryOn: CONFIG.defaultRetryOn,
    rateLimit: CONFIG.defaultRateLimit,
    timeout: CONFIG.defaultTimeout,
    format: 'json',
    pick: null,
    query: null,
    output: null,
    quiet: false
  };
  
  // Parse remaining args
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--header' || arg === '-H') {
      const header = args[++i];
      const [key, ...valueParts] = header.split(':');
      options.headers[key.trim()] = valueParts.join(':').trim();
    }
    else if (arg === '--auth-header' || arg === '-A') {
      const [key, value] = args[++i].split(' ');
      options.headers[key] = value;
    }
    else if (arg === '--bearer' || arg === '-B') {
      options.headers['Authorization'] = `Bearer ${args[++i]}`;
    }
    else if (arg === '--basic' || arg === '-U') {
      const credentials = args[++i];
      const encoded = Buffer.from(credentials).toString('base64');
      options.headers['Authorization'] = `Basic ${encoded}`;
    }
    else if (arg === '--body' || arg === '-d') {
      options.body = args[++i];
    }
    else if (arg === '--body-file' || arg === '-D') {
      options.body = fs.readFileSync(args[++i], 'utf-8');
    }
    else if (arg === '--content-type' || arg === '-T') {
      options.headers['Content-Type'] = args[++i];
    }
    else if (arg === '--retries' || arg === '-r') {
      options.retries = parseInt(args[++i]);
    }
    else if (arg === '--retry-delay' || arg === '-R') {
      options.retryDelay = parseInt(args[++i]);
    }
    else if (arg === '--retry-on') {
      options.retryOn = args[++i].split(',').map(Number);
    }
    else if (arg === '--rate-limit') {
      const [requests, window] = args[++i].split(',').map(Number);
      options.rateLimit = { requests, window };
    }
    else if (arg === '--timeout' || arg === '-t') {
      options.timeout = parseInt(args[++i]);
    }
    else if (arg === '--pick' || arg === '-p') {
      options.pick = args[++i];
    }
    else if (arg === '--query' || arg === '-q') {
      // Check if it's actually the quiet flag
      if (args[i] === '-q' && args[i + 1]?.startsWith('-')) {
        options.quiet = true;
      } else {
        options.query = args[++i];
      }
    }
    else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    }
    else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    }
    else if (arg === '--format' || arg === '-f') {
      options.format = args[++i];
    }
  }
  
  // Set default content-type for body methods
  if (['post', 'put', 'patch'].includes(method) && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }
  
  return { method, url, options };
}

// Make HTTP request with retries
async function makeRequest(method, url, options) {
  const { headers, body, retries, retryDelay, retryOn, timeout } = options;
  
  let lastError;
  let attempt = 0;
  
  while (attempt <= retries) {
    attempt++;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const fetchOptions = {
        method: method.toUpperCase(),
        headers,
        signal: controller.signal
      };
      
      if (body && !['get', 'head'].includes(method)) {
        fetchOptions.body = body;
      }
      
      const startTime = new Date().toISOString();
      const response = await fetch(url, fetchOptions);
      const endTime = new Date().toISOString();
      
      clearTimeout(timeoutId);
      
      // Read response
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      let responseBody;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }
      
      // Check if we should retry
      if (retryOn.includes(response.status) && attempt <= retries) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await sleep(delay);
        continue;
      }
      
      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        timings: {
          start: startTime,
          end: endTime,
          duration: new Date(endTime) - new Date(startTime)
        }
      };
      
    } catch (error) {
      lastError = error;
      
      // Network errors are retryable
      if (attempt <= retries && retryOn.includes(0)) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      } else {
        break;
      }
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Request failed',
    retries: attempt - 1,
    ...(lastError?.code && { code: lastError.code })
  };
}

// Main
async function main() {
  const { method, url, options } = parseArgs();
  
  // Validate method
  const validMethods = ['get', 'post', 'put', 'patch', 'delete', 'head'];
  if (!validMethods.includes(method)) {
    console.error(`Invalid method: ${method}`);
    console.error(`Valid methods: ${validMethods.join(', ')}`);
    process.exit(1);
  }
  
  // Apply rate limiting
  if (options.rateLimit) {
    const limiter = new RateLimiter(options.rateLimit.requests, options.rateLimit.window);
    await limiter.acquire();
  }
  
  // Make request
  const result = await makeRequest(method, url, options);
  
  // Apply response transformations
  if (result.success && options.pick) {
    result.body = pickFields(result.body, options.pick);
  }
  
  if (result.success && options.query) {
    result.body = queryJSON(result.body, options.query);
  }
  
  // Save to file if requested
  if (options.output && result.success) {
    const outputDir = path.dirname(options.output);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    if (typeof result.body === 'object') {
      fs.writeFileSync(options.output, JSON.stringify(result.body, null, 2));
    } else {
      fs.writeFileSync(options.output, result.body);
    }
    
    if (!options.quiet) {
      console.log(`Response saved to ${options.output}`);
    }
  }
  
  // Output
  if (options.quiet) {
    if (typeof result.body === 'object') {
      console.log(JSON.stringify(result.body));
    } else {
      console.log(result.body);
    }
  } else if (options.format === 'text' && result.success) {
    console.log(typeof result.body === 'object' ? JSON.stringify(result.body, null, 2) : result.body);
  } else if (options.format === 'raw' && result.success) {
    console.log(result.body);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
  
  // Exit with error code if request failed
  if (!result.success) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(JSON.stringify({
    success: false,
    error: error.message
  }));
  process.exit(1);
});
