#!/usr/bin/env node

/**
 * Tunnel Manager - Agnostic tunnel management
 * Inspired by ZeroClaw's agnostic tunnel architecture
 */

import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TUNNEL_DIR = process.env.TUNNEL_DIR || path.join(os.homedir(), '.config', 'agent', 'tunnels');
const STATE_FILE = path.join(TUNNEL_DIR, 'state.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadState() {
  ensureDir(TUNNEL_DIR);
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return { tunnels: [] };
}

function saveState(state) {
  ensureDir(TUNNEL_DIR);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function runCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: true });
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', data => { stdout += data; });
    proc.stderr.on('data', data => { stderr += data; });
    
    proc.on('close', code => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
      } else {
        reject(new Error(`Command failed: ${stderr || stdout}`));
      }
    });
    
    proc.on('error', reject);
  });
}

function checkProviderCLI(provider) {
  const clis = {
    cloudflare: 'cloudflared',
    tailscale: 'tailscale',
    ngrok: 'ngrok'
  };
  
  const cli = clis[provider];
  if (!cli) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  
  try {
    const { execSync } = require('child_process');
    execSync(`which ${cli}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

async function cmdCreate(options) {
  const { provider, name, subdomain, domain } = options;
  
  if (!provider) {
    throw new Error('--provider is required');
  }
  
  const cliAvailable = checkProviderCLI(provider);
  if (!cliAvailable) {
    return {
      success: false,
      provider,
      message: `${provider} CLI not found. Please install the provider's CLI tool.`,
      installHint: getInstallHint(provider)
    };
  }
  
  const state = loadState();
  const tunnelId = `${provider}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const tunnelName = name || `tunnel-${Date.now()}`;
  
  const tunnel = {
    id: tunnelId,
    name: tunnelName,
    provider,
    subdomain,
    domain,
    status: 'created',
    createdAt: new Date().toISOString()
  };
  
  state.tunnels.push(tunnel);
  saveState(state);
  
  if (provider === 'cloudflare') {
    try {
      const result = await runCommand('cloudflared', ['tunnel', 'create', tunnelName]);
      // Extract tunnel UUID from output
      const uuidMatch = result.stdout.match(/([a-f0-9-]{36})/);
      if (uuidMatch) {
        tunnel.uuid = uuidMatch[1];
      }
    } catch (e) {
      // Tunnel might already exist, continue
    }
  }
  
  return {
    success: true,
    provider,
    tunnelId,
    name: tunnelName,
    status: 'created',
    message: `Tunnel created. Use 'start' to activate.`
  };
}

function getInstallHint(provider) {
  const hints = {
    cloudflare: 'Install: https://developers.cloudflare.com/cloudflare-one/infrastructure/tunnel/downloads/',
    tailscale: 'Install: https://tailscale.com/download/',
    ngrok: 'Install: https://ngrok.com/download'
  };
  return hints[provider] || 'See provider documentation.';
}

async function cmdList(options) {
  const state = loadState();
  
  return {
    tunnels: state.tunnels.map(t => ({
      id: t.id,
      name: t.name,
      provider: t.provider,
      status: t.status,
      url: t.url,
      createdAt: t.createdAt
    })),
    count: state.tunnels.length
  };
}

async function cmdStatus(options) {
  const { tunnelId } = options;
  
  if (!tunnelId) {
    throw new Error('--tunnel-id is required');
  }
  
  const state = loadState();
  const tunnel = state.tunnels.find(t => t.id === tunnelId);
  
  if (!tunnel) {
    return { success: false, message: 'Tunnel not found' };
  }
  
  // Check if tunnel process is still running
  if (tunnel.pid) {
    try {
      process.kill(tunnel.pid, 0);
      tunnel.status = 'running';
    } catch (e) {
      tunnel.status = 'stopped';
      tunnel.pid = null;
      saveState(state);
    }
  }
  
  return {
    tunnelId: tunnel.id,
    name: tunnel.name,
    provider: tunnel.provider,
    status: tunnel.status,
    url: tunnel.url,
    port: tunnel.port
  };
}

async function cmdStart(options) {
  const { provider, tunnelId, port = 3000, subdomain, domain } = options;
  
  if (!provider || !tunnelId) {
    throw new Error('--provider and --tunnel-id are required');
  }
  
  const state = loadState();
  const tunnel = state.tunnels.find(t => t.id === tunnelId);
  
  if (!tunnel) {
    return { success: false, message: 'Tunnel not found' };
  }
  
  if (tunnel.status === 'running') {
    return { success: false, message: 'Tunnel already running', url: tunnel.url };
  }
  
  let url = '';
  
  if (provider === 'cloudflare') {
    try {
      const args = ['tunnel', 'run'];
      if (tunnel.uuid) {
        args.push(tunnel.uuid);
      } else {
        args.push(tunnel.name);
      }
      args.push('--url', `http://localhost:${port}`);
      
      const proc = spawn('cloudflared', args, {
        detached: true,
        stdio: 'ignore'
      });
      
      proc.unref();
      tunnel.pid = proc.pid;
      tunnel.status = 'running';
      tunnel.port = port;
      
      // Generate URL (cloudflared outputs this)
      if (subdomain && domain) {
        url = `https://${subdomain}.${domain}`;
      } else {
        url = `https://${tunnel.name}.cloudflared.io`;
      }
      tunnel.url = url;
      
    } catch (e) {
      return { success: false, message: `Failed to start tunnel: ${e.message}` };
    }
  } else if (provider === 'tailscale') {
    try {
      // Tailscale serve
      await runCommand('tailscale', ['serve', 'tcp', port, '&']);
      url = `https://${tunnel.name}.tail-scale.ts.net`;
      tunnel.url = url;
      tunnel.status = 'running';
      tunnel.port = port;
    } catch (e) {
      return { success: false, message: `Failed to start tunnel: ${e.message}` };
    }
  } else if (provider === 'ngrok') {
    try {
      const proc = spawn('ngrok', ['tcp', port.toString()], {
        detached: true,
        stdio: 'ignore'
      });
      
      proc.unref();
      tunnel.pid = proc.pid;
      tunnel.status = 'running';
      tunnel.port = port;
      url = `ngrok.io (dynamic)`;
      tunnel.url = url;
    } catch (e) {
      return { success: false, message: `Failed to start tunnel: ${e.message}` };
    }
  }
  
  saveState(state);
  
  return {
    success: true,
    provider,
    tunnelId,
    status: 'running',
    port,
    url,
    message: `Tunnel started on port ${port}`
  };
}

