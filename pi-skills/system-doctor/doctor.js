#!/usr/bin/env node
/**
 * System Doctor - Health diagnostics tool
 * Inspired by zeroclaw doctor and openclaw doctor
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const check = colors.green + '✓' + colors.reset;
const warn = colors.yellow + '!' + colors.reset;
const fail = colors.red + '✗' + colors.reset;

// Parse arguments
const args = process.argv.slice(2);
const specificCheck = args[0]?.replace('--', '');

const results = [];

function printHeader() {
  console.log(colors.cyan + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║' + colors.bold + '           System Doctor Diagnostic Report              ' + colors.reset + colors.cyan + '║' + colors.reset);
  console.log(colors.cyan + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  console.log();
}

function section(title) {
  console.log(colors.cyan + '─'.repeat(60) + colors.reset);
  console.log(colors.bold + title + colors.reset);
  console.log(colors.cyan + '─'.repeat(60) + colors.reset);
}

function runCheck(name, func) {
  try {
    return func();
  } catch (error) {
    results.push({ name, status: 'error', message: error.message });
    console.log(`  ${fail} ${name}: ${error.message}`);
    return false;
  }
}

// Check disk space
function checkDisk() {
  try {
    const df = execSync('df -h / 2>/dev/null | tail -1', { encoding: 'utf8' }).trim();
    const parts = df.split(/\s+/);
    const used = parts[4];
    const usedNum = parseInt(used);
    const size = parts[1];
    const available = parts[3];
    
    let status = 'ok';
    if (usedNum > 90) status = 'critical';
    else if (usedNum > 80) status = 'warning';
    
    results.push({ name: 'Disk Space', status, message: `${used} used (${available} free of ${size})` });
    
    const icon = status === 'ok' ? check : warn;
    console.log(`  ${icon} Disk Space   ${used} used (${available} free of ${size})`);
    return status === 'ok';
  } catch (e) {
    results.push({ name: 'Disk Space', status: 'error', message: 'Could not check disk' });
    console.log(`  ${fail} Disk Space   Could not check`);
    return false;
  }
}

// Check memory
function checkMemory() {
  try {
    const mem = execSync('free -m 2>/dev/null | grep -E "^Mem:"', { encoding: 'utf8' }).trim();
    const parts = mem.split(/\s+/);
    const total = parseInt(parts[1]);
    const used = parseInt(parts[2]);
    const available = parseInt(parts[6]);
    const percent = Math.round((used / total) * 100);
    
    let status = 'ok';
    if (percent > 90) status = 'critical';
    else if (percent > 80) status = 'warning';
    
    results.push({ name: 'Memory', status, message: `${percent}% used (${Math.round(available/1024*10)/10}GB free of ${Math.round(total/1024*10)/10}GB)` });
    
    const icon = status === 'ok' ? check : (status === 'warning' ? warn : fail);
    console.log(`  ${icon} Memory       ${percent}% used (${Math.round(available/1024*10)/10}GB free of ${Math.round(total/1024*10)/10}GB)`);
    return status === 'ok';
  } catch (e) {
    // Fallback to os module
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percent = Math.round((used / total) * 100);
    
    let status = 'ok';
    if (percent > 90) status = 'critical';
    else if (percent > 80) status = 'warning';
    
    results.push({ name: 'Memory', status, message: `${percent}% used (${Math.round(free/1024/1024/1024*10)/10}GB free of ${Math.round(total/1024/1024/1024*10)/10}GB)` });
    
    const icon = status === 'ok' ? check : (status === 'warning' ? warn : fail);
    console.log(`  ${icon} Memory       ${percent}% used (${Math.round(free/1024/1024/1024*10)/10}GB free of ${Math.round(total/1024/1024/1024*10)/10}GB)`);
    return status === 'ok';
  }
}

// Check network
function checkNetwork() {
  const endpoints = [
    { name: 'Google DNS', host: '8.8.8.8' },
    { name: 'Cloudflare', host: '1.1.1.1' },
    { name: 'GitHub', host: 'github.com' }
  ];
  
  let allOk = true;
  const issues = [];
  
  for (const ep of endpoints) {
    try {
      execSync(`ping -c 1 -W 2 ${ep.host} 2>/dev/null`, { stdio: 'pipe' });
    } catch (e) {
      allOk = false;
      issues.push(ep.name);
    }
  }
  
  const status = allOk ? 'ok' : 'warning';
  results.push({ name: 'Network', status, message: allOk ? 'All endpoints reachable' : `Failed: ${issues.join(', ')}` });
  
  const icon = allOk ? check : warn;
  console.log(`  ${icon} Network      ${allOk ? 'All endpoints reachable' : issues.join(', ') + ' unreachable'}`);
  return allOk;
}

// Check Docker
function checkDocker() {
  try {
    const version = execSync('docker --version 2>/dev/null', { encoding: 'utf8', stdio: 'pipe' }).trim();
    try {
      execSync('docker info 2>/dev/null', { stdio: 'pipe' });
      const v = version.match(/(\d+\.\d+\.\d+)/)?.[0] || 'unknown';
      results.push({ name: 'Docker', status: 'ok', message: `Running (v${v})` });
      console.log(`  ${check} Docker       Running (v${v})`);
      return true;
    } catch (e) {
      results.push({ name: 'Docker', status: 'warning', message: 'Installed but not running' });
      console.log(`  ${warn} Docker       Installed but not running`);
      return false;
    }
  } catch (e) {
    results.push({ name: 'Docker', status: 'warning', message: 'Not installed' });
    console.log(`  ${warn} Docker       Not installed`);
    return false;
  }
}

// Check Git
function checkGit() {
  try {
    const version = execSync('git --version 2>/dev/null', { encoding: 'utf8', stdio: 'pipe' }).trim();
    
    const userName = execSync('git config user.name 2>/dev/null', { encoding: 'utf8', stdio: 'pipe' }).trim() || null;
    const userEmail = execSync('git config user.email 2>/dev/null', { encoding: 'utf8', stdio: 'pipe' }).trim() || null;
    
    if (!userName || !userEmail) {
      results.push({ name: 'Git', status: 'warning', message: 'Not fully configured (missing user.name or user.email)' });
      console.log(`  ${warn} Git          ${version.replace('git version ', 'v')} - Not fully configured`);
      return false;
    }
    
    results.push({ name: 'Git', status: 'ok', message: `${version.replace('git version ', 'v')} - Configured` });
    console.log(`  ${check} Git          ${version.replace('git version ', 'v')} - Configured properly`);
    return true;
  } catch (e) {
    results.push({ name: 'Git', status: 'error', message: 'Not installed' });
    console.log(`  ${fail} Git          Not installed`);
    return false;
  }
}

// Check Node.js
function checkNode() {
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    
    let status = 'ok';
    if (major < 18) status = 'critical';
    else if (major < 20) status = 'warning';
    
    results.push({ name: 'Node.js', status, message: `${version} - ${status === 'ok' ? 'Recommended' : 'Consider updating'}` });
    
    const icon = status === 'ok' ? check : (status === 'warning' ? warn : fail);
    console.log(`  ${icon} Node.js      ${version} - ${status === 'ok' ? 'Recommended version' : 'Consider updating to v20+'}`);
    return status === 'ok';
  } catch (e) {
    results.push({ name: 'Node.js', status: 'error', message: 'Unknown version' });
    console.log(`  ${fail} Node.js      Unknown version`);
    return false;
  }
}

// Check common environment files
function checkEnvFiles() {
  const files = ['.env', '.env.local', '.env.example'];
  let found = 0;
  let envContent = '';
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      found++;
      if (file === '.env') {
        try {
          envContent = fs.readFileSync(file, 'utf8');
        } catch (e) {}
      }
    }
  }
  
  const hasKeyVars = envContent.includes('API_KEY') || envContent.includes('TOKEN') || envContent.includes('SECRET');
  
  results.push({ name: 'Environment', status: found > 0 ? 'ok' : 'warning', message: found > 0 ? `${found} env file(s) found` : 'No .env files found' });
  
  const icon = found > 0 ? check : warn;
  console.log(`  ${icon} Environment  ${found > 0 ? `${found} env file(s) found` : 'No .env files found'}`);
  return found > 0;
}

// Check load average
function checkLoad() {
  try {
    const cpus = os.cpus().length;
    const load = os.loadavg()[0];
    const percent = Math.round((load / cpus) * 100);
    
    let status = 'ok';
    if (percent > 150) status = 'critical';
    else if (percent > 100) status = 'warning';
    
    results.push({ name: 'Load Average', status, message: `Load: ${load.toFixed(2)} (${percent}% of ${cpus} cores)` });
    
    const icon = status === 'ok' ? check : (status === 'warning' ? warn : fail);
    console.log(`  ${icon} Load Average Load: ${load.toFixed(2)} (${percent}% of ${cpus} cores)`);
    return status === 'ok';
  } catch (e) {
    console.log(`  ${warn} Load Average Could not determine`);
    return false;
  }
}

// Print summary
function printSummary() {
  const criticals = results.filter(r => r.status === 'critical').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const errors = results.filter(r => r.status === 'error').length;
  const ok = results.filter(r => r.status === 'ok').length;
  
  console.log();
  console.log(colors.cyan + '═'.repeat(60) + colors.reset);
  
  if (criticals > 0) {
    console.log(colors.red + colors.bold + `Overall Status: ❌ CRITICAL (${criticals} critical, ${warnings} warnings)` + colors.reset);
  } else if (warnings > 0) {
    console.log(colors.yellow + colors.bold + `Overall Status: ⚠️ WARNING (${warnings} warning(s))` + colors.reset);
  } else if (errors > 0) {
    console.log(colors.yellow + colors.bold + `Overall Status: ⚠️ ISSUES (${errors} error(s))` + colors.reset);
  } else {
    console.log(colors.green + colors.bold + `Overall Status: ✓ HEALTHY (${ok} checks passed)` + colors.reset);
  }
  
  console.log(colors.cyan + '═'.repeat(60) + colors.reset);
  
  // Show issues
  const issues = results.filter(r => r.status !== 'ok');
  if (issues.length > 0) {
    console.log();
    console.log(colors.bold + 'Issues to address:' + colors.reset);
    issues.forEach(issue => {
      const icon = issue.status === 'critical' ? fail : warn;
      console.log(`  ${icon} ${issue.name}: ${issue.message}`);
    });
  }
  
  console.log();
}

// Main
printHeader();

switch (specificCheck) {
  case 'disk':
    checkDisk();
    break;
  case 'memory':
    checkMemory();
    break;
  case 'network':
    checkNetwork();
    break;
  case 'docker':
    checkDocker();
    break;
  case 'git':
    checkGit();
    break;
  case 'node':
    checkNode();
    checkEnvFiles();
    break;
  case 'load':
    checkLoad();
    break;
  default:
    // Run all checks
    checkDisk();
    checkMemory();
    checkLoad();
    checkNetwork();
    checkDocker();
    checkGit();
    checkNode();
    checkEnvFiles();
    printSummary();
}
