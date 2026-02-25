#!/usr/bin/env node

/**
 * report.js - Generate formatted LLM usage reports
 * 
 * Usage:
 *   node report.js [--period 7d|30d|90d|all] [--format json|text]
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

const { period = 'all', format = 'text' } = opts;

// Read entries
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

// Calculate date range
let fromDate = null;
let toDate = new Date();

if (period !== 'all') {
  const days = parseInt(period);
  if (days) {
    fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
  }
}

// Filter by date range
let filtered = entries;
if (fromDate) {
  filtered = filtered.filter(e => new Date(e.timestamp) >= fromDate);
}

// Calculate totals
const totalCost = filtered.reduce((sum, e) => sum + e.cost, 0);
const totalInput = filtered.reduce((sum, e) => sum + (e.inputTokens || 0), 0);
const totalOutput = filtered.reduce((sum, e) => sum + (e.outputTokens || 0), 0);

// Group by
const byModel = {};
const byProvider = {};
const byJob = {};
const byDay = {};

filtered.forEach(e => {
  const date = e.timestamp.split('T')[0];
  byModel[e.model] = (byModel[e.model] || { cost: 0, input: 0, output: 0 });
  byModel[e.model].cost += e.cost;
  byModel[e.model].input += e.inputTokens || 0;
  byModel[e.model].output += e.outputTokens || 0;
  
  byProvider[e.provider] = (byProvider[e.provider] || { cost: 0, input: 0, output: 0 });
  byProvider[e.provider].cost += e.cost;
  byProvider[e.provider].input += e.inputTokens || 0;
  byProvider[e.provider].output += e.outputTokens || 0;
  
  if (e.jobId) {
    byJob[e.jobId] = (byJob[e.jobId] || { cost: 0, input: 0, output: 0 });
    byJob[e.jobId].cost += e.cost;
    byJob[e.jobId].input += e.inputTokens || 0;
    byJob[e.jobId].output += e.outputTokens || 0;
  }
  
  byDay[date] = (byDay[date] || { cost: 0, input: 0, output: 0 });
  byDay[date].cost += e.cost;
  byDay[date].input += e.inputTokens || 0;
  byDay[date].output += e.outputTokens || 0;
});

if (format === 'json') {
  console.log(JSON.stringify({
    period: period,
    totalCost: Math.round(totalCost * 100) / 100,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    entries: filtered.length,
    byModel: Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, { cost: Math.round(v.cost * 100) / 100, inputTokens: v.input, outputTokens: v.output }])),
    byProvider: Object.fromEntries(Object.entries(byProvider).map(([k, v]) => [k, { cost: Math.round(v.cost * 100) / 100, inputTokens: v.input, outputTokens: v.output }])),
    byDay: Object.fromEntries(Object.entries(byDay).map(([k, v]) => [k, { cost: Math.round(v.cost * 100) / 100, inputTokens: v.input, outputTokens: v.output }])),
  }, null, 2));
  process.exit(0);
}

// Text/Table output
const periodLabel = period === 'all' ? 'All Time' : `Last ${period}`;
const width = 60;

console.log('');
console.log('╔' + '═'.repeat(width - 2) + '╗');
console.log('║' + ' '.repeat(Math.floor((width - 2 - 24) / 2)) + 'LLM Usage Report' + ' '.repeat(Math.ceil((width - 2 - 24) / 2)) + '║');
console.log('║' + ' '.repeat(Math.floor((width - 2 - periodLabel.length) / 2)) + periodLabel + ' '.repeat(Math.ceil((width - 2 - periodLabel.length) / 2)) + '║');
console.log('╠' + '═'.repeat(width - 2) + '╣');

console.log('║' + ' '.repeat(2) + 'Total Cost:' + ' '.repeat(width - 18 - totalCost.toFixed(2).length) + `$${totalCost.toFixed(2)}`.padStart(14) + ' ║');
console.log('║' + ' '.repeat(2) + 'Total Input:' + ' '.repeat(width - 18 - totalInput.toLocaleString().length) + totalInput.toLocaleString().padStart(14) + ' ║');
console.log('║' + ' '.repeat(2) + 'Total Output:' + ' '.repeat(width - 18 - totalOutput.toLocaleString().length) + totalOutput.toLocaleString().padStart(14) + ' ║');
console.log('║' + ' '.repeat(2) + 'Total Entries:' + ' '.repeat(width - 19 - filtered.length.toString().length) + filtered.length.toString().padStart(14) + ' ║');

console.log('╠' + '═'.repeat(width - 2) + '╣');
console.log('║' + ' '.repeat(2) + 'By Model:' + ' '.repeat(width - 12) + '║');

Object.entries(byModel)
  .sort((a, b) => b[1].cost - a[1].cost)
  .forEach(([model, data]) => {
    const pct = ((data.cost / totalCost) * 100).toFixed(0);
    const costStr = `$${data.cost.toFixed(2)}`;
    const pctStr = `(${pct}%)`;
    const modelDisplay = model.length > 24 ? model.slice(0, 21) + '...' : model;
    const line = `${modelDisplay} ${costStr} ${pctStr}`;
    console.log('║  ' + line + ' '.repeat(Math.max(0, width - 4 - line.length)) + '║');
  });

console.log('╠' + '═'.repeat(width - 2) + '╣');
console.log('║' + ' '.repeat(2) + 'By Provider:' + ' '.repeat(width - 14) + '║');

Object.entries(byProvider)
  .sort((a, b) => b[1].cost - a[1].cost)
  .forEach(([provider, data]) => {
    const pct = ((data.cost / totalCost) * 100).toFixed(0);
    const costStr = `$${data.cost.toFixed(2)}`;
    const pctStr = `(${pct}%)`;
    const line = `${provider} ${costStr} ${pctStr}`;
    console.log('║  ' + line + ' '.repeat(Math.max(0, width - 4 - line.length)) + '║');
  });

console.log('╚' + '═'.repeat(width - 2) + '╝');
console.log('');
