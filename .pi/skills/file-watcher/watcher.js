#!/usr/bin/env node
/**
 * File Watcher Skill - Watch files and directories for changes
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const STORAGE_FILE = '/tmp/file-watchers.json';

// Watchers map: id -> { watcher, path, action, throttle, lastTriggered }
const activeWatchers = new Map();

function loadWatcherState() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
    }
  } catch (e) {
    // Ignore
  }
  return { watchers: {} };
}

function saveWatcherState(state) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Failed to save watcher state:', e.message);
  }
}

function startWatching(id, targetPath, action, options = {}) {
  const { recursive = false, throttle = 100 } = options;
  
  if (!fs.existsSync(targetPath)) {
    console.error(`Error: Path does not exist: ${targetPath}`);
    process.exit(1);
  }

  const isDirectory = fs.statSync(targetPath).isDirectory();
  
  try {
    const watcher = fs.watch(targetPath, { recursive }, (eventType, filename) => {
      const now = Date.now();
      const watcherData = activeWatchers.get(id);
      
      if (!watcherData) return;
      
      // Throttle check
      if (watcherData.lastTrigger && (now - watcherData.lastTrigger) < throttle) {
        return;
      }
      
      watcherData.lastTrigger = now;
      activeWatchers.set(id, watcherData);
      
      const event = {
        id,
        path: targetPath,
        event: eventType,
        filename: filename || null,
        timestamp: new Date().toISOString()
      };
      
      // Log event
      console.log(JSON.stringify(event));
      
      // Execute action if provided
      if (action) {
        const env = {
          ...process.env,
          WATCHER_ID: id,
          WATCHER_PATH: targetPath,
          WATCHER_EVENT: eventType,
          WATCHER_FILE: filename || '',
          WATCHER_TIMESTAMP: event.timestamp
        };
        
        exec(action, { env }, (err, stdout, stderr) => {
          if (err) {
            console.error(`Action failed: ${err.message}`);
          } else if (stdout) {
            console.log(stdout.trim());
          }
        });
      }
    });
    
    activeWatchers.set(id, { 
      watcher, 
      path: targetPath, 
      action, 
      throttle,
      lastTrigger: 0
    });
    
    // Update state file
    const state = loadWatcherState();
    state.watchers[id] = { path: targetPath, action, recursive, throttle };
    saveWatcherState(state);
    
    console.log(JSON.stringify({
      status: 'started',
      id,
      path: targetPath,
      recursive,
      throttle
    }));
    
    // Keep process alive
    process.stdin.resume();
    
  } catch (e) {
    console.error(`Failed to start watching: ${e.message}`);
    process.exit(1);
  }
}

function listWatchers() {
  const state = loadWatcherState();
  const watchers = Object.entries(state.watchers || {}).map(([id, data]) => ({
    id,
    ...data,
    active: activeWatchers.has(id)
  }));
  console.log(JSON.stringify({ watchers }, null, 2));
}

function stopWatcher(id) {
  if (activeWatchers.has(id)) {
    const { watcher } = activeWatchers.get(id);
    watcher.close();
    activeWatchers.delete(id);
    
    const state = loadWatcherState();
    delete state.watchers[id];
    saveWatcherState(state);
    
    console.log(JSON.stringify({ status: 'stopped', id }));
  } else {
    // Try to clean up state file even if not in memory
    const state = loadWatcherState();
    if (state.watchers[id]) {
      delete state.watchers[id];
      saveWatcherState(state);
      console.log(JSON.stringify({ status: 'removed', id }));
    } else {
      console.error(`Watcher not found: ${id}`);
      process.exit(1);
    }
  }
}

function stopAllWatchers() {
  for (const [id] of activeWatchers) {
    stopWatcher(id);
  }
  // Clear any remaining in state file
  saveWatcherState({ watchers: {} });
  console.log(JSON.stringify({ status: 'stopped-all' }));
}

// CLI
const [,, command, ...args] = process.argv;

switch (command) {
  case 'watch': {
    const targetPath = args[0];
    const actionIndex = args.indexOf('--action');
    const action = actionIndex >= 0 ? args[actionIndex + 1] : null;
    const recursive = args.includes('--recursive') || args.includes('-r');
    
    const throttleIndex = args.indexOf('--throttle');
    const throttle = throttleIndex >= 0 ? parseInt(args[throttleIndex + 1]) || 100 : 100;
    
    if (!targetPath) {
      console.error('Usage: watcher.js watch <path> [options]');
      process.exit(1);
    }
    
    const id = uuidv4().slice(0, 8);
    startWatching(id, path.resolve(targetPath), action, { recursive, throttle });
    break;
  }
  
  case 'list': {
    listWatchers();
    break;
  }
  
  case 'stop': {
    const id = args[0];
    if (!id) {
      console.error('Usage: watcher.js stop <watcher-id>');
      process.exit(1);
    }
    stopWatcher(id);
    break;
  }
  
  case 'stop-all': {
    stopAllWatchers();
    break;
  }
  
  default: {
    console.log(`Usage: watcher.js <command> [options]

Commands:
  watch <path> [options]   Start watching a file or directory
    --action "cmd"         Command to run on change
    --recursive, -r        Watch recursively (directories)
    --throttle <ms>        Minimum ms between triggers (default: 100)

  list                     List active watchers
  stop <id>                Stop a watcher
  stop-all                 Stop all watchers`);
    process.exit(0);
  }
}
