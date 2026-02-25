#!/usr/bin/env node

// Heartbeat Monitor - Self-monitoring and periodic task execution

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

const HEARTBEAT_DIR = process.env.HEARTBEAT_DIR || './heartbeat-data';
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL_MINUTES || '5');
const HEARTBEAT_ENABLED = process.env.HEARTBEAT_ENABLED !== 'false';
const HEARTBEAT_TASKS_FILE = process.env.HEARTBEAT_TASKS_FILE || './heartbeat-tasks.md';
const HEARTBEAT_STATUS_FILE = join(HEARTBEAT_DIR, 'status.json');
const HEARTBEAT_HISTORY_FILE = join(HEARTBEAT_DIR, 'history.jsonl');

// Ensure directory exists
if (!existsSync(HEARTBEAT_DIR)) mkdirSync(HEARTBEAT_DIR, { recursive: true });

let heartbeatInterval = null;
let isRunning = false;

function generateId() {
  return createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .substring(0, 8);
}

function loadTasks() {
  const path = HEARTBEAT_TASKS_FILE;
  if (existsSync(path)) {
    const content = readFileSync(path, 'utf-8');
    // Parse markdown tasks (lines starting with - )
    const tasks = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        const task = trimmed.substring(2);
        if (task && !task.startsWith('#')) {
          tasks.push({
            id: generateId(),
            name: task,
            enabled: true,
            schedule: null,
            lastRun: null,
            lastStatus: null
          });
        }
      }
    }
    return tasks;
  }
  return [];
}

function loadStatus() {
  if (existsSync(HEARTBEAT_STATUS_FILE)) {
    return JSON.parse(readFileSync(HEARTBEAT_STATUS_FILE, 'utf-8'));
  }
  return {
    running: false,
    lastTick: null,
    tasks: { total: 0, running: 0, failed: 0 }
  };
}

function saveStatus(status) {
  writeFileSync(HEARTBEAT_STATUS_FILE, JSON.stringify(status, null, 2));
}

function addHistory(entry) {
  appendFileSync(HEARTBEAT_HISTORY_FILE, JSON.stringify(entry) + '\n');
}

function getHealthMetrics() {
  const metrics = {
    timestamp: new Date().toISOString()
  };
  
  try {
    // Memory usage
    if (process.platform !== 'win32') {
      const memInfo = execSync('free -m 2>/dev/null', { encoding: 'utf-8' });
      const lines = memInfo.split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        const total = parseInt(parts[1]);
        const used = parseInt(parts[2]);
        metrics.memory = {
          total: total,
          used: used,
          percent: Math.round((used / total) * 100)
        };
      }
    }
    
    // Disk usage
    if (process.platform !== 'win32') {
      const diskInfo = execSync('df -h / 2>/dev/null | tail -1', { encoding: 'utf-8' });
      const parts = diskInfo.split(/\s+/);
      metrics.disk = {
        total: parts[1],
        used: parts[2],
        percent: parseInt(parts[4])
      };
    }
    
    // CPU load
    if (process.platform !== 'win32') {
      const load = execSync('uptime 2>/dev/null', { encoding: 'utf-8' });
      const match = load.match(/load average[s]?: ([\d.]+)/);
      if (match) {
        metrics.cpu = { load: parseFloat(match[1]) };
      }
    }
  } catch (err) {
    metrics.error = err.message;
  }
  
  return metrics;
}

async function runTask(task) {
  const startTime = Date.now();
  const entry = {
    id: task.id,
    name: task.name,
    startTime: new Date().toISOString(),
    status: 'running'
  };
  
  try {
    // Simulate task execution (in real use, run actual task)
    console.log(`Running task: ${task.name}`);
    
    // For now, just log that we would run the task
    entry.status = 'success';
    entry.duration = Date.now() - startTime;
    entry.output = 'Task completed';
  } catch (err) {
    entry.status = 'failed';
    entry.error = err.message;
    entry.duration = Date.now() - startTime;
  }
  
  addHistory(entry);
  return entry;
}

async function tick() {
  console.log(`[Heartbeat] Tick at ${new Date().toISOString()}`);
  
  // Get health metrics
  const health = getHealthMetrics();
  console.log(`[Heartbeat] Health:`, health);
  
  // Run enabled tasks
  const tasks = loadTasks();
  let running = 0;
  let failed = 0;
  
  for (const task of tasks) {
    if (task.enabled) {
      running++;
      const result = await runTask(task);
      if (result.status === 'failed') failed++;
    }
  }
  
  // Update status
  const status = {
    running: isRunning,
    lastTick: new Date().toISOString(),
    health,
    tasks: {
      total: tasks.length,
      running,
      failed
    }
  };
  
  saveStatus(status);
}

