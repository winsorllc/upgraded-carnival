#!/usr/bin/env node
/**
 * API Tester Skill - HTTP API testing and validation
 */

const http = require('http');
const https = require('https');
const URL = require('url');
const fs = require('fs');
const path = require('path');

async function makeRequest(method, url, options = {}) {
  const { headers = {}, body, timeout = 30000 } = options;
  const parsed = new URL.URL(url);
  const client = parsed.protocol === 'https:' ? https : http;
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: method.toUpperCase(),
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'PopeBot-API-Tester/1.0',
        ...headers
      },
      timeout
    };
    
    const req = client.request(requestOptions, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsedBody = responseBody;
        
        // Try to parse as JSON
        try {
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json') || responseBody.startsWith('{')) {
            parsedBody = JSON.parse(responseBody);
          }
        } catch (e) {
          // Keep as string
        }
        
        resolve({
          status: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: parsedBody,
          rawBody: responseBody,
          duration
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runRequest(method, url, options) {
  const { 
    headers = {}, 
    data, 
    token,
    expectStatus,
    expectHeader,
    verbose = false
  } = options;
  
  const requestHeaders = { ...headers };
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  let body = data;
  if (data && typeof data === 'string' && data.startsWith('{')) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
  }
  
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(method, url, { 
      headers: requestHeaders, 
      body,
      timeout: options.timeout || 30000
    });
    
    const result = {
      success: true,
      duration: response.duration,
      status: response.status,
      statusMessage: response.statusMessage,
      headers: response.headers,
      body: response.body
    };
    
    // Validation
    const errors = [];
    
    if (expectStatus !== undefined && response.status !== parseInt(expectStatus)) {
      errors.push(`Expected status ${expectStatus}, got ${response.status}`);
      result.success = false;
    }
    
    if (expectHeader) {
      const [headerName, headerValue] = expectHeader.split(':').map(s => s.trim().toLowerCase());
      const actualValue = response.headers[headerName.toLowerCase()];
      if (!actualValue || !actualValue.toLowerCase().includes(headerValue)) {
        errors.push(`Expected header "${expectHeader}", got "${actualValue}"`);
        result.success = false;
      }
    }
    
    if (errors.length > 0) {
      result.errors = errors;
    }
    
    if (verbose) {
      console.error('--- Request ---');
      console.error(`${method.toUpperCase()} ${url}`);
      console.error('Headers:', JSON.stringify(requestHeaders, null, 2));
      if (body) console.error('Body:', body);
      console.error('\n--- Response ---');
      console.error(`Status: ${response.status} ${response.statusMessage}`);
      console.error(`Duration: ${response.duration}ms`);
      console.error('Headers:', JSON.stringify(response.headers, null, 2));
      console.error('Body:', JSON.stringify(response.body, null, 2));
      console.error('--- End ---\n');
    }
    
    console.log(JSON.stringify(result, null, 2));
    return result.success ? 0 : 1;
    
  } catch (error) {
    const result = {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
    console.log(JSON.stringify(result, null, 2));
    return 1;
  }
}

async function runTestSuite(filePath) {
  let suite;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    suite = JSON.parse(content);
  } catch (e) {
    console.error(`Failed to load test suite: ${e.message}`);
    return 1;
  }
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  console.error(`\nRunning test suite: ${suite.name || 'Unknown'}\n`);
  
  for (const test of suite.tests || []) {
    const url = suite.baseUrl 
      ? `${suite.baseUrl}${test.path}` 
      : test.url;
    
    if (!url) {
      console.error(`Skipping test "${test.name}": no URL specified`);
      continue;
    }
    
    process.stderr.write(`  ${test.name}... `);
    
    const result = await runRequest(test.method || 'GET', url, {
      headers: { ...suite.defaults?.headers, ...test.headers },
      body: test.body,
      timeout: test.timeout || suite.defaults?.timeout || 30000,
      expectStatus: test.expect?.status,
      expectHeader: test.expect?.header
    });
    
    results.push(result);
    if (result === 0) {
      passed++;
      console.error('✓');
    } else {
      failed++;
      console.error('✗ Failed');
    }
  }
  
  console.error(`\nResults: ${passed} passed, ${failed} failed\n`);
  return failed > 0 ? 1 : 0;
}

// CLI
const [,, command, url, ...args] = process.argv;

async function main() {
  if (!command || command === '--help' || command === '-h') {
    console.log(`Usage: tester.js <command> [options]

Commands:
  get <url> [options]     Send GET request
  post <url> [options]    Send POST request
  put <url> [options]     Send PUT request
  delete <url> [options]  Send DELETE request
  patch <url> [options]   Send PATCH request
  run <file>             Run test suite from JSON file

Options:
  --data, -d            Request body (JSON string)
  --header, -H          Header (format: "Name: Value")
  --token, -t           Bearer token
  --timeout             Request timeout in ms (default: 30000)
  --expect-status        Expected HTTP status code
  --expect-header        Expected header (format: "Name: value")
  --verbose, -v         Print full request/response details

Examples:
  tester.js get https://api.github.com/user --token <gh-token>
  tester.js post https://api.example.com/users -d '{"name":"Test"}' --expect-status 201
  tester.js run ./tests/users.json`);
    return 0;
  }
  
  if (command === 'run') {
    if (!url) {
      console.error('Usage: tester.js run <test-suite-file.json>');
      return 1;
    }
    return await runTestSuite(url);
  }
  
  const methods = ['get', 'post', 'put', 'delete', 'patch'];
  if (!methods.includes(command)) {
    console.error(`Unknown command: ${command}`);
    return 1;
  }
  
  if (!url) {
    console.error(`Usage: tester.js ${command} <url> [options]`);
    return 1;
  }
  
  // Parse arguments
  const options = {
    headers: {},
    verbose: args.includes('--verbose') || args.includes('-v'),
    timeout: 30000
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if ((arg === '--data' || arg === '-d') && args[i + 1]) {
      options.data = args[++i];
    } else if ((arg === '--header' || arg === '-H') && args[i + 1]) {
      const [name, ...valueParts] = args[++i].split(':');
      if (name && valueParts.length > 0) {
        options.headers[name.trim()] = valueParts.join(':').trim();
      }
    } else if ((arg === '--token' || arg === '-t') && args[i + 1]) {
      options.token = args[++i];
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i]) || 30000;
    } else if (arg === '--expect-status' && args[i + 1]) {
      options.expectStatus = args[++i];
    } else if (arg === '--expect-header' && args[i + 1]) {
      options.expectHeader = args[++i];
    }
  }
  
  return await runRequest(command, url, options);
}

main().then(code => process.exit(code)).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
