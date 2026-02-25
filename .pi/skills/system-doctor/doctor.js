#!/usr/bin/env node

/**
 * System Doctor - Health diagnostics and troubleshooting
 * 
 * Provides comprehensive system health checks including:
 * - Configuration validation
 * - Memory usage
 * - Disk space
 * - Network connectivity
 * - Security settings
 * - Docker status
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CHECKS = ['config', 'memory', 'disk', 'network', 'security', 'docker'];

/**
 * Run a shell command and return output
 */
function runCommand(cmd, timeout = 5000) {
  try {
    return {
      success: true,
      output: execSync(cmd, { encoding: 'utf8', timeout, stdio: 'pipe' }).trim()
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      output: e.stdout || e.stderr || ''
    };
  }
}

/**
 * Check configuration
 */
function checkConfig() {
  const issues = [];
  const checks = [];
  
  // Check environment variables
  const requiredEnvVars = ['GH_TOKEN', 'GH_OWNER', 'GH_REPO', 'APP_URL'];
  const optionalEnvVars = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'TELEGRAM_BOT_TOKEN'];
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      issues.push(`Missing required env var: ${varName}`);
      checks.push(`${varName}: MISSING (required)`);
    } else {
      checks.push(`${varName}: Set`);
    }
  }
  
  for (const varName of optionalEnvVars) {
    if (process.env[varName]) {
      checks.push(`${varName}: Set`);
    } else {
      checks.push(`${varName}: Not set (optional)`);
    }
  }
  
  // Check config files
  const configFiles = [
    '/job/config/SOUL.md',
    '/job/config/AGENT.md',
    '/job/config/EVENT_HANDLER.md'
  ];
  
  for (const file of configFiles) {
    if (fs.existsSync(file)) {
      checks.push(`${path.basename(file)}: Exists`);
    } else {
      issues.push(`Missing config file: ${file}`);
      checks.push(`${path.basename(file)}: Missing`);
    }
  }
  
  return {
    status: issues.length === 0 ? 'pass' : 'error',
    details: checks.join('\n'),
    issues: issues
  };
}

/**
 * Check memory usage
 */
