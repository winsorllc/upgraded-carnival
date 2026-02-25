/**
 * Memory Store for Robot Personality
 * Persists user preferences and conversation context
 */

export class MemoryStore {
  constructor() {
    this.memories = new Map();
    this.accessLog = [];
  }

  /**
   * Store a memory
   */
  async store(key, value) {
    const entry = {
      value,
      timestamp: new Date().toISOString(),
      accessCount: 0
    };
    
    this.memories.set(key, entry);
    this.logAccess('store', key);
    
    return { success: true, key };
  }

  /**
   * Recall a memory
   */
  async recall(key) {
    const entry = this.memories.get(key);
    
    if (!entry) {
      return { found: false, key };
    }
    
    entry.accessCount++;
    entry.lastAccessed = new Date().toISOString();
    this.logAccess('recall', key);
    
    return {
      found: true,
      key,
      value: entry.value,
      storedAt: entry.timestamp,
      accessCount: entry.accessCount
    };
  }

  /**
   * Query memories by pattern
   */
  async query(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const results = [];
    
    for (const [key, entry] of this.memories) {
      if (regex.test(key)) {
        results.push({
          key,
          value: entry.value,
          storedAt: entry.timestamp,
          accessCount: entry.accessCount
        });
      }
    }
    
    return {
      count: results.length,
      matches: results
    };
  }

  /**
   * Clear a memory
   */
  async clear(key) {
    const existed = this.memories.has(key);
    this.memories.delete(key);
    this.logAccess('clear', key);
    
    return { success: true, key, existed };
  }

  /**
   * Get all memories (for debugging)
   */
  getAll() {
    const all = {};
    for (const [key, entry] of this.memories) {
      all[key] = {
        value: entry.value,
        timestamp: entry.timestamp
      };
    }
    return all;
  }

  /**
   * Log memory access
   */
  logAccess(action, key) {
    this.accessLog.push({
      action,
      key,
      timestamp: new Date().toISOString()
    });
    
    // Keep log from growing too large
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-500);
    }
  }

  /**
   * Get access log
   */
  getAccessLog(limit = 50) {
    return this.accessLog.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalMemories: this.memories.size,
      totalAccesses: this.accessLog.length
    };
  }
}
