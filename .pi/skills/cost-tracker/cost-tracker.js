#!/usr/bin/env node

/**
 * Cost Tracker - Track and analyze LLM usage costs
 * 
 * Usage:
 *   cost-tracker.js --record --provider anthropic --model claude-3 --input-tokens 1000 --output-tokens 500 --cost 0.03
 *   cost-tracker.js --summary
 *   cost-tracker.js --daily
 *   cost-tracker.js --by-provider
 */

const fs = require('fs');
const path = require('path');

// SQLite-like simple storage (JSON file)
const DATA_DIR = process.env.COST_TRACKER_DIR || path.join(process.env.HOME || '/tmp', '.cost-tracker');
const DATA_FILE = path.join(DATA_DIR, 'costs.json');

// Default cost per 1M tokens
const COST_PER_MILLION = {
  'anthropic-claude-3.5-sonnet': { input: 3.00, output: 15.00 },
  'anthropic-claude-3-opus': { input: 15.00, output: 75.00 },
  'anthropic-claude-3-sonnet': { input: 3.00, output: 15.00 },
  'anthropic-claude-3-haiku': { input: 0.25, output: 1.25 },
  'openai-gpt-4o': { input: 2.50, output: 10.00 },
  'openai-gpt-4-turbo': { input: 10.00, output: 30.00 },
  'openai-gpt-4': { input: 30.00, output: 60.00 },
  'openai-gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'google-gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'google-gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'google-gemini-pro': { input: 0.50, output: 1.50 },
  'ollama-llama2': { input: 0.00, output: 0.00 },
  'ollama-mistral': { input: 0.00, output: 0.00 }
};

// Initialize data file
function initData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ entries: [] }, null, 2));
  }
}

// Read data
function readData() {
  initData();
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write data
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Calculate cost from tokens
function calculateCost(provider, model, inputTokens, outputTokens) {
  const key = `${provider}-${model}`;
  const rates = COST_PER_MILLION[key] || { input: 0, output: 0 };
  
  return {
    inputCost: (inputTokens / 1000000) * rates.input,
    outputCost: (outputTokens / 1000000) * rates.output,
    totalCost: ((inputTokens / 1000000) * rates.input) + ((outputTokens / 1000000) * rates.output)
  };
}

// Record a cost entry
function recordEntry(provider, model, inputTokens, outputTokens, cost) {
  const data = readData();
  
  // Calculate cost if not provided or null
  let actualCost = cost;
  if (actualCost === undefined || actualCost === null) {
    const calculated = calculateCost(provider, model, inputTokens, outputTokens);
    actualCost = calculated.totalCost;
  }
  
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    provider,
    model,
    inputTokens: parseInt(inputTokens),
    outputTokens: parseInt(outputTokens),
    totalTokens: parseInt(inputTokens) + parseInt(outputTokens),
    cost: parseFloat(actualCost)
  };
  
  data.entries.push(entry);
  writeData(data);
  
  return entry;
}

// Filter entries by period
function filterByPeriod(entries, period) {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      return entries;
  }
  
  return entries.filter(e => new Date(e.timestamp) >= startDate);
}

// Get summary
function getSummary(period = 'all') {
  const data = readData();
  const entries = filterByPeriod(data.entries, period);
  
  const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
  const totalInputTokens = entries.reduce((sum, e) => sum + e.inputTokens, 0);
  const totalOutputTokens = entries.reduce((sum, e) => sum + e.outputTokens, 0);
  const totalTokens = totalInputTokens + totalOutputTokens;
  
  return {
    totalCost: totalCost.toFixed(4),
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    requests: entries.length,
    period
  };
}

// Get daily breakdown
function getDaily(period = '30d') {
  const data = readData();
  const entries = filterByPeriod(data.entries, period);
  
  const daily = {};
  
  entries.forEach(entry => {
    const date = entry.timestamp.split('T')[0];
    if (!daily[date]) {
      daily[date] = { cost: 0, requests: 0, inputTokens: 0, outputTokens: 0 };
    }
    daily[date].cost += entry.cost;
    daily[date].requests++;
    daily[date].inputTokens += entry.inputTokens;
    daily[date].outputTokens += entry.outputTokens;
  });
  
  // Sort by date
  const sorted = {};
  Object.keys(daily).sort().forEach(key => {
    sorted[key] = {
      cost: parseFloat(daily[key].cost.toFixed(4)),
      requests: daily[key].requests,
      inputTokens: daily[key].inputTokens,
      outputTokens: daily[key].outputTokens
    };
  });
  
  return sorted;
}

