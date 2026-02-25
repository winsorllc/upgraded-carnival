#!/usr/bin/env node
/**
 * Webhook Server - Lightweight HTTP webhook receiver
 * Inspired by ZeroClaw Gateway and OpenClaw webhook triggers
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CONFIG_PATH = '/tmp/webhook-config.json';
const LOG_PATH = '/tmp/webhook-logs.jsonl';

// Parse CLI args
const args = process.argv.slice(2);
const PORT = parseInt(args.find((_, i) => args[i-1] === '--port') || args.find((_, i) => args[i-1] === '-p') || '3456');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

let config = { endpoints: [], actions: {} };

// Load config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      log('verbose', `Loaded config from ${CONFIG_PATH}`);
    }
  } catch (err) {
    log('error', `Failed to load config: ${err.message}`);
  }
}

// Logging
function log(level, message, data = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  };
  
  if (VERBOSE || level === 'error') {
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'info' ? 'ℹ️' : '🐛';
    console.log(`${prefix} ${message}`);
    if (data) console.log('   Data:', typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  }
  
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
}

// Webhook logging
function logWebhook(req, body, status, error = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: { ...req.headers, authorization: undefined, 'x-secret': undefined },
    body: typeof body === 'string' ? (body.length > 1000 ? body.slice(0, 1000) + '...' : body) : body,
    status,
    error
  };
  
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
}

// Verify HMAC signature
function verifySignature(body, signature, secret) {
  if (!signature || !secret) return !secret; // Pass if no secret configured
  const expected = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  const provided = signature.replace('sha256=', '');
  // Ensure same length for timingSafeEqual
  if (expected.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

// Parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve(body);
      }
    });
    req.on('error', reject);
  });
}

// Execute action
async function executeAction(action, payload, headers) {
  switch (action.type) {
    case 'log':
      log('info', 'Webhook logged', payload);
      return { success: true, action: 'log' };
      
    case 'exec':
      return new Promise((resolve) => {
        const env = { ...process.env, WEBHOOK_PAYLOAD: JSON.stringify(payload) };
        const child = spawn('bash', ['-c', action.command], { env, stdio: 'pipe' });
        let stdout = '', stderr = '';
        child.stdout.on('data', d => stdout += d);
        child.stderr.on('data', d => stderr += d);
        child.on('close', code => {
          resolve({ success: code === 0, action: 'exec', code, stdout, stderr });
        });
      });
      
    case 'forward':
      try {
        const httpModule = action.url?.startsWith('https:') ? require('https') : require('http');
        await new Promise((resolve, reject) => {
          const req = httpModule.request(action.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(action.headers || {})
            }
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ success: res.statusCode < 400, status: res.statusCode, body: data }));
          });
          req.on('error', reject);
          req.write(JSON.stringify(payload));
          req.end();
        });
        return { success: true, action: 'forward', to: action.url };
      } catch (err) {
        return { success: false, action: 'forward', error: err.message };
      }
      
    default:
      return { success: false, error: `Unknown action type: ${action.type}` };
  }
}

// Process webhook
async function processWebhook(req, res, endpoint) {
  const body = await parseBody(req);
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
  
  // Verify signature if configured
  const signature = req.headers['x-hub-signature-256'] || req.headers['x-signature'];
  if (endpoint.secret && !verifySignature(rawBody, signature, endpoint.secret)) {
    log('warn', `Invalid signature for ${req.url}`);
    logWebhook(req, body, 401, 'Invalid signature');
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid signature' }));
    return;
  }
  
  log('info', `Processing webhook: ${req.url}`, { endpoint: endpoint.path });
  
  const results = [];
  
  // Execute configured actions
  if (endpoint.actions) {
    for (const action of endpoint.actions) {
      const result = await executeAction(action, body, req.headers);
      results.push(result);
      log('verbose', `Action executed: ${action.type}`, result);
    }
  }
  
  // Forward if configured
  if (endpoint.forward) {
    const result = await executeAction({ type: 'forward', url: endpoint.forward, headers: endpoint.forwardHeaders }, body, req.headers);
    results.push(result);
  }
  
  const response = {
    success: true,
    timestamp: new Date().toISOString(),
    processed_at: req.url,
    results
  };
  
  logWebhook(req, body, 200);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response));
}

// Request handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check
  if (parsedUrl.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    return;
  }
  
  // Status endpoint
  if (parsedUrl.pathname === '/status' && req.method === 'GET') {
    const recent = getRecentLogs(10);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      port: PORT,
      endpoints: config.endpoints.map(e => e.path),
      recent_webhooks: recent,
      uptime: process.uptime()
    }));
    return;
  }
  
  // Find matching endpoint
  const endpoint = config.endpoints.find(e => e.path === parsedUrl.pathname || parsedUrl.pathname.startsWith(e.path + '/'));
  
  if (!endpoint) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
    return;
  }
  
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  
  try {
    await processWebhook(req, res, endpoint);
  } catch (err) {
    log('error', `Webhook processing failed: ${err.message}`, err.stack);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal error' }));
  }
});

// Get recent logs
function getRecentLogs(count = 10) {
  try {
    if (!fs.existsSync(LOG_PATH)) return [];
    const lines = fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-count).map(line => {
      try { return JSON.parse(line); } catch { return line; }
    });
  } catch {
    return [];
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('info', 'Shutting down webhook server...');
  server.close(() => {
    process.exit(0);
  });
});

// Start server
loadConfig();
server.listen(PORT, '127.0.0.1', () => {
  log('info', `🌐 Webhook server running on http://127.0.0.1:${PORT}`);
  log('info', `Health: http://127.0.0.1:${PORT}/health`);
  log('info', `Status: http://127.0.0.1:${PORT}/status`);
  
  if (config.endpoints.length === 0) {
    log('warn', 'No endpoints configured. Create config at:', CONFIG_PATH);
    // Create default config
    const defaultConfig = {
      endpoints: [
        {
          path: '/webhook/generic',
          actions: [{ type: 'log' }]
        }
      ]
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    log('info', 'Created default config', defaultConfig);
    config = defaultConfig;
  }
  
  config.endpoints.forEach(e => {
    log('info', `📡 Endpoint: ${e.path}${e.secret ? ' (auth enabled)' : ''}${e.forward ? ` → ${e.forward}` : ''}`);
  });
});

module.exports = { server, loadConfig, verifySignature };