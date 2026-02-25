#!/usr/bin/env node

/**
 * Health Monitor — System Health & Performance Monitoring
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const METRICS_FILE = path.join(process.cwd(), 'data', 'health-metrics.json');

if (!fs.existsSync(path.dirname(METRICS_FILE))) {
  fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
}

/**
 * Collect system metrics
 */
async function collectSystemMetrics() {
  const metrics = {
    timestamp: new Date().toISOString(),
    system: {},
    process: {}
  };
  
  try {
    // CPU usage
    const cpuInfo = await execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\'');
    metrics.system.cpu_percent = parseFloat(cpuInfo.stdout.trim()) || 0;
    
    // Memory usage
    const memInfo = await execAsync('free -m | awk \'NR==2{printf "%.2f", $3*100/$2}\'');
    metrics.system.memory_percent = parseFloat(memInfo.stdout.trim()) || 0;
    
    // Disk usage
    const diskInfo = await execAsync('df -h / | awk \'NR==2{print $5}\' | tr -d "%"');
    metrics.system.disk_percent = parseInt(diskInfo.stdout.trim()) || 0;
    
  } catch (error) {
    console.warn('Failed to collect some system metrics:', error.message);
  }
  
  // Node.js process metrics
  const usage = process.memoryUsage();
  metrics.process.heap_used_mb = Math.round(usage.heapUsed / 1024 / 1024);
  metrics.process.heap_total_mb = Math.round(usage.heapTotal / 1024 / 1024);
  metrics.process.rss_mb = Math.round(usage.rss / 1024 / 1024);
  metrics.process.uptime_seconds = process.uptime();
  
  return metrics;
}

/**
 * Run health checks
 */
async function checkHealth() {
  const results = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: []
  };
  
  // System checks
  const metrics = await collectSystemMetrics();
  
  // Disk space check
  const diskCheck = {
    name: 'disk_space',
    status: metrics.system.disk_percent < 90 ? 'pass' : 'fail',
    value: `${metrics.system.disk_percent}%`,
    threshold: '90%'
  };
  results.checks.push(diskCheck);
  
  // Memory check
  const memoryCheck = {
    name: 'memory',
    status: metrics.system.memory_percent < 90 ? 'pass' : 'fail',
    value: `${metrics.system.memory_percent.toFixed(1)}%`,
    threshold: '90%'
  };
  results.checks.push(memoryCheck);
  
  // Process health
  const processCheck = {
    name: 'process',
    status: 'pass',
    value: `uptime: ${Math.round(metrics.process.uptime_seconds / 60)}m`
  };
  results.checks.push(processCheck);
  
  // Determine overall status
  const failures = results.checks.filter(c => c.status === 'fail');
  if (failures.length > 0) {
    results.status = 'unhealthy';
    results.failures = failures;
  }
  
  // Save metrics
  saveMetric(metrics);
  
  return results;
}

/**
 * Save a metric
 */
function saveMetric(metric) {
  let data = { entries: [] };
  if (fs.existsSync(METRICS_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf-8'));
    } catch (e) {}
  }
  
  data.entries.push(metric);
  
  // Keep last 1000 entries
  if (data.entries.length > 1000) {
    data.entries = data.entries.slice(-1000);
  }
  
  fs.writeFileSync(METRICS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Get metrics for time period
 */
function getMetrics(period = 'last_hour') {
  let data = { entries: [] };
  if (fs.existsSync(METRICS_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf-8'));
    } catch (e) {}
  }
  
  const now = Date.now();
  const periods = {
    last_hour: 60 * 60 * 1000,
    last_24h: 24 * 60 * 60 * 1000,
    last_week: 7 * 24 * 60 * 60 * 1000
  };
  
  const cutoff = now - (periods[period] || periods.last_hour);
  return data.entries.filter(e => new Date(e.timestamp).getTime() > cutoff);
}

/**
 * CLI interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'check':
      checkHealth().then(result => {
        console.log('\n💚 Health Check Results\n');
        console.log(`Overall: ${result.status.toUpperCase()}\n`);
        console.log('Checks:');
        for (const check of result.checks) {
          const icon = check.status === 'pass' ? '✓' : '✗';
          console.log(`  ${icon} ${check.name}: ${check.value} ${check.threshold ? `(< ${check.threshold})` : ''}`);
        }
        console.log();
      }).catch(console.error);
      break;

    case 'metrics':
      const period = args[args.indexOf('--period') + 1] || 'last_hour';
      const metrics = getMetrics(period);
      console.log(`\nCollected ${metrics.length} metric entries for ${period}\n`);
      break;

    default:
      console.log(`
Health Monitor — System Health & Performance Monitoring

Usage:
  health-monitor check             Run health checks
  health-monitor metrics           Show collected metrics

Examples:
  health-monitor check
  health-monitor metrics --period last_24h
`);
  }
}

module.exports = { checkHealth, collectSystemMetrics, getMetrics, saveMetric };
