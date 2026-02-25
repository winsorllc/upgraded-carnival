#!/usr/bin/env node

// Comprehensive Audit Logger for Agent Actions

import { writeFileSync, appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

const AUDIT_DIR = process.env.AUDIT_DIR || './audit-logs';
const AUDIT_LEVEL = process.env.AUDIT_LEVEL || 'info';
const AUDIT_RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS || '90');

// Ensure audit directory exists
if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });

const LEVELS = { debug: 0, info: 1, warning: 2, error: 3, critical: 4 };
const currentLevel = LEVELS[AUDIT_LEVEL] || LEVELS.info;

// Sensitive fields to redact
const SENSITIVE_FIELDS = [
  'password', 'secret', 'token', 'api_key', 'apikey', 'private_key',
  'access_token', 'refresh_token', 'authorization', 'auth', 'credit_card'
];

function redactSensitive(data) {
  if (typeof data !== 'object' || data === null) return data;
  
  const redacted = Array.isArray(data) ? [] : {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(f => lowerKey.includes(f))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function generateId() {
  return createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .substring(0, 16);
}

function getLogFilename() {
  const now = new Date();
  return `${now.toISOString().split('T')[0]}.jsonl`;
}

function getLogPath() {
  return join(AUDIT_DIR, getLogFilename());
}

async function log(event) {
  const entry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    type: event.type || 'agent_action',
    level: event.level || 'info',
    message: event.message || '',
    data: redactSensitive(event.data || {}),
    source: {
      agent: process.env.AGENT_NAME || 'agent',
      session: process.env.SESSION_ID || 'default',
      ...event.source
    }
  };
  
  // Check if we should log this level
  if (LEVELS[entry.level] < currentLevel) {
    return entry;
  }
  
  const logPath = getLogPath();
  appendFileSync(logPath, JSON.stringify(entry) + '\n');
  
  return entry;
}

function parseLogLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function queryLogs({ type, startDate, endDate, level, limit = 100, format = 'json' } = {}) {
  const files = readdirSync(AUDIT_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .sort();
  
  const results = [];
  
  for (const file of files) {
    const filePath = join(AUDIT_DIR, file);
    const fileDate = file.replace('.jsonl', '');
    
    if (startDate && fileDate < startDate) continue;
    if (endDate && fileDate > endDate) continue;
    
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n').filter(l => l.trim())) {
      const entry = parseLogLine(line);
      if (!entry) continue;
      
      if (type && entry.type !== type) continue;
      if (level && LEVELS[entry.level] < LEVELS[level]) continue;
      
      results.push(entry);
      
      if (results.length >= limit) break;
    }
    
    if (results.length >= limit) break;
  }
  
  if (format === 'text') {
    return results.map(e => 
      `[${e.timestamp}] ${e.level.toUpperCase()} ${e.type}: ${e.message}`
    ).join('\n');
  }
  
  return results;
}

function showRecent(count = 10, type = null) {
  return queryLogs({ type, limit: count, format: 'text' });
}

function getStats(period = 'day') {
  const logs = queryLogs({ limit: 10000, format: 'json' });
  
  const stats = {
    total: logs.length,
    byType: {},
    byLevel: {},
    byDate: {}
  };
  
  for (const entry of logs) {
    stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
    stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
    
    const date = entry.timestamp.split('T')[0];
    stats.byDate[date] = (stats.byDate[date] || 0) + 1;
  }
  
  return stats;
}

function generateReport({ startDate, endDate, format = 'markdown' } = {}) {
  const logs = queryLogs({ startDate, endDate, limit: 10000, format: 'json' });
  const stats = getStats();
  
  if (format === 'json') {
    return { logs, stats, period: { startDate, endDate } };
  }
  
  // Markdown format
  let report = `# Audit Report\n\n`;
  report += `**Period:** ${startDate || 'Beginning'} to ${endDate || 'Now'}\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  report += `## Summary\n\n`;
  report += `- Total Events: ${stats.total}\n`;
  report += `- Date Range: ${Object.keys(stats.byDate).sort()[0]} to ${Object.keys(stats.byDate).sort().slice(-1)[0]}\n\n`;
  
  report += `## Events by Type\n\n`;
  for (const [type, count] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
    report += `- ${type}: ${count}\n`;
  }
  report += '\n';
  
  report += `## Events by Level\n\n`;
  for (const [level, count] of Object.entries(stats.byLevel)) {
    report += `- ${level}: ${count}\n`;
  }
  report += '\n';
  
  report += `## Recent Errors\n\n`;
  const errors = logs.filter(l => l.level === 'error' || l.level === 'critical').slice(0, 10);
  for (const err of errors) {
    report += `### ${err.timestamp}\n`;
    report += `**Type:** ${err.type}\n`;
    report += `**Message:** ${err.message}\n`;
    if (err.data.error) {
      report += `**Error:** ${err.data.error}\n`;
    }
    report += '\n';
  }
  
  return report;
}

function cleanLogs(olderThanDays = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  
  const files = readdirSync(AUDIT_DIR).filter(f => f.endsWith('.jsonl'));
  let deleted = 0;
  
  for (const file of files) {
    const fileDate = file.replace('.jsonl', '');
    if (fileDate < cutoffStr) {
      unlinkSync(join(AUDIT_DIR, file));
      deleted++;
    }
  }
  
  return { deleted, cutoff: cutoffStr };
}

// CLI Commands
const cmd = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (cmd) {
    case 'log': {
      let type = 'agent_action';
      let message = '';
      let level = 'info';
      let data = {};
      
      const typeIdx = args.indexOf('--type');
      const msgIdx = args.indexOf('--message');
      const dataIdx = args.indexOf('--data');
      const levelIdx = args.indexOf('--level');
      
      if (typeIdx >= 0 && typeIdx + 1 < args.length) type = args[typeIdx + 1];
      if (msgIdx >= 0 && msgIdx + 1 < args.length) message = args[msgIdx + 1];
      if (levelIdx >= 0 && levelIdx + 1 < args.length) level = args[levelIdx + 1];
      if (dataIdx >= 0 && dataIdx + 1 < args.length) {
        try {
          data = JSON.parse(args[dataIdx + 1]);
        } catch {
          data = { raw: args[dataIdx + 1] };
        }
      }
      
      const entry = await log({ type, message, level, data });
      console.log(JSON.stringify(entry, null, 2));
      break;
    }
      
    case 'query': {
      let type = null, startDate = null, endDate = null, level = null;
      let limit = 100, format = 'json';
      
      const typeIdx = args.indexOf('--type');
      const startIdx = args.indexOf('--start');
      const endIdx = args.indexOf('--end');
      const levelIdx = args.indexOf('--level');
      const limitIdx = args.indexOf('--limit');
      const formatIdx = args.indexOf('--format');
      
      if (typeIdx >= 0 && typeIdx + 1 < args.length) type = args[typeIdx + 1];
      if (startIdx >= 0 && startIdx + 1 < args.length) startDate = args[startIdx + 1];
      if (endIdx >= 0 && endIdx + 1 < args.length) endDate = args[endIdx + 1];
      if (levelIdx >= 0 && levelIdx + 1 < args.length) level = args[levelIdx + 1];
      if (limitIdx >= 0 && limitIdx + 1 < args.length) limit = parseInt(args[limitIdx + 1]);
      if (formatIdx >= 0 && formatIdx + 1 < args.length) format = args[formatIdx + 1];
      
      const results = queryLogs({ type, startDate, endDate, level, limit, format });
      console.log(format === 'json' ? JSON.stringify(results, null, 2) : results);
      break;
    }
      
    case 'recent': {
      let count = 10, type = null;
      
      const countIdx = args.indexOf('--count');
      const typeIdx = args.indexOf('--type');
      
      if (countIdx >= 0 && countIdx + 1 < args.length) count = parseInt(args[countIdx + 1]);
      if (typeIdx >= 0 && typeIdx + 1 < args.length) type = args[typeIdx + 1];
      
      console.log(showRecent(count, type));
      break;
    }
      
    case 'report': {
      let startDate = null, endDate = null, format = 'markdown';
      
      const startIdx = args.indexOf('--start');
      const endIdx = args.indexOf('--end');
      const formatIdx = args.indexOf('--format');
      
      if (startIdx >= 0 && startIdx + 1 < args.length) startDate = args[startIdx + 1];
      if (endIdx >= 0 && endIdx + 1 < args.length) endDate = args[endIdx + 1];
      if (formatIdx >= 0 && formatIdx + 1 < args.length) format = args[formatIdx + 1];
      
      console.log(generateReport({ startDate, endDate, format }));
      break;
    }
      
    case 'stats': {
      const periodIdx = args.indexOf('--period');
      const period = periodIdx >= 0 && periodIdx + 1 < args.length ? args[periodIdx + 1] : 'day';
      
      console.log(JSON.stringify(getStats(period), null, 2));
      break;
    }
      
    case 'clean': {
      let olderThan = 30;
      
      const olderIdx = args.indexOf('--older-than');
      if (olderIdx >= 0 && olderIdx + 1 < args.length) {
        olderThan = parseInt(args[olderIdx + 1]);
      }
      
      console.log(JSON.stringify(cleanLogs(olderThan), null, 2));
      break;
    }
      
    default:
      console.log(`Audit Logger

Usage: audit <command> [args...]

Commands:
  log --type <type> --message <message> [--data <json>] [--level <level>]
    Log an audit event
  query [--type <type>] [--start <date>] [--end <date>] [--limit <n>] [--format json|text]
    Query audit logs
  recent [--count <n>] [--type <type>]
    Show recent audit events
  report [--start <date>] [--end <date>] [--format json|markdown]
    Generate an audit report
  stats [--period <day|week|month>]
    Show audit statistics
  clean [--older-than <days>]
    Clean old audit logs

Event Types:
  tool_execution, file_read, file_write, file_edit, file_delete,
  command_execution, git_branch_created, git_commit, git_pr_created,
  auth_success, auth_failure, permission_denied, api_request,
  agent_error, agent_action

Levels:
  debug, info, warning, error, critical

Environment Variables:
  AUDIT_DIR: Log directory (default: ./audit-logs)
  AUDIT_LEVEL: Minimum level (default: info)
  AUDIT_RETENTION_DAYS: Retention period (default: 90)
`);
      process.exit(1);
  }
}

main().catch(console.error);
