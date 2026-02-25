#!/usr/bin/env node
/**
 * Network Tool - Network diagnostics
 */

const { exec } = require('child_process');
const net = require('net');
const https = require('https');

function execPromise(command, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout }, (error, stdout, stderr) => {
      if (error && error.code !== 0) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function ping(host, count = 3) {
  const startTime = Date.now();
  
  try {
    const cmd = process.platform === 'win32' 
      ? `ping -n ${count} ${host}`
      : `ping -c ${count} ${host}`;
    
    const { stdout } = await execPromise(cmd, 30000);
    
    // Parse ping output
    const lines = stdout.split('\n');
    let sent = count, received = 0;
    let time_match;
    
    if (process.platform === 'win32') {
      const stats = lines.find(l => l.includes('Received'));
      if (stats) {
        const match = stats.match(/Received = (\d+)/);
        if (match) received = parseInt(match[1]);
      }
      const timeLine = lines.find(l => l.includes('Minimum'));
      if (timeLine) {
        time_match = timeLine.match(/Average = (\d+)ms/);
      }
    } else {
      const stats = lines.find(l => l.includes('packets transmitted'));
      if (stats) {
        const match = stats.match(/(\d+) received/);
        if (match) received = parseInt(match[1]);
      }
      const timeLine = lines.find(l => l.includes('min/avg/max'));
      if (timeLine) {
        time_match = timeLine.match(/= [\d.]+\/([\d.]+)\//);
      }
    }
    
    return {
      host,
      status: received > 0 ? 'reachable' : 'unreachable',
      time_ms: time_match ? parseFloat(time_match[1]) : null,
      packets_sent: sent,
      packets_received: received,
      packet_loss: ((sent - received) / sent * 100).toFixed(1),
      duration_ms: Date.now() - startTime
    };
  } catch (e) {
    return {
      host,
      status: 'failed',
      error: e.error?.message || 'Ping command failed',
      packets_sent: count,
      packets_received: 0,
      packet_loss: 100
    };
  }
}

async function dnsLookup(domain, types = ['A']) {
  const results = [];
  const {resolve4, resolve6, resolveMx, resolveTxt} = require('dns').promises;
  
  for (const type of types) {
    try {
      switch (type.toUpperCase()) {
        case 'A':
          const ipv4 = await resolve4(domain);
          results.push(...ipv4.map(ip => ({ type: 'A', value: ip })));
          break;
        case 'AAAA':
          const ipv6 = await resolve6(domain);
          results.push(...ipv6.map(ip => ({ type: 'AAAA', value: ip })));
          break;
        case 'MX':
          const mx = await resolveMx(domain);
          results.push(...mx.map(r => ({ type: 'MX', value: `${r.priority} ${r.exchange}` })));
          break;
        case 'TXT':
          const txt = await resolveTxt(domain);
          results.push(...txt.map(r => ({ type: 'TXT', value: r.join('') })));
          break;
      }
    } catch (e) {
      // Skip records that fail
    }
  }
  
  return {
    domain,
    records: results,
    count: results.length
  };
}

async function checkPort(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    
    const cleanup = () => {
      try { socket.destroy(); } catch (e) {}
    };
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      cleanup();
      resolve({
        host,
        port,
        open: true,
        response_time_ms: Date.now() - startTime
      });
    });
    
    socket.on('timeout', () => {
      cleanup();
      resolve({
        host,
        port,
        open: false,
        error: 'Connection timeout'
      });
    });
    
    socket.on('error', (err) => {
      cleanup();
      resolve({
        host,
        port,
        open: false,
        error: err.code || err.message
      });
    });
    
    socket.connect(port, host);
  });
}

async function getPublicIp() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.ipify.org',
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 5000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          public_ip: data.trim(),
          source: 'api.ipify.org'
        });
      });
    });
    
    req.on('error', () => {
      resolve({ error: 'Could not determine public IP' });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'Request timeout' });
    });
    
    req.end();
  });
}

