/**
 * Memory Persist Skill
 * 
 * Persistent key-value memory storage for agents.
 * Stores data in ~/.thepopebot/memory.json
 */

const fs = require('fs');
const path = require('path');

/**
 * Get the path to the memory storage file
 */
function getMemoryPath() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const thepopebotDir = path.join(homeDir, '.thepopebot');
  
  // Ensure directory exists
  if (!fs.existsSync(thepopebotDir)) {
    fs.mkdirSync(thepopebotDir, { recursive: true });
  }
  
  return path.join(thepopebotDir, 'memory.json');
}

/**
 * Load memory from disk
 * @returns {Object} Memory data
 */
function loadMemory() {
  const memoryPath = getMemoryPath();
  
  if (!fs.existsSync(memoryPath)) {
    return {};
  }
  
  try {
    const data = fs.readFileSync(memoryPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading memory:', error.message);
    return {};
  }
}

/**
 * Save memory to disk
 * @param {Object} data - Memory data to save
 */
function saveMemory(data) {
  const memoryPath = getMemoryPath();
  
  try {
    fs.writeFileSync(memoryPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving memory:', error.message);
    throw error;
  }
}

/**
 * Store a key-value pair in persistent memory
 * @param {string} key - The key to store under
 * @param {string} value - The value to store
 * @returns {string} Confirmation message
 */
function memory_store(key, value) {
  try {
    const data = loadMemory();
    data[key] = String(value);
    saveMemory(data);
    return `Stored: ${key}`;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

/**
 * Search memory for entries matching the query
 * @param {string} query - The search query
 * @returns {string} Matching entries or "no matches" message
 */
function memory_recall(query) {
  try {
    const data = loadMemory();
    
    if (Object.keys(data).length === 0) {
      return 'No memories stored yet';
    }
    
    const queryLower = query.toLowerCase();
    const matches = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (key.toLowerCase().includes(queryLower) || 
          String(value).toLowerCase().includes(queryLower)) {
        matches[key] = value;
      }
    }
    
    if (Object.keys(matches).length === 0) {
      return `No matches for: ${query}`;
    }
    
    return JSON.stringify(matches, null, 2);
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

/**
 * Delete a memory by key
 * @param {string} key - The key to delete
 * @returns {string} Confirmation message
 */
function memory_delete(key) {
  try {
    const data = loadMemory();
    
    if (!(key in data)) {
      return `Key not found: ${key}`;
    }
    
    delete data[key];
    saveMemory(data);
    return `Deleted: ${key}`;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

/**
 * List all stored memory keys
 * @returns {string} List of keys
 */
function memory_list() {
  try {
    const data = loadMemory();
    const keys = Object.keys(data);
    
    if (keys.length === 0) {
      return 'No memories stored yet';
    }
    
    return `Stored memories (${keys.length}):\n- ` + keys.join('\n- ');
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

/**
 * Clear all memories
 * @returns {string} Confirmation message
 */
function memory_clear() {
  try {
    saveMemory({});
    return 'Cleared all memories';
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

module.exports = {
  memory_store,
  memory_recall,
  memory_delete,
  memory_list,
  memory_clear,
  loadMemory,
  saveMemory,
  getMemoryPath
};
