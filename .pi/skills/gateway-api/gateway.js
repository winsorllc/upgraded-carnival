#!/usr/bin/env node
const http = require('http');
const url = require('url');

const PORT = process.argv.find((_, i) => process.argv[i-1] === '--port') || 8765;

const routes = [
  { path: '/health', type: 'internal', action: 'health' },
  { path: '/status', type: 'internal', action: 'status' }
];

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  
  res.setHeader('Content-Type', 'application/json');
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health endpoint
  if (parsed.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    return;
  }
  
  // Status endpoint
  if (parsed.pathname === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify({
      routes: routes.length,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }));
    return;
  }
  
  // Default
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found', path: parsed.pathname }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🌐 Gateway running on http://127.0.0.1:${PORT}`);
  console.log(`   Health: http://127.0.0.1:${PORT}/health`);
  console.log(`   Status: http://127.0.0.1:${PORT}/status`);
});

module.exports = { server, routes };
