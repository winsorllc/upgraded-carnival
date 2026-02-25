#!/usr/bin/env node
/**
 * Generate comprehensive health report
 * @module system-health/health-report
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Import check functions
import { getCPUUsage, getMemoryUsage, getDiskUsage } from './check-resources.js';
import { checkService } from './check-service.js';
import { checkAPIs } from './check-api.js';

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

function getProcessList(sortBy = 'cpu', limit = 10) {
  try {
    const cmd = sortBy === 'memory' 
      ? `ps aux --sort=-%mem | head -${limit + 1}`
      : `ps aux --sort=-%cpu | head -${limit + 1}`;
    const output = safeExec(cmd);
    if (!output) return [];
    
    const lines = output.split('\n');
    const headers = lines[0].split(/\s+/);
    const processes = [];
    
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/\s+/);
      if (parts.length >= 11) {
        const proc = {};
        headers.forEach((h, idx) => {
          proc[h.toLowerCase()] = parts[idx];
        });
        processes.push(proc);
      }
    }
    
    return processes;
  } catch (e) {
    return [];
  }
}

function evaluateThresholds(resources, thresholds) {
  const alerts = [];
  
  if (!thresholds) {
    thresholds = {
      cpuWarning: 70,
      cpuCritical: 90,
      memoryWarning: 75,
      memoryCritical: 90,
      diskWarning: 80,
      diskCritical: 95
    };
  }
  
  // CPU alerts
  if (resources.cpu && resources.cpu.usage >= thresholds.cpuCritical) {
    alerts.push({
      level: 'CRITICAL',
      metric: 'cpu',
      value: resources.cpu.usage,
      threshold: thresholds.cpuCritical,
      message: `CPU usage at ${resources.cpu.usage}% (threshold: ${thresholds.cpuCritical}%)`,
      recommendation: 'Identify high-CPU processes, consider scaling or optimizing'
    });
  } else if (resources.cpu && resources.cpu.usage >= thresholds.cpuWarning) {
    alerts.push({
      level: 'WARNING',
      metric: 'cpu',
      value: resources.cpu.usage,
      threshold: thresholds.cpuWarning,
      message: `CPU usage at ${resources.cpu.usage}% (threshold: ${thresholds.cpuWarning}%)`,
      recommendation: 'Monitor CPU usage trends'
    });
  }
  
  // Memory alerts
  if (resources.memory && resources.memory.usagePercent >= thresholds.memoryCritical) {
    alerts.push({
      level: 'CRITICAL',
      metric: 'memory',
      value: resources.memory.usagePercent,
      threshold: thresholds.memoryCritical,
      message: `Memory usage at ${resources.memory.usagePercent}% (threshold: ${thresholds.memoryCritical}%)`,
      recommendation: 'Free up memory, check for memory leaks'
    });
  } else if (resources.memory && resources.memory.usagePercent >= thresholds.memoryWarning) {
    alerts.push({
      level: 'WARNING',
      metric: 'memory',
      value: resources.memory.usagePercent,
      threshold: thresholds.memoryWarning,
      message: `Memory usage at ${resources.memory.usagePercent}% (threshold: ${thresholds.memoryWarning}%)`,
      recommendation: 'Monitor memory usage trends'
    });
  }
  
  // Disk alerts
  if (resources.disk && resources.disk.usagePercent >= thresholds.diskCritical) {
    alerts.push({
      level: 'CRITICAL',
      metric: 'disk',
      value: resources.disk.usagePercent,
      threshold: thresholds.diskCritical,
      message: `Disk usage at ${resources.disk.usagePercent}% (threshold: ${thresholds.diskCritical}%)`,
      recommendation: 'Clean up /job/tmp/ or expand storage'
    });
  } else if (resources.disk && resources.disk.usagePercent >= thresholds.diskWarning) {
    alerts.push({
      level: 'WARNING',
      metric: 'disk',
      value: resources.disk.usagePercent,
      threshold: thresholds.diskWarning,
      message: `Disk usage at ${resources.disk.usagePercent}% (threshold: ${thresholds.diskWarning}%)`,
      recommendation: 'Consider cleaning up old files'
    });
  }
  
  return alerts;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let num = bytes;
  while (num >= 1024 && i < units.length - 1) {
    num /= 1024;
    i++;
  }
  return `${num.toFixed(1)} ${units[i]}`;
}

function formatTextReport(report) {
  let text = '═══════════════════════════════════════════════════════════\n';
  text += `  SYSTEM HEALTH REPORT - ${report.timestamp}\n`;
  text += `  Overall Status: ${report.overall.toUpperCase()}\n`;
  text += '═══════════════════════════════════════════════════════════\n\n';
  
  // Resources
  text += '┌──────────────────────────────────────────────────────────┐\n';
  text += '│  SYSTEM RESOURCES                                        │\n';
  text += '└──────────────────────────────────────────────────────────┘\n';
  
  if (report.resources.cpu) {
    text += `  CPU: ${report.resources.cpu.usage}% usage (${report.resources.cpu.cores} cores)\n`;
    text += `  Load Average: ${report.resources.cpu.load.join(', ')}\n`;
  }
  
  if (report.resources.memory) {
    text += `  Memory: ${formatBytes(report.resources.memory.used)} / ${formatBytes(report.resources.memory.total)} (${report.resources.memory.usagePercent}%)\n`;
  }
  
  if (report.resources.disk) {
    text += `  Disk: ${formatBytes(report.resources.disk.used)} / ${formatBytes(report.resources.disk.total)} (${report.resources.disk.usagePercent}%)\n`;
  }
  
  text += '\n';
  
  // Services
  if (report.services && report.services.length > 0) {
    text += '┌──────────────────────────────────────────────────────────┐\n';
    text += '│  SERVICE HEALTH                                          │\n';
    text += '└──────────────────────────────────────────────────────────┘\n';
    for (const svc of report.services) {
      const icon = svc.status === 'healthy' ? '✓' : '✗';
      text += `  [${icon}] ${svc.name || svc.url}: ${svc.status} (${svc.responseTime}ms)\n`;
    }
    text += '\n';
  }
  
  // APIs
  if (report.apis && report.apis.length > 0) {
    text += '┌──────────────────────────────────────────────────────────┐\n';
    text += '│  API CONNECTIVITY                                        │\n';
    text += '└──────────────────────────────────────────────────────────┘\n';
    for (const api of report.apis) {
      const icon = api.status === 'healthy' ? '✓' : '✗';
      text += `  [${icon}] ${api.provider}: ${api.status}`;
      if (api.authenticated) text += ' (authenticated)';
      if (api.error) text += ` - ${api.error}`;
      text += '\n';
    }
    text += '\n';
  }
  
  // Alerts
  if (report.alerts && report.alerts.length > 0) {
    text += '┌──────────────────────────────────────────────────────────┐\n';
    text += '│  ALERTS                                                  │\n';
    text += '└──────────────────────────────────────────────────────────┘\n';
    for (const alert of report.alerts) {
      text += `  [${alert.level}] ${alert.message}\n`;
      text += `         → ${alert.recommendation}\n`;
    }
    text += '\n';
  }
  
  // Top Processes
  if (report.processes && report.processes.length > 0) {
    text += '┌──────────────────────────────────────────────────────────┐\n';
    text += '│  TOP PROCESSES (by CPU)                                  │\n';
    text += '└──────────────────────────────────────────────────────────┘\n';
    text += '  PID    USER     CPU%   MEM%   COMMAND\n';
    text += '  ' + '─'.repeat(50) + '\n';
    for (const proc of report.processes.slice(0, 5)) {
      const pid = (proc.pid || '').padEnd(7);
      const user = (proc.user || '').padEnd(9);
      const cpu = (proc['%cpu'] || '0.0').padEnd(7);
      const mem = (proc['%mem'] || '0.0').padEnd(7);
      const cmd = proc.command || proc.cmd || '';
      text += `  ${pid}${user}${cpu}${mem}${cmd.substring(0, 20)}\n`;
    }
  }
  
  text += '\n═══════════════════════════════════════════════════════════\n';
  return text;
}

async function generateReport(options = {}) {
  const {
    checkServices = [],
    format = 'json',
    output = null,
    thresholds = null
  } = options;
  
  const report = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    resources: {
      cpu: getCPUUsage(),
      memory: getMemoryUsage(),
      disk: getDiskUsage('/job')
    },
    services: [],
    apis: await checkAPIs(),
    processes: getProcessList('cpu'),
    alerts: []
  };
  
  // Check configured services
  for (const svc of checkServices) {
    const result = await checkService(svc.url, svc.timeout || 5000);
    result.name = svc.name || svc.url;
    report.services.push(result);
  }
  
  // Evaluate thresholds
  report.alerts = evaluateThresholds(report.resources, thresholds);
  
  // Determine overall health
  const hasCritical = report.alerts.some(a => a.level === 'CRITICAL');
  const hasWarning = report.alerts.some(a => a.level === 'WARNING');
  const hasUnhealthyService = report.services.some(s => s.status !== 'healthy');
  
  if (hasCritical || hasUnhealthyService) {
    report.overall = 'critical';
  } else if (hasWarning) {
    report.overall = 'warning';
  }
  
  // Format output
  let outputContent;
  if (format === 'text') {
    outputContent = formatTextReport(report);
  } else {
    outputContent = JSON.stringify(report, null, 2);
  }
  
  // Write to file if specified
  if (output) {
    fs.writeFileSync(output, outputContent, 'utf8');
    console.log(`Report written to ${output}`);
  }
  
  // Also print to stdout
  console.log(outputContent);
  
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  
  let format = 'json';
  let output = null;
  let services = [];
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) {
      format = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      output = args[i + 1];
      i++;
    } else if (args[i] === '--service' && args[i + 1]) {
      const [name, url] = args[i + 1].split('=');
      services.push({ name, url });
      i++;
    }
  }
  
  await generateReport({ format, output, checkServices: services });
}

export { generateReport };

if (process.argv[1] && process.argv[1].endsWith('health-report.js')) {
  main();
}
