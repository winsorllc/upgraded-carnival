#!/usr/bin/env node

/**
 * Health Check - Monitor service health and uptime
 * 
 * Usage:
 *   health-check.js --url "https://api.example.com/health"
 *   health-check.js --host "localhost" --port 3000
 *   health-check.js --dns "example.com"
 *   health-check.js --system
 */

const https = require('https');
const http = require('http');
const dns = require('dns');
const os = require('os');
const { execSync } = require('child_process');
const { promisify } = require('util');

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);
const dnsResolveMx = promisify(dns.resolveMx);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  url: null,
  host: null,
  port: null,
  dns: null,
  system: false,
  timeout: 10
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  switch (arg) {
    case '--url':
      options.url = nextArg;
      i++;
      break;
    case '--host':
      options.host = nextArg;
      i++;
      break;
    case '--port':
      options.port = parseInt(nextArg);
      i++;
      break;
    case '--dns':
      options.dns = nextArg;
      i++;
      break;
    case '--system':
      options.system = true;
      break;
    case '--timeout':
      options.timeout = parseInt(nextArg);
      i++;
      break;
    case '--help':
    case '-h':
      console.log(`
Health Check - Monitor service health and uptime

Usage:
  health-check.js --url "https://api.example.com/health"
  health-check.js --host "localhost" --port 3000
  health-check.js --dns "example.com"
  health-check.js --system

Options:
  --url <url>        URL to check
  --host <host>     Hostname to check
  --port <port>     Port to check
  --dns <domain>    DNS name to resolve
  --system          Run system health check
  --timeout <sec>   Timeout in seconds (default: 10)

Examples:
  health-check.js --url "https://api.example.com/health"
  health-check.js --host "localhost" --port 3000
  health-check.js --system
      `.trim());
      process.exit(0);
  }
}

// Check HTTP/HTTPS endpoint
function checkUrl(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timeout = options.timeout * 1000;
    
    try {
      const parsedUrl = new URL(url);
      const lib = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = lib.get(url, { timeout }, (res) => {
        const responseTime = Date.now() - startTime;
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let sslInfo = null;
          if (parsedUrl.protocol === 'https:' && res.socket) {
            const cert = res.socket.getPeerCertificate();
            if (cert && cert.valid_to) {
              const expiryDate = new Date(cert.valid_to);
              const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
              sslInfo = {
                valid: daysUntilExpiry > 0,
                expires: cert.valid_to,
                daysUntilExpiry
              };
            }
          }
          
          resolve({
            status: res.statusCode >= 200 && res.statusCode < 400 ? 'pass' : 'fail',
            responseTime,
            statusCode: res.statusCode,
            ssl: sslInfo,
            contentLength: data.length
          });
        });
      });
      
      req.on('error', (err) => {
        resolve({
          status: 'fail',
          error: err.message,
          responseTime: Date.now() - startTime
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 'fail',
          error: 'Timeout',
          responseTime: Date.now() - startTime
        });
      });
    } catch (err) {
      resolve({
        status: 'fail',
        error: err.message,
        responseTime: Date.now() - startTime
      });
    }
  });
}

// Check port connectivity
function checkPort(host, port) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timeout = options.timeout * 1000;
    
    const socket = new (require('net').Socket)();
    
    socket.setTimeout(timeout);
    
    socket.connect(port, host, () => {
      const responseTime = Date.now() - startTime;
      socket.destroy();
      resolve({
        status: 'pass',
        responseTime,
        open: true
      });
    });
    
    socket.on('error', (err) => {
      const responseTime = Date.now() - startTime;
      socket.destroy();
      resolve({
        status: 'fail',
        error: err.message,
        responseTime,
        open: false
      });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        status: 'fail',
        error: 'Timeout',
        responseTime: Date.now() - startTime,
        open: false
      });
    });
  });
}

