#!/usr/bin/env node

/**
 * File Watcher Skill
 * Monitor files and directories for changes
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Use builtin fs.watch if chokidar not available
let chokidar;
try {
  chokidar = require('chokidar');
} catch (e) {
  chokidar = null;
}

function parseArgs(args) {
  const options = {
    pattern: '*',
    ignored: ['**/node_modules/**', '**/.git/**', '**/*.swp'],
    recursive: true,
    once: false,
    onChange: null,
    onAdd: null,
    onUnlink: null,
    timeout: 100
  };
  
  let watchPath = null;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--pattern' && args[i + 1]) {
      options.pattern = args[++i];
    } else if (arg === '--ignore' && args[i + 1]) {
      options.ignored = args[++i].split(',');
    } else if (arg === '--recursive') {
      options.recursive = args[i + 1] !== 'false';
      if (options.recursive === true) i++;
    } else if (arg === '--once') {
      options.once = true;
    } else if (arg === '--on-change' && args[i + 1]) {
      options.onChange = args[++i];
    } else if (arg === '--on-add' && args[i + 1]) {
      options.onAdd = args[++i];
    } else if (arg === '--on-unlink' && args[i + 1]) {
      options.onUnlink = args[++i];
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i]);
    } else if (!arg.startsWith('--')) {
      watchPath = arg;
    }
  }
  
  return { watchPath, options };
}

function getStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  } catch (e) {
    return null;
  }
}

function executeCommand(cmd, eventInfo) {
  try {
    const env = { ...process.env, ...eventInfo };
    const result = execSync(cmd, { 
      env,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { success: true, output: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function watchWithChokidar(watchPath, options) {
  return new Promise((resolve, reject) => {
    const watcher = chokidar.watch(watchPath, {
      ignored: options.ignored,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: options.timeout,
        pollInterval: 50
      }
    });
    
    let eventCount = 0;
    let debounceTimer = null;
    
    const handleEvent = (event, filePath) => {
      const eventInfo = {
        event: event,
        path: filePath,
        timestamp: new Date().toISOString(),
        stats: getStats(filePath)
      };
      
      console.log(JSON.stringify(eventInfo, null, 2));
      
      // Execute command if specified
      let command = null;
      if (event === 'add' && options.onAdd) {
        command = options.onAdd;
      } else if (event === 'unlink' && options.onUnlink) {
        command = options.onUnlink;
      } else if (event === 'change' && options.onChange) {
        command = options.onChange;
      } else if (options.onChange && (event === 'add' || event === 'unlink')) {
        command = options.onChange;
      }
      
      if (command) {
        const result = executeCommand(command, {
          FILE_PATH: filePath,
          EVENT_TYPE: event,
          EVENT: event
        });
        if (!result.success) {
          console.error(`Command failed: ${result.error}`);
        }
      }
      
      eventCount++;
      
      if (options.once) {
        watcher.close().then(() => resolve({ eventCount }));
      }
    };
    
    watcher
      .on('add', handleEvent)
      .on('change', handleEvent)
      .on('unlink', handleEvent)
      .on('addDir', (p) => handleEvent('addDir', p))
      .on('unlinkDir', (p) => handleEvent('unlinkDir', p))
      .on('error', reject);
    
    console.log(`Watching: ${watchPath}`);
    console.log(`Pattern: ${options.pattern}`);
    console.log('Press Ctrl+C to stop');
  });
}

function watchWithBuiltin(watchPath, options) {
  return new Promise((resolve, reject) => {
    const isDirectory = fs.statSync(watchPath).isDirectory();
    const watchTarget = isDirectory ? watchPath : path.dirname(watchPath);
    
    fs.watch(watchTarget, { recursive: options.recursive }, (eventType, filename) => {
      if (!filename) return;
      
      const filePath = path.join(watchTarget, filename);
      
      // Check pattern
      const pattern = options.pattern.replace(/\*/g, '.*');
      const regex = new RegExp(pattern);
      if (!regex.test(filename)) return;
      
      const eventInfo = {
        event: eventType === 'change' ? 'change' : eventType === 'rename' ? 'unlink' : 'add',
        path: filePath,
        timestamp: new Date().toISOString(),
        stats: getStats(filePath)
      };
      
      console.log(JSON.stringify(eventInfo, null, 2));
      
      if (options.once) {
        resolve({ eventCount: 1 });
      }
    });
    
    console.log(`Watching: ${watchPath}`);
    console.log('Press Ctrl+C to stop');
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: watch.js <path> [options]');
    console.log('Options:');
    console.log('  --pattern PATTERN    Glob pattern (default: *)');
    console.log('  --ignore PATHS       Comma-separated ignore patterns');
    console.log('  --recursive BOOL     Watch subdirectories (default: true)');
    console.log('  --once               Exit after first change');
    console.log('  --on-change CMD      Command to run on change');
    console.log('  --on-add CMD         Command to run on file add');
    console.log('  --on-unlink CMD      Command to run on file delete');
    console.log('  --timeout MS         Debounce timeout (default: 100)');
    process.exit(0);
  }
  
  const { watchPath, options } = parseArgs(args);
  
  if (!watchPath) {
    console.error('Error: Watch path required');
    process.exit(1);
  }
  
  if (!fs.existsSync(watchPath)) {
    console.error(`Error: Path does not exist: ${watchPath}`);
    process.exit(1);
  }
  
  try {
    if (chokidar) {
      await watchWithChokidar(watchPath, options);
    } else {
      console.log('Note: Install chokidar for better file watching: npm install chokidar');
      await watchWithBuiltin(watchPath, options);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
