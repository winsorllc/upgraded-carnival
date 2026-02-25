#!/usr/bin/env node

/**
 * Rate Limiter
 * Sliding window rate limiting for API calls and actions
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = process.env.RATE_LIMIT_FILE || 'data/rate-limits.json';

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.maxRequests = options.maxRequests || 100;
    this.burstAllowance = options.burstAllowance || 0;
    this.costPerRequest = options.costPerRequest || 1;
    this.maxCostPerDay = options.maxCostPerDay || 1000;
    
    // Track requests per key
    this.requests = new Map();
    // Track costs per key
    this.costs = new Map();
    // State file path
    this.stateFile = path.resolve(STATE_FILE);
    
    // Load persisted state
    this.load();
  }

  /**
   * Get current timestamp
   */
  now() {
    return Date.now();
  }

  /**
   * Load state from disk
   */
  load() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        // Filter out old entries
        const cutoff = this.now() - this.windowMs - 60000;
        
        if (data.requests) {
          for (const [key, timestamps] of Object.entries(data.requests)) {
            const valid = (timestamps || []).filter(t => t > cutoff);
            if (valid.length > 0) {
              this.requests.set(key, valid);
            }
          }
        }
        
        if (data.costs) {
          for (const [key, costData] of Object.entries(data.costs)) {
            if (costData.date === new Date().toISOString().split('T')[0]) {
              this.costs.set(key, costData.total);
            }
          }
        }
      }
    } catch (e) {
      // Ignore load errors
    }
  }

  /**
   * Save state to disk
   */
  save() {
    try {
      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        requests: Object.fromEntries(this.requests),
        costs: {}
      };
      
      for (const [key, total] of this.costs) {
        data.costs[key] = {
          date: new Date().toISOString().split('T')[0],
          total
        };
      }
      
      fs.writeFileSync(this.stateFile, JSON.stringify(data, null, 2));
    } catch (e) {
      // Ignore save errors
    }
  }

  /**
   * Get request timestamps for a key
   */
  getTimestamps(key) {
    return this.requests.get(key) || [];
  }

  /**
   * Get valid timestamps (within window)
   */
  getValidTimestamps(key) {
    const cutoff = this.now() - this.windowMs;
    return this.getTimestamps(key).filter(t => t > cutoff);
  }

  /**
   * Check if action is allowed
   */
  check(key, options = {}) {
    const valid = this.getValidTimestamps(key);
    const max = options.maxRequests || this.maxRequests;
    
    if (options.cost) {
      const currentCost = this.costs.get(key) || 0;
      if (currentCost + options.cost > this.maxCostPerDay) {
        return false;
      }
    }
    
    return valid.length < max + this.burstAllowance;
  }

  /**
   * Record an action
   */
  record(key, options = {}) {
    const timestamps = this.getTimestamps(key);
    const now = this.now();
    
    // Add new timestamp
    timestamps.push(now);
    
    // Clean old timestamps
    const cutoff = now - this.windowMs - 60000; // Keep 1 extra minute of history
    const valid = timestamps.filter(t => t > cutoff);
    
    this.requests.set(key, valid);
    
    // Record cost if provided
    if (options.cost) {
      const currentCost = this.costs.get(key) || 0;
      this.costs.set(key, currentCost + options.cost);
    }
    
    this.save();
    
    return {
      allowed: true,
      remaining: (options.maxRequests || this.maxRequests) - valid.length,
      total: valid.length
    };
  }

  /**
   * Get remaining quota
   */
  getRemaining(key, options = {}) {
    const valid = this.getValidTimestamps(key);
    const max = options.maxRequests || this.maxRequests;
    return Math.max(0, max + this.burstAllowance - valid.length);
  }

  /**
   * Get remaining cost budget
   */
  getRemainingCost(key) {
    const currentCost = this.costs.get(key) || 0;
    return Math.max(0, this.maxCostPerDay - currentCost);
  }

  /**
   * Reset limit for a key
   */
  reset(key) {
    this.requests.delete(key);
    this.costs.delete(key);
    this.save();
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      keys: [],
      totalRequests: 0,
      totalCost: 0
    };
    
    for (const [key, timestamps] of this.requests) {
      const valid = this.getValidTimestamps(key);
      stats.keys.push({
        key,
        requestsInWindow: valid.length,
        totalHistorical: timestamps.length,
        remaining: this.getRemaining(key)
      });
      stats.totalRequests += timestamps.length;
    }
    
    for (const [key, cost] of this.costs) {
      stats.totalCost += cost;
    }
    
    return stats;
  }

  /**
   * Wait for rate limit to clear
   */
  async waitFor(key, options = {}) {
    const maxWait = options.maxWaitMs || 60000;
    const start = this.now();
    
    while (!this.check(key, options)) {
      if (this.now() - start > maxWait) {
        throw new Error('Rate limit wait timeout');
      }
      await new Promise(r => setTimeout(r, 100));
    }
    
    return this.record(key, options);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const limiter = new RateLimiter();

  switch (command) {
    case 'check':
      const key = args[1];
      if (!key) {
        console.error('Usage: rate-limit check <key> [--cost <amount>]');
        process.exit(1);
      }
      
      const costIdx = args.indexOf('--cost');
      const cost = costIdx > -1 ? parseInt(args[costIdx + 1], 10) : 0;
      
      const allowed = limiter.check(key, { cost: cost || undefined });
      console.log(allowed ? 'Allowed ✓' : 'Blocked ✗');
      break;

    case 'record':
      const recKey = args[1];
      if (!recKey) {
        console.error('Usage: rate-limit record <key> [--cost <amount>]');
        process.exit(1);
      }
      
      const costIdx2 = args.indexOf('--cost');
      const recCost = costIdx2 > -1 ? parseInt(args[costIdx2 + 1], 10) : 0;
      
      const result = limiter.record(recKey, { cost: recCost || undefined });
      console.log('Recorded. Remaining:', result.remaining);
      break;

    case 'remaining':
      const remKey = args[1];
      if (!remKey) {
        console.error('Usage: rate-limit remaining <key>');
        process.exit(1);
      }
      
      console.log('Remaining:', limiter.getRemaining(remKey));
      console.log('Cost remaining:', limiter.getRemainingCost(remKey));
      break;

    case 'reset':
      const resetKey = args[1];
      if (!resetKey) {
        console.error('Usage: rate-limit reset <key>');
        process.exit(1);
      }
      
      limiter.reset(resetKey);
      console.log('Reset complete for:', resetKey);
      break;

    case 'stats':
      const stats = limiter.getStats();
      console.log('Rate Limiter Statistics:');
      console.log('Total requests:', stats.totalRequests);
      console.log('Total cost:', stats.totalCost);
      console.log('\nPer-key stats:');
      stats.keys.forEach(k => {
        console.log(`  ${k.key}: ${k.requestsInWindow}/${limiter.maxRequests} in window, ${k.remaining} remaining`);
      });
      break;

    default:
      console.log('Rate Limiter Commands:');
      console.log('  check <key> [--cost <amt>]   - Check if action allowed');
      console.log('  record <key> [--cost <amt>] - Record an action');
      console.log('  remaining <key>             - Get remaining quota');
      console.log('  reset <key>                 - Reset limit for key');
      console.log('  stats                       - Show statistics');
  }
}

module.exports = { RateLimiter };
