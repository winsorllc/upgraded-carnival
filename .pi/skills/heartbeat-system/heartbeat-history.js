#!/usr/bin/env node
const fs = require('fs');
const HISTORY_FILE = '/tmp/heartbeat-history.jsonl';

function loadHistory(count = 20) {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    const lines = fs.readFileSync(HISTORY_FILE, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-count).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

const history = loadHistory(process.argv[2] || 20);
console.log(`📊 Last ${history.length} heartbeats\n`);

history.forEach(h => {
  const icon = h.healthy ? '💚' : '❤️';
  const time = new Date(h.timestamp).toLocaleTimeString();
  console.log(`${icon} ${time} - ${h.healthy ? 'healthy' : 'unhealthy'} (${h.duration_ms}ms)`);
});

if (history.length === 0) {
  console.log('No heartbeats recorded yet');
}
