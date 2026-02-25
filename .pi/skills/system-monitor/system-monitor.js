#!/usr/bin/env node

/**
 * System Monitor Skill
 * Comprehensive system health monitoring
 */

const os = require('os');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Utility to exec command and get output
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Get CPU information
async function getCPU() {
  const cpus = os.cpus();
  const cores = cpus.length;
  
  let totalIdle = 0;
  let totalTick = 0;
  
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }
  
  const idle = totalIdle / cores;
  const total = totalTick / cores;
  const usage = 100 - (100 * idle / total);
  
  // Get load average
  const loadAvg = os.loadavg();
  
  return {
    cores,
    usage: usage.toFixed(1),
    model: cpus[0].model,
    speed: cpus[0].speed,
    loadAverage: {
      '1min': loadAvg[0].toFixed(2),
      '5min': loadAvg[1].toFixed(2),
      '15min': loadAvg[2].toFixed(2)
    }
  };
}

// Get memory information
function getMemory() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const usage = (used / total) * 100;
  
  return {
    total: formatBytes(total),
    used: formatBytes(used),
    free: formatBytes(free),
    usage: usage.toFixed(1)
  };
}

// Get disk usage (Linux)
async function getDisk() {
  try {
    const output = await execPromise("df -k / | tail -1 | awk '{print $2,$3,$4,$5}'");
    const parts = output.trim().split(/\s+/);
    
    if (parts.length >= 4) {
      const total = parseInt(parts[0]) * 1024;
      const used = parseInt(parts[1]) * 1024;
      const free = parseInt(parts[2]) * 1024;
      const usage = parseInt(parts[3]);
      
      return {
        total: formatBytes(total),
        used: formatBytes(used),
        free: formatBytes(free),
        usage: usage
      };
    }
  } catch (e) {
    // Fallback for non-Linux systems
  }
  
  return { usage: 'N/A', note: 'Disk info not available' };
}

// Get network statistics (Linux)
async function getNetwork() {
  try {
    const output = await execPromise("cat /proc/net/dev | grep -v 'lo:' | tail -5");
    const lines = output.trim().split('\n');
    const interfaces = [];
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 10 && parts[1] && parts[9]) {
        interfaces.push({
          interface: parts[0].replace(':', ''),
          rx: formatBytes(parseInt(parts[1])),
          tx: formatBytes(parseInt(parts[9]))
        });
      }
    }
    
    return interfaces;
  } catch (e) {
    return [];
  }
}

// Get process list (Linux)
async function getProcesses(limit = 20) {
  try {
    const output = await execPromise(`ps aux --sort=-%cpu | head -${limit + 1} | tail -${limit}`);
    const lines = output.trim().split('\n');
    const processes = [];
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 11) {
        processes.push({
          user: parts[0],
          pid: parseInt(parts[1]),
          cpu: parseFloat(parts[2]),
          mem: parseFloat(parts[3]),
          command: parts.slice(10).join(' ')
        });
      }
    }
    
    return processes;
  } catch (e) {
    return [];
  }
}

// Get uptime
function getUptime() {
  const uptime = os.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  return { days, hours, minutes, total: uptime };
}

// Get hostname info
function getHostname() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    type: os.type(),
    release: os.release(),
    uptime: getUptime()
  };
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Check health with thresholds
async function healthCheck(options = {}) {
  const cpuThreshold = options.cpu || 90;
  const memThreshold = options.memory || 85;
  const diskThreshold = options.disk || 95;
  
  const cpu = await getCPU();
  const memory = getMemory();
  const disk = await getDisk();
  
  const results = {
    cpu: { value: parseFloat(cpu.usage), status: 'healthy' },
    memory: { value: parseFloat(memory.usage), status: 'healthy' },
    disk: { value: parseInt(disk.usage) || 0, status: 'healthy' }
  };
  
  // Determine status
  if (results.cpu.value > cpuThreshold) results.cpu.status = 'critical';
  else if (results.cpu.value > cpuThreshold - 10) results.cpu.status = 'warning';
  
  if (results.memory.value > memThreshold) results.memory.status = 'critical';
  else if (results.memory.value > memThreshold - 10) results.memory.status = 'warning';
  
  if (results.disk.value > diskThreshold) results.disk.status = 'critical';
  else if (results.disk.value > diskThreshold - 15) results.disk.status = 'warning';
  
  return results;
}

// Print status
async function printStatus() {
  console.log('\n=== System Status ===\n');
  
  const hostname = getHostname();
  console.log(`Hostname: ${hostname.hostname}`);
  console.log(`Platform: ${hostname.platform} ${hostname.arch}`);
  console.log(`Uptime: ${hostname.uptime.days}d ${hostname.uptime.hours}h ${hostname.uptime.minutes}m`);
  
  const cpu = await getCPU();
  console.log(`\n--- CPU ---`);
  console.log(`Cores: ${cpu.cores}`);
  console.log(`Model: ${cpu.model}`);
  console.log(`Usage: ${cpu.usage}%`);
  console.log(`Load: ${cpu.loadAverage['1min']} / ${cpu.loadAverage['5min']} / ${cpu.loadAverage['15min']}`);
  
  const memory = getMemory();
  console.log(`\n--- Memory ---`);
  console.log(`Used: ${memory.used} / ${memory.total} (${memory.usage}%)`);
  
  const disk = await getDisk();
  console.log(`\n--- Disk ---`);
  console.log(`Used: ${disk.used} / ${disk.total} (${disk.usage}%)`);
  
  const network = await getNetwork();
  if (network.length > 0) {
    console.log(`\n--- Network ---`);
    network.forEach(n => {
      console.log(`  ${n.interface}: RX ${n.rx} TX ${n.tx}`);
    });
  }
}

