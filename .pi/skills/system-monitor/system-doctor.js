#!/usr/bin/env node
/**
 * System Doctor - Comprehensive diagnostics
 * Inspired by ZeroClaw's doctor command
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHECKS = {
  disk: checkDisk,
  memory: checkMemory,
  cpu: checkCPU,
  docker: checkDocker,
  git: checkGit,
  node: checkNode,
  network: checkNetwork
};

async function runDiagnostics() {
  const results = {
    healthy: true,
    timestamp: new Date().toISOString(),
    checks: {}
  };

  console.log('🔍 Running system diagnostics...\n');

  for (const [name, checkFn] of Object.entries(CHECKS)) {
    try {
      const result = await checkFn();
      results.checks[name] = result;
      if (!result.healthy) {
        results.healthy = false;
      }
      printResult(name, result);
    } catch (err) {
      results.checks[name] = { healthy: false, error: err.message };
      results.healthy = false;
      printResult(name, { healthy: false, error: err.message });
    }
  }

  console.log('\n' + '='.repeat(50));
  if (results.healthy) {
    console.log('✅ All systems healthy');
  } else {
    console.log('⚠️  Some checks failed. Review output above.');
    process.exit(1);
  }

  // Save report
  const reportPath = path.join('/tmp', `system-doctor-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report saved: ${reportPath}`);

  return results;
}

function checkDisk() {
  const output = execSync('df -h /', { encoding: 'utf8' });
  const lines = output.trim().split('\n');
  const rootLine = lines.find(l => l.includes(' /') || l.endsWith(' /'));
  
  if (!rootLine) {
    return { healthy: false, error: 'Could not parse disk info' };
  }

  const parts = rootLine.split(/\s+/);
  const usage = parseInt(parts[4]?.replace('%', '') || '0');
  const size = parts[1];
  const used = parts[2];
  const available = parts[3];

  return {
    healthy: usage < 90,
    usage,
    size,
    used,
    available,
    status: usage > 90 ? 'critical' : usage > 80 ? 'warning' : 'ok'
  };
}

function checkMemory() {
  try {
    const output = execSync('free -m', { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    const memLine = lines.find(l => l.startsWith('Mem:'));
    
    if (!memLine) {
      // Try alternative on macOS
      const vmOutput = execSync('vmstat -s', { encoding: 'utf8' });
      const pages = vmOutput.match(/(\d+) pages/);
      const pageSize = parseInt(execSync('getconf PAGESIZE', { encoding: 'utf8' }).trim());
      const totalMem = parseInt(pages[1]) * pageSize / 1024 / 1024;
      
      return {
        healthy: true,
        total_mb: Math.round(totalMem),
        note: 'macOS memory check (limited info)'
      };
    }

    const parts = memLine.split(/\s+/);
    const total = parseInt(parts[1]);
    const used = parseInt(parts[2]);
    const free = parseInt(parts[3]);
    const usage = Math.round((used / total) * 100);

    return {
      healthy: usage < 95,
      total_mb: total,
      used_mb: used,
      free_mb: free,
      usage,
      status: usage > 95 ? 'critical' : usage > 85 ? 'warning' : 'ok'
    };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

function checkCPU() {
  try {
    let loadAvg;
    try {
      loadAvg = execSync('uptime', { encoding: 'utf8' }).trim();
    } catch {
      // macOS fallback
      loadAvg = execSync('uptime', { encoding: 'utf8' }).trim();
    }
    
    const match = loadAvg.match(/load average[s]?:\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (!match) {
      return { healthy: true, info: loadAvg };
    }

    const numCpus = parseInt(execSync('nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1', { encoding: 'utf8' }).trim());
    const load1 = parseFloat(match[1]);
    const load5 = parseFloat(match[2]);
    const load15 = parseFloat(match[3]);
    const healthy = load1 < numCpus * 2;

    return {
      healthy,
      load_1min: load1,
      load_5min: load5,
      load_15min: load15,
      cpus: numCpus,
      status: load1 > numCpus * 2 ? 'critical' : load1 > numCpus ? 'warning' : 'ok'
    };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

function checkDocker() {
  try {
    const version = execSync('docker --version', { encoding: 'utf8' }).trim();
    const info = execSync('docker info --format "{{.Containers}} {{.ContainersRunning}}" 2>/dev/null', { encoding: 'utf8' }).trim();
    const [total, running] = info.split(' ').map(Number);

    return {
      healthy: true,
      version: version.split(',')[0],
      containers: total || 0,
      running: running || 0,
      status: 'ok'
    };
  } catch (err) {
    return { healthy: false, error: 'Docker not available', details: err.message };
  }
}

function checkGit() {
  try {
    const version = execSync('git --version', { encoding: 'utf8' }).trim();
    
    // Check if we're in a git repo
    let repo = null;
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: '/job' });
      const branch = execSync('git branch --show-current', { encoding: 'utf8', cwd: '/job' }).trim();
      repo = {
        branch,
        changes: status.trim().split('\n').filter(l => l).length
      };
    } catch {}

    return {
      healthy: true,
      version: version.replace('git version ', ''),
      repository: repo,
      status: 'ok'
    };
  } catch (err) {
    return { healthy: false, error: 'Git not available' };
  }
}

function checkNode() {
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    const major = parseInt(version.replace('v', '').split('.')[0]);

    return {
      healthy: major >= 18,
      version,
      npm: npmVersion,
      status: major < 18 ? 'warning' : 'ok'
    };
  } catch (err) {
    return { healthy: false, error: 'Node.js not available' };
  }
}

function checkNetwork() {
  return new Promise((resolve) => {
    const testHosts = ['google.com', 'github.com', '1.1.1.1'];
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ healthy: false, error: 'Network check timed out' });
      }
    }, 5000);

    try {
      execSync('ping -c 1 -W 2 google.com 2>/dev/null || nc -z -w 2 google.com 80', { timeout: 5000 });
      clearTimeout(timeout);
      resolved = true;
      resolve({ healthy: true, status: 'ok', connectivity: 'online' });
    } catch {
      clearTimeout(timeout);
      resolved = true;
      resolve({ healthy: false, status: 'offline', error: 'No internet connectivity' });
    }
  });
}

function printResult(name, result) {
  const icon = result.healthy ? '✓' : '✗';
  const color = result.healthy ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  
  console.log(`${color}${icon}${reset} ${name.padEnd(10)} ${JSON.stringify(result)}`);
}

// Run if called directly
if (require.main === module) {
  runDiagnostics().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runDiagnostics, CHECKS };