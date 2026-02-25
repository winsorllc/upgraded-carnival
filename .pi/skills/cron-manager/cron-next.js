#!/usr/bin/env node
const { getNextRun } = require('./cron-utils.js');

const expr = process.argv[2];
if (!expr) {
  console.error('Usage: cron-next.js "0 9 * * *"');
  process.exit(1);
}

const next = getNextRun(expr);
console.log(`Next run: ${next.toISOString()}`);
console.log(`Local: ${next.toLocaleString()}`);
