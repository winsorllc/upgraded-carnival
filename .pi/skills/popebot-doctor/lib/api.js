/**
 * API Connectivity Diagnostics
 * Check network and API endpoint health
 */

const https = require('https');
const http = require('http');

const API_ENDPOINTS = [
  { 
    name: 'github-api', 
    host: 'api.github.com', 
    path: '/rate_limit',
    headers: { 'User-Agent': 'PopeBot-Doctor/1.0' },
    required: true 
  },
  { 
    name: 'github-raw', 
    host: 'raw.githubusercontent.com', 
    path: '/',
    required: true 
  },
  { 
    name: 'anthropic-api', 
    host: 'api.anthropic.com', 
    path: '/',
    required: false,
    optional: true
  },
  { 
    name: 'openai-api', 
    host: 'api.openai.com', 
    path: '/',
    required: false,
    optional: true
  }
];

/**
 * Run API diagnostics
 * @returns {Promise<Array>} Diagnostic items
 */
async function run() {
  const results = [];
  
  // Basic connectivity
  results.push(await checkInternetConnectivity());
  
  // Check DNS resolution
  results.push(await checkDNSResolution());
  
  // Check API endpoints
  for (const endpoint of API_ENDPOINTS) {
    results.push(await checkEndpoint(endpoint));
  }
  
  // Check LLM API keys if available
  results.push(...checkLLMKeys());
  
  return results;
}

function checkInternetConnectivity() {
  return new Promise((resolve) => {
    const req = https.get('https://1.1.1.1', { timeout: 5000 }, (res) => {
      resolve({
        category: 'api',
        check: 'internet-connectivity',
        severity: 'ok',
        message: 'Internet connectivity available',
        details: 'Successfully reached 1.1.1.1'
      });
    });
    
    req.on('error', (err) => {
      resolve({
        category: 'api',
        check: 'internet-connectivity',
        severity: 'error',
        message: 'No internet connectivity',
        remediation: 'Check network connection',
        details: err.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        category: 'api',
        check: 'internet-connectivity',
        severity: 'error',
        message: 'Internet connectivity timeout',
        remediation: 'Check network connection'
      });
    });
  });
}

function checkDNSResolution() {
  return new Promise((resolve) => {
    const dns = require('dns');
    dns.lookup('github.com', (err) => {
      if (err) {
        resolve({
          category: 'api',
          check: 'dns-resolution',
          severity: 'error',
          message: 'DNS resolution failing',
          remediation: 'Check DNS configuration',
          details: err.message
        });
      } else {
        resolve({
          category: 'api',
          check: 'dns-resolution',
          severity: 'ok',
          message: 'DNS resolution working'
        });
      }
    });
  });
}

function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: endpoint.host,
      path: endpoint.path,
      method: 'HEAD',
      timeout: 10000,
      headers: endpoint.headers || {}
    };
    
    const client = options.hostname.includes(':443') ? https : https;
    
    const req = client.request(options, (res) => {
      const status = res.statusCode;
      
      if (status >= 200 && status < 500) {
        resolve({
          category: 'api',
          check: endpoint.name,
          severity: 'ok',
          message: `${endpoint.host} reachable (HTTP ${status})`
        });
      } else if (status === 403 || status === 401) {
        resolve({
          category: 'api',
          check: endpoint.name,
          severity: endpoint.required ? 'warning' : 'ok',
          message: `${endpoint.host} requires authentication (HTTP ${status})`,
          ...(endpoint.required ? {} : { details: 'This is expected for unauthenticated requests' })
        });
      } else {
        resolve({
          category: 'api',
          check: endpoint.name,
          severity: endpoint.optional ? 'warning' : 'error',
          message: `${endpoint.host} returned HTTP ${status}`,
          details: `May be rate limited or temporarily unavailable`
        });
      }
    });
    
    req.on('error', (err) => {
      resolve({
        category: 'api',
        check: endpoint.name,
        severity: endpoint.optional ? 'warning' : 'error',
        message: `Could not reach ${endpoint.host}`,
        remediation: endpoint.optional ? null : 'Check network and firewall settings',
        details: err.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        category: 'api',
        check: endpoint.name,
        severity: 'error',
        message: `${endpoint.host} connection timeout`,
        remedy: 'Check network connection'
      });
    });
    
    req.end();
  });
}

function checkLLMKeys() {
  const results = [];
  const keys = [
    { name: 'ANTHROPIC_API_KEY', provider: 'Anthropic', optional: false },
    { name: 'OPENAI_API_KEY', provider: 'OpenAI', optional: true },
    { name: 'GOOGLE_API_KEY', provider: 'Google', optional: true },
    { name: 'BRAVE_API_KEY', provider: 'Brave Search', optional: true }
  ];
  
  for (const key of keys) {
    const value = process.env[key.name];
    const isPresent = value && value.length > 0;
    
    results.push({
      category: 'api',
      check: `api-key-${key.name.toLowerCase()}`,
      severity: isPresent ? 'ok' : (key.optional ? 'warning' : 'error'),
      message: isPresent 
        ? `${key.provider} API key configured`
        : `${key.provider} API key not found (${key.name})`,
      ...(isPresent ? {} : { 
        remediation: key.optional 
          ? `Optional: Set ${key.name} for ${key.provider} features`
          : `Required: Set ${key.name} environment variable`
      })
    });
  }
  
  return results;
}

module.exports = { run };
