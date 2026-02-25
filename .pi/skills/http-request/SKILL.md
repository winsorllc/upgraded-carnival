---
name: http-request
description: "Make HTTP requests to external APIs. Use when: you need to fetch data from web services, POST to APIs, or integrate with external systems. NOT for: internal file operations or local network scanning."
metadata: { "openclaw": { "emoji": "🌐", "requires": { "bins": ["curl", "jq"] } } }
---

# HTTP Request Skill

Make HTTP GET, POST, PUT, DELETE requests to external APIs with authentication and headers.

## When to Use

✅ **USE this skill when:**

- Fetching data from REST APIs
- Sending webhooks
- Integrating with external services
- Testing API endpoints
- Downloading files from URLs

## When NOT to Use

❌ **DON'T use this skill when:**

- Internal file operations → use fs module
- Local network scanning → security risk
- Making requests to localhost/internal IPs → blocked for security
- Recursive API crawling → use rate limiting

## Security

This skill enforces:
- Only http:// and https:// URLs allowed
- Private/local IPs blocked (10.x, 192.168.x, 127.0.0.1, etc.)
- Configurable allowed domains whitelist
- Response size limits
- Request timeout protection

## Basic Usage

### GET Request

```bash
curl -s "https://api.example.com/data" \
  -H "Accept: application/json"
```

### GET with Query Params

```bash
curl -s "https://api.example.com/users?limit=10&offset=0" \
  -H "Accept: application/json"
```

### POST with JSON Body

```bash
curl -X POST "https://api.example.com/users" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'
```

### POST with Authentication

```bash
curl -X POST "https://api.example.com/data" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}'
```

### PUT Request

```bash
curl -X PUT "https://api.example.com/users/123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'
```

### DELETE Request

```bash
curl -X DELETE "https://api.example.com/users/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Node.js Implementation

```javascript
const https = require('https');
const http = require('http');
const { URL } = require('url');

const ALLOWED_DOMAINS = ['api.github.com', 'api.openai.com', 'api.example.com'];
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
const TIMEOUT_MS = 30000; // 30 seconds

function validateUrl(urlString) {
  try {
    const url = new URL(urlString);
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only http:// and https:// URLs allowed');
    }
    
    if (ALLOWED_DOMAINS.length > 0 && !ALLOWED_DOMAINS.includes(url.hostname)) {
      throw new Error(`Domain ${url.hostname} not in allowed list`);
    }
    
    // Block private IPs
    const host = url.hostname;
    if (host === 'localhost' || 
        host.startsWith('10.') || 
        host.startsWith('192.168.') || 
        host.startsWith('127.') ||
        host.startsWith('0.') ||
        host === 'internal' ||
        host.endsWith('.local') ||
        host.endsWith('.internal')) {
      throw new Error('Blocked: private/internal host');
    }
    
    return url;
  } catch (e) {
    throw new Error(`Invalid URL: ${e.message}`);
  }
}

async function httpRequest(url, options = {}) {
  const parsedUrl = validateUrl(url);
  
  return new Promise((resolve, reject) => {
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || TIMEOUT_MS
    };
    
    const req = client.request(reqOptions, (res) => {
      let data = '';
      let receivedSize = 0;
      
      res.on('data', chunk => {
        receivedSize += chunk.length;
        if (receivedSize > MAX_RESPONSE_SIZE) {
          req.destroy();
          reject(new Error(`Response exceeds max size of ${MAX_RESPONSE_SIZE} bytes`));
        }
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Try to parse as JSON
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: json
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      const bodyData = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
      req.write(bodyData);
    }
    
    req.end();
  });
}

// Convenience methods
async function get(url, headers = {}) {
  return httpRequest(url, { method: 'GET', headers });
}

async function post(url, data, headers = {}) {
  return httpRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: data
  });
}

async function put(url, data, headers = {}) {
  return httpRequest(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: data
  });
}

async function del(url, headers = {}) {
  return httpRequest(url, { method: 'DELETE', headers });
}

// Usage
const response = await get('https://api.github.com/users/octocat');
console.log(response.data);

const created = await post('https://api.example.com/users', {
  name: 'Alice',
  email: 'alice@example.com'
}, {
  'Authorization': 'Bearer token123'
});
console.log(created.data);
```

## Common API Patterns

### Pagination

```javascript
async function fetchAllPages(baseUrl) {
  let page = 1;
  let allResults = [];
  let hasMore = true;
  
  while (hasMore) {
    const response = await get(`${baseUrl}?page=${page}&per_page=100`);
    allResults = allResults.concat(response.data);
    hasMore = response.data.length === 100;
    page++;
  }
  
  return allResults;
}
```

### Retry with Exponential Backoff

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await get(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

### Rate Limiting

```javascript
class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.interval = 1000 / requestsPerSecond;
    this.lastRequest = 0;
  }
  
  async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.interval) {
      await new Promise(r => setTimeout(r, this.interval - elapsed));
    }
    this.lastRequest = Date.now();
  }
}

const limiter = new RateLimiter(5); // 5 requests/second
await limiter.throttle();
const data = await get('https://api.example.com/data');
```

## Error Handling

```javascript
async function safeRequest(url) {
  try {
    const response = await get(url);
    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Quick Response Templates

**Simple GET:**

```bash
curl -s "https://api.github.com/repos/owner/repo" | jq '.description'
```

**POST with auth:**

```bash
curl -X POST "https://api.openai.com/v1/chat/completions" \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}'
```

## Notes

- Always validate URLs before making requests
- Use appropriate timeouts
- Handle rate limits with backoff
- Log request/response for debugging
- Sanitize sensitive data in logs