// Check DNS resolution
async function checkDns(domain) {
  const startTime = Date.now();
  const results = {
    a: null,
    aaaa: null,
    mx: null,
    resolutionTime: 0,
    status: 'fail'
  };
  
  try {
    // Resolve A records
    try {
      results.a = await dnsResolve4(domain);
    } catch (e) {
      // No A records
    }
    
    // Resolve AAAA records
    try {
      results.aaaa = await dnsResolve6(domain);
    } catch (e) {
      // No AAAA records
    }
    
    // Resolve MX records
    try {
      results.mx = await dnsResolveMx(domain);
    } catch (e) {
      // No MX records
    }
    
    results.resolutionTime = Date.now() - startTime;
    results.status = (results.a || results.aaaa || results.mx) ? 'pass' : 'fail';
  } catch (err) {
    results.error = err.message;
    results.resolutionTime = Date.now() - startTime;
  }
  
  return results;
}

// Check system resources
function checkSystem() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = (usedMem / totalMem) * 100;
  
  // Get load average (only available on Unix)
  let loadAvg = null;
  try {
    loadAvg = os.loadavg();
  } catch (e) {
    // Not available on Windows
  }
  
  // Get disk usage (Unix only)
  let diskUsage = null;
  try {
    const disk = execSync('df -h . 2>/dev/null | tail -1 | awk \'{print $5}\'', { encoding: 'utf-8' });
    diskUsage = disk.trim().replace('%', '');
  } catch (e) {
    // Not available or error
  }
  
  // CPU usage calculation
  let cpuUsage = 0;
  let idle = 0;
  cpus.forEach(cpu => {
    const total = Object.values(cpu.times).reduce((acc, t) => acc + t, 0);
    idle += cpu.times.idle;
    cpuUsage += ((total - idle) / total) * 100;
  });
  cpuUsage = cpuUsage / cpus.length;
  
  const checks = [];
  
  // Memory check
  checks.push({
    name: 'memory',
    status: memPercent < 90 ? 'pass' : 'fail',
    usage: `${memPercent.toFixed(1)}%`,
    used: formatBytes(usedMem),
    total: formatBytes(totalMem)
  });
  
  // Disk check
  if (diskUsage) {
    const diskPercent = parseInt(diskUsage);
    checks.push({
      name: 'disk',
      status: diskPercent < 90 ? 'pass' : 'fail',
      usage: `${diskUsage}%`
    });
  }
  
  // CPU check
  checks.push({
    name: 'cpu',
    status: cpuUsage < 90 ? 'pass' : 'fail',
    usage: `${cpuUsage.toFixed(1)}%`
  });
  
  // Load average (if available)
  if (loadAvg) {
    checks.push({
      name: 'load',
      status: loadAvg[0] < cpus.length * 2 ? 'pass' : 'fail',
      load: loadAvg.map(l => l.toFixed(2)),
      cores: cpus.length
    });
  }
  
  // Uptime
  const uptime = os.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  checks.push({
    name: 'uptime',
    status: 'pass',
    uptime: `${days}d ${hours}h ${minutes}m`,
    seconds: uptime
  });
  
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    checks
  };
}

// Format bytes to human readable
function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Main execution
async function main() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: []
  };
  
  try {
    if (options.url) {
      const result = await checkUrl(options.url);
      results.checks.push({
        name: options.url,
        type: 'http',
        ...result
      });
    }
    
    if (options.host && options.port) {
      const result = await checkPort(options.host, options.port);
      results.checks.push({
        name: `${options.host}:${options.port}`,
        type: 'port',
        ...result
      });
    }
    
    if (options.dns) {
      const result = await checkDns(options.dns);
      results.checks.push({
        name: options.dns,
        type: 'dns',
        ...result
      });
    }
    
    if (options.system) {
      const result = checkSystem();
      results.checks.push({
        name: 'system',
        type: 'system',
        ...result
      });
    }
    
    // Calculate overall status
    const allPassed = results.checks.every(c => c.status === 'pass');
    results.status = allPassed ? 'healthy' : 'unhealthy';
    results.summary = {
      passed: results.checks.filter(c => c.status === 'pass').length,
      failed: results.checks.filter(c => c.status === 'fail').length,
      total: results.checks.length
    };
    
    console.log(JSON.stringify(results, null, 2));
    
    if (!allPassed) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