async function cmdStop(options) {
  const { tunnelId } = options;
  
  if (!tunnelId) {
    throw new Error('--tunnel-id is required');
  }
  
  const state = loadState();
  const tunnel = state.tunnels.find(t => t.id === tunnelId);
  
  if (!tunnel) {
    return { success: false, message: 'Tunnel not found' };
  }
  
  if (tunnel.pid) {
    try {
      process.kill(tunnel.pid, 'SIGTERM');
    } catch (e) {
      // Process already gone
    }
  }
  
  if (tunnel.provider === 'tailscale') {
    try {
      await runCommand('tailscale', ['serve', 'off']);
    } catch (e) {
      // Ignore
    }
  }
  
  tunnel.status = 'stopped';
  tunnel.pid = null;
  tunnel.url = null;
  saveState(state);
  
  return {
    success: true,
    tunnelId,
    status: 'stopped'
  };
}

async function cmdDelete(options) {
  const { tunnelId } = options;
  
  if (!tunnelId) {
    throw new Error('--tunnel-id is required');
  }
  
  const state = loadState();
  const index = state.tunnels.findIndex(t => t.id === tunnelId);
  
  if (index === -1) {
    return { success: false, message: 'Tunnel not found' };
  }
  
  const tunnel = state.tunnels[index];
  
  // Stop if running
  if (tunnel.pid) {
    try {
      process.kill(tunnel.pid, 'SIGTERM');
    } catch (e) {
      // Ignore
    }
  }
  
  // Delete from provider
  if (tunnel.provider === 'cloudflare' && tunnel.uuid) {
    try {
      await runCommand('cloudflared', ['tunnel', 'delete', tunnel.uuid]);
    } catch (e) {
      // Ignore - might not exist
    }
  }
  
  state.tunnels.splice(index, 1);
  saveState(state);
  
  return {
    success: true,
    tunnelId,
    message: 'Tunnel deleted'
  };
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    if (command === 'create') {
      const options = {
        provider: getArgValue(args, '--provider'),
        name: getArgValue(args, '--name'),
        subdomain: getArgValue(args, '--subdomain'),
        domain: getArgValue(args, '--domain')
      };
      
      if (!options.provider) {
        console.error('Error: --provider is required');
        process.exit(1);
      }
      
      const result = await cmdCreate(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'list') {
      const result = await cmdList({});
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'status') {
      const options = {
        tunnelId: getArgValue(args, '--tunnel-id'),
        provider: getArgValue(args, '--provider')
      };
      
      if (!options.tunnelId) {
        console.error('Error: --tunnel-id is required');
        process.exit(1);
      }
      
      const result = await cmdStatus(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'start') {
      const options = {
        provider: getArgValue(args, '--provider'),
        tunnelId: getArgValue(args, '--tunnel-id'),
        port: parseInt(getArgValue(args, '--port') || '3000'),
        subdomain: getArgValue(args, '--subdomain'),
        domain: getArgValue(args, '--domain')
      };
      
      if (!options.provider || !options.tunnelId) {
        console.error('Error: --provider and --tunnel-id are required');
        process.exit(1);
      }
      
      const result = await cmdStart(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'stop') {
      const options = {
        tunnelId: getArgValue(args, '--tunnel-id')
      };
      
      if (!options.tunnelId) {
        console.error('Error: --tunnel-id is required');
        process.exit(1);
      }
      
      const result = await cmdStop(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'delete') {
      const options = {
        tunnelId: getArgValue(args, '--tunnel-id')
      };
      
      if (!options.tunnelId) {
        console.error('Error: --tunnel-id is required');
        process.exit(1);
      }
      
      const result = await cmdDelete(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else {
      console.log(`
Tunnel Manager - Agnostic tunnel management

Usage:
  tunnel-manager.js create --provider <provider> [options]
  tunnel-manager.js list
  tunnel-manager.js status --tunnel-id <id> [--provider <provider>]
  tunnel-manager.js start --provider <provider> --tunnel-id <id> [options]
  tunnel-manager.js stop --tunnel-id <id>
  tunnel-manager.js delete --tunnel-id <id>

Commands:
  create  Create a new tunnel
  list    List all tunnels
  status  Get tunnel status
  start   Start a tunnel
  stop    Stop a tunnel
  delete  Delete a tunnel

Providers:
  cloudflare  Cloudflare Tunnel
  tailscale   Tailscale
  ngrok       Ngrok

Examples:
  tunnel-manager.js create --provider cloudflare --name "my-tunnel"
  tunnel-manager.js list
  tunnel-manager.js start --provider cloudflare --tunnel-id "xxx" --port 3000
  tunnel-manager.js stop --tunnel-id "xxx"
  tunnel-manager.js delete --tunnel-id "xxx"
`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
}

main();
