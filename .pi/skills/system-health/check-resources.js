#!/usr/bin/env node
/**
 * Check system resources (CPU, memory, disk)
 * @module system-health/check-resources
 */

import { execSync } from 'child_process';

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

function parseMeminfo() {
  const meminfo = safeExec('cat /proc/meminfo');
  if (!meminfo) return null;
  
  const lines = meminfo.split('\n');
  const data = {};
  for (const line of lines) {
    const match = line.match(/^(\w+):\s+(\d+)/);
    if (match) {
      data[match[1]] = parseInt(match[2], 10) * 1024; // Convert from kB to bytes
    }
  }
  return data;
}

function getCPUUsage() {
  // Use /proc/stat for CPU usage
  const stat1 = safeExec('cat /proc/stat');
  if (!stat1) return { usage: 0, cores: 1, load: [0, 0, 0] };
  
  const cpuLine = stat1.split('\n').find(l => l.startsWith('cpu '));
  if (!cpuLine) return { usage: 0, cores: 1, load: [0, 0, 0] };
  
  const parts = cpuLine.split(/\s+/).slice(1).map(Number);
  const idle = parts[3] || 0;
  const iowait = parts[4] || 0;
  const total = parts.reduce((a, b) => a + b, 0);
  
  const usage = total > 0 ? ((total - idle - iowait) / total) * 100 : 0;
  
  // Get load averages
  const loadavg = safeExec('cat /proc/loadavg');
  const load = loadavg ? loadavg.split(/\s+/).slice(0, 3).map(parseFloat) : [0, 0, 0];
  
  // Get CPU cores
  const nproc = safeExec('nproc');
  const cores = nproc ? parseInt(nproc, 10) : 1;
  
  return {
    usage: Math.round(usage * 10) / 10,
    cores,
    load
  };
}

function getMemoryUsage() {
  const meminfo = parseMeminfo();
  if (!meminfo) return null;
  
  const total = meminfo.MemTotal || 0;
  const free = meminfo.MemFree || 0;
  const available = meminfo.MemAvailable || free;
  const used = total - available;
  
  return {
    total,
    used,
    free: available,
    usagePercent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0
  };
}

function getDiskUsage(path = '/') {
  const df = safeExec(`df -B1 ${path} | tail -1`);
  if (!df) return null;
  
  const parts = df.split(/\s+/);
  if (parts.length < 6) return null;
  
  return {
    total: parseInt(parts[1], 10),
    used: parseInt(parts[2], 10),
    free: parseInt(parts[3], 10),
    usagePercent: parseInt(parts[4], 10)
  };
}

function main() {
  const result = {
    timestamp: new Date().toISOString(),
    cpu: getCPUUsage(),
    memory: getMemoryUsage(),
    disk: getDiskUsage('/job')
  };
  
  console.log(JSON.stringify(result, null, 2));
}

// Export for use as module
export { getCPUUsage, getMemoryUsage, getDiskUsage };

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('check-resources.js')) {
  main();
}
