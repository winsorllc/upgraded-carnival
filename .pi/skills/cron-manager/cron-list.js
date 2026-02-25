#!/usr/bin/env node
const { listJobs } = require('./cron-utils.js');
const path = require('path');

const configPath = process.argv[2] || '/job/config/CRONS.json';
const jobs = listJobs(configPath);

if (jobs.error) {
  console.error(`❌ Error: ${jobs.error}`);
  process.exit(1);
}

console.log('📅 Cron Jobs\n');
jobs.forEach((job, i) => {
  const icon = job.valid ? '✅' : '❌';
  const status = job.enabled !== false ? '🟢' : '⚪';
  console.log(`${i + 1}. ${icon} ${job.name}`);
  console.log(`   Schedule: ${job.schedule}`);
  console.log(`   Description: ${job.description}`);
  console.log(`   Status: ${status} ${job.enabled !== false ? 'enabled' : 'disabled'}`);
  if (job.type) console.log(`   Type: ${job.type}`);
  console.log();
});

console.log(`Total: ${jobs.length} jobs`);
