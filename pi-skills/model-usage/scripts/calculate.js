#!/usr/bin/env node

/**
 * calculate.js - Calculate LLM cost from token counts
 * 
 * Usage:
 *   node calculate.js --provider <provider> --model <model> --input-tokens <n> --output-tokens <n>
 */

const PRICING = {
  anthropic: {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
    'claude-opus-4-5-20250514': { input: 15.00, output: 75.00 },
  },
  openai: {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'gpt-4': { input: 30.00, output: 60.00 },
  },
  google: {
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'gemini-pro': { input: 0.25, output: 0.50 },
  }
};

const args = process.argv.slice(2);
const opts = {};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2).replace(/-([a-z])/g, g => g[1].toUpperCase());
    const value = args[i + 1] || '';
    if (!value.startsWith('--')) {
      opts[key] = value;
      i++;
    }
  }
}

const { provider, model, inputTokens, outputTokens } = opts;

if (!provider || !model) {
  console.error('Usage: node calculate.js --provider <provider> --model <model> --input-tokens <n> --output-tokens <n>');
  console.error('');
  console.error('Providers: anthropic, openai, google');
  console.error('');
  console.error('Examples:');
  console.error('  node calculate.js --provider anthropic --model claude-3-5-sonnet-20241022 --input-tokens 150000 --output-tokens 3000');
  console.error('  node calculate.js --provider openai --model gpt-4o --input-tokens 100000 --output-tokens 2000');
  process.exit(1);
}

const inputT = parseInt(inputTokens) || 0;
const outputT = parseInt(outputTokens) || 0;

// Get pricing
const providerPricing = PRICING[provider.toLowerCase()];
if (!providerPricing) {
  console.error(`Unknown provider: ${provider}`);
  console.error(`Available providers: ${Object.keys(PRICING).join(', ')}`);
  process.exit(1);
}

const modelPricing = providerPricing[model.toLowerCase()];
if (!modelPricing) {
  console.error(`Unknown model: ${model} for provider ${provider}`);
  console.error(`Available models for ${provider}:`);
  Object.keys(providerPricing).forEach(m => console.error(`  - ${m}`));
  process.exit(1);
}

// Calculate cost
const inputCost = (inputT / 1_000_000) * modelPricing.input;
const outputCost = (outputT / 1_000_000) * modelPricing.output;
const totalCost = inputCost + outputCost;

console.log('═'.repeat(50));
console.log('           Cost Calculation');
console.log('═'.repeat(50));
console.log(`Provider: ${provider}`);
console.log(`Model: ${model}`);
console.log(`Input Tokens: ${inputT.toLocaleString()}`);
console.log(`Output Tokens: ${outputT.toLocaleString()}`);
console.log('');
console.log(`Input Cost:  $${inputCost.toFixed(4)} ($${modelPricing.input}/M tokens)`);
console.log(`Output Cost: $${outputCost.toFixed(4)} ($${modelPricing.output}/M tokens)`);
console.log('');
console.log(`Total Cost: $${totalCost.toFixed(2)}`);
console.log('═'.repeat(50));
