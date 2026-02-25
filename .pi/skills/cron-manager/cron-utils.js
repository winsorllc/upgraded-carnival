#!/usr/bin/env node
/**
 * Cron utilities - Parser, validator, and expression generator
 */

// Standard cron patterns
const FIELD_NAMES = ['minute', 'hour', 'day of month', 'month', 'day of week'];
const FIELD_RANGES = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7]
];

// Month names
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function isValidNumber(str, min, max) {
  const num = parseInt(str);
  return !isNaN(num) && num >= min && num <= max;
}

function validateExpr(expr) {
  const fields = expr.split(/\s+/).filter(f => f);
  
  if (fields.length !== 5) {
    return { valid: false, error: `Expected 5 fields, got ${fields.length}` };
  }
  
  const results = [];
  
  for (let i = 0; i < 5; i++) {
    const field = fields[i].toLowerCase();
    const [min, max] = FIELD_RANGES[i];
    
    // Check for special characters
    if (field === '*') {
      results.push({ field: FIELD_NAMES[i], value: field, valid: true });
      continue;
    }
    
    if (field.includes('/')) {
      const [base, step] = field.split('/');
      if (!isValidNumber(step, 1, max)) {
        results.push({ field: FIELD_NAMES[i], value: field, valid: false, error: `Invalid step: ${step}` });
        continue;
      }
      results.push({ field: FIELD_NAMES[i], value: field, valid: true });
      continue;
    }
    
    if (field.includes('-')) {
      const [start, end] = field.split('-');
      if (!isValidNumber(start, min, max) || !isValidNumber(end, min, max)) {
        results.push({ field: FIELD_NAMES[i], value: field, valid: false, error: `Invalid range: ${start}-${end}` });
        continue;
      }
      results.push({ field: FIELD_NAMES[i], value: field, valid: true });
      continue;
    }
    
    if (field.includes(',')) {
      const values = field.split(',');
      const allValid = values.every(v => isValidNumber(v, min, max));
      if (!allValid) {
        results.push({ field: FIELD_NAMES[i], value: field, valid: false, error: `Invalid value list` });
        continue;
      }
      results.push({ field: FIELD_NAMES[i], value: field, valid: true });
      continue;
    }
    
    // Single value
    if (!isValidNumber(field, min, max)) {
      results.push({ field: FIELD_NAMES[i], value: field, valid: false, error: `Value out of range ${min}-${max}` });
      continue;
    }
    
    results.push({ field: FIELD_NAMES[i], value: field, valid: true });
  }
  
  const errors = results.filter(r => !r.valid);
  return {
    valid: errors.length === 0,
    fields: results,
    error: errors.length > 0 ? errors.map(e => `${e.field}: ${e.error}`).join('; ') : null
  };
}

function getNextRun(expr, from = new Date()) {
  // Simplified next run calculation
  const now = new Date(from);
  const fields = expr.split(/\s+/);
  
  // This is a simplified version - a full implementation would parse all fields
  const minute = fields[0];
  const hour = fields[1];
  const dayOfMonth = fields[2];
  const month = fields[3];
  const dayOfWeek = fields[4];
  
  if (minute === '*' || minute.startsWith('*/')) {
    const step = minute === '*' ? 1 : parseInt(minute.split('/')[1]);
    const next = new Date(now);
    next.setMinutes(Math.ceil(now.getMinutes() / step) * step, 0, 0);
    if (next <= now) {
      next.setHours(next.getHours() + 1);
    }
    return next;
  }
  
  if (minute.includes('-')) {
    const [start] = minute.split('-');
    const next = new Date(now);
    next.setMinutes(parseInt(start), 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }
  
  if (isValidNumber(minute, 0, 59)) {
    const next = new Date(now);
    next.setMinutes(parseInt(minute), 0, 0);
    if (next <= now) {
      next.setHours(next.getHours() + 1);
    }
    return next;
  }
  
  return new Date(now.getTime() + 60000); // Default: 1 minute from now
}

function describe(expr) {
  const r = validateExpr(expr);
  if (!r.valid) return r.error;
  
  const fields = expr.split(/\s+/);
  const parts = [];
  
  if (fields[0] === '*') {
    parts.push('every minute');
  } else if (fields[0].startsWith('*/')) {
    parts.push(`every ${fields[0].split('/')[1]} minutes`);
  } else {
    parts.push(`at minute ${fields[0]}`);
  }
  
  if (fields[1] === '*') {
    parts.push('of every hour');
  } else if (fields[1].startsWith('*/')) {
    parts.push(`every ${fields[1].split('/')[1]} hours`);
  } else {
    parts.push(`at hour ${fields[1]}`);
  }
  
  if (fields[4] !== '*') {
    if (fields[4] === '1-5') {
      parts.push('on weekdays');
    } else if (fields[4] === '0,6' || fields[4] === '6,0') {
      parts.push('on weekends');
    } else {
      parts.push(`on day ${fields[4]}`);
    }
  }
  
  return parts.join(' ');
}

function listJobs(configPath) {
  const fs = require('fs');
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.map(job => ({
      ...job,
      valid: validateExpr(job.schedule || '* * * * *').valid,
      description: describe(job.schedule || '* * * * *')
    }));
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { validateExpr, getNextRun, describe, listJobs, FIELD_NAMES };