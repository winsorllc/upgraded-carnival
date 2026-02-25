/**
 * Heartbeat Scheduler
 * 
 * Manages periodic self-monitoring tasks for PopeBot agents.
 * Converts heartbeat definitions into scheduled executions.
 */

import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEARTBEAT_FILE = '/job/HEARTBEAT.md';
const STATUS_DIR = '/job/logs/.heartbeat';

/**
 * Parse interval string to milliseconds
 * Supports: 30s, 5m, 1h, 1d, 1w
 */
function parseInterval(interval) {
  const match = interval.match(/^(\d+)\s*(s|m|h|d|w)$/i);
  if (!match) return null;
  
  const [, num, unit] = match;
  const multipliers = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000
  };
  
  return parseInt(num) * multipliers[unit.toLowerCase()];
}

/**
 * Parse HEARTBEAT.md file
 */
export async function parseHeartbeatFile(filepath = HEARTBEAT_FILE) {
  try {
    const content = await readFile(filepath, 'utf-8');
    const tasks = [];
    
    // Parse markdown list items with format: "- type: description every interval"
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^-\s*(\w+):\s*(.+)$/);
      if (match) {
        const [, type, rest] = match;
        
        // Try to extract interval from phrases like "every 30 minutes" or "every day at 9 AM"
        let interval = null;
        let description = rest;
        
        const intervalMatch = rest.match(/every\s+(\d+\s*(?:second|minute|hour|day|week)s?|(?:second|minute|hour|day|week))(?:\s+at\s+(.+))?/i);
        if (intervalMatch) {
          const intervalPart = intervalMatch[1].toLowerCase();
          // Normalize interval
          if (intervalPart.includes('second')) interval = intervalPart.replace(/\s*seconds?/, 's');
          else if (intervalPart.includes('minute')) interval = intervalPart.replace(/\s*minutes?/, 'm');
          else if (intervalPart.includes('hour')) interval = intervalPart.replace(/\s*hours?/, 'h');
          else if (intervalPart.includes('day')) interval = intervalPart.replace(/\s*days?/, 'd');
          else if (intervalPart.includes('week')) interval = intervalPart.replace(/\s*weeks?/, 'w');
          else interval = intervalPart; // Already normalized
          
          description = rest.substring(0, rest.indexOf('every')).trim();
        }
        
        tasks.push({
          name: `${type}-${tasks.filter(t => t.type === type).length + 1}`,
          type: type.toLowerCase(),
          description: description || `${type} check`,
          interval: interval || '30m',
          enabled: true,
          created: new Date().toISOString()
        });
      }
    }
    
    return tasks;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Schedule a new heartbeat task
 */
export async function scheduleHeartbeat(config) {
  const { name, type, interval, enabled = true, action } = config;
  
  // Ensure status directory exists
  try {
    await mkdir(STATUS_DIR, { recursive: true });
  } catch (e) {}
  
  const task = {
    name,
    type,
    interval,
    enabled,
    action: action || 'default',
    created: new Date().toISOString(),
    runs: 0,
    lastRun: null,
    lastResult: null
  };
  
  const statusFile = join(STATUS_DIR, `${name}.json`);
  await writeFile(statusFile, JSON.stringify(task, null, 2));
  
  return task;
}

/**
 * Get all configured heartbeat tasks
 */
export async function listHeartbeats() {
  try {
    await mkdir(STATUS_DIR, { recursive: true });
    const files = await fs.readdir(STATUS_DIR);
    const tasks = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await readFile(join(STATUS_DIR, file), 'utf-8');
        tasks.push(JSON.parse(content));
      }
    }
    
    return tasks.sort((a, b) => new Date(b.created) - new Date(a.created));
  } catch (err) {
    return [];
  }
}

/**
 * Get status of specific heartbeat
 */
export async function getHeartbeatStatus(name) {
  try {
    const statusFile = join(STATUS_DIR, `${name}.json`);
    const content = await readFile(statusFile, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

// Import fs for listHeartbeats
import * as fs from 'fs/promises';

export { parseInterval };

export default {
  parseHeartbeatFile,
  scheduleHeartbeat,
  listHeartbeats,
  getHeartbeatStatus,
  parseInterval
};