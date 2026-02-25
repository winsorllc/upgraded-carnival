#!/usr/bin/env node
/**
 * Heartbeat - Self-monitoring system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEFAULT_HEARTBEAT_MD = `/job/config/HEARTBEAT.md`;
const HISTORY_FILE = `/tmp/heartbeat-history.jsonl`;

async function runHeartbeat(configPath = DEFAULT_HEARTBEAT_MD) {
  const startTime = Date.now();
  const log = [];
  
  // Load config if exists
  let config = {
    enabled: true,
    interval_minutes: 30,
    message: 'Health check',
    target: 'log'
  };
  
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      // Parse simple key: value format
      content.split('\n').forEach(line => {
        const match = line.match(/^(\w+):\s*(.+)/);
        if (match) {
          const [, key, val] = match;
          if (key === 'enabled') config.enabled = val === 'true';
          else if (key === 'interval_minutes') config.interval_minutes = parseInt(val);
          else config[key] = val;
        }
      });
    }
  } catch (err) {
    log.push({ type: 'warning', message: 'Could not load HEARTBEAT.md, using defaults' });
  }
  
  if (!config.enabled) {
    return { status: 'disabled', message: 'Heartbeat is disabled' };
  }
  
  // Collect health metrics
  const metrics = {};
  
  // System info
  try {
    metrics.uptime = process.uptime();
    metrics.memory = process.memoryUsage();
    metrics.node_version = process.version;
  } catch {}
  
  // Disk check
  try {
    const df = execSync("df -h / | tail -1 | awk '{print $5}'", { encoding: 'utf8' }).trim();
    metrics.disk_usage = parseInt(df.replace('%', ''));
  } catch {}
  
  // Load average
  try {
    const uptime = execSync('uptime', { encoding: 'utf8' }).trim();
    const match = uptime.match(/load average[s]?:\s*([\d.]+)/i);
    if (match) metrics.load_1min = parseFloat(match[1]);
  } catch {}
  
  // Git status
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8', cwd: '/job' }).trim();
    metrics.git_branch = branch;
  } catch {}
  
  const result = {
    timestamp: new Date().toISOString(),
    healthy: true,
    metrics,
    checks: [],
    duration_ms: Date.now() - startTime
  };
  
  // Run checks
  if (metrics.disk_usage > 90) {
    result.healthy = false;
    result.checks.push({ type: 'disk', status: 'critical', message: `Disk usage: ${metrics.disk_usage}%` });
  }
  
  if (metrics.memory) {
    const heapUsedPercent = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;
    if (heapUsedPercent > 95) {
      result.healthy = false;
      result.checks.push({ type: 'memory', status: 'critical', message: `Heap usage: ${heapUsedPercent.toFixed(1)}%` });
    }
  }
  
  // Save to history
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(result) + '\n');
  
  return result;
}

async function main() {
  const result = await runHeartbeat(process.argv[2]);
  
  const icon = result.healthy ? '💚' : '❤️';
  console.log(`${icon} Heartbeat (${result.timestamp})`);
  console.log(`   Healthy: ${result.healthy}`);
  console.log(`   Duration: ${result.duration_ms}ms`);
  
  if (result.metrics) {
    console.log(`   Metrics:`);
    Object.entries(result.metrics).forEach(([k, v]) => {
      if (typeof v === 'object') {
        console.log(`      ${k}: ${Math.round(v.heapUsed / 1024 / 1024)}MB / ${Math.round(v.heapTotal / 1024 / 1024)}MB`);
      } else {
        console.log(`      ${k}: ${v}`);
      }
    });
  }
  
  if (result.checks.length > 0) {
    console.log(`   Checks:`);
    result.checks.forEach(c => console.log(`      [${c.type.toUpperCase()}] ${c.message}`));
  }
  
  process.exit(result.healthy ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { runHeartbeat };