function checkMemory() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const percentUsed = (usedMem / totalMem) * 100;
  
  const checks = [
    `Total: ${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    `Used: ${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    `Free: ${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    `Usage: ${percentUsed.toFixed(1)}%`
  ];
  
  let status = 'pass';
  if (percentUsed > 90) {
    status = 'error';
  } else if (percentUsed > 75) {
    status = 'warning';
  }
  
  return {
    status,
    details: checks.join('\n'),
    issues: percentUsed > 75 ? [`Memory usage is ${percentUsed.toFixed(1)}%`] : []
  };
}

/**
 * Check disk usage
 */
function checkDisk() {
  // Try to get disk usage (works on Linux/macOS)
  const result = runCommand('df -h / | tail -1');
  
  if (!result.success) {
    return {
      status: 'skip',
      details: 'Could not determine disk usage',
      issues: []
    };
  }
  
  const parts = result.output.split(/\s+/);
  if (parts.length < 6) {
    return {
      status: 'skip',
      details: 'Could not parse disk usage',
      issues: []
    };
  }
  
  const usePercent = parseInt(parts[4], 10);
  const used = parts[2];
  const available = parts[3];
  
  const details = `Usage: ${usePercent}%\nUsed: ${used}\nAvailable: ${available}`;
  
  let status = 'pass';
  if (usePercent >= 95) {
    status = 'error';
  } else if (usePercent >= 85) {
    status = 'warning';
  }
  
  return {
    status,
    details,
    issues: usePercent >= 85 ? [`Disk usage is ${usePercent}%`] : []
  };
}

/**
 * Check network connectivity
 */
function checkNetwork() {
  const checks = [];
  const issues = [];
  
  // Check internet connectivity
  const pingResult = runCommand('ping -c 1 -W 2 8.8.8.8', 5000);
  if (pingResult.success) {
    checks.push('Internet: Connected');
  } else {
    checks.push('Internet: Not reachable');
    issues.push('Cannot reach external network');
  }
  
  // Check DNS
  const dnsResult = runCommand('nslookup google.com 8.8.8.8', 5000);
  if (dnsResult.success) {
    checks.push('DNS: Working');
  } else {
    checks.push('DNS: Not working');
    issues.push('DNS resolution not working');
  }
  
  // Check localhost
  const localhostResult = runCommand('ping -c 1 -W 1 127.0.0.1');
  if (localhostResult.success) {
    checks.push('Localhost: Reachable');
  }
  
  return {
    status: issues.length === 0 ? 'pass' : 'warning',
    details: checks.join('\n'),
    issues
  };
}

/**
 * Check security settings
 */
function checkSecurity() {
  const checks = [];
  const issues = [];
  
  // Check if running as root
  const isRoot = process.geteuid ? process.geteuid() === 0 : false;
  if (isRoot) {
    checks.push('Running as root: YES (not recommended)');
    issues.push('Running as root user');
  } else {
    checks.push('Running as root: NO');
  }
  
  // Check for .env file
  const envPath = '/job/.env';
  if (fs.existsSync(envPath)) {
    checks.push('.env file: Exists');
  } else {
    checks.push('.env file: Missing');
    issues.push('No .env file found');
  }
  
  // Check file permissions on sensitive files
  const sensitiveFiles = ['/job/.env', '/job/data/thepopebot.sqlite'];
  for (const file of sensitiveFiles) {
    if (fs.existsSync(file)) {
      try {
        const stats = fs.statSync(file);
        const mode = (stats.mode & 0o777).toString(8);
        checks.push(`${path.basename(file)}: ${mode}`);
      } catch (e) {
        // Ignore
      }
    }
  }
  
  return {
    status: issues.length === 0 ? 'pass' : 'warning',
    details: checks.join('\n'),
    issues
  };
}

/**
 * Check Docker status
 */
function checkDocker() {
  const checks = [];
  const issues = [];
  
  // Check if Docker is installed
  const dockerVersion = runCommand('docker --version');
  if (!dockerVersion.success) {
    return {
      status: 'skip',
      details: 'Docker not installed',
      issues: []
    };
  }
  
  checks.push(`Docker: ${dockerVersion.output}`);
  
  // Check if Docker daemon is running
  const dockerPs = runCommand('docker ps');
  if (!dockerPs.success) {
    checks.push('Docker daemon: Not running');
    issues.push('Docker daemon is not running');
  } else {
    checks.push('Docker daemon: Running');
  }
  
  // Check running containers
  const runningContainers = runCommand('docker ps --format "{{.Names}}"');
  if (runningContainers.success) {
    const containers = runningContainers.output.split('\n').filter(c => c.trim());
    checks.push(`Running containers: ${containers.length}`);
    if (containers.length > 0) {
      checks.push(`  - ${containers.join('\n  - ')}`);
    }
  }
  
  // Check disk usage
  const dockerDf = runCommand('docker system df');
  if (dockerDf.success) {
    checks.push('Docker disk usage:');
    checks.push(dockerDf.output.split('\n').slice(0, 4).join('\n'));
  }
  
  return {
    status: issues.length === 0 ? 'pass' : 'warning',
    details: checks.join('\n'),
    issues
  };
}

/**
 * Run all checks
 */
function runAllChecks(options = {}) {
  const results = {};
  const allIssues = [];
  
  const checksToRun = options.checks || CHECKS;
  
  for (const check of checksToRun) {
    switch (check) {
      case 'config':
        results.config = checkConfig();
        break;
      case 'memory':
        results.memory = checkMemory();
        break;
      case 'disk':
        results.disk = checkDisk();
        break;
      case 'network':
        results.network = checkNetwork();
        break;
      case 'security':
        results.security = checkSecurity();
        break;
      case 'docker':
        results.docker = checkDocker();
        break;
    }
    
    if (results[check] && results[check].issues) {
      allIssues.push(...results[check].issues);
    }
  }
  
  // Determine overall status
  const statuses = Object.values(results).map(r => r.status);
  let overallStatus = 'pass';
  if (statuses.includes('error')) {
    overallStatus = 'error';
  } else if (statuses.includes('warning')) {
    overallStatus = 'warning';
  }
  
  return {
    status: overallStatus,
    checks: results,
    issues: allIssues,
    recommendations: allIssues.map(i => `Fix: ${i}`)
  };
}

// CLI handling
const args = process.argv.slice(2);
const options = {
  checks: [],
  verbose: false,
  json: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--check' && args[i + 1]) {
    options.checks.push(args[i + 1]);
    i++;
  } else if (arg === '--verbose' || arg === '-v') {
    options.verbose = true;
  } else if (arg === '--json') {
    options.json = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log('System Doctor CLI');
    console.log('');
    console.log('Usage: doctor.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --check <name>  Run specific check (config, memory, disk, network, security, docker)');
    console.log('  --verbose       Verbose output');
    console.log('  --json          JSON output');
    console.log('  --help          Show this help');
    process.exit(0);
  }
}

if (options.checks.length === 0) {
  options.checks = CHECKS;
}

const results = runAllChecks(options);

if (options.json) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log('🏥 System Doctor - Health Check');
  console.log('='.repeat(50));
  console.log(`Overall Status: ${results.status.toUpperCase()}`);
  console.log('');
  
  for (const [name, result] of Object.entries(results.checks)) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : result.status === 'error' ? '❌' : '⏭️';
    console.log(`${icon} ${name.toUpperCase()}`);
    if (options.verbose || result.status !== 'pass') {
      console.log(result.details.split('\n').map(l => `   ${l}`).join('\n'));
    }
    console.log('');
  }
  
  if (results.recommendations.length > 0) {
    console.log('📋 Recommendations:');
    for (const rec of results.recommendations) {
      console.log(`  - ${rec}`);
    }
  }
}

process.exit(results.status === 'error' ? 1 : 0);
