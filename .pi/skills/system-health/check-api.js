#!/usr/bin/env node
/**
 * Check API connectivity for various providers
 * @module system-health/check-api
 */

import https from 'https';
import { URL } from 'url';

async function checkAPI(provider, apiKey) {
  const result = {
    provider,
    timestamp: new Date().toISOString(),
    status: 'unknown',
    responseTime: 0,
    authenticated: false,
    error: null
  };
  
  const startTime = Date.now();
  
  if (!apiKey || apiKey === 'sk-xxx' || apiKey.length < 10) {
    result.status = 'not_configured';
    result.error = 'API key not configured or invalid';
    result.responseTime = Date.now() - startTime;
    return result;
  }
  
  const endpoints = {
    anthropic: {
      url: 'https://api.anthropic.com/v1/models',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    },
    openai: {
      url: 'https://api.openai.com/v1/models',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    },
    google: {
      url: `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
      headers: {}
    },
    github: {
      url: 'https://api.github.com/user',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  };
  
  const endpoint = endpoints[provider];
  if (!endpoint) {
    result.status = 'unknown_provider';
    result.error = `Unknown provider: ${provider}`;
    result.responseTime = Date.now() - startTime;
    return result;
  }
  
  return new Promise((resolve) => {
    const parsedUrl = new URL(endpoint.url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: endpoint.headers,
      method: 'GET',
      timeout: 5000
    };
    
    const req = https.request(options, (res) => {
      const responseTime = Date.now() - startTime;
      result.responseTime = responseTime;
      
      if (res.statusCode === 200) {
        result.status = 'healthy';
        result.authenticated = true;
      } else if (res.statusCode === 401) {
        result.status = 'unauthorized';
        result.error = 'Invalid API key';
      } else if (res.statusCode === 403) {
        result.status = 'forbidden';
        result.error = 'API key lacks permissions';
      } else if (res.statusCode === 429) {
        result.status = 'rate_limited';
        result.error = 'Rate limit exceeded';
      } else {
        result.status = 'error';
        result.error = `HTTP ${res.statusCode}`;
      }
      
      res.resume();
      resolve(result);
    });
    
    req.on('error', (err) => {
      result.status = 'unreachable';
      result.error = err.message;
      result.responseTime = Date.now() - startTime;
      resolve(result);
    });
    
    req.on('timeout', () => {
      req.destroy();
      result.status = 'timeout';
      result.error = 'Request timed out';
      result.responseTime = Date.now() - startTime;
      resolve(result);
    });
    
    req.end();
  });
}

async function checkAPIs() {
  const providers = [
    { name: 'anthropic', env: 'ANTHROPIC_API_KEY' },
    { name: 'openai', env: 'OPENAI_API_KEY' },
    { name: 'google', env: 'GOOGLE_API_KEY' },
    { name: 'github', env: 'GH_TOKEN' }
  ];
  
  const results = [];
  
  for (const provider of providers) {
    const apiKey = process.env[provider.env];
    const result = await checkAPI(provider.name, apiKey);
    results.push(result);
  }
  
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--provider')) {
    const idx = args.indexOf('--provider');
    const provider = args[idx + 1];
    const envMap = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      google: 'GOOGLE_API_KEY',
      github: 'GH_TOKEN'
    };
    const apiKey = process.env[envMap[provider]];
    const result = await checkAPI(provider, apiKey);
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Check all configured APIs
    const results = await checkAPIs();
    const output = {
      timestamp: new Date().toISOString(),
      apis: results
    };
    console.log(JSON.stringify(output, null, 2));
  }
}

export { checkAPI, checkAPIs };

if (process.argv[1] && process.argv[1].endsWith('check-api.js')) {
  main();
}
