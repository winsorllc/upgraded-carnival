#!/usr/bin/env node

/**
 * Webhook Tool - Create and manage webhooks
 * 
 * Usage:
 *   webhook-tool.js --listen --path /webhook/github --command "handle.sh"
 *   webhook-tool.js --test --url "https://example.com/webhook" --method POST --body '{}'
 *   webhook-tool.js --list
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// Storage
const WEBHOOK_DIR = process.env.WEBHOOK_DIR || path.join(process.env.HOME || '/tmp', '.webhooks');
const WEBHOOK_FILE = path.join(WEBHOOK_DIR, 'hooks.json');

// Ensure storage directory exists
function ensureDir() {
  if (!fs.existsSync(WEBHOOK_DIR)) {
    fs.mkdirSync(WEBHOOK_DIR, { recursive: true });
  }
  if (!fs.existsSync(WEBHOOK_FILE)) {
    fs.writeFileSync(WEBHOOK_FILE, JSON.stringify({ hooks: [] }, null, 2));
  }
}

// Load webhooks
function loadWebhooks() {
  ensureDir();
  const data = fs.readFileSync(WEBHOOK_FILE, 'utf-8');
  return JSON.parse(data).hooks;
}

// Save webhooks
function saveWebhooks(hooks) {
  ensureDir();
  fs.writeFileSync(WEBHOOK_FILE, JSON.stringify({ hooks }, null, 2));
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  listen: false,
  path: null,
  command: null,
  port: 8080,
  test: false,
  url: null,
  method: 'POST',
  body: null,
  headers: null,
  list: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  switch (arg) {
    case '--listen':
      options.listen = true;
      break;
    case '--path':
      options.path = nextArg;
      i++;
      break;
    case '--command':
      options.command = nextArg;
      i++;
      break;
    case '--port':
      options.port = parseInt(nextArg);
      i++;
      break;
    case '--test':
      options.test = true;
      break;
    case '--url':
      options.url = nextArg;
      i++;
      break;
    case '--method':
      options.method = nextArg;
      i++;
      break;
    case '--body':
      options.body = nextArg;
      i++;
      break;
    case '--headers':
      options.headers = nextArg;
      i++;
      break;
    case '--list':
      options.list = true;
      break;
    case '--help':
    case '-h':
      console.log(`
Webhook Tool - Create and manage webhooks

Usage:
  webhook-tool.js --listen --path /webhook/github --command "handle.sh"
  webhook-tool.js --test --url "https://example.com/webhook" --method POST
  webhook-tool.js --list

Options:
  --listen            Start webhook listener
  --path <path>      Webhook path
  --command <cmd>    Command to execute when triggered
  --port <n>         Port to listen on (default: 8080)
  --test             Test a webhook URL
  --url <url>        Webhook URL to test
  --method <method>  HTTP method (default: POST)
  --body <body>      Request body
  --headers <json>   Request headers as JSON
  --list             List registered webhooks

Examples:
  webhook-tool.js --listen --path /webhook/github --command "./handle-github.sh"
  webhook-tool.js --test --url "https://example.com/webhook" --body '{"event":"test"}'
      `.trim());
      process.exit(0);
  }
}

// Add a webhook
function addWebhook(webhookPath, command) {
  const hooks = loadWebhooks();
  
  // Check if path already exists
  if (hooks.find(h => h.path === webhookPath)) {
    return { success: false, error: `Webhook at ${webhookPath} already exists` };
  }
  
  const hook = {
    id: Date.now().toString(36),
    path: webhookPath,
    command,
    createdAt: new Date().toISOString(),
    triggerCount: 0
  };
  
  hooks.push(hook);
  saveWebhooks(hooks);
  
  return { success: true, webhook: hook };
}

// List webhooks
function listWebhooks() {
  const hooks = loadWebhooks();
  return {
    success: true,
    count: hooks.length,
    webhooks: hooks
  };
}

// Remove a webhook
function removeWebhook(webhookPath) {
  const hooks = loadWebhooks();
  const index = hooks.findIndex(h => h.path === webhookPath);
  
  if (index === -1) {
    return { success: false, error: `Webhook at ${webhookPath} not found` };
  }
  
  hooks.splice(index, 1);
  saveWebhooks(hooks);
  
  return { success: true, message: `Webhook at ${webhookPath} removed` };
}

// Start webhook listener server
function startListener(port) {
  ensureDir();
  const hooks = loadWebhooks();
  
  // Create URL to handler mapping
  const handlers = {};
  hooks.forEach(hook => {
    handlers[hook.path] = hook;
  });
  
  const server = http.createServer(async (req, res) => {
    const pathname = req.url.split('?')[0];
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);
    
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Check if webhook exists
    const hook = handlers[pathname];
    
    if (!hook) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Webhook not found' }));
      return;
    }
    
    // Get request body
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      // Update trigger count
      hook.triggerCount++;
      saveWebhooks(hooks);
      
      // Parse body if JSON
      let parsedBody = body;
      try {
        parsedBody = JSON.parse(body);
      } catch (e) {
        // Not JSON
      }
      
      // Execute command
      let result;
      try {
        // Pass body to command via stdin or environment
        const child = spawn(hook.command, [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            WEBHOOK_BODY: body,
            WEBHOOK_METHOD: req.method,
            WEBHOOK_PATH: pathname,
            WEBHOOK_HEADERS: JSON.stringify(req.headers)
          }
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', data => stdout += data.toString());
        child.stderr.on('data', data => stderr += data.toString());
        
        // Wait for process with timeout
        result = await new Promise((resolve) => {
          setTimeout(() => {
            child.kill();
            resolve({ timedOut: true });
          }, 30000);
          
          child.on('close', (code) => {
            resolve({
              code,
              stdout: stdout.trim(),
              stderr: stderr.trim()
            });
          });
        });
      } catch (e) {
        result = { error: e.message };
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        webhook: hook.path,
        result
      }, null, 2));
    });
  });
  
  server.listen(port, () => {
    console.log(`Webhook listener running on port ${port}`);
    console.log(`Registered webhooks:`);
    hooks.forEach(hook => {
      console.log(`  ${hook.path} -> ${hook.command}`);
    });
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down webhook listener...');
    server.close(() => {
      process.exit(0);
    });
  });
}

// Test a webhook URL
function testWebhook(testUrl, method, body, headers) {
  return new Promise((resolve) => {
    const url = new URL(testUrl);
    const lib = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    const req = lib.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(responseBody);
        } catch (e) {
          parsed = responseBody;
        }
        
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          response: parsed
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });
    
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

// Main execution
async function main() {
  try {
    if (options.listen) {
      if (!options.path || !options.command) {
        console.error('Error: --path and --command are required for --listen');
        process.exit(1);
      }
      
      // Add webhook first
      const added = addWebhook(options.path, options.command);
      console.log(JSON.stringify(added, null, 2));
      
      // Then start listener
      startListener(options.port);
    } else if (options.test) {
      if (!options.url) {
        console.error('Error: --url is required for --test');
        process.exit(1);
      }
      
      let parsedBody = null;
      if (options.body) {
        try {
          parsedBody = JSON.parse(options.body);
        } catch (e) {
          parsedBody = options.body;
        }
      }
      
      let parsedHeaders = {};
      if (options.headers) {
        try {
          parsedHeaders = JSON.parse(options.headers);
        } catch (e) {
          // Not JSON
        }
      }
      
      const result = await testWebhook(options.url, options.method, options.body, parsedHeaders);
      console.log(JSON.stringify(result, null, 2));
    } else if (options.list) {
      console.log(JSON.stringify(listWebhooks(), null, 2));
    } else {
      console.log('Use --help for usage information');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
