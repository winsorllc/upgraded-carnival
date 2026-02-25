#!/usr/bin/env node

// Secure HTTP Client with domain allowlisting, rate limiting, and security controls

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// Configuration
const CONFIG = {
  allowedDomains: (process.env.HTTP_ALLOWED_DOMAINS || 'api.github.com,api.openai.com')
    .split(',').map(d => d.trim().toLowerCase()),
  maxResponseSize: parseInt(process.env.HTTP_MAX_RESPONSE_SIZE || '1048576'),
  timeoutSecs: parseInt(process.env.HTTP_TIMEOUT_SECS || '30'),
  rateLimitPerMinute: parseInt(process.env.HTTP_RATE_LIMIT_PER_MINUTE || '60'),
  dataDir: process.env.HTTP_DATA_DIR || './http-data'
};

// Rate limiting state
const rateLimits = {};

// Ensure data directory
if (!existsSync(CONFIG.dataDir)) {
  mkdirSync(CONFIG.dataDir, { recursive: true });
}

function getRateLimitPath(domain) {
  return join(CONFIG.dataDir, `rate-${domain}.json`);
}

function getRateLimit(domain) {
  const path = getRateLimitPath(domain);
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8'));
  }
  return { count: 0, windowStart: Date.now() };
}

function updateRateLimit(domain) {
  const now = Date.now();
  let limit = getRateLimit(domain);
  
  const windowMs = 60000; // 1 minute
  if (now - limit.windowStart > windowMs) {
    limit = { count: 1, windowStart: now };
  } else {
    limit.count++;
  }
  
  writeFileSync(getRateLimitPath(domain), JSON.stringify(limit));
  return limit;
}

function checkRateLimit(domain) {
  const limit = getRateLimit(domain);
  const remaining = CONFIG.rateLimitPerMinute - limit.count;
  const resetIn = Math.max(0, 60000 - (Date.now() - limit.windowStart));
  
  return { remaining, resetIn, limit: CONFIG.rateLimitPerMinute };
}

function isPrivateHost(hostname) {
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const isPrivateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname);
  const isLinkLocal = hostname.startsWith('169.254.');
  const isAnyLocal = hostname === '0.0.0.0' || hostname === '::';
  
  return isLocalhost || isPrivateIP || isLinkLocal || isAnyLocal;
}

function validateUrl(urlStr) {
  let url;
  try {
    url = new URL(urlStr);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { valid: false, error: 'Only http and https protocols allowed' };
  }
  
  const hostname = url.hostname.toLowerCase();
  
  if (isPrivateHost(hostname)) {
    return { valid: false, error: 'Private/localhost addresses not allowed' };
  }
  
  const allowed = CONFIG.allowedDomains.some(d => 
    hostname === d || hostname.endsWith('.' + d)
  );
  
  if (!allowed) {
    return { valid: false, error: `Domain not in allowlist: ${hostname}. Allowed: ${CONFIG.allowedDomains.join(', ')}` };
  }
  
  return { valid: true, url };
}

async function makeRequest(method, urlStr, options = {}) {
  const validation = validateUrl(urlStr);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const url = validation.url;
  const domain = url.hostname.toLowerCase();
  
  // Check rate limit
  const rateCheck = checkRateLimit(domain);
  if (rateCheck.remaining <= 0) {
    throw new Error(`Rate limit exceeded for ${domain}. Resets in ${Math.ceil(rateCheck.resetIn/1000)}s`);
  }
  
  updateRateLimit(domain);
  
  // Prepare request
  const headers = options.headers || {};
  const timeoutMs = (options.timeout || CONFIG.timeoutSecs) * 1000;
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(urlStr, {
      method,
      headers: {
        'User-Agent': 'SecureHTTPClient/1.0',
        ...headers
      },
      body: options.data ? JSON.stringify(options.data) : undefined,
      signal: AbortSignal.timeout(timeoutMs)
    });
    
    const timeMs = Date.now() - startTime;
    
    // Check response size
    const size = parseInt(response.headers.get('content-length') || '0');
    if (size > CONFIG.maxResponseSize) {
      throw new Error(`Response too large: ${size} bytes (max: ${CONFIG.maxResponseSize})`);
    }
    
    const body = await response.text();
    
    if (body.length > CONFIG.maxResponseSize) {
      throw new Error(`Response too large: ${body.length} bytes (max: ${CONFIG.maxResponseSize})`);
    }
    
    // Build response
    const respHeaders = {};
    response.headers.forEach((v, k) => { respHeaders[k] = v; });
    
    return {
      status: response.status,
      status_text: response.statusText,
      headers: respHeaders,
      body,
      size: body.length,
      time_ms: timeMs
    };
  } catch (err) {
    if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw err;
  }
}