// Print CPU info
async function printCPU() {
  const cpu = await getCPU();
  console.log(JSON.stringify(cpu, null, 2));
}

// Print memory info
function printMemory() {
  const memory = getMemory();
  console.log(JSON.stringify(memory, null, 2));
}

// Print disk info
async function printDisk() {
  const disk = await getDisk();
  console.log(JSON.stringify(disk, null, 2));
}

// Print network info
async function printNetwork() {
  const network = await getNetwork();
  console.log(JSON.stringify(network, null, 2));
}

// Print processes
async function printProcesses(limit = 20) {
  const processes = await getProcesses(limit);
  console.log('\nTop Processes by CPU:\n');
  console.log('PID    USER       CPU    MEM   COMMAND');
  console.log('-----  ---------  -----  -----  -------');
  processes.forEach(p => {
    console.log(`${p.pid.toString().padEnd(5)}  ${p.user.slice(0,9).padEnd(9)}  ${p.cpu.toString().padEnd(5)}  ${p.mem.toString().padEnd(5)}  ${p.command.slice(0, 40)}`);
  });
}

// Run diagnostics
async function runDoctor() {
  console.log('\n=== Running Diagnostics ===\n');
  
  // Check system resources
  const health = await healthCheck({ cpu: 90, memory: 85, disk: 95 });
  
  console.log('Health Status:');
  for (const [metric, data] of Object.entries(health)) {
    let icon = '✓';
    if (data.status === 'warning') icon = '⚠';
    if (data.status === 'critical') icon = '✗';
    console.log(`  ${icon} ${metric}: ${data.value}% (${data.status})`);
  }
  
  // Check load vs cores
  const cpu = await getCPU();
  const loadPerCore = cpu.loadAverage['1min'] / cpu.cores;
  
  console.log('\nLoad Analysis:');
  console.log(`  Load per core: ${loadPerCore.toFixed(2)}`);
  if (loadPerCore > 1) {
    console.log('  ⚠ System may be overloaded');
  } else {
    console.log('  ✓ Load is normal');
  }
  
  // Memory check
  const mem = getMemory();
  const swap = os.totalmem() - os.freemem();
  if (parseFloat(mem.usage) > 80 && swap === 0) {
    console.log('  ⚠ High memory usage without swap - consider adding swap');
  }
  
  console.log('\nDiagnostics complete.');
}

// Monitor loop
async function monitorLoop(intervalSeconds, thresholds) {
  console.log(`Starting monitor (interval: ${intervalSeconds}s)...`);
  console.log(`Thresholds: CPU ${thresholds.cpu}%, Memory ${thresholds.memory}%, Disk ${thresholds.disk}%\n`);
  
  setInterval(async () => {
    const health = await healthCheck(thresholds);
    
    const timestamp = new Date().toISOString();
    let alerts = [];
    
    for (const [metric, data] of Object.entries(health)) {
      if (data.status === 'critical') {
        console.log(`[${timestamp}] ⚠ CRITICAL: ${metric} at ${data.value}%`);
        alerts.push(`${metric}: ${data.value}%`);
      } else if (data.status === 'warning') {
        console.log(`[${timestamp}] ⚐ Warning: ${metric} at ${data.value}%`);
      }
    }
    
    if (alerts.length > 0) {
      console.log('  -> Alerts triggered!');
    }
  }, intervalSeconds * 1000);
}

// Main CLI
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cpu') options.cpu = parseInt(args[++i]);
    if (args[i] === '--memory') options.memory = parseInt(args[++i]);
    if (args[i] === '--disk') options.disk = parseInt(args[++i]);
    if (args[i] === '--limit') options.limit = parseInt(args[++i]);
    if (args[i] === '--interval') options.interval = parseInt(args[++i]);
  }

  try {
    switch (command) {
      case 'status':
        await printStatus();
        break;
        
      case 'cpu':
        await printCPU();
        break;
        
      case 'memory':
        printMemory();
        break;
        
      case 'disk':
        await printDisk();
        break;
        
      case 'network':
        await printNetwork();
        break;
        
      case 'processes':
        await printProcesses(options.limit || 20);
        break;
        
      case 'health':
        const health = await healthCheck(options);
        console.log(JSON.stringify(health, null, 2));
        break;
        
      case 'monitor':
        await monitorLoop(options.interval || 60, {
          cpu: options.cpu || 90,
          memory: options.memory || 85,
          disk: options.disk || 95
        });
        break;
        
      case 'doctor':
        await runDoctor();
        break;
        
      default:
        console.log(`
System Monitor Skill - CLI

Commands:
  status                     Show full system status
  cpu                        Show CPU information
  memory                     Show memory information
  disk                       Show disk usage
  network                    Show network statistics
  processes [--limit N]      Show top processes
  health [--cpu N] [--memory N] [--disk N]  Run health check
  monitor [--interval N]     Start monitoring daemon
  doctor                     Run diagnostics

Options:
  --cpu N                    CPU alert threshold (default: 90)
  --memory N                 Memory alert threshold (default: 85)
  --disk N                   Disk alert threshold (default: 95)
  --limit N                  Process list limit (default: 20)
  --interval N               Monitor interval in seconds (default: 60)

Examples:
  system-monitor.js status
  system-monitor.js cpu
  system-monitor.js health --cpu 80 --memory 75
  system-monitor.js monitor --interval 30 --cpu 85
  system-monitor.js doctor
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
