#!/usr/bin/env node
/**
 * Cron Advanced - Enhanced cron management
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const CRON_DIR = path.join(process.cwd(), '.cron');
const TASKS_FILE = path.join(CRON_DIR, 'tasks.json');
const HISTORY_DIR = path.join(CRON_DIR, 'history');

function ensureDirs() {
  if (!fs.existsSync(CRON_DIR)) fs.mkdirSync(CRON_DIR, { recursive: true });
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

function loadTasks() {
  ensureDirs();
  if (fs.existsSync(TASKS_FILE)) {
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  }
  return { version: '1.0', tasks: [] };
}

function saveTasks(tasks) {
  ensureDirs();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function generateTaskId() {
  return `task-${Date.now().toString(36)}`;
}

function addTask(name, type, schedule, command) {
  const tasks = loadTasks();
  
  const task = {
    id: generateTaskId(),
    name,
    type,
    schedule,
    command,
    status: 'active',
    created: new Date().toISOString(),
    lastRun: null,
    nextRun: calculateNextRun(type, schedule)
  };
  
  tasks.tasks.push(task);
  saveTasks(tasks);
  
  return task;
}

function calculateNextRun(type, schedule) {
  const now = new Date();
  
  switch (type) {
    case 'at':
      return schedule;
    case 'every':
      return new Date(now.getTime() + parseInt(schedule) * 1000).toISOString();
    case 'cron':
      // Simplified - next run would be calculated from cron expression
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}

function listTasks() {
  return loadTasks().tasks;
}

function updateTask(taskId, updates) {
  const tasks = loadTasks();
  const task = tasks.tasks.find(t => t.id === taskId);
  
  if (task) {
    Object.assign(task, updates);
    saveTasks(tasks);
  }
  
  return task;
}

function removeTask(taskId) {
  const tasks = loadTasks();
  const index = tasks.tasks.findIndex(t => t.id === taskId);
  
  if (index >= 0) {
    tasks.tasks.splice(index, 1);
    saveTasks(tasks);
    return true;
  }
  return false;
}

function addHistory(taskId, result) {
  const historyFile = path.join(HISTORY_DIR, `${taskId}.jsonl`);
  fs.appendFileSync(historyFile, JSON.stringify({ ...result, timestamp: new Date().toISOString() }) + '\n');
}

function getHistory(taskId) {
  const historyFile = path.join(HISTORY_DIR, `${taskId}.jsonl`);
  if (!fs.existsSync(historyFile)) return [];
  
  return fs.readFileSync(historyFile, 'utf8')
    .split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l));
}

function parseArgs(args) {
  const result = {
    command: null,
    name: null,
    schedule: null,
    cmd: null,
    id: null,
    time: null,
    interval: null,
    json: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--command': result.command = args[++i]; break;
      case '--name': result.name = args[++i]; break;
      case '--schedule': result.schedule = args[++i]; break;
      case '--cmd': result.cmd = args[++i]; break;
      case '--id': result.id = args[++i]; break;
      case '--time': result.time = args[++i]; break;
      case '--interval': result.interval = args[++i]; break;
      case '--json': result.json = true; break;
    }
  }
  return result;
}

async function runTask(task) {
  return new Promise((resolve) => {
    exec(task.command, (error, stdout, stderr) => {
      resolve({
        success: !error,
        exitCode: error ? error.code : 0,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.command) {
    console.log('Cron Advanced - Enhanced cron management');
    console.log('');
    console.log('Commands: list, add, add-at, add-every, pause, resume, remove, history, run-now');
    process.exit(1);
  }
  
  switch (args.command) {
    case 'list': {
      const tasks = listTasks();
      
      if (args.json) {
        console.log(JSON.stringify(tasks, null, 2));
      } else {
        console.log('Scheduled Tasks');
        console.log('══════════════');
        
        if (tasks.length === 0) {
          console.log('No tasks scheduled');
        } else {
          for (const t of tasks) {
            const statusIcon = t.status === 'active' ? '●' : t.status === 'paused' ? '⏸' : '○';
            console.log(`${statusIcon} ${t.name} (${t.id})`);
            console.log(`  Type: ${t.type}`);
            console.log(`  Schedule: ${t.schedule}`);
            console.log(`  Status: ${t.status}`);
            console.log(`  Command: ${t.command.substring(0, 50)}`);
            console.log('');
          }
        }
        
        console.log(`Total: ${tasks.length} task(s)`);
      }
      break;
    }
    
    case 'add': {
      if (!args.name || !args.schedule || !args.cmd) {
        console.error('Error: --name, --schedule, --cmd required');
        process.exit(1);
      }
      
      const task = addTask(args.name, 'cron', args.schedule, args.cmd);
      
      if (args.json) {
        console.log(JSON.stringify({ success: true, task }, null, 2));
      } else {
        console.log('✓ Task added');
        console.log(`  ID: ${task.id}`);
        console.log(`  Name: ${task.name}`);
        console.log(`  Schedule: ${task.schedule}`);
      }
      break;
    }
    
    case 'add-at': {
      if (!args.name || !args.time || !args.cmd) {
        console.error('Error: --name, --time, --cmd required');
        process.exit(1);
      }
      
      const task = addTask(args.name, 'at', args.time, args.cmd);
      
      if (args.json) {
        console.log(JSON.stringify({ success: true, task }, null, 2));
      } else {
        console.log('✓ One-time task added');
        console.log(`  ID: ${task.id}`);
        console.log(`  Name: ${task.name}`);
        console.log(`  Time: ${task.schedule}`);
      }
      break;
    }
    
    case 'add-every': {
      if (!args.name || !args.interval || !args.cmd) {
        console.error('Error: --name, --interval, --cmd required');
        process.exit(1);
      }
      
      const task = addTask(args.name, 'every', args.interval, args.cmd);
      
      if (args.json) {
        console.log(JSON.stringify({ success: true, task }, null, 2));
      } else {
        console.log('✓ Recurring task added');
        console.log(`  ID: ${task.id}`);
        console.log(`  Name: ${task.name}`);
        console.log(`  Interval: ${args.interval} seconds`);
      }
      break;
    }
    
    case 'pause': {
      if (!args.id) {
        console.error('Error: --id required');
        process.exit(1);
      }
      
      const task = updateTask(args.id, { status: 'paused' });
      
      if (task) {
        console.log(`✓ Task ${args.id} paused`);
      } else {
        console.error(`Task ${args.id} not found`);
        process.exit(1);
      }
      break;
    }
    
    case 'resume': {
      if (!args.id) {
        console.error('Error: --id required');
        process.exit(1);
      }
      
      const task = updateTask(args.id, { status: 'active' });
      
      if (task) {
        console.log(`✓ Task ${args.id} resumed`);
      } else {
        console.error(`Task ${args.id} not found`);
        process.exit(1);
      }
      break;
    }
    
    case 'remove': {
      if (!args.id) {
        console.error('Error: --id required');
        process.exit(1);
      }
      
      if (removeTask(args.id)) {
        console.log(`✓ Task ${args.id} removed`);
      } else {
        console.error(`Task ${args.id} not found`);
        process.exit(1);
      }
      break;
    }
    
    case 'history': {
      if (!args.id) {
        console.error('Error: --id required');
        process.exit(1);
      }
      
      const history = getHistory(args.id);
      
      if (args.json) {
        console.log(JSON.stringify(history, null, 2));
      } else {
        console.log(`History for ${args.id}`);
        console.log('════════════════');
        
        if (history.length === 0) {
          console.log('No history available');
        } else {
          for (const h of history) {
            console.log(`\n[${h.timestamp}]`);
            console.log(`  Status: ${h.success ? 'Success' : 'Failed'}`);
            if (h.stdout) console.log(`  Output: ${h.stdout.substring(0, 100)}`);
          }
        }
        
        console.log(`\nTotal runs: ${history.length}`);
      }
      break;
    }
    
    case 'run-now': {
      if (!args.id) {
        console.error('Error: --id required');
        process.exit(1);
      }
      
      const tasks = listTasks();
      const task = tasks.find(t => t.id === args.id);
      
      if (!task) {
        console.error(`Task ${args.id} not found`);
        process.exit(1);
      }
      
      console.log(`Running task: ${task.name}`);
      const result = await runTask(task);
      addHistory(args.id, result);
      
      if (result.success) {
        console.log('✓ Task completed successfully');
        if (result.stdout) console.log(result.stdout);
      } else {
        console.error('✗ Task failed');
        if (result.stderr) console.error(result.stderr);
      }
      break;
    }
    
    default:
      console.error(`Unknown command: ${args.command}`);
      process.exit(1);
  }
}

main();