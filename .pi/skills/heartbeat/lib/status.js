/**
 * Heartbeat Status Management
 * 
 * Tracks heartbeat execution history and results.
 */

import { readFile, writeFile, mkdir, readdir, access } from 'fs/promises';
import { join } from 'path';

const STATUS_DIR = '/job/logs/.heartbeat';
const HISTORY_FILE = join(STATUS_DIR, 'history.json');

/**
 * Ensure the status directory exists
 */
async function ensureStatusDir() {
  await mkdir(STATUS_DIR, { recursive: true });
}

/**
 * Load heartbeat configuration
 */
export async function loadHeartbeat(name) {
  await ensureStatusDir();
  
  try {
    const configPath = join(STATUS_DIR, `${name}.json`);
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

/**
 * Save heartbeat configuration
 */
export async function saveHeartbeat(config) {
  await ensureStatusDir();
  
  const configPath = join(STATUS_DIR, `${config.name}.json`);
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Record a heartbeat run
 */
export async function recordRun(name, result) {
  await ensureStatusDir();
  
  // Update the heartbeat config
  const config = await loadHeartbeat(name) || { name };
  config.runs = (config.runs || 0) + 1;
  config.lastRun = new Date().toISOString();
  config.lastResult = {
    timestamp: result.timestamp,
    status: result.status || 'unknown',
    type: result.type
  };
  await saveHeartbeat(config);
  
  // Add to history
  let history = [];
  try {
    const content = await readFile(HISTORY_FILE, 'utf-8');
    history = JSON.parse(content);
  } catch (e) {}
  
  history.push({
    name,
    timestamp: result.timestamp,
    status: result.status,
    type: result.type
  });
  
  // Keep only last 100 entries
  while (history.length > 100) {
    history.shift();
  }
  
  await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * Get heartbeat execution history
 */
export async function getHistory(limit = 20) {
  await ensureStatusDir();
  
  try {
    const content = await readFile(HISTORY_FILE, 'utf-8');
    const history = JSON.parse(content);
    return history.slice(-limit).reverse();
  } catch (e) {
    return [];
  }
}

/**
 * Get all heartbeat statuses
 */
export async function getAllStatuses() {
  await ensureStatusDir();
  
  try {
    const files = await readdir(STATUS_DIR);
    const configs = [];
    
    for (const file of files) {
      if (file === 'history.json') continue;
      if (!file.endsWith('.json')) continue;
      
      try {
        const content = await readFile(join(STATUS_DIR, file), 'utf-8');
        const config = JSON.parse(content);
        configs.push(config);
      } catch (e) {}
    }
    
    return configs.sort((a, b) => new Date(b.created) - new Date(a.created));
  } catch (e) {
    return [];
  }
}

/**
 * Get summary statistics
 */
export async function getSummary() {
  await ensureStatusDir();
  
  const statuses = await getAllStatuses();
  const history = await getHistory(100);
  
  const totalRuns = statuses.reduce((sum, s) => sum + (s.runs || 0), 0);
  const healthy = statuses.filter(s => s.enabled !== false).length;
  const inactive = statuses.filter(s => s.enabled === false).length;
  
  const recentFailures = history.filter(h => 
    h.status === 'error' || h.status === 'warning'
  ).length;
  
  return {
    timestamp: new Date().toISOString(),
    heartbeats: {
      total: statuses.length,
      active: healthy,
      inactive: inactive
    },
    runs: {
      total: totalRuns,
      recent: history.length
    },
    health: {
      recentFailures,
      successRate: history.length > 0 
        ? ((history.length - recentFailures) / history.length * 100).toFixed(1) + '%'
        : 'N/A'
    }
  };
}

export default {
  loadHeartbeat,
  saveHeartbeat,
  recordRun,
  getHistory,
  getAllStatuses,
  getSummary
};