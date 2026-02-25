#!/usr/bin/env node

// Multi-Provider Router - Intelligent LLM routing with fallback, cost optimization, and latency routing

const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    models: {
      'claude-3-5-sonnet': { input: 3.00, output: 15.00, context: 200000 },
      'claude-3-opus': { input: 15.00, output: 75.00, context: 200000 },
      'claude-3-5-haiku': { input: 0.80, output: 4.00, context: 200000 },
      'claude-3-haiku': { input: 0.25, output: 1.25, context: 200000 }
    },
    defaultModel: 'claude-3-5-sonnet',
    apiKeyEnv: 'ANTHROPIC_API_KEY'
  },
  openai: {
    name: 'OpenAI',
    models: {
      'gpt-4o': { input: 2.50, output: 10.00, context: 128000 },
      'gpt-4o-mini': { input: 0.15, output: 0.60, context: 128000 },
      'gpt-4-turbo': { input: 10.00, output: 30.00, context: 128000 },
      'gpt-4': { input: 30.00, output: 60.00, context: 8192 }
    },
    defaultModel: 'gpt-4o',
    apiKeyEnv: 'OPENAI_API_KEY'
  },
  google: {
    name: 'Google',
    models: {
      'gemini-1.5-pro': { input: 1.25, output: 5.00, context: 2000000 },
      'gemini-1.5-flash': { input: 0.075, output: 0.30, context: 1000000 },
      'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15, context: 1000000 }
    },
    defaultModel: 'gemini-1.5-pro',
    apiKeyEnv: 'GOOGLE_API_KEY'
  }
};

// Health tracking
const health = {
  anthropic: { score: 100, failures: 0, lastFailure: null, avgLatency: 500 },
  openai: { score: 100, failures: 0, lastFailure: null, avgLatency: 400 },
  google: { score: 100, failures: 0, lastFailure: null, avgLatency: 300 }
};

// Round-robin state
let roundRobinIndex = 0;

function getProviders() {
  const env = process.env.LLM_PROVIDERS || 'anthropic,openai,google';
  return env.split(',').map(p => p.trim()).filter(p => PROVIDERS[p]);
}

function getStrategy() {
  return process.env.ROUTING_STRATEGY || 'fallback';
}

function estimateCost(provider, model, inputTokens, outputTokens) {
  const p = PROVIDERS[provider];
  if (!p) return null;
  
  const m = p.models[model] || p.models[p.defaultModel];
  if (!m) return null;
  
  const inputCost = (inputTokens / 1000000) * m.input;
  const outputCost = (outputTokens / 1000000) * m.output;
  
  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
    currency: 'USD'
  };
}

async function testProvider(provider) {
  const p = PROVIDERS[provider];
  if (!p) {
    console.error(`Unknown provider: ${provider}`);
    return;
  }
  
  const apiKey = process.env[p.apiKeyEnv];
  if (!apiKey) {
    console.error(`API key not set: ${p.apiKeyEnv}`);
    return;
  }
  
  console.log(`Testing ${provider}...`);
  
  const start = Date.now();
  
  try {
    let result;
    if (provider === 'anthropic') {
      result = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: p.defaultModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });
    } else if (provider === 'openai') {
      result = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: p.defaultModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        })
      });
    } else if (provider === 'google') {
      result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${p.defaultModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] })
      });
    }
    
    const latency = Date.now() - start;
    
    if (result.ok) {
      health[provider].score = Math.min(100, health[provider].score + 10);
      health[provider].failures = 0;
      
      // Update average latency
      const prev = health[provider].avgLatency;
      health[provider].avgLatency = Math.round((prev * 0.7) + (latency * 0.3));
      
      console.log(`✓ ${provider} OK - Latency: ${latency}ms`);
    } else {
      throw new Error(`HTTP ${result.status}`);
    }
  } catch (err) {
    health[provider].failures++;
    health[provider].lastFailure = new Date().toISOString();
    
    if (health[provider].failures >= 3) {
      health[provider].score = 50;
    } else if (health[provider].failures >= 1) {
      health[provider].score = 75;
    }
    
    console.error(`✗ ${provider} FAILED: ${err.message}`);
  }
}

function selectProvider(prompt, strategy = null) {
  const providers = getProviders();
  strategy = strategy || getStrategy();
  
  if (strategy === 'round-robin') {
    const selected = providers[roundRobinIndex % providers.length];
    roundRobinIndex++;
    return { provider: selected, reason: 'round-robin' };
  }
  
  if (strategy === 'latency') {
    const available = providers.filter(p => health[p].score >= 50);
    if (available.length === 0) return { provider: providers[0], reason: 'fallback (all degraded)' };
    
    available.sort((a, b) => health[a].avgLatency - health[b].avgLatency);
    return { provider: available[0], reason: `lowest latency (${health[available[0]].avgLatency}ms)` };
  }
  
  if (strategy === 'cost') {
    // Estimate based on prompt length (rough: 1 token ≈ 4 chars)
    const estimatedTokens = Math.ceil(prompt.length / 4);
    const estimatedOutput = Math.min(estimatedTokens, 1000); // Cap output estimate
    
    const costs = providers.map(p => ({
      provider: p,
      cost: estimateCost(p, PROVIDERS[p].defaultModel, estimatedTokens, estimatedOutput)?.total || Infinity
    }));
    
    costs.sort((a, b) => a.cost - b.cost);
    return { 
      provider: costs[0].provider, 
      reason: `lowest cost ($${costs[0].cost.toFixed(4)})`,
      estimates: costs
    };
  }
  
  // Fallback: prefer higher health score
  const available = providers.filter(p => health[p].score >= 50);
  if (available.length === 0) return { provider: providers[0], reason: 'fallback (all degraded)' };
  
  available.sort((a, b) => health[b].score - health[a].score);
  return { provider: available[0], reason: `highest health (${health[available[0]].score})` };
}

