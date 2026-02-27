#!/usr/bin/env node

/**
 * SSH Tool - Execute commands on remote servers via SSH
 * 
 * Usage:
 *   ssh-tool.js --host <host> --user <user> --command <cmd>
 *   ssh-tool.js --host <host> --user <user> --key <key> --command <cmd>
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  host: null,
  user: null,
  command: null,
  key: null,
  password: null,
  port: 22,
  shell: false,
  timeout: 30
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  switch (arg) {
    case '--host':
      options.host = nextArg;
      i++;
      break;
    case '--user':
      options.user = nextArg;
      i++;
      break;
    case '--command':
      options.command = nextArg;
      i++;
      break;
    case '--key':
      options.key = nextArg;
      i++;
      break;
    case '--password':
      options.password = nextArg;
      i++;
      break;
    case '--port':
      options.port = parseInt(nextArg);
      i++;
      break;
    case '--shell':
      options.shell = true;
      break;
    case '--timeout':
      options.timeout = parseInt(nextArg);
      i++;
      break;
    case '--help':
    case '-h':
      console.log(`
SSH Tool - Execute commands on remote servers via SSH

Usage:
  ssh-tool.js --host <host> --user <user> --command <cmd>
  ssh-tool.js --host <host> --user <user> --key <key> --command <cmd>

Options:
  --host <host>      Remote hostname or IP (required)
  --user <user>      SSH username (required)
  --command <cmd>    Command to execute (required unless --shell)
  --key <path>       Path to SSH private key
  --password <pass>  SSH password
  --port <n>         SSH port (default: 22)
  --shell            Start interactive shell
  --timeout <n>      Command timeout in seconds (default: 30)

Examples:
  ssh-tool.js --host server.example.com --user ubuntu --command "ls -la"
  ssh-tool.js --host 192.168.1.100 --user admin --key ~/.ssh/id_rsa --command "uptime"
      `.trim());
      process.exit(0);
  }
}

// Validate required options
if (!options.host) {
  console.error('Error: --host is required');
  process.exit(1);
}

if (!options.user) {
  console.error('Error: --user is required');
  process.exit(1);
}

if (!options.command && !options.shell) {
  console.error('Error: Either --command or --shell is required');
  process.exit(1);
}

// Build SSH command arguments
function buildSSHArgs() {
  const args = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    '-o', 'ConnectTimeout=10',
    '-p', options.port.toString()
  ];
  
  if (options.key) {
    args.push('-i', options.key);
  }
  
  // Add password via SSH_ASKPASS if provided
  if (options.password) {
    // For non-interactive use, we'd need expect or similar
    // For now, just note that key-based auth is preferred
    console.warn('Warning: Password authentication requires interactive terminal');
  }
  
  const userHost = `${options.user}@${options.host}`;
  
  if (options.shell) {
    args.push(userHost);
  } else {
    args.push(userHost, options.command);
  }
  
  return args;
}

// Execute SSH command
function executeSSH() {
  return new Promise((resolve, reject) => {
    const sshArgs = buildSSHArgs();
    
    console.log(`Executing SSH: ssh ${sshArgs.join(' ')}`);
    
    const proc = spawn('ssh', sshArgs, {
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Command timed out after ${options.timeout} seconds`));
    }, options.timeout * 1000);
    
    proc.on('close', (code) => {
      clearTimeout(timeout);
      
      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: code === 0
      });
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Execute and output result
async function main() {
  try {
    if (options.shell) {
      console.log(`Starting interactive shell on ${options.user}@${options.host}...`);
      const args = buildSSHArgs();
      const proc = spawn('ssh', args, {
        stdio: 'inherit'
      });
      proc.on('close', (code) => {
        process.exit(code);
      });
    } else {
      const result = await executeSSH();
      
      if (result.stdout) {
        console.log(result.stdout);
      }
      
      if (!result.success && result.stderr) {
        console.error(result.stderr);
      }
      
      console.log(JSON.stringify({
        success: result.success,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }, null, 2));
      
      process.exit(result.exitCode);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
