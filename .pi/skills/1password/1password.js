#!/usr/bin/env node

/**
 * 1Password CLI Wrapper
 * 
 * Note: Requires 1Password CLI (op) to be installed
 * Download: https://1password.com/downloads/command-line/
 */

const { execSync, spawn } = require('child_process');
const args = process.argv.slice(2);

const command = args[0];

// Check if op is available
function checkOp() {
  try {
    execSync('op --version', { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

async function run() {
  if (!checkOp()) {
    console.error('Error: 1Password CLI (op) not found');
    console.error('Install: https://1password.com/downloads/command-line/');
    process.exit(1);
  }
  
  if (!command) {
    showHelp();
    return;
  }
  
  switch (command) {
    case 'list':
    case 'ls':
      execSync('op vault list', { stdio: 'inherit' });
      break;
    
    case 'items':
      const vault = args[1] || 'Private';
      execSync(`op item list --vault "${vault}"`, { stdio: 'inherit' });
      break;
    
    case 'get':
      if (!args[1]) {
        console.error('Usage: 1password get <item-name-or-id> [--field <field>]');
        process.exit(1);
      }
      const itemId = args[1];
      const field = args.includes('--field') ? args[args.indexOf('--field') + 1] : null;
      
      if (field) {
        execSync(`op item get "${itemId}" --field ${field}`, { stdio: 'inherit' });
      } else {
        execSync(`op item get "${itemId}"`, { stdio: 'inherit' });
      }
      break;
    
    case 'whoami':
      execSync('op whoami', { stdio: 'inherit' });
      break;
    
    case 'signin':
      execSync('op signin', { stdio: 'inherit' });
      break;
    
    case 'version':
    case '--version':
    case '-v':
      execSync('op --version', { stdio: 'inherit' });
      break;
    
    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
  }
}

function showHelp() {
  console.log(`
1Password CLI Wrapper

Usage:
  1password list                    List vaults
  1password items [vault]          List items in vault
  1password get <item>             Get item details
  1password get <item> --field password  Get password
  1password whoami                  Show current user
  1password signin                  Sign in to 1Password

Notes:
  - Requires 1Password CLI (op) to be installed
  - Must be signed in to use these commands
  - Use 'op' directly for advanced operations

Install:
  macOS: brew install 1password-cli
  Linux: see https://1password.com/downloads/command-line/
`);
}

run();
