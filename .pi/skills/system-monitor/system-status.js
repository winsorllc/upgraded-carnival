#!/usr/bin/env node
/**
 * Quick System Status - Fast health snapshot
 */

const { execSync } = require('child_process');

function getStatus() {
  const status = {
    timestamp: new Date().toISOString(),
    healthy: true,
    checks: {}
  };

  // Quick disk check
  try {
    const df = execSync("df -h / | tail -1 | awk '{print $5}'", { encoding: 'utf8' }).trim();
    const usage = parseInt(df.replace('%', ''));
    status.checks.disk = { usage, healthy: usage < 90 };
    if (usage >= 90) status.healthy = false;
  } catch {
    status.checks.disk = { healthy: false };
    status.healthy = false;
  }

  // Quick memory check
  try {
    const mem = execSync("free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100.0}'", { encoding: 'utf8' }).trim();
    const usage = parseFloat(mem);
    status.checks.memory = { usage, healthy: usage < 95 };
    if (usage >= 95) status.healthy = false;
  } catch {
    // macOS alternative
    try {
      const vmStats = execSync('vm_stat 2>/dev/null | head -5', { encoding: 'utf8' });
      status.checks.memory = { info: 'macOS', healthy: true };
    } catch {
      status.checks.memory = { healthy: false };
      status.healthy = false;
    }
  }

  // Docker check
  try {
    const running = execSync('docker ps -q 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
    status.checks.docker = { running: parseInt(running), healthy: true };
  } catch {
    status.checks.docker = { healthy: false };
  }

  // Load average
  try {
    const uptime = execSync('uptime').toString();
    const match = uptime.match(/load average[s]?:\s*([\d.]+)/i);
    if (match) {
      status.checks.load = { '1min': parseFloat(match[1]), healthy: true };
    }
  } catch {}

  return status;
}

if (require.main === module) {
  const status = getStatus();
  
  const statusIcon = status.healthy ? '✅' : '⚠️';
  console.log(`${statusIcon} System Status (${status.timestamp})\n`);

  Object.entries(status.checks).forEach(([name, check]) => {
    const icon = check.healthy ? '✓' : '✗';
    const details = Object.entries(check)
      .filter(([k]) => k !== 'healthy')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    console.log(`  ${icon} ${name.padEnd(10)}${details}`);
  });

  console.log('');
  console.log(JSON.stringify(status, null, 2));
}

module.exports = { getStatus };