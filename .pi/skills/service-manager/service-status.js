#!/usr/bin/env node
/**
 * Service Status - Check running processes
 */
const { execSync } = require('child_process');

function getProcessStatus() {
  try {
    const psOutput = execSync("ps aux | grep -E 'node|npm|pm2' | grep -v grep | head -20", { encoding: 'utf8' });
    const lines = psOutput.trim().split('\n').filter(l => l);
    
    console.log('🔧 Running Services\n');
    
    const services = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        user: parts[0],
        pid: parts[1],
        cpu: parts[2],
        mem: parts[3],
        time: parts[9],
        command: parts.slice(10).join(' ').slice(0, 60)
      };
    });
    
    if (services.length === 0) {
      console.log('No Node.js/npm/pm2 services found');
      return [];
    }
    
    console.log(`  ${'PID'.padEnd(8)} ${'CPU'.padEnd(6)} ${'MEM'.padEnd(6)} ${'TIME'.padEnd(10)} COMMAND`);
    console.log(`  ${'-'.repeat(70)}`);
    
    services.forEach(s => {
      console.log(`  ${s.pid.padEnd(8)} ${s.cpu.padEnd(6)} ${s.mem.padEnd(6)} ${s.time.padEnd(10)} ${s.command}`);
    });
    
    console.log(`\nTotal: ${services.length} processes`);
    return services;
  } catch (err) {
    console.log('No services found or ps not available:', err.message);
    return [];
  }
}

getProcessStatus();

module.exports = { getProcessStatus };