function startHeartbeat(intervalMinutes = HEARTBEAT_INTERVAL) {
  if (isRunning) {
    console.log('Heartbeat already running');
    return;
  }
  
  isRunning = true;
  console.log(`Starting heartbeat with ${intervalMinutes} minute interval`);
  
  // Initial tick
  tick();
  
  // Set interval
  heartbeatInterval = setInterval(() => {
    tick();
  }, intervalMinutes * 60 * 1000);
  
  // Update status
  const status = loadStatus();
  status.running = true;
  saveStatus(status);
}

function stopHeartbeat() {
  if (!isRunning) {
    console.log('Heartbeat not running');
    return;
  }
  
  isRunning = false;
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  // Update status
  const status = loadStatus();
  status.running = false;
  saveStatus(status);
  
  console.log('Heartbeat stopped');
}

// CLI Commands
const cmd = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (cmd) {
    case 'start': {
      let interval = HEARTBEAT_INTERVAL;
      const intervalIdx = args.indexOf('--interval');
      if (intervalIdx >= 0 && intervalIdx + 1 < args.length) {
        interval = parseInt(args[intervalIdx + 1]);
      }
      startHeartbeat(interval);
      break;
    }
      
    case 'stop': {
      stopHeartbeat();
      break;
    }
      
    case 'status': {
      const status = loadStatus();
      console.log(JSON.stringify(status, null, 2));
      break;
    }
      
    case 'tasks': {
      const tasks = loadTasks();
      if (tasks.length === 0) {
        console.log('No tasks configured. Add tasks to', HEARTBEAT_TASKS_FILE);
        break;
      }
      console.log('Configured tasks:');
      for (const task of tasks) {
        const status = task.enabled ? '✓' : '✗';
        console.log(`  ${status} [${task.id}] ${task.name}`);
      }
      break;
    }
      
    case 'add': {
      const taskName = args[0];
      if (!taskName) {
        console.error('Usage: heartbeat add <task> [--schedule <cron>]');
        process.exit(1);
      }
      
      let schedule = null;
      const schedIdx = args.indexOf('--schedule');
      if (schedIdx >= 0 && schedIdx + 1 < args.length) {
        schedule = args[schedIdx + 1];
      }
      
      // Add to tasks file
      const path = HEARTBEAT_TASKS_FILE;
      const content = existsSync(path) ? readFileSync(path, 'utf-8') : '# Heartbeat Tasks\n';
      const newTask = `- ${taskName}${schedule ? ` (schedule: ${schedule})` : ''}\n`;
      writeFileSync(path, content + newTask);
      
      console.log('Added task:', taskName);
      break;
    }
      
    case 'remove': {
      const id = args[0];
      if (!id) {
        console.error('Usage: heartbeat remove <id>');
        process.exit(1);
      }
      
      // This would require reading and rewriting the file
      console.log('Task removal not implemented - edit', HEARTBEAT_TASKS_FILE, 'manually');
      break;
    }
      
    case 'run-now': {
      const id = args[0];
      const tasks = loadTasks();
      
      if (id === 'all') {
        for (const task of tasks) {
          await runTask(task);
        }
      } else {
        const task = tasks.find(t => t.id === id);
        if (!task) {
          console.error('Task not found:', id);
          process.exit(1);
        }
        await runTask(task);
      }
      break;
    }
      
    case 'history': {
      let limit = 20;
      const limitIdx = args.indexOf('--limit');
      if (limitIdx >= 0 && limitIdx + 1 < args.length) {
        limit = parseInt(args[limitIdx + 1]);
      }
      
      if (!existsSync(HEARTBEAT_HISTORY_FILE)) {
        console.log('No history yet');
        break;
      }
      
      const content = readFileSync(HEARTBEAT_HISTORY_FILE, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim()).slice(-limit);
      
      for (const line of lines.reverse()) {
        const entry = JSON.parse(line);
        const icon = entry.status === 'success' ? '✓' : entry.status === 'failed' ? '✗' : '→';
        console.log(`${icon} [${entry.name}] ${entry.status} (${entry.duration}ms)`);
      }
      break;
    }
      
    case 'health': {
      const health = getHealthMetrics();
      console.log(JSON.stringify(health, null, 2));
      break;
    }
      
    default:
      console.log(`Heartbeat Monitor

Usage: heartbeat <command> [args...]

Commands:
  start [--interval <minutes>]
    Start the heartbeat monitor
  stop
    Stop the heartbeat monitor
  status
    Show current heartbeat status
  tasks
    List configured heartbeat tasks
  add <task> [--schedule <cron>]
    Add a new heartbeat task
  remove <id>
    Remove a heartbeat task
  run-now <id|all>
    Run a task immediately
  history [--limit <n>]
    Show task execution history
  health
    Show current health metrics

Environment Variables:
  HEARTBEAT_DIR: Data directory (default: ./heartbeat-data)
  HEARTBEAT_INTERVAL_MINUTES: Tick interval (default: 5)
  HEARTBEAT_ENABLED: Enable heartbeat (default: true)
  HEARTBEAT_TASKS_FILE: Tasks file (default: ./heartbeat-tasks.md)
`);
      process.exit(1);
  }
}

main().catch(console.error);
