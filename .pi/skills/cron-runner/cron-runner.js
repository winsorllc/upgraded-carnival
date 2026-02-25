#!/usr/bin/env node

/**
 * Cron Runner - Manage and run cron jobs programmatically
 * 
 * Usage:
 *   cron-runner.js --add --name "backup" --schedule "0 2 * * *" --command "backup.sh"
 *   cron-runner.js --list
 *   cron-runner.js --run "backup"
 *   cron-runner.js --remove "backup"
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// Storage directory
const CRON_DIR = process.env.CRON_RUNNER_DIR || path.join(process.env.HOME || '/tmp', '.cron-runner');
const CRON_FILE = path.join(CRON_DIR, 'jobs.json');

// Ensure storage directory exists
function ensureDir() {
  if (!fs.existsSync(CRON_DIR)) {
    fs.mkdirSync(CRON_DIR, { recursive: true });
  }
  if (!fs.existsSync(CRON_FILE)) {
    fs.writeFileSync(CRON_FILE, JSON.stringify({ jobs: [] }, null, 2));
  }
}

// Load jobs
function loadJobs() {
  ensureDir();
  const data = fs.readFileSync(CRON_FILE, 'utf-8');
  return JSON.parse(data).jobs;
}

// Save jobs
function saveJobs(jobs) {
  ensureDir();
  fs.writeFileSync(CRON_FILE, JSON.stringify({ jobs }, null, 2));
}

// Validate cron expression
function validateCron(expression) {
  const parts = expression.split(/\s+/);
  if (parts.length !== 5) {
    return { valid: false, error: 'Cron expression must have 5 parts' };
  }
  
  // Simple validation patterns
  const patterns = [
    /^(\*|(\*\/)?[0-5]?\d(-[0-5]?\d)?(,[0-5]?\d(-[0-5]?\d)?)*)$/, // minute
    /^(\*|(\*\/)?[01]?\d|2[0-3](-([01]?\d|2[0-3]))?(,([01]?\d|2[0-3])(-([01]?\d|2[0-3]))?)*)$/, // hour
    /^(\*|(\*\/)?[1-9]|[12]\d|3[01](-([1-9]|[12]\d|3[01]))?(,([1-9]|[12]\d|3[01])(-([1-9]|[12]\d|3[01]))?)*)$/, // day
    /^(\*|(\*\/)?[1-9]|1[0-2](-([1-9]|1[0-2]))?(,([1-9]|1[0-2])(-([1-9]|1[0-2]))?)*)$/, // month
    /^(\*|(\*\/)?[0-6](-[0-6])?(,[0-6](-[0-6])?)*)$/ // day of week
  ];
  
  const names = ['minute', 'hour', 'day', 'month', 'day of week'];
  
  for (let i = 0; i < 5; i++) {
    if (!patterns[i].test(parts[i])) {
      return { valid: false, error: `Invalid ${names[i]}: ${parts[i]}` };
    }
  }
  
  return { valid: true };
}

// Add a cron job
function addJob(name, schedule, command) {
  const validation = validateCron(schedule);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  const jobs = loadJobs();
  
  // Check if job already exists
  if (jobs.find(j => j.name === name)) {
    return { success: false, error: `Job "${name}" already exists` };
  }
  
  const job = {
    id: Date.now().toString(36),
    name,
    schedule,
    command,
    enabled: true,
    createdAt: new Date().toISOString(),
    lastRun: null,
    nextRun: null
  };
  
  jobs.push(job);
  saveJobs(jobs);
  
  return { success: true, job };
}

// List all jobs
function listJobs() {
  const jobs = loadJobs();
  return {
    success: true,
    count: jobs.length,
    jobs: jobs.map(j => ({
      name: j.name,
      schedule: j.schedule,
      command: j.command,
      enabled: j.enabled,
      createdAt: j.createdAt,
      lastRun: j.lastRun,
      nextRun: calculateNextRun(j.schedule)
    }))
  };
}

// Calculate next run time
function calculateNextRun(schedule) {
  const parts = schedule.split(/\s+/);
  if (parts.length !== 5) return null;
  
  const now = new Date();
  const [minP, hourP, dayP, monthP, dowP] = parts;
  
  // Simple next run calculation (simplified version)
  // For production, use a proper cron library
  try {
    const cron = require('cron-parser');
    const interval = cron.parseExpression(schedule);
    return interval.next().toDate().toISOString();
  } catch (e) {
    // Fallback: return null if cron-parser not available
    return null;
  }
}

// Run a job immediately
function runJob(name) {
  const jobs = loadJobs();
  const job = jobs.find(j => j.name === name);
  
  if (!job) {
    return { success: false, error: `Job "${name}" not found` };
  }
  
  if (!job.enabled) {
    return { success: false, error: `Job "${name}" is disabled` };
  }
  
  // Execute the command
  const startTime = Date.now();
  
  try {
    // Try to execute - using shell for complex commands
    const result = execSync(job.command, {
      encoding: 'utf-8',
      timeout: 300, // 5 minute timeout
      shell: true
    });
    
    const duration = Date.now() - startTime;
    
    // Update last run time
    job.lastRun = new Date().toISOString();
    saveJobs(jobs);
    
    return {
      success: true,
      output: result,
      duration: `${duration}ms`
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Still update last run time even on failure
    job.lastRun = new Date().toISOString();
    saveJobs(jobs);
    
    return {
      success: false,
      error: error.message,
      duration: `${duration}ms`
    };
  }
}

// Remove a job
function removeJob(name) {
  const jobs = loadJobs();
  const index = jobs.findIndex(j => j.name === name);
  
  if (index === -1) {
    return { success: false, error: `Job "${name}" not found` };
  }
  
  jobs.splice(index, 1);
  saveJobs(jobs);
  
  return { success: true, message: `Job "${name}" removed` };
}

// Enable a job
function enableJob(name) {
  const jobs = loadJobs();
  const job = jobs.find(j => j.name === name);
  
  if (!job) {
    return { success: false, error: `Job "${name}" not found` };
  }
  
  job.enabled = true;
  saveJobs(jobs);
  
  return { success: true, message: `Job "${name}" enabled` };
}

// Disable a job
function disableJob(name) {
  const jobs = loadJobs();
  const job = jobs.find(j => j.name === name);
  
  if (!job) {
    return { success: false, error: `Job "${name}" not found` };
  }
  
  job.enabled = false;
  saveJobs(jobs);
  
  return { success: true, message: `Job "${name}" disabled` };
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  add: false,
  name: null,
  schedule: null,
  command: null,
  list: false,
  run: null,
  remove: null,
  enable: null,
  disable: null
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  switch (arg) {
    case '--add':
      options.add = true;
      break;
    case '--name':
      options.name = nextArg;
      i++;
      break;
    case '--schedule':
      options.schedule = nextArg;
      i++;
      break;
    case '--command':
      options.command = nextArg;
      i++;
      break;
    case '--list':
      options.list = true;
      break;
    case '--run':
      options.run = nextArg;
      i++;
      break;
    case '--remove':
      options.remove = nextArg;
      i++;
      break;
    case '--enable':
      options.enable = nextArg;
      i++;
      break;
    case '--disable':
      options.disable = nextArg;
      i++;
      break;
    case '--help':
    case '-h':
      console.log(`
Cron Runner - Manage and run cron jobs programmatically

Usage:
  cron-runner.js --add --name <name> --schedule <cron> --command <cmd>
  cron-runner.js --list
  cron-runner.js --run <name>
  cron-runner.js --remove <name>

Options:
  --add              Add a new cron job
  --name <name>      Job name
  --schedule <cron>  Cron schedule expression
  --command <cmd>    Command to run
  --list             List all cron jobs
  --run <name>       Run a job immediately
  --remove <name>    Remove a cron job
  --enable <name>    Enable a disabled job
  --disable <name>   Disable a job

Examples:
  cron-runner.js --add --name "daily-backup" --schedule "0 2 * * *" --command "backup.sh"
  cron-runner.js --list
  cron-runner.js --run "daily-backup"
  cron-runner.js --remove "daily-backup"
      `.trim());
      process.exit(0);
  }
}

// Main execution
function main() {
  ensureDir();
  
  if (options.add) {
    if (!options.name || !options.schedule || !options.command) {
      console.error('Error: --name, --schedule, and --command are required for --add');
      process.exit(1);
    }
    console.log(JSON.stringify(addJob(options.name, options.schedule, options.command), null, 2));
  } else if (options.list) {
    console.log(JSON.stringify(listJobs(), null, 2));
  } else if (options.run) {
    console.log(JSON.stringify(runJob(options.run), null, 2));
  } else if (options.remove) {
    console.log(JSON.stringify(removeJob(options.remove), null, 2));
  } else if (options.enable) {
    console.log(JSON.stringify(enableJob(options.enable), null, 2));
  } else if (options.disable) {
    console.log(JSON.stringify(disableJob(options.disable), null, 2));
  } else {
    console.log('Use --help for usage information');
  }
}

main();
