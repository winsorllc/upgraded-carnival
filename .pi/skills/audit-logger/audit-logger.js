#!/usr/bin/env node

/**
 * Audit Logger - Comprehensive audit logging for agent actions
 * Inspired by ZeroClaw's command_logger.rs
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.AUDIT_DB_PATH || path.join(__dirname, 'audit.db');

let db;

function initDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        tool TEXT,
        user TEXT DEFAULT 'agent',
        details TEXT,
        severity TEXT DEFAULT 'low',
        session_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_severity ON audit_logs(severity);
      CREATE INDEX IF NOT EXISTS idx_user ON audit_logs(user);
    `);
  }
  return db;
}

function generateId() {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getTimestamp() {
  return new Date().toISOString();
}

async function logAction(options) {
  const { action, tool, user = 'agent', details = {}, severity = 'low', sessionId } = options;
  
  initDB();
  
  const id = generateId();
  const timestamp = getTimestamp();
  const detailsJson = typeof details === 'string' ? details : JSON.stringify(details);
  
  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, tool, user, details, severity, session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, timestamp, action, tool || null, user, detailsJson, severity, sessionId || null);
  
  return { id, timestamp, action, tool, user, severity };
}

async function queryLogs(options) {
  const { limit = 50, type, user, severity, startTime, endTime } = options;
  
  initDB();
  
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];
  
  if (type) {
    sql += ' AND action = ?';
    params.push(type);
  }
  if (user) {
    sql += ' AND user = ?';
    params.push(user);
  }
  if (severity) {
    sql += ' AND severity = ?';
    params.push(severity);
  }
  if (startTime) {
    sql += ' AND timestamp >= ?';
    params.push(startTime);
  }
  if (endTime) {
    sql += ' AND timestamp <= ?';
    params.push(endTime);
  }
  
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);
  
  return rows.map(row => ({
    ...row,
    details: row.details ? JSON.parse(row.details) : {}
  }));
}

async function checkSecurity(options) {
  const { hours = 24 } = options;
  
  initDB();
  
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  
  const stmt = db.prepare(`
    SELECT * FROM audit_logs 
    WHERE timestamp >= ? AND action IN ('security_event', 'rate_limit', 'auth_failure')
    ORDER BY timestamp DESC
  `);
  
  const rows = stmt.all(cutoff);
  
  const summary = {
    total: rows.length,
    byType: {},
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    events: rows.map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : {}
    }))
  };
  
  rows.forEach(row => {
    summary.byType[row.action] = (summary.byType[row.action] || 0) + 1;
    if (summary.bySeverity[row.severity] !== undefined) {
      summary.bySeverity[row.severity]++;
    }
  });
  
  return summary;
}

async function exportLogs(options) {
  const { format = 'json', output } = options;
  
  initDB();
  
  const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC');
  const rows = stmt.all();
  
  let content;
  
  if (format === 'csv') {
    const headers = ['id', 'timestamp', 'action', 'tool', 'user', 'details', 'severity', 'session_id'];
    const csvRows = [headers.join(',')];
    
    rows.forEach(row => {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    });
    
    content = csvRows.join('\n');
  } else {
    content = JSON.stringify(rows.map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : {}
    })), null, 2);
  }
  
  if (output) {
    fs.writeFileSync(output, content);
    return { success: true, output, count: rows.length };
  }
  
  return content;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    if (command === 'log') {
      const options = {
        action: getArgValue(args, '--action'),
        tool: getArgValue(args, '--tool'),
        user: getArgValue(args, '--user'),
        details: getArgValue(args, '--details'),
        severity: getArgValue(args, '--severity') || 'low',
        sessionId: getArgValue(args, '--session-id')
      };
      
      if (!options.action) {
        console.error('Error: --action is required');
        process.exit(1);
      }
      
      if (options.details) {
        try {
          options.details = JSON.parse(options.details);
        } catch (e) {
          options.details = { raw: options.details };
        }
      }
      
      const result = await logAction(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'query') {
      const options = {
        limit: parseInt(getArgValue(args, '--limit') || '50'),
        type: getArgValue(args, '--type'),
        user: getArgValue(args, '--user'),
        severity: getArgValue(args, '--severity'),
        startTime: getArgValue(args, '--start-time'),
        endTime: getArgValue(args, '--end-time')
      };
      
      const result = await queryLogs(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'security') {
      const options = {
        hours: parseInt(getArgValue(args, '--hours') || '24')
      };
      
      const result = await checkSecurity(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'export') {
      const options = {
        format: getArgValue(args, '--format') || 'json',
        output: getArgValue(args, '--output')
      };
      
      const result = await exportLogs(options);
      if (options.output) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result);
      }
      
    } else {
      console.log(`
Audit Logger - Comprehensive audit logging for agent actions

Usage:
  audit-logger.js log --action <type> [options]
  audit-logger.js query [options]
  audit-logger.js security [options]
  audit-logger.js export [options]

Commands:
  log       Log an action
  query     Query audit logs
  security  Check security events
  export    Export audit logs

Examples:
  audit-logger.js log --action tool_execution --tool bash --details '{"command": "ls"}'
  audit-logger.js query --limit 10 --type tool_execution
  audit-logger.js security --hours 24
  audit-logger.js export --format csv --output audit.csv
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
