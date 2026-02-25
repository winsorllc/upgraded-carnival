#!/usr/bin/env node

/**
 * Rate Limiter - Sliding window and token bucket rate limiting
 * Inspired by ZeroClaw's rate limiter with cost/day cap
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.RATE_LIMIT_DB_PATH || path.join(__dirname, 'rate-limits.db');

let db;

function initDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        requests TEXT DEFAULT '[]',
        total_requests INTEGER DEFAULT 0,
        total_cost REAL DEFAULT 0,
        window_start TEXT,
        day_start TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  return db;
}

function getTodayStart() {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

function getWindowStart(windowSeconds) {
  const now = new Date();
  now.setSeconds(now.getSeconds() - windowSeconds);
  return now.toISOString();
}

function cleanOldRequests(requests, windowStart) {
  return requests.filter(r => new Date(r.timestamp) >= new Date(windowStart));
}

async function check(options) {
  const { key, limit = 10, window = 60 } = options;
  
  if (!key) {
    throw new Error('--key is required');
  }
  
  initDB();
  
  const windowStart = getWindowStart(window);
  const stmt = db.prepare('SELECT * FROM rate_limits WHERE key = ?');
  const row = stmt.get(key);
  
  let used = 0;
  let requests = [];
  
  if (row) {
    requests = row.requests ? JSON.parse(row.requests) : [];
    requests = cleanOldRequests(requests, windowStart);
    used = requests.length;
  }
  
  const allowed = used < limit;
  const remaining = Math.max(0, limit - used);
  
  const resetAt = new Date();
  resetAt.setSeconds(resetAt.getSeconds() + window);
  
  return {
    allowed,
    remaining,
    resetAt: resetAt.toISOString(),
    used,
    limit
  };
}

async function record(options) {
  const { key, cost = 1 } = options;
  
  if (!key) {
    throw new Error('--key is required');
  }
  
  initDB();
  
  const windowStart = getWindowStart(60);
  const todayStart = getTodayStart();
  
  const stmt = db.prepare('SELECT * FROM rate_limits WHERE key = ?');
  let row = stmt.get(key);
  
  if (!row) {
    const insert = db.prepare(`
      INSERT INTO rate_limits (key, requests, total_requests, total_cost, window_start, day_start)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run(key, '[]', 0, 0, windowStart, todayStart);
    row = { key, requests: '[]', total_requests: 0, total_cost: 0, window_start: windowStart, day_start: todayStart };
  }
  
  let requests = row.requests ? JSON.parse(row.requests) : [];
  requests = cleanOldRequests(requests, windowStart);
  
  requests.push({
    timestamp: new Date().toISOString(),
    cost
  });
  
  let totalRequests = row.total_requests + 1;
  let totalCost = row.total_cost + cost;
  
  const dayStart = row.day_start || todayStart;
  if (new Date(todayStart) > new Date(dayStart)) {
    totalCost = cost;
    totalRequests = 1;
  }
  
  const update = db.prepare(`
    UPDATE rate_limits 
    SET requests = ?, total_requests = ?, total_cost = ?, window_start = ?, day_start = ?
    WHERE key = ?
  `);
  update.run(
    JSON.stringify(requests),
    totalRequests,
    totalCost,
    windowStart,
    todayStart,
    key
  );
  
  return {
    success: true,
    key,
    cost,
    totalRequests,
    totalCost
  };
}

async function status(options) {
  const { key, limit = 10, window = 60 } = options;
  
  if (!key) {
    throw new Error('--key is required');
  }
  
  initDB();
  
  const windowStart = getWindowStart(window);
  const stmt = db.prepare('SELECT * FROM rate_limits WHERE key = ?');
  const row = stmt.get(key);
  
  if (!row) {
    return {
      key,
      used: 0,
      totalRequests: 0,
      totalCost: 0,
      limit,
      window,
      resetAt: new Date(Date.now() + window * 1000).toISOString()
    };
  }
  
  let requests = row.requests ? JSON.parse(row.requests) : [];
  requests = cleanOldRequests(requests, windowStart);
  
  const used = requests.length;
  const remaining = Math.max(0, limit - used);
  
  const resetAt = new Date();
  resetAt.setSeconds(resetAt.getSeconds() + window);
  
  return {
    key,
    used,
    remaining,
    totalRequests: row.total_requests,
    totalCost: row.total_cost,
    limit,
    window,
    resetAt: resetAt.toISOString()
  };
}

async function reset(options) {
  const { key } = options;
  
  if (!key) {
    throw new Error('--key is required');
  }
  
  initDB();
  
  const stmt = db.prepare('DELETE FROM rate_limits WHERE key = ?');
  const result = stmt.run(key);
  
  return {
    success: result.changes > 0,
    key,
    message: result.changes > 0 ? 'Rate limit reset' : 'Key not found'
  };
}

async function dailyCost(options) {
  const { key, limit = 1000 } = options;
  
  if (!key) {
    throw new Error('--key is required');
  }
  
  initDB();
  
  const todayStart = getTodayStart();
  const stmt = db.prepare('SELECT * FROM rate_limits WHERE key = ?');
  const row = stmt.get(key);
  
  let totalCost = 0;
  let totalRequests = 0;
  
  if (row) {
    const dayStart = row.day_start || todayStart;
    if (new Date(todayStart) <= new Date(dayStart)) {
      totalCost = row.total_cost;
      totalRequests = row.total_requests;
    }
  }
  
  const allowed = totalCost < limit;
  const remaining = Math.max(0, limit - totalCost);
  
  const resetAt = new Date();
  resetAt.setUTCHours(24, 0, 0, 0);
  
  return {
    allowed,
    totalCost,
    totalRequests,
    limit,
    remaining,
    resetAt: resetAt.toISOString()
  };
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    if (command === 'check') {
      const options = {
        key: getArgValue(args, '--key'),
        limit: parseInt(getArgValue(args, '--limit') || '10'),
        window: parseInt(getArgValue(args, '--window') || '60')
      };
      
      if (!options.key) {
        console.error('Error: --key is required');
        process.exit(1);
      }
      
      const result = await check(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'record') {
      const options = {
        key: getArgValue(args, '--key'),
        cost: parseFloat(getArgValue(args, '--cost') || '1')
      };
      
      if (!options.key) {
        console.error('Error: --key is required');
        process.exit(1);
      }
      
      const result = await record(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'status') {
      const options = {
        key: getArgValue(args, '--key'),
        limit: parseInt(getArgValue(args, '--limit') || '10'),
        window: parseInt(getArgValue(args, '--window') || '60')
      };
      
      if (!options.key) {
        console.error('Error: --key is required');
        process.exit(1);
      }
      
      const result = await status(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'reset') {
      const options = {
        key: getArgValue(args, '--key')
      };
      
      if (!options.key) {
        console.error('Error: --key is required');
        process.exit(1);
      }
      
      const result = await reset(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'daily-cost') {
      const options = {
        key: getArgValue(args, '--key'),
        limit: parseFloat(getArgValue(args, '--limit') || '1000')
      };
      
      if (!options.key) {
        console.error('Error: --key is required');
        process.exit(1);
      }
      
      const result = await dailyCost(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else {
      console.log(`
Rate Limiter - Sliding window rate limiting

Usage:
  rate-limiter.js check --key <id> [options]
  rate-limiter.js record --key <id> [options]
  rate-limiter.js status --key <id> [options]
  rate-limiter.js reset --key <id>
  rate-limiter.js daily-cost --key <id> [options]

Commands:
  check       Check if action is allowed
  record      Record an action
  status      Get current usage status
  reset       Reset rate limit for key
  daily-cost  Check daily cost cap

Examples:
  rate-limiter.js check --key user:123 --limit 10 --window 60
  rate-limiter.js record --key user:123 --cost 1
  rate-limiter.js status --key user:123
  rate-limiter.js reset --key user:123
  rate-limiter.js daily-cost --key user:123 --limit 1000
`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
}

main();
