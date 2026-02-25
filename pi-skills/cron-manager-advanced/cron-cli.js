#!/usr/bin/env node

/**
 * Advanced Cron Manager CLI
 * Based on zeroclaw's cron_add/cron_list/cron_remove tools
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CRON_DIR = process.env.CRON_DIR || path.join(process.cwd(), '.crons');
const CRON_FILE = path.join(CRON_DIR, 'jobs.json');

// Ensure cron directory exists
function ensureCronDir() {
  if (!fs.existsSync(CRON_DIR)) {
    fs.mkdirSync(CRON_DIR, { recursive: true });
  }
}

// Load cron jobs
function loadCrons() {
  ensureCronDir();
  if (fs.existsSync(CRON_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CRON_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

// Save cron jobs
function saveCrons(jobs) {
  ensureCronDir();
  fs.writeFileSync(CRON_FILE, JSON.stringify(jobs, null, 2));
}

// Validate cron expression
function validateCron(expression) {
  const parts = expression.split(/\s+/);
  if (parts.length < 5 || parts.length > 6) {
    return { valid: false, error: 'Cron expression must have 5-6 fields' };
  }
  return { valid: true };
}

// Parse cron description
function parseCronDescription(schedule) {
  const schedules = {
    'every minute': '* * * * *',
    'every hour': '0 * * * *',
    'every day': '0 0 * * *',
    'every week': '0 0 * * 0',
    'every month': '0 0 1 * *',
    'daily': '0 0 * * *',
    'weekly': '0 0 * * 0',
    'monthly': '0 0 1 * *',
    'hourly': '0 * * * *'
  };
  
  const lower = schedule.toLowerCase();
  
  // Check for exact match
  if (schedules[lower]) {
    return schedules[lower];
  }
  
  // Check for "at X" patterns
  const atMatch = schedule.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (atMatch) {
    let hour = parseInt(atMatch[1]);
    const minute = parseInt(atMatch[2] || '0');
    const period = atMatch[3]?.toLowerCase();
    
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    
    return `${minute} ${hour} * * *`;
  }
  
  return null;
}

// Add cron job
function addCron(args) {
  const { 
    name, 
    schedule, 
    command,
    description = '',
    enabled = true,
    type = 'command' // command, agent
  } = args;
  
  if (!name) {
    return { success: false, output: 'Name is required', error: 'Missing name' };
  }
  
  if (!command && !args.job) {
    return { success: false, output: 'Command or job is required', error: 'Missing command/job' };
  }
  
  // Parse schedule
  let cronExpr = schedule;
  if (!cronExpr.startsWith('*') && !/^\d/.test(cronExpr)) {
    cronExpr = parseCronDescription(schedule);
    if (!cronExpr) {
      return { success: false, output: 'Invalid schedule format', error: 'Invalid schedule' };
    }
  }
  
  const validation = validateCron(cronExpr);
  if (!validation.valid) {
    return { success: false, output: validation.error, error: validation.error };
  }
  
  const crons = loadCrons();
  
  // Check for duplicate name
  if (crons.find(c => c.name === name)) {
    return { success: false, output: `Cron job "${name}" already exists`, error: 'Duplicate name' };
  }
  
  const newCron = {
    id: `cron-${Date.now()}`,
    name,
    schedule: cronExpr,
    command: command || args.job,
    description,
    enabled,
    type,
    created_at: new Date().toISOString(),
    last_run: null,
    run_count: 0
  };
  
  crons.push(newCron);
  saveCrons(crons);
  
  return {
    success: true,
    output: `Cron job "${name}" added successfully!\n` +
      `Schedule: ${cronExpr}\n` +
      `Command: ${command || args.job}\n` +
      `Enabled: ${enabled}`,
    error: null,
    cron: newCron
  };
}

// List cron jobs
function listCrons(args) {
  const { filter, enabled } = args;
  
  let crons = loadCrons();
  
  // Filter by enabled status
  if (enabled !== undefined) {
    crons = crons.filter(c => c.enabled === enabled);
  }
  
  // Filter by name
  if (filter) {
    crons = crons.filter(c => 
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.description?.toLowerCase().includes(filter.toLowerCase())
    );
  }
  
  if (crons.length === 0) {
    return { success: true, output: 'No cron jobs found.', error: null, crons: [] };
  }
  
  let output = `Cron Jobs (${crons.length} total):\n\n`;
  
  for (const cron of crons) {
    const status = cron.enabled ? '✓' : '✗';
    output += `${status} ${cron.name}\n`;
    output += `   Schedule: ${cron.schedule}\n`;
    output += `   Command: ${cron.command?.slice(0, 50)}${cron.command?.length > 50 ? '...' : ''}\n`;
    if (cron.description) {
      output += `   Description: ${cron.description}\n`;
    }
    output += `   Runs: ${cron.run_count || 0}\n`;
    if (cron.last_run) {
      output += `   Last run: ${cron.last_run}\n`;
    }
    output += '\n';
  }
  
  return { success: true, output, error: null, crons };
}

// Remove cron job
function removeCron(args) {
  const { name, id } = args;
  
  if (!name && !id) {
    return { success: false, output: 'Name or ID is required', error: 'Missing identifier' };
  }
  
  const crons = loadCrons();
  const index = crons.findIndex(c => c.name === name || c.id === id);
  
  if (index === -1) {
    return { success: false, output: 'Cron job not found', error: 'Not found' };
  }
  
  const removed = crons.splice(index, 1)[0];
  saveCrons(crons);
  
  return {
    success: true,
    output: `Removed cron job: ${removed.name}`,
    error: null,
    removed
  };
}

// Enable/disable cron job
function enableCron(args) {
  const { name, id, enabled } = args;
  
  if (!name && !id) {
    return { success: false, output: 'Name or ID is required', error: 'Missing identifier' };
  }
  
  if (enabled === undefined) {
    return { success: false, output: 'Enabled status required', error: 'Missing enabled' };
  }
  
  const crons = loadCrons();
  const cron = crons.find(c => c.name === name || c.id === id);
  
  if (!cron) {
    return { success: false, output: 'Cron job not found', error: 'Not found' };
  }
  
  cron.enabled = enabled;
  saveCrons(crons);
  
  return {
    success: true,
    output: `Cron job "${cron.name}" ${enabled ? 'enabled' : 'disabled'}`,
    error: null,
    cron
  };
}

// Update cron job
function updateCron(args) {
  const { name, schedule, command, description } = args;
  
  if (!name) {
    return { success: false, output: 'Name is required', error: 'Missing name' };
  }
  
  const crons = loadCrons();
  const cron = crons.find(c => c.name === name);
  
  if (!cron) {
    return { success: false, output: 'Cron job not found', error: 'Not found' };
  }
  
  if (schedule) {
    const validation = validateCron(schedule);
    if (!validation.valid) {
      return { success: false, output: validation.error, error: validation.error };
    }
    cron.schedule = schedule;
  }
  
  if (command) cron.command = command;
  if (description !== undefined) cron.description = description;
  
  saveCrons(crons);
  
  return {
    success: true,
    output: `Updated cron job: ${cron.name}`,
    error: null,
    cron
  };
}

// CLI routing
const command = process.argv[2];
let args = {};

if (process.argv[3]) {
  try {
    args = JSON.parse(process.argv[3]);
  } catch {
    args = {};
  }
}

let result;

switch (command) {
  case 'add':
    result = addCron(args);
    break;
  case 'list':
    result = listCrons(args);
    break;
  case 'remove':
    result = removeCron(args);
    break;
  case 'enable':
  case 'disable':
    result = enableCron(args);
    break;
  case 'update':
    result = updateCron(args);
    break;
  default:
    result = {
      success: false,
      output: `Unknown command: ${command}. Available: add, list, remove, enable, disable, update`,
      error: 'Unknown command'
    };
}

console.log(JSON.stringify(result, null, 2));