function showStatus() {
  console.log('\n=== Provider Status ===\n');
  
  for (const [name, info] of Object.entries(PROVIDERS)) {
    const h = health[name];
    const status = h.score >= 100 ? '✓ Healthy' : h.score >= 75 ? '⚠ Degraded' : h.score >= 50 ? '⚠ Unhealthy' : '✗ Down';
    console.log(`${name} (${info.name}):`);
    console.log(`  Status: ${status}`);
    console.log(`  Health Score: ${h.score}/100`);
    console.log(`  Failures: ${h.failures}`);
    console.log(`  Avg Latency: ${h.avgLatency}ms`);
    console.log(`  Default Model: ${info.defaultModel}`);
    console.log('');
  }
}

function showInfo(provider) {
  const p = PROVIDERS[provider];
  if (!p) {
    console.error(`Unknown provider: ${provider}`);
    return;
  }
  
  console.log(`\n=== ${p.name} ===\n`);
  console.log('Models:');
  for (const [model, details] of Object.entries(p.models)) {
    console.log(`  ${model}:`);
    console.log(`    Input: $${details.input}/1M tokens`);
    console.log(`    Output: $${details.output}/1M tokens`);
    console.log(`    Context: ${(details.context / 1000).toFixed(0)}K tokens`);
  }
}

function showCost(provider, model, inputTokens, outputTokens) {
  const cost = estimateCost(provider, model || PROVIDERS[provider]?.defaultModel, inputTokens, outputTokens);
  if (!cost) {
    console.error(`Invalid provider or model: ${provider}/${model}`);
    return;
  }
  
  console.log(`\n=== Cost Estimate ===\n`);
  console.log(`Provider: ${provider}`);
  console.log(`Model: ${model || PROVIDERS[provider].defaultModel}`);
  console.log(`Input tokens: ${inputTokens}`);
  console.log(`Output tokens: ${outputTokens}`);
  console.log(`\nCosts:`);
  console.log(`  Input:  $${cost.input.toFixed(4)}`);
  console.log(`  Output: $${cost.output.toFixed(4)}`);
  console.log(`  Total:  $${cost.total.toFixed(4)}`);
}

function routePrompt(prompt, strategy) {
  const result = selectProvider(prompt, strategy);
  
  console.log(`\n=== Route Decision ===\n`);
  console.log(`Strategy: ${strategy || getStrategy()}`);
  console.log(`Selected: ${result.provider}`);
  console.log(`Reason: ${result.reason}`);
  
  if (result.estimates) {
    console.log('\nAll provider costs:');
    for (const e of result.estimates) {
      console.log(`  ${e.provider}: $${e.cost.toFixed(4)}`);
    }
  }
  
  return result;
}

// Main
const cmd = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (cmd) {
    case 'status':
      await Promise.all(getProviders().map(p => testProvider(p)));
      showStatus();
      break;
      
    case 'test':
      const providerToTest = args[0] || getProviders()[0];
      await testProvider(providerToTest);
      break;
      
    case 'cost': {
      const costProvider = args[0];
      let model = null;
      let inputTokens = 0;
      let outputTokens = 0;
      
      const modelIdx = args.indexOf('--model');
      const tokensIdx = args.indexOf('--tokens');
      
      if (modelIdx >= 0 && modelIdx + 1 < args.length) {
        model = args[modelIdx + 1];
      }
      if (tokensIdx >= 0 && tokensIdx + 1 < args.length) {
        const [inTok, outTok] = args[tokensIdx + 1].split(',');
        inputTokens = parseInt(inTok);
        outputTokens = parseInt(outTok);
      }
      
      showCost(costProvider, model, inputTokens, outputTokens);
      break;
    }
      
    case 'route': {
      let prompt = '';
      let strategy = null;
      
      const promptIdx = args.indexOf('--prompt');
      const stratIdx = args.indexOf('--strategy');
      
      if (promptIdx >= 0 && promptIdx + 1 < args.length) {
        prompt = args[promptIdx + 1];
      }
      if (stratIdx >= 0 && stratIdx + 1 < args.length) {
        strategy = args[stratIdx + 1];
      }
      
      routePrompt(prompt, strategy);
      break;
    }
      
    case 'info': {
      const infoProvider = args[0];
      if (!infoProvider) {
        console.error('Usage: router info <provider>');
        process.exit(1);
      }
      showInfo(infoProvider);
      break;
    }
      
    default:
      console.log(`Multi-Provider Router

Usage: router <command> [args...]

Commands:
  status
    Test all providers and show health status
  test <provider>
    Test a specific provider
  cost <provider> --model <model> --tokens <input>,<output>
    Estimate cost for a request
  route --prompt "prompt" [--strategy <fallback|cost|latency|round-robin>]
    Show which provider would be selected
  info <provider>
    Show provider details and models

Environment Variables:
  LLM_PROVIDERS: comma-separated provider list (default: anthropic,openai,google)
  ROUTING_STRATEGY: fallback|cost|latency|round-robin (default: fallback)
  COST_OPTIMIZATION: true|false
  LATENCY_SLO_MS: max acceptable latency
`);
      process.exit(1);
  }
}

main().catch(console.error);
