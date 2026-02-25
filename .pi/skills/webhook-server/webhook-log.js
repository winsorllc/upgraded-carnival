#!/usr/bin/env node
/**
 * Webhook Log Viewer
 */

const fs = require('fs');

const LOG_PATH = '/tmp/webhook-logs.jsonl';

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    tail: parseInt(args.find((_, i) => args[i-1] === '--tail') || '20'),
    showErrors: args.includes('--errors'),
    showSuccess: args.includes('--success'),
    format: args.includes('--json') ? 'json' : 'pretty'
  };
}

function loadLogs() {
  try {
    if (!fs.existsSync(LOG_PATH)) {
      return [];
    }
    const content = fs.readFileSync(LOG_PATH, 'utf8');
    return content.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch (err) {
    console.error('Error reading logs:', err.message);
    return [];
  }
}

function filterLogs(logs, opts) {
  if (opts.showErrors) {
    return logs.filter(l => l.error || l.status >= 400);
  }
  if (opts.showSuccess) {
    return logs.filter(l => l.status < 400);
  }
  return logs;
}

function formatPretty(log) {
  const time = new Date(log.timestamp).toLocaleTimeString();
  const icon = log.status >= 400 ? '❌' : log.error ? '⚠️' : '✓';
  console.log(`${icon} [${time}] ${log.method || 'LOG'} ${log.url || log.message || ''}`);
  
  if (log.body) {
    const body = typeof log.body === 'object' ? log.body : JSON.parse(log.body || '{}');
    if (Object.keys(body).length > 0) {
      console.log(`  Body: ${JSON.stringify(body).slice(0, 200)}${JSON.stringify(body).length > 200 ? '...' : ''}`);
    }
  }
  
  if (log.error) {
    console.log(`  Error: ${log.error}`);
  }
  
  console.log();
}

function main() {
  const opts = parseArgs();
  const logs = loadLogs();
  const filtered = filterLogs(logs, opts);
  const display = filtered.slice(-opts.tail);
  
  console.log(`📋 Showing ${display.length} of ${filtered.length} logs (filtered from ${logs.length} total)\n`);
  
  if (opts.format === 'json') {
    console.log(JSON.stringify(display, null, 2));
  } else {
    display.forEach(formatPretty);
  }
}

main();