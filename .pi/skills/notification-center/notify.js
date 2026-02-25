#!/usr/bin/env node
/**
 * Notification sender
 */

const fs = require('fs');
const path = require('path');

const NOTIFICATIONS_FILE = '/tmp/notifications.jsonl';

// Priority levels with colors
const PRIORITIES = {
  critical: { level: 4, icon: '🚨', color: '\x1b[31m' },
  warning: { level: 3, icon: '⚠️', color: '\x1b[33m' },
  info: { level: 2, icon: 'ℹ️', color: '\x1b[36m' },
  debug: { level: 1, icon: '🐛', color: '\x1b[90m' }
};

function sendNotification(message, options = {}) {
  const priority = PRIORITIES[options.priority] || PRIORITIES.info;
  const notification = {
    id: Math.random().toString(36).slice(2, 10),
    timestamp: new Date().toISOString(),
    message,
    priority: options.priority || 'info',
    source: options.source || 'notification-center',
    tags: options.tags || []
  };
  
  // Log to console
  const reset = '\x1b[0m';
  console.log(`${priority.color}${priority.icon} [${notification.priority.toUpperCase()}] ${message}${reset}`);
  if (options.tags.length > 0) {
    console.log(`   Tags: ${options.tags.join(', ')}`);
  }
  
  // Save to file
  fs.appendFileSync(NOTIFICATIONS_FILE, JSON.stringify(notification) + '\n');
  
  return { success: true, id: notification.id };
}

// Parse args
const args = process.argv.slice(2);
const message = args.filter(a => !a.startsWith('--')).join(' ');
const priority = args.find((a, i) => args[i-1] === '--priority') || 'info';
const tags = (args.find((a, i) => args[i-1] === '--tags') || '').split(',').filter(Boolean);

if (!message) {
  console.error('Usage: notify.js "message" --priority critical --tags tag1,tag2');
  process.exit(1);
}

sendNotification(message, { priority, tags });