// Get provider breakdown
function getByProvider(period = 'all') {
  const data = readData();
  const entries = filterByPeriod(data.entries, period);
  
  const byProvider = {};
  
  entries.forEach(entry => {
    if (!byProvider[entry.provider]) {
      byProvider[entry.provider] = { 
        cost: 0, 
        requests: 0, 
        inputTokens: 0, 
        outputTokens: 0,
        models: {}
      };
    }
    
    byProvider[entry.provider].cost += entry.cost;
    byProvider[entry.provider].requests++;
    byProvider[entry.provider].inputTokens += entry.inputTokens;
    byProvider[entry.provider].outputTokens += entry.outputTokens;
    
    if (!byProvider[entry.provider].models[entry.model]) {
      byProvider[entry.provider].models[entry.model] = { cost: 0, requests: 0 };
    }
    byProvider[entry.provider].models[entry.model].cost += entry.cost;
    byProvider[entry.provider].models[entry.model].requests++;
  });
  
  // Format output
  const result = {};
  Object.keys(byProvider).forEach(provider => {
    result[provider] = {
      cost: parseFloat(byProvider[provider].cost.toFixed(4)),
      requests: byProvider[provider].requests,
      inputTokens: byProvider[provider].inputTokens,
      outputTokens: byProvider[provider].outputTokens,
      models: byProvider[provider].models
    };
  });
  
  return result;
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  record: false,
  provider: null,
  model: null,
  inputTokens: null,
  outputTokens: null,
  cost: null,
  summary: false,
  daily: false,
  byProvider: false,
  period: 'all'
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  switch (arg) {
    case '--record':
      options.record = true;
      break;
    case '--provider':
      options.provider = nextArg;
      i++;
      break;
    case '--model':
      options.model = nextArg;
      i++;
      break;
    case '--input-tokens':
      options.inputTokens = parseInt(nextArg);
      i++;
      break;
    case '--output-tokens':
      options.outputTokens = parseInt(nextArg);
      i++;
      break;
    case '--cost':
      options.cost = parseFloat(nextArg);
      i++;
      break;
    case '--summary':
      options.summary = true;
      break;
    case '--daily':
      options.daily = true;
      break;
    case '--by-provider':
      options.byProvider = true;
      break;
    case '--period':
      options.period = nextArg;
      i++;
      break;
    case '--help':
    case '-h':
      console.log(`
Cost Tracker - Track and analyze LLM usage costs

Usage:
  cost-tracker.js --record --provider <p> --model <m> --input-tokens <n> --output-tokens <n> [--cost <c>]
  cost-tracker.js --summary [--period <period>]
  cost-tracker.js --daily [--period <period>]
  cost-tracker.js --by-provider [--period <period>]

Options:
  --record            Record a new cost entry
  --provider <p>     LLM provider (anthropic, openai, google, etc.)
  --model <m>        Model name
  --input-tokens <n> Number of input tokens
  --output-tokens <n> Number of output tokens
  --cost <c>         Cost in USD (auto-calculated if not provided)
  --summary          Show total cost summary
  --daily            Show daily cost breakdown
  --by-provider      Show cost by provider
  --period <period>  Time period: today, 7d, 30d, all (default: all)

Examples:
  cost-tracker.js --record --provider anthropic --model claude-3.5-sonnet --input-tokens 1000 --output-tokens 500
  cost-tracker.js --summary --period 30d
  cost-tracker.js --daily --period 7d
      `.trim());
      process.exit(0);
  }
}

// Main execution
function main() {
  try {
    if (options.record) {
      if (!options.provider || !options.model || !options.inputTokens) {
        console.error('Error: --provider, --model, and --input-tokens are required for --record');
        process.exit(1);
      }
      
      const entry = recordEntry(
        options.provider,
        options.model,
        options.inputTokens,
        options.outputTokens || 0,
        options.cost
      );
      
      console.log(JSON.stringify({ success: true, entry }, null, 2));
    } else if (options.summary) {
      console.log(JSON.stringify(getSummary(options.period), null, 2));
    } else if (options.daily) {
      console.log(JSON.stringify(getDaily(options.period), null, 2));
    } else if (options.byProvider) {
      console.log(JSON.stringify(getByProvider(options.period), null, 2));
    } else {
      console.log('Use --help for usage information');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
