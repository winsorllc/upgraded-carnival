#!/usr/bin/env node

/**
 * record.js - Record LLM usage cost entries
 * 
 * Usage:
 *   node record.js --model <model> --provider <provider> --input <tokens> --output <tokens> --cost <cost> [--job-id <id>] [--timestamp <iso-date>]
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

const { model, provider, input, output, cost, 'job-id': jobId, timestamp } = opts;

if (!model || !provider || !cost) {
  console.error('Usage: node record.js --model <model> --provider <provider> --input <tokens> --output <tokens> --cost <cost> [--job-id <id>] [--timestamp <iso-date>]');
  console.error('');
  console.error('Required:');
  console.error('  --model       Model name (e.g., claude-3-5-sonnet-20241022)');
  console.error('  --provider    Provider (anthropic, openai, google)');
  console.error('  --cost        Total cost in USD');
  console.error('');
  console.error('Optional:');
  console.error('  --input       Input tokens');
  console.error('  --output      Output tokens');
  console.error('  --job-id      Job/session ID for tracking');
  console.error('  --timestamp   ISO timestamp (defaults to now)');
  process.exit(1);
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const entry = {
  id: generateId(),
  model,
  provider,
  inputTokens: parseInt(input) || 0,
  outputTokens: parseInt(output) || 0,
  cost: parseFloat(cost),
  jobId: jobId || null,
  timestamp: timestamp || new Date().toISOString(),
  recordedAt: new Date().toISOString()
};

// Append to JSONL file
fs.appendFileSync(USAGE_FILE, JSON.stringify(entry) + '\n');

console.log(`✓ Recorded: ${model} (${provider}) - $${parseFloat(cost).toFixed(2)}${jobId ? ` for job ${jobId}` : ''}`);

function generateId() {
  return 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
