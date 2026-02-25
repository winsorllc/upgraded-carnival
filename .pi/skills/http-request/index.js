const https = require('https');
const http = require('http');
const { URL } = require('url');

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT = 30000;

function validateUrl(urlString) {
  try {
    const url = new URL(urlString);
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only http:// and https:// URLs allowed');
    }
    
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || 
        host.startsWith('10.') || 
        host.startsWith('192.168.') || 
        host.startsWith('127.') ||
        host.startsWith('0.') ||
        host.endsWith('.local') ||
        host.endsWith('.internal') ||
        host === 'internal') {
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
      timeout: options.timeout || DEFAULT_TIMEOUT
    };
    
    const req = client.request(reqOptions, (res) => {
      let data = '';
      let receivedSize = 0;
      
      res.on('data', chunk => {
        receivedSize += chunk.length;
        if (receivedSize > MAX_RESPONSE_SIZE) {
          req.destroy();
          reject(new Error(`Response exceeds max size`));
        }
        data += chunk;
      });
      
      res.on('end', () => {
        try {
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

// Retry with exponential backoff
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await httpRequest(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const url = args[1];

  if (!command || !url) {
    console.log('Usage: node index.js <method> <url> [options]');
    console.log('Methods: get, post, put, delete');
    console.log('Examples:');
    console.log('  node index.js get https://api.github.com/users/octocat');
    console.log('  node index.js post https://httpbin.org/post --body \'{"test":true}\'');
    process.exit(1);
  }

  try {
    let response;
    let headers = {};
    let body = null;
    
    // Parse additional args
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--header' && args[i + 1]) {
        const [key, value] = args[++i].split(':');
        headers[key] = value.trim();
      } else if (args[i] === '--body' && args[i + 1]) {
        body = args[++i];
      }
    }

    switch (command.toLowerCase()) {
      case 'get':
        response = await get(url, headers);
        break;
      case 'post':
        response = await post(url, body ? JSON.parse(body) : {}, headers);
        break;
      case 'put':
        response = await put(url, body ? JSON.parse(body) : {}, headers);
        break;
      case 'delete':
        response = await del(url, headers);
        break;
      default:
        console.error('Unknown method:', command);
        process.exit(1);
    }

    console.log(`Status: ${response.status}`);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('\nData:');
    console.log(typeof response.data === 'object' 
      ? JSON.stringify(response.data, null, 2) 
      : response.data);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  httpRequest,
  get,
  post,
  put,
  del,
  fetchWithRetry
};