async function checkHttp(url, timeout = 10000) {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : require('http');
    
    const options = new URL(url);
    options.timeout = timeout;
    
    const req = client.request(options, (res) => {
      resolve({
        url,
        status: res.statusCode,
        status_text: res.statusMessage,
        headers: res.headers,
        response_time_ms: Date.now() - startTime,
        success: res.statusCode >= 200 && res.statusCode < 400
      });
    });
    
    req.on('error', (err) => {
      resolve({
        url,
        error: err.message,
        response_time_ms: Date.now() - startTime,
        success: false
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        error: 'Request timeout',
        response_time_ms: Date.now() - startTime,
        success: false
      });
    });
    
    req.end();
  });
}

function getLocalIp() {
  const interfaces = require('os').networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          address: iface.address,
          netmask: iface.netmask,
          mac: iface.mac
        });
      }
    }
  }
  
  return addresses;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Network Tool - Network diagnostics');
    console.log('');
    console.log('Usage: network.js <command> [args]');
    console.log('');
    console.log('Commands:');
    console.log('  ping <host>              Ping a host');
    console.log('  dns <domain>            DNS lookup');
    console.log('  port <host> <port>      Check if port is open');
    console.log('  ip                       Show IP information');
    console.log('  http <url>              HTTP status check');
    console.log('');
    console.log('Options:');
    console.log('  --type <type>           DNS record type (A, AAAA, MX, TXT)');
    console.log('  --timeout <seconds>      Connection timeout');
    console.log('  --count <n>             Ping count');
    console.log('  --public                 Show public IP');
    console.log('');
    console.log('Examples:');
    console.log('  network.js ping google.com');
    console.log('  network.js dns github.com --type A --type MX');
    console.log('  network.js port localhost 3000');
    console.log('  network.js ip --public');
    process.exit(1);
  }
  
  const command = args[0];
  
  switch (command) {
    case 'ping': {
      const host = args[1];
      const countArg = args.indexOf('--count');
      const count = countArg > -1 ? parseInt(args[countArg + 1]) : 3;
      
      if (!host) {
        console.log(JSON.stringify({ error: 'Host required' }, null, 2));
        process.exit(1);
      }
      
      const result = await ping(host, count);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === 'reachable' ? 0 : 1);
    }
    
    case 'dns': {
      const domain = args[1];
      if (!domain) {
        console.log(JSON.stringify({ error: 'Domain required' }, null, 2));
        process.exit(1);
      }
      
      const types = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--type' && args[i + 1]) {
          types.push(args[i + 1]);
        }
      }
      
      const result = await dnsLookup(domain, types.length > 0 ? types : ['A']);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }
    
    case 'port': {
      const host = args[1];
      const port = parseInt(args[2]);
      const timeoutArg = args.indexOf('--timeout');
      const timeout = timeoutArg > -1 ? parseInt(args[timeoutArg + 1]) * 1000 : 5000;
      
      if (!host || !port) {
        console.log(JSON.stringify({ error: 'Host and port required' }, null, 2));
        process.exit(1);
      }
      
      const result = await checkPort(host, port, timeout);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.open ? 0 : 1);
    }
    
    case 'ip': {
      const result = {
        local: getLocalIp()
      };
      
      if (args.includes('--public')) {
        result.public = await getPublicIp();
      }
      
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }
    
    case 'http': {
      const url = args[1];
      const timeoutArg = args.indexOf('--timeout');
      const timeout = timeoutArg > -1 ? parseInt(args[timeoutArg + 1]) * 1000 : 10000;
      
      if (!url) {
        console.log(JSON.stringify({ error: 'URL required' }, null, 2));
        process.exit(1);
      }
      
      const result = await checkHttp(url, timeout);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    }
    
    default:
      console.log(JSON.stringify({ error: `Unknown command: ${command}` }, null, 2));
      process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});