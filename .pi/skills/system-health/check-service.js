#!/usr/bin/env node
/**
 * Check service/endpoint health
 * @module system-health/check-service
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

function checkService(urlStr, timeout = 5000) {
  return new Promise((resolve) => {
    const result = {
      url: urlStr,
      timestamp: new Date().toISOString(),
      status: 'unknown',
      responseTime: 0,
      statusCode: 0,
      error: null
    };
    
    const startTime = Date.now();
    
    try {
      const parsedUrl = new URL(urlStr);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.get(urlStr, { timeout }, (res) => {
        const responseTime = Date.now() - startTime;
        result.responseTime = responseTime;
        result.statusCode = res.statusCode;
        
        // Determine health status
        if (res.statusCode >= 200 && res.statusCode < 300) {
          result.status = 'healthy';
        } else if (res.statusCode >= 300 && res.statusCode < 400) {
          result.status = 'redirect';
        } else if (res.statusCode >= 400 && res.statusCode < 500) {
          result.status = 'client_error';
        } else {
          result.status = 'server_error';
        }
        
        // Consume response to free memory
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
        result.error = `Request timed out after ${timeout}ms`;
        result.responseTime = Date.now() - startTime;
        resolve(result);
      });
      
    } catch (err) {
      result.status = 'error';
      result.error = err.message;
      result.responseTime = Date.now() - startTime;
      resolve(result);
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  let url = null;
  let timeout = 5000;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      url = args[i + 1];
      i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
      timeout = parseInt(args[i + 1], 10);
      i++;
    }
  }
  
  if (!url) {
    console.error('Usage: node check-service.js --url <URL> [--timeout <ms>]');
    console.error('Example: node check-service.js --url https://api.example.com/health');
    process.exit(1);
  }
  
  const result = await checkService(url, timeout);
  console.log(JSON.stringify(result, null, 2));
}

export { checkService };

if (process.argv[1] && process.argv[1].endsWith('check-service.js')) {
  main();
}
