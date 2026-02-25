#!/usr/bin/env node

/**
 * Cron Manager - Manage cron jobs
 * 
 * Usage: cron-manager.js <command> [options]
 * Commands: list, add, remove, enable, disable, next
 */

const fs = require('fs');
const path = require('path');

const CRONS_FILE = path.join(__dirname, '..', '..', 'config', 'CRONS.json');

/**
 * Load cron jobs from config
 */
function loadCrons() {
  try {
    if (fs.existsSync(CRONS_FILE)) {
      return JSON.parse(fs.readFileSync(CRONS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading crons:', e.message);
  }
  return [];
}

/**
 * Save cron jobs to config
 */
function saveCrons(crons) {
  const dir = path.dirname(CRONS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CRONS_FILE, JSON.stringify(crons, null, 2));
}

/**
 * List all cron jobs
 */
function listCrons() {
  const crons = loadCrons();
  
  if (crons.length === 0) {
    return { count: 0, crons: [], message: 'No cron jobs defined' };
  }
  
  return {
    count: crons.length,
    crons: crons.map(c => ({
      name: c.name,
      schedule: c.schedule,
      type: c.type || 'agent',
      enabled: c.enabled !== false,
      job: c.job || null,
      command: c.command || null
    }))
  };
}

/**
 * Add a cron job
 */
function addCron(name, schedule, options = {}) {
  const crons = loadCrons();
  
  // Check if name already exists
  if (crons.some(c => c.name === name)) {
    return { success: false, error: `Cron job "${name}" already exists` };
  }
  
  const newCron = {
    name,
    schedule,
    type: options.type || 'agent',
    enabled: options.enabled !== false
  };
  
  if (options.job) {
    newCron.job = options.job;
  }
  
  if (options.command) {
    newCron.command = options.command;
  }
  
  crons.push(newCron);
  saveCrons(crons);
  
  return { success: true, name, message: `Added cron job: ${name}` };
}

/**
 * Remove a cron job
 */
function removeCron(name) {
  const crons = loadCrons();
  const index = crons.findIndex(c => c.name === name);
  
  if (index === -1) {
    return { success: false, error: `Cron job "${name}" not found` };
  }
  
  crons.splice(index, 1);
  saveCrons(crons);
  
  return { success: true, name, message: `Removed cron job: ${name}` };
}

/**
 * Enable a cron job
 */
function enableCron(name) {
  const crons = loadCrons();
  const cron = crons.find(c => c.name === name);
  
  if (!cron) {
    return { success: false, error: `Cron job "${name}" not found` };
  }
  
  cron.enabled = true;
  saveCrons(crons);
  
  return { success: true, name, message: `Enabled cron job: ${name}` };
}

/**
 * Disable a cron job
 */
function disableCron(name) {
  const crons = loadCrons();
  const cron = crons.find(c => c.name === name);
  
  if (!cron) {
    return { success: false, error: `Cron job "${name}" not found` };
  }
  
  cron.enabled = false;
  saveCrons(crons);
  
  return { success: true, name, message: `Disabled cron job: ${name}` };
}

/**
 * Show next run times
 */
function showNextRuns() {
  const crons = loadCrons();
  
  const results = crons.map(cron => {
    const next = getNextRunTime(cron.schedule);
    return {
      name: cron.name,
      schedule: cron.schedule,
      enabled: cron.enabled !== false,
      nextRun: next
    };
  });
  
  return { crons: results };
}

/**
 * Calculate next run time from cron expression (simplified)
 */
function getNextRunTime(schedule) {
  // Very simplified cron parser - just for display
  const parts = schedule.split(' ');
  if (parts.length !== 5) {
    return 'Invalid schedule';
  }
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  const now = new Date();
  const next = new Date(now);
  
  // Simple calculation for common patterns
  if (minute !== '*' && hour !== '*') {
    const mins = parseInt(minute, 10);
    const hours = parseInt(hour, 10);
    
    if (!isNaN(mins) && !isNaN(hours)) {
      next.setHours(hours, mins, 0, 0);
      
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    }
  }
  
  return next.toISOString();
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {
    command: '',
    options: {}
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--job' && args[i + 1]) {
      result.options.job = args[i + 1];
      i += 2;
    } else if (arg === '--command' && args[i + 1]) {
      result.options.command = args[i + 1];
      i += 2;
    } else if (arg === '--type' && args[i + 1]) {
      result.options.type = args[i + 1];
      i += 2;
    } else if (arg === '--enabled' && args[i + 1]) {
      result.options.enabled = args[i + 1] !== 'false';
      i += 2;
    } else if (!result.command) {
      result.command = arg;
      i++;
    } else if (!result.options.schedule && arg.includes('*')) {
      // Likely a cron schedule
      result.options.schedule = arg;
      i++;
    } else {
      result.options.name = arg;
      i++;
    }
  }
  
  return result;
}

// CLI handling
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Cron Manager CLI');
  console.log('');
  console.log('Usage: cron-manager.js <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  list                  List all cron jobs');
  console.log('  add <name> <schedule> Add a cron job');
  console.log('  remove <name>         Remove a cron job');
  console.log('  enable <name>         Enable a cron job');
  console.log('  disable <name>        Disable a cron job');
  console.log('  next                  Show next run times');
  console.log('');
  console.log('Options for add:');
  console.log('  --job <prompt>        Task prompt for agent jobs');
  console.log('  --command <cmd>       Shell command for command jobs');
  console.log('  --type <type>         Type: agent, command, or webhook');
  console.log('  --enabled <bool>      Enable on creation (default: true)');
  console.log('');
  console.log('Examples:');
  console.log('  cron-manager.js add "Daily" "0 9 * * *" --job "Run daily report"');
  console.log('  cron-manager.js list');
  console.log('  cron-manager.js disable "Daily"');
  process.exit(1);
}

const command = args[0];
const parsed = parseArgs(args.slice(1));

let result;

switch (command) {
  case 'list':
    result = listCrons();
    break;
    
  case 'add':
    if (!parsed.options.name || !parsed.options.schedule) {
      console.error('Error: Name and schedule are required for add command');
      process.exit(1);
    }
    result = addCron(parsed.options.name, parsed.options.schedule, parsed.options);
    break;
    
  case 'remove':
    if (!parsed.options.name) {
      console.error('Error: Name is required for remove command');
      process.exit(1);
    }
    result = removeCron(parsed.options.name);
    break;
    
  case 'enable':
    if (!parsed.options.name) {
      console.error('Error: Name is required for enable command');
      process.exit(1);
    }
    result = enableCron(parsed.options.name);
    break;
    
  case 'disable':
    if (!parsed.options.name) {
      console.error('Error: Name is required for disable command');
      process.exit(1);
    }
    result = disableCron(parsed.options.name);
    break;
    
  case 'next':
    result = showNextRuns();
    break;
    
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
