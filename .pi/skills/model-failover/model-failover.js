#!/usr/bin/env node

/**
 * Model Failover Skill
 * Automatic LLM provider failover with configurable chains
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration file
const CONFIG_PATH = path.join(os.homedir(), '.thepopebot', 'model-failover.json');

// Default configuration
const DEFAULT_CONFIG = {
  chain: [
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
  ],
  maxRetries: 2,
  retryDelayMs: 1000,
  failureCounts: {}
};

// Load/save configuration
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Warning: Could not load config:', e.message);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Get API key for provider
function getApiKey(provider) {
  const keyMap = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    custom: process.env.CUSTOM_API_KEY,
    'anthropic-custom': process.env.ANTHROPIC_API_KEY,
    ollama: process.env.OPENAI_API_KEY,
    llamacpp: process.env.OPENAI_API_KEY,
    vllm: process.env.OPENAI_API_KEY
  };
  return keyMap[provider] || null;
}

// Get base URL for provider
function getBaseUrl(provider) {
  const urlMap = {
    anthropic: 'https://api.anthropic.com',
    openai: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    google: 'https://generativelanguage.googleapis.com',
    custom: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    'anthropic-custom': process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    ollama: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    llamacpp: process.env.LLAMA_CPP_BASE_URL || 'http://localhost:8080',
    vllm: process.env.VLLM_BASE_URL || 'http://localhost:8000'
  };
  return urlMap[provider] || urlMap.openai;
}

// Make API request
async function makeRequest(provider, model, messages, options = {}) {
  const apiKey = getApiKey(provider);
  const baseUrl = getBaseUrl(provider);
  const isHttps = baseUrl.startsWith('https://');
  const client = isHttps ? https : http;

  let url, headers, body;

  if (provider === 'anthropic') {
    url = new URL('/v1/messages', baseUrl);
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };
    body = {
      model,
      messages,
      max_tokens: options.maxTokens || 1024
    };
  } else if (provider === 'google') {
    url = new URL(`/v1beta/models/${model}:generateContent`, baseUrl);
    headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    body = {
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 1024
      }
    };
  } else {
    // OpenAI-compatible (OpenAI, custom, ollama, llamacpp, vllm)
    url = new URL('/v1/chat/completions', baseUrl);
    headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    body = {
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1024
    };
  }

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          // Check for errors
          if (res.statusCode >= 400) {
            const errorMsg = json.error?.message || json.error?.type || `HTTP ${res.statusCode}`;
            reject(new Error(errorMsg));
            return;
          }
          
          // Extract response based on provider
          let content;
          if (provider === 'anthropic') {
            content = json.content?.[0]?.text;
          } else if (provider === 'google') {
            content = json.candidates?.[0]?.content?.parts?.[0]?.text;
          } else {
            content = json.choices?.[0]?.message?.content;
          }
          
          resolve(content || '');
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

// Chat with failover
async function chat(message, config) {
  const messages = [{ role: 'user', content: message }];
  let lastError = null;

  for (let i = 0; i < config.chain.length; i++) {
    const { provider, model } = config.chain[i];
    
    for (let retry = 0; retry <= config.maxRetries; retry++) {
      try {
        const response = await makeRequest(provider, model, messages, {
          maxTokens: 1024,
          temperature: 0.7
        });
        
        // Success - reset failure count
        config.failureCounts[`${provider}:${model}`] = 0;
        saveConfig(config);
        
        return response;
      } catch (error) {
        lastError = error;
        
        // Track failure
        const key = `${provider}:${model}`;
        config.failureCounts[key] = (config.failureCounts[key] || 0) + 1;
        
        console.error(`Provider ${provider}/${model} failed (attempt ${retry + 1}): ${error.message}`);
        
        // Wait before retry
        if (retry < config.maxRetries) {
          await new Promise(r => setTimeout(r, config.retryDelayMs));
        }
      }
    }
  }

  throw new Error(`All providers failed. Last error: ${lastError?.message}`);
}

// Add provider to chain
function addProvider(config, provider, model) {
  // Check if provider already exists
  const existingIdx = config.chain.findIndex(p => p.provider === provider);
  
  if (existingIdx >= 0) {
    config.chain[existingIdx].model = model;
  } else {
    config.chain.push({ provider, model });
  }
  
  saveConfig(config);
  console.log(`Added/updated provider: ${provider}:${model}`);
}

// Remove provider from chain
function removeProvider(config, provider) {
  const initialLength = config.chain.length;
  config.chain = config.chain.filter(p => p.provider !== provider);
  
  if (config.chain.length < initialLength) {
    saveConfig(config);
    console.log(`Removed provider: ${provider}`);
  } else {
    console.log(`Provider not found: ${provider}`);
  }
}

// List providers
function listProviders(config) {
  console.log('\nProvider Chain:');
  config.chain.forEach((p, i) => {
    const key = `${p.provider}:${p.model}`;
    const failures = config.failureCounts[key] || 0;
    console.log(`  ${i + 1}. ${p.provider}/${p.model} (failures: ${failures})`);
  });
}

// Check health (simple connectivity test)
async function checkHealth(config) {
  console.log('\nProvider Health:');
  
  for (const { provider, model } of config.chain) {
    const key = `${provider}:${model}`;
    const failures = config.failureCounts[key] || 0;
    let status = '✓';
    
    if (failures >= 3) status = '✗ (failing)';
    else if (failures >= 1) status = '⚠ (degraded)';
    
    console.log(`  ${status} ${provider}/${model} - ${failures} failures`);
  }
}

// Reset failure counts
function resetFailures(config) {
  config.failureCounts = {};
  saveConfig(config);
  console.log('Failure counts reset');
}

// Main CLI
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  const config = loadConfig();

  try {
    switch (command) {
      case 'chat': {
        const message = args.join(' ');
        if (!message) {
          console.error('Usage: model-failover.js chat <message>');
          process.exit(1);
        }
        
        console.log('Sending message with failover...\n');
        const response = await chat(message, config);
        console.log(response);
        break;
      }

      case 'add-provider': {
        const provider = args[0];
        const model = args[1] || 'default';
        
        if (!provider) {
          console.error('Usage: model-failover.js add-provider <provider> [model]');
          process.exit(1);
        }
        
        addProvider(config, provider, model);
        listProviders(config);
        break;
      }

      case 'remove-provider': {
        const provider = args[0];
        
        if (!provider) {
          console.error('Usage: model-failover.js remove-provider <provider>');
          process.exit(1);
        }
        
        removeProvider(config, provider);
        listProviders(config);
        break;
      }

      case 'list': {
        listProviders(config);
        break;
      }

      case 'health': {
        await checkHealth(config);
        break;
      }

      case 'reset': {
        resetFailures(config);
        break;
      }

      default:
        console.log(`
Model Failover Skill - CLI

Commands:
  chat <message>              Send message with automatic failover
  add-provider <p> [m]        Add provider to chain
  remove-provider <p>         Remove provider from chain
  list                        List providers in chain
  health                      Check provider health status
  reset                       Reset failure counts

Environment Variables:
  LLM_PROVIDER_CHAIN          Override provider chain (comma-separated)
  ANTHROPIC_API_KEY           Anthropic API key
  OPENAI_API_KEY              OpenAI API key
  GOOGLE_API_KEY              Google API key
  OPENAI_BASE_URL             Custom OpenAI-compatible endpoint
  MAX_RETRIES                 Max retries per provider (default: 2)
  RETRY_DELAY_MS              Delay between retries (default: 1000)

Provider Format:
  provider:model

Examples:
  model-failover.js chat "Hello, how are you?"
  model-failover.js add-provider openai gpt-4o-mini
  model-failover.js remove-provider anthropic
  model-failover.js health
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
