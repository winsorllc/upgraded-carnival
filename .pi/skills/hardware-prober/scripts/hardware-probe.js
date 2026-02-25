#!/usr/bin/env node
/**
 * Hardware Prober - System hardware information
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

function parseArgs(args) {
  const result = {
    component: null,
    json: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--component': result.component = args[++i]; break;
      case '--json': result.json = true; break;
    }
  }
  return result;
}

function readFileSafe(path) {
  try {
    return fs.readFileSync(path, 'utf8').trim();
  } catch (e) {
    return null;
  }
}

function getCpuInfo() {
  const cpus = os.cpus();
  const cpu0 = cpus[0] || {};
  
  const model = cpu0.model || 'Unknown';
  const speed = cpu0.speed || 0;
  const cores = os.cpus().length;
  const logicalCores = cores;
  
  const physicalCores = readFileSafe('/sys/devices/system/cpu/cpu0/topology/core_siblings_list');
  
  const arch = os.arch();
  const platform = os.platform();
  
  return {
    model,
    architecture: arch,
    platform,
    cores,
    logicalCores,
    physicalCores: physicalCores ? physicalCores.split(',').length : Math.floor(cores / 2),
    clockSpeed: speed,
    clockSpeedGHz: (speed / 1000).toFixed(2) + ' GHz'
  };
}

function getMemoryInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  
  // Try to get more details from /proc
  const meminfo = readFileSafe('/proc/meminfo');
  let memAvailable = null;
  
  if (meminfo) {
    const match = meminfo.match(/MemAvailable:\s+(\d+)/);
    if (match) memAvailable = parseInt(match[1]) * 1024;
  }
  
  return {
    total,
    free,
    used,
    available: memAvailable || free,
    totalGB: (total / 1024 / 1024 / 1024).toFixed(2) + ' GB',
    usedGB: (used / 1024 / 1024 / 1024).toFixed(2) + ' GB',
    freeGB: (free / 1024 / 1024 / 1024).toFixed(2) + ' GB',
    percentUsed: Math.round((used / total) * 100) + '%'
  };
}

function getStorageInfo() {
  const info = {
    disks: []
  };
  
  try {
    const mounts = readFileSafe('/proc/mounts');
    if (mounts) {
      const lines = mounts.split('\n');
      const seen = new Set();
      
      for (const line of lines) {
        const parts = line.split(' ');
        if (parts.length > 2 && parts[0].startsWith('/dev/')) {
          const device = parts[0];
          const mount = parts[1];
          const fs = parts[2];
          
          if (!seen.has(device) && (fs === 'ext4' || fs === 'ext3' || fs === 'xfs' || fs === 'btrfs' || fs === 'tmpfs')) {
            seen.add(device);
            try {
              const stats = fs.statSync(mount);
              // Try to get size info
              info.disks.push({
                device,
                mountpoint: mount,
                filesystem: fs,
                type: fs
              });
            } catch (e) {
              info.disks.push({
                device,
                mountpoint: mount,
                filesystem: fs
              });
            }
          }
        }
      }
    }
  } catch (e) {
    // Fallback
  }
  
  // Add root filesystem
  try {
    const cwd = process.cwd();
    const stats = fs.statSync(cwd);
    info.root = {
      available: 'Unknown',
      cwd
    };
  } catch (e) {}
  
  return info;
}

function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const result = [];
  
  for (const [name, addrs] of Object.entries(interfaces)) {
    const iface = {
      name,
      addresses: addrs.map(a => ({
        address: a.address,
        family: a.family,
        internal: a.internal,
        mac: a.mac || 'N/A'
      }))
    };
    result.push(iface);
  }
  
  return result;
}

function getSystemInfo() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    uptime: os.uptime(),
    uptimeFormatted: formatUptime(os.uptime()),
    loadAverage: os.loadavg(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem()
  };
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.component) {
    console.log('Hardware Prober');
    console.log('Usage: hardware-probe.js --component <cpu|memory|storage|network|all> [--json]');
    process.exit(1);
  }
  
  let result = {};
  
  switch (args.component) {
    case 'cpu':
      result = getCpuInfo();
      break;
    case 'memory':
      result = getMemoryInfo();
      break;
    case 'storage':
      result = getStorageInfo();
      break;
    case 'network':
      result = getNetworkInfo();
      break;
    case 'all':
      result = {
        cpu: getCpuInfo(),
        memory: getMemoryInfo(),
        storage: getStorageInfo(),
        network: getNetworkInfo(),
        system: getSystemInfo()
      };
      break;
    default:
      console.error(`Unknown component: ${args.component}`);
      process.exit(1);
  }
  
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    switch (args.component) {
      case 'cpu':
        console.log('CPU Information');
        console.log('═══════════════');
        console.log(`Model: ${result.model}`);
        console.log(`Architecture: ${result.architecture}`);
        console.log(`Cores: ${result.cores} logical, ${result.physicalCores} physical`);
        console.log(`Clock Speed: ${result.clockSpeedGHz}`);
        break;
        
      case 'memory':
        console.log('Memory Information');
        console.log('══════════════════');
        console.log(`Total: ${result.totalGB}`);
        console.log(`Used: ${result.usedGB} (${result.percentUsed})`);
        console.log(`Free: ${result.freeGB}`);
        break;
        
      case 'storage':
        console.log('Storage Information');
        console.log('═══════════════════');
        if (result.disks.length > 0) {
          for (const disk of result.disks) {
            console.log(`${disk.device} on ${disk.mountpoint} (${disk.filesystem})`);
          }
        } else {
          console.log('No disk information available');
        }
        break;
        
      case 'network':
        console.log('Network Interfaces');
        console.log('══════════════════');
        for (const iface of result) {
          console.log(`${iface.name}:`);
          for (const addr of iface.addresses) {
            const type = addr.internal ? '[internal]' : '';
            console.log(`  ${addr.family}: ${addr.address} ${type}`);
          }
        }
        break;
        
      case 'all':
        console.log('System Overview');
        console.log('═══════════════');
        console.log('');
        console.log('CPU:');
        console.log(`  ${result.cpu.model}`);
        console.log(`  ${result.cpu.cores} cores @ ${result.cpu.clockSpeedGHz}`);
        console.log('');
        console.log('Memory:');
        console.log(`  Total: ${result.memory.totalGB}`);
        console.log(`  Used: ${result.memory.percentUsed}`);
        console.log('');
        console.log('Network:');
        for (const iface of result.network) {
          if (!iface.addresses.every(a => a.internal)) {
            console.log(`  ${iface.name}`);
          }
        }
        console.log('');
        console.log('System:');
        console.log(`  Hostname: ${result.system.hostname}`);
        console.log(`  Platform: ${result.system.platform} ${result.system.release}`);
        console.log(`  Uptime: ${result.system.uptimeFormatted}`);
        break;
    }
  }
}

main();