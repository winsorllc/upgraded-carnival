#!/usr/bin/env node

/**
 * Heartbeat Task Runner
 * Periodic self-monitoring and task execution
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const HEARTBEAT_FILE = process.env.HEARTBEAT_FILE || 'HEARTBEAT.md';
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL_MINUTES || '15', 10);
const HEARTBEAT_STATE_FILE = 'data/heartbeat.json';
const HEARTBEAT_LOG_DIR = 'logs/heartbeat';

class Heartbeat {
  constructor(config = {}) {
    this.intervalMinutes = config.intervalMinutes || HEARTBEAT_INTERVAL;
    this.enabled = config.enabled !== false;
    this.workspaceDir = config.workspaceDir || process.cwd();
    this.heartbeatFile = path.join(this.workspaceDir, HEARTBEAT_FILE);
    this.stateFile = path.join(this.workspaceDir, HEARTBEAT_STATE_FILE);
    this.logDir = path.join(this.workspaceDir, HEARTBEAT_LOG_DIR);
    this.running = false;
    this.intervalId = null;
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = [this.logDir, path.dirname(this.stateFile)];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Parse HEARTBEAT.md and extract tasks
   */
  parseTasks() {
    if (!fs.existsSync(this.heartbeatFile)) {
      return [];
    }

    const content = fs.readFileSync(this.heartbeatFile, 'utf8');
    const tasks = [];
    
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '' || !trimmed.startsWith('- ')) {
        continue;
      }
      
      // Extract task (remove "- " prefix)
      const task = trimmed.substring(2).trim();
      if (task && !tasks.includes(task)) {
        tasks.push(task);
      }
    }
    
    return tasks;
  }

  /**
   * Get current state
   */
  getState() {
    if (!fs.existsSync(this.stateFile)) {
      return { runs: [], tasks: [] };
    }
    
    try {
      return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    } catch (e) {
      return { runs: [], tasks: [] };
    }
  }

  /**
   * Save state
   */
  saveState(state) {
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  /**
   * Execute a task
   */
  async executeTask(task, runId) {
    const logFile = path.join(this.logDir, `${runId}.log`);
    const startTime = new Date().toISOString();
    
    // Log start
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    logStream.write(`[${startTime}] Starting task: ${task}\n`);
    
    try {
      // For now, tasks are executed as agent jobs
      // In production, this would trigger the actual agent
      const result = await this.runAgentTask(task);
      
      const endTime = new Date().toISOString();
      logStream.write(`[${endTime}] Completed successfully\n`);
      logStream.write(`Result: ${JSON.stringify(result).substring(0, 1000)}\n`);
      logStream.end();
      
      return { success: true, output: result };
    } catch (e) {
      const endTime = new Date().toISOString();
      logStream.write(`[${endTime}] Failed: ${e.message}\n`);
      logStream.end();
      
      return { success: false, error: e.message };
    }
  }

  /**
   * Run an agent task (placeholder - would integrate with actual agent)
   */
  runAgentTask(task) {
    return new Promise((resolve) => {
      // This would normally trigger an agent job
      // For now, we simulate with a simple log
      resolve({ task, status: 'would_execute', timestamp: new Date().toISOString() });
    });
  }

  /**
   * Run heartbeat once
   */
  async run() {
    const runId = `hb-${Date.now()}`;
    const state = this.getState();
    const tasks = this.parseTasks();
    
    console.log(`💓 Heartbeat ${runId}: Running ${tasks.length} tasks...`);
    
    const results = [];
    for (const task of tasks) {
      console.log(`  → ${task}`);
      const result = await this.executeTask(task, runId);
      results.push({ task, ...result });
    }
    
    // Save run to state
    state.runs.push({
      runId,
      timestamp: new Date().toISOString(),
      tasks: results
    });
    
    // Keep only last 100 runs
    if (state.runs.length > 100) {
      state.runs = state.runs.slice(-100);
    }
    
    this.saveState(state);
    
    const successCount = results.filter(r => r.success).length;
    console.log(`💓 Heartbeat complete: ${successCount}/${results.length} tasks succeeded`);
    
    return { runId, results };
  }

  /**
   * Start heartbeat daemon
   */
  start() {
    if (this.running) {
      console.log('Heartbeat already running');
      return;
    }
    
    this.running = true;
    const intervalMs = Math.max(this.intervalMinutes, 5) * 60 * 1000;
    
    console.log(`💓 Heartbeat started: every ${this.intervalMinutes} minutes`);
    
    // Run immediately on start
    this.run().catch(console.error);
    
    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      if (this.enabled) {
        this.run().catch(console.error);
      }
    }, intervalMs);
  }

  /**
   * Stop heartbeat daemon
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    console.log('💓 Heartbeat stopped');
  }

  /**
   * List current tasks
   */
  listTasks() {
    return this.parseTasks();
  }

  /**
   * Add a task
   */
  addTask(task) {
    const tasks = this.parseTasks();
    if (!tasks.includes(task)) {
      tasks.push(task);
      this.saveTasks(tasks);
    }
    return tasks;
  }

  /**
   * Remove a task
   */
  removeTask(task) {
    let tasks = this.parseTasks();
    tasks = tasks.filter(t => t !== task);
    this.saveTasks(tasks);
    return tasks;
  }

  /**
   * Save tasks to file
   */
  saveTasks(tasks) {
    let content = '# Periodic Tasks\n\n';
    content += 'Add tasks below (one per line, starting with `- `). The agent will\n';
    content += 'check this file on each heartbeat tick.\n\n';
    
    for (const task of tasks) {
      content += `- ${task}\n`;
    }
    
    fs.writeFileSync(this.heartbeatFile, content);
  }

  /**
   * Get history
   */
  getHistory(limit = 10) {
    const state = this.getState();
    return state.runs.slice(-limit);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const heartbeat = new Heartbeat();

  switch (command) {
    case 'start':
      heartbeat.start();
      break;
      
    case 'stop':
      heartbeat.stop();
      break;
      
    case 'run':
      heartbeat.run().then(r => {
        console.log('Run complete:', r.runId);
      }).catch(e => {
        console.error('Error:', e.message);
        process.exit(1);
      });
      break;
      
    case 'tasks':
      const tasks = heartbeat.listTasks();
      console.log('Heartbeat tasks:');
      tasks.forEach(t => console.log('  -', t));
      break;
      
    case 'add':
      if (!args[1]) {
        console.error('Usage: heartbeat add "<task>"');
        process.exit(1);
      }
      const added = heartbeat.addTask(args.slice(1).join(' '));
      console.log('Task added. Current tasks:');
      added.forEach(t => console.log('  -', t));
      break;
      
    case 'remove':
      if (!args[1]) {
        console.error('Usage: heartbeat remove "<task>"');
        process.exit(1);
      }
      const removed = heartbeat.removeTask(args.slice(1).join(' '));
      console.log('Task removed. Current tasks:');
      removed.forEach(t => console.log('  -', t));
      break;
      
    case 'history':
      const history = heartbeat.getHistory();
      console.log('Recent heartbeat runs:');
      history.forEach(h => {
        const success = h.tasks.filter(t => t.success).length;
        console.log(`  - ${h.runId}: ${success}/${h.tasks.length} tasks (${h.timestamp})`);
      });
      break;
      
    default:
      console.log('Heartbeat Commands:');
      console.log('  start              - Start heartbeat daemon');
      console.log('  stop               - Stop heartbeat daemon');
      console.log('  run                - Run heartbeat once');
      console.log('  tasks              - List current tasks');
      console.log('  add "<task>"      - Add a task');
      console.log('  remove "<task>"   - Remove a task');
      console.log('  history            - Show recent runs');
  }
}

module.exports = { Heartbeat };
