#!/usr/bin/env node
const fs = require('fs');
const NOTIFICATIONS_FILE = '/tmp/notifications.jsonl';

function loadNotifications(limit = 20) {
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) return [];
    const lines = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

const limit = parseInt(process.argv[2]) || 20;
const notifications = loadNotifications(limit);

console.log(`📢 Notifications (${notifications.length} total)\n`);

const icons = { critical: '🚨', warning: '⚠️', info: 'ℹ️', debug: '🐛' };

notifications.forEach(n => {
  const time = new Date(n.timestamp).toLocaleTimeString();
  const icon = icons[n.priority] || '•';
  console.log(`${icon} [${time}] ${n.message}`);
  if (n.tags?.length > 0) {
    console.log(`   Tags: ${n.tags.join(', ')}`);
  }
});

if (notifications.length === 0) {
  console.log('No notifications yet');
}
