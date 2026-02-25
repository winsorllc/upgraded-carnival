#!/usr/bin/env node

/**
 * query.js - Query LLM usage data
 * 
 * Usage:
 *   node query.js [--by model|provider|job] [--from <date>] [--to <date>] [--job-id <id>] [--format json|text]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = '/job/data/model-usage';
const USAGE_FILE = path.join(DATA_DIR, 'usage.jsonl');

const args = process.argv.slice(2);
const opts = {};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const value = args[i + 1] || '';
    if (!value.startsWith('--')) {
      opts[key] = value;
      i++;
    }
  }
}

const { by, from, to, 'job-id': jobId, format = 'text' } = opts;

// Read all entries
let entries = [];
if (fs.existsSync(USAGE_FILE)) {
  const lines = fs.readFileSync(USAGE_FILE, 'utf8').split('\n').filter(Boolean);
  entries = lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

if (entries.length === 0) {
  console.log('No usage data found. Record some costs first with:');
  console.log('  node record.js --model <model> --provider <provider> --cost <cost>');
  process.exit(0);
}

// Filter by date range
let filtered = entries;
if (from) {
  filtered = filtered.filter(e => e.timestamp >= from);
}
if (to) {
  filtered = filtered.filter(e => e.timestamp <= to);
}

// Filter by job ID
if (jobId) {
  filtered = filtered.filter(e => e.jobId === jobId);
  
  if (format === 'json') {
    console.log(JSON.stringify(filtered, null, 2));
  } else {
    if (filtered.length === 0) {
      console.log(`No entries found for job: ${jobId}`);
    } else {
      const e = filtered[0];
      console.log(`Job: ${jobId}`);
      console.log(`  Model: ${e.model}`);
      console.log(`  Provider: ${e.provider}`);
      console.log(`  Input Tokens: ${e.inputTokens.toLocaleString()}`);
      console.log(`  Output Tokens: ${e.outputTokens.toLocaleString()}`);
      console.log(`  Cost: $${e.cost.toFixed(2)}`);
      console.log(`  Date: ${e.timestamp}`);
    }
  }
  process.exit(0);
}

// Calculate totals
const totalCost = filtered.reduce((sum, e) => sum + e.cost, 0);
const totalInput = filtered.reduce((sum, e) => sum + (e.inputTokens || 0), 0);
const totalOutput = filtered.reduce((sum, e) => sum + (e.outputTokens || 0), 0);

// Group by
const byModel = {};
const byProvider = {};
const byJob = {};

filtered.forEach(e => {
  byModel[e.model] = (byModel[e.model] || 0) + e.cost;
  byProvider[e.provider] = (byProvider[e.provider] || 0) + e.cost;
  if (e.jobId) {
    byJob[e.jobId] = (byJob[e.jobId] || 0) + e.cost;
  }
});

if (format === 'json') {
  const result = {
    totalCost: Math.round(totalCost * 100) / 100,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    entries: filtered.length,
    byModel: Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    byProvider: Object.fromEntries(Object.entries(byProvider).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    period: from && to ? { from, to } : null
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

// Text output
console.log('═'.repeat(50));
console.log('           LLM Usage Summary');
console.log('═'.repeat(50));
console.log(`\nTotal Cost: $${totalCost.toFixed(2)}`);
console.log(`Total Entries: ${filtered.length}`);

if (by && by === 'model') {
  console.log('\n─── By Model ───');
  Object.entries(byModel)
    .sort((a, b) => b[1] - a[1])
    .forEach(([model, cost]) => {
      const pct = ((cost / totalCost) * 100).toFixed(1);
      console.log(`  ${model}: $${cost.toFixed(2)} (${pct}%)`);
    });
} else if (by && by === 'provider') {
  console.log('\n─── By Provider ───');
  Object.entries(byProvider)
    .sort((a, b) => b[1] - a[1])
    .forEach(([provider, cost]) => {
      const pct = ((cost / totalCost) * 100).toFixed(1);
      console.log(`  ${provider}: $${cost.toFixed(2)} (${pct}%)`);
    });
} else if (by && by === 'job') {
  console.log('\n─── By Job ───');
  Object.entries(byJob)
    .sort((a, b) => b[1] - a[1])
    .forEach(([job, cost]) => {
      console.log(`  ${job}: $${cost.toFixed(2)}`);
    });
} else {
  // Show all breakdowns
  console.log('\n─── By Model ───');
  Object.entries(byModel)
    .sort((a, b) => b[1] - a[1])
    .forEach(([model, cost]) => {
      const pct = ((cost / totalCost) * 100).toFixed(1);
      console.log(`  ${model}: $${cost.toFixed(2)} (${pct}%)`);
    });

  console.log('\n─── By Provider ───');
  Object.entries(byProvider)
    .sort((a, b) => b[1] - a[1])
    .forEach(([provider, cost]) => {
      const pct = ((cost / totalCost) * 100).toFixed(1);
      console.log(`  ${provider}: $${cost.toFixed(2)} (${pct}%)`);
    });
  
  if (Object.keys(byJob).length > 0) {
    console.log('\n─── By Job ───');
    Object.entries(byJob)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([job, cost]) => {
        console.log(`  ${job}: $${cost.toFixed(2)}`);
      });
  }
}

console.log('\n' + '═'.repeat(50));