// CLI
const cmd = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (cmd) {
    case 'get': {
      const url = args[0];
      if (!url) {
        console.error('Usage: http get <url> [--headers <json>] [--timeout <seconds>]');
        process.exit(1);
      }
      
      const headersIdx = args.indexOf('--headers');
      const timeoutIdx = args.indexOf('--timeout');
      
      const options = {};
      if (headersIdx >= 0 && headersIdx + 1 < args.length) {
        try { options.headers = JSON.parse(args[headersIdx + 1]); } catch {}
      }
      if (timeoutIdx >= 0 && timeoutIdx + 1 < args.length) {
        options.timeout = parseInt(args[timeoutIdx + 1]);
      }
      
      const result = await makeRequest('GET', url, options);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
      
    case 'post': {
      const url = args[0];
      if (!url) {
        console.error('Usage: http post <url> [--data <json>] [--headers <json>]');
        process.exit(1);
      }
      
      const dataIdx = args.indexOf('--data');
      const headersIdx = args.indexOf('--headers');
      
      const options = {};
      if (dataIdx >= 0 && dataIdx + 1 < args.length) {
        try { options.data = JSON.parse(args[dataIdx + 1]); } catch { options.data = args[dataIdx + 1]; }
      }
      if (headersIdx >= 0 && headersIdx + 1 < args.length) {
        try { options.headers = JSON.parse(args[headersIdx + 1]); } catch {}
      }
      
      const result = await makeRequest('POST', url, options);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
      
    case 'put': {
      const url = args[0];
      if (!url) {
        console.error('Usage: http put <url> [--data <json>] [--headers <json>]');
        process.exit(1);
      }
      
      const dataIdx = args.indexOf('--data');
      const headersIdx = args.indexOf('--headers');
      
      const options = {};
      if (dataIdx >= 0 && dataIdx + 1 < args.length) {
        try { options.data = JSON.parse(args[dataIdx + 1]); } catch { options.data = args[dataIdx + 1]; }
      }
      if (headersIdx >= 0 && headersIdx + 1 < args.length) {
        try { options.headers = JSON.parse(args[headersIdx + 1]); } catch {}
      }
      
      const result = await makeRequest('PUT', url, options);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
      
    case 'delete': {
      const url = args[0];
      if (!url) {
        console.error('Usage: http delete <url> [--headers <json>]');
        process.exit(1);
      }
      
      const headersIdx = args.indexOf('--headers');
      const options = {};
      if (headersIdx >= 0 && headersIdx + 1 < args.length) {
        try { options.headers = JSON.parse(args[headersIdx + 1]); } catch {}
      }
      
      const result = await makeRequest('DELETE', url, options);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
      
    case 'rate-limit': {
      const domain = args[0];
      if (!domain) {
        console.error('Usage: http rate-limit <domain>');
        process.exit(1);
      }
      
      const info = checkRateLimit(domain.toLowerCase());
      console.log(JSON.stringify(info, null, 2));
      break;
    }
      
    case 'allowed': {
      console.log('Allowed domains:');
      for (const d of CONFIG.allowedDomains) {
        console.log(`  - ${d}`);
      }
      break;
    }
      
    case 'test': {
      const url = args[0];
      if (!url) {
        console.error('Usage: http test <url>');
        process.exit(1);
      }
      
      try {
        const result = await makeRequest('GET', url, { timeout: 10 });
        console.log('✓ Connection successful');
        console.log(JSON.stringify({ status: result.status, time_ms: result.time_ms }, null, 2));
      } catch (err) {
        console.error('✗ Connection failed:', err.message);
        process.exit(1);
      }
      break;
    }
      
    default:
      console.log(`Secure HTTP Client

Usage: http <command> [args...]

Commands:
  get <url> [--headers <json>] [--timeout <seconds>]
    Make a GET request
  post <url> [--data <json>] [--headers <json>]
    Make a POST request
  put <url> [--data <json>] [--headers <json>]
    Make a PUT request
  delete <url> [--headers <json>]
    Make a DELETE request
  rate-limit <domain>
    Check rate limit status for domain
  allowed
    List allowed domains
  test <url>
    Test connectivity to URL

Environment Variables:
  HTTP_ALLOWED_DOMAINS: Comma-separated domain allowlist
  HTTP_MAX_RESPONSE_SIZE: Max response bytes (default: 1MB)
  HTTP_TIMEOUT_SECS: Request timeout (default: 30)
  HTTP_RATE_LIMIT_PER_MINUTE: Rate limit (default: 60)
`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
