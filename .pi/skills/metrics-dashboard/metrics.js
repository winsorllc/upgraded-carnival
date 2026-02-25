#!/usr/bin/env node
/**
 * Metrics Dashboard - System metrics and statistics
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

class MetricsDashboard {
  constructor() {
    this.metricsDir = '/job/tmp/.metrics';
    this.ensureMetricsDir();
  }

  ensureMetricsDir() {
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
  }

  getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      timestamp: new Date().toISOString(),
      cpu: {
        count: os.cpus().length,
        load: os.loadavg(),
      },
      memory: {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        percent: Math.round((usedMem / totalMem) * 100),
      },
      uptime: this.formatUptime(os.uptime()),
      platform: `${os.platform()} ${os.arch()}`,
      hostname: os.hostname(),
    };
  }

  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }
    return `${size.toFixed(2)} ${units[unit]}`;
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  drawBar(value, max, width = 20) {
    const filled = Math.round((value / max) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const color = value > 80 ? colors.red : value > 60 ? colors.yellow : colors.green;
    return `${color}${bar}${colors.reset}`;
  }

  printReport(metrics) {
    console.clear();
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════╗`);
    console.log(`║           PopeBot Metrics Dashboard                    ║`);
    console.log(`╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.bold}System Information${colors.reset}`);
    console.log(`${'─'.repeat(50)}`);
    console.log(`Platform:  ${metrics.platform}`);
    console.log(`Hostname:  ${metrics.hostname}`);
    console.log(`Uptime:    ${metrics.uptime}`);

    console.log(`\n${colors.bold}CPU${colors.reset}`);
    console.log(`${'─'.repeat(50)}`);
    console.log(`Cores:     ${metrics.cpu.count}`);
    console.log(`Load:      ${metrics.cpu.load.map(l => l.toFixed(2)).join(', ')}`);

    console.log(`\n${colors.bold}Memory${colors.reset}`);
    console.log(`${'─'.repeat(50)}`);
    const memBar = this.drawBar(metrics.memory.percent, 100);
    console.log(`${memBar} ${metrics.memory.percent}%`);
    console.log(`  Total: ${metrics.memory.total}`);
    console.log(`  Used:  ${metrics.memory.used}`);
    console.log(`  Free:  ${metrics.memory.free}`);

    // Process info
    try {
      const memUsage = process.memoryUsage();
      console.log(`\n${colors.bold}Process${colors.reset}`);
      console.log(`${'─'.repeat(50)}`);
      console.log(`RSS:     ${this.formatBytes(memUsage.rss)}`);
      console.log(`Heap:    ${this.formatBytes(memUsage.heapUsed)} / ${this.formatBytes(memUsage.heapTotal)}`);
      console.log(`External: ${this.formatBytes(memUsage.external)}`);
    } catch (e) {
      // Ignore
    }

    console.log(`\n${colors.gray}Generated: ${metrics.timestamp}${colors.reset}`);
  }

  async live() {
    const readline = require('readline');
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    let running = true;

    process.stdin.on('keypress', (str, key) => {
      if (key?.name === 'q' || (key?.ctrl && key?.name === 'c')) {
        running = false;
        process.stdin.setRawMode(false);
        process.stdin.pause();
        console.log('\n' + colors.green + 'Exiting...' + colors.reset);
        process.exit(0);
      }
    });

    console.log(`${colors.gray}Press 'q' to quit, 'c' to clear${colors.reset}\n`);

    while (running) {
      const metrics = this.getSystemMetrics();
      this.printReport(metrics);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  export(format = 'json') {
    const metrics = this.getSystemMetrics();
    
    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    }
    
    if (format === 'csv') {
      return [
        'timestamp,hostname,platform,cpu_count,cpu_load_1m,memory_total,memory_percent',
        `${metrics.timestamp},${metrics.hostname},${metrics.platform},${metrics.cpu.count},${metrics.cpu.load[0]},${metrics.memory.total},${metrics.memory.percent}`,
      ].join('\n');
    }
    
    return JSON.stringify(metrics);
  }

  run() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help') {
      console.log('Metrics Dashboard - System metrics and statistics');
      console.log('');
      console.log('Commands:');
      console.log('  report                           Show metrics report');
      console.log('  live                             Show live updating dashboard (q to quit)');
      console.log('  export --format [json|csv]       Export metrics');
      console.log('  help                             Show this help');
      process.exit(0);
    }

    if (command === 'report') {
      const metrics = this.getSystemMetrics();
      this.printReport(metrics);
    }

    if (command === 'live') {
      this.live();
    }

    if (command === 'export') {
      const formatIdx = args.indexOf('--format');
      const format = formatIdx > -1 ? args[formatIdx + 1] : 'json';
      const output = this.export(format);
      
      const outputIdx = args.indexOf('--output');
      if (outputIdx > -1) {
        fs.writeFileSync(args[outputIdx + 1], output);
        console.log('Exported successfully');
      } else {
        console.log(output);
      }
    }
  }
}

if (require.main === module) {
  const metrics = new MetricsDashboard();
  metrics.run();
}

module.exports = { MetricsDashboard };
