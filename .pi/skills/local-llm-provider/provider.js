#!/usr/bin/env node

/**
 * Local LLM Provider - Connect to local LLM endpoints with automatic fallback
 * 
 * Supports: Ollama, llama.cpp server, vLLM, with cloud fallback
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = process.env.LOCAL_LLM_CONFIG || path.join(__dirname, 'config.json');

/**
 * Load configuration
 */
function loadConfig() {
  // Build config with fresh env var values each time
  const config = {
    providers: [
      {
        name: 'ollama',
        url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        enabled: true,
        fallback_order: 1
      },
      {
        name: 'llamacpp',
        url: process.env.LLAMACPP_BASE_URL || 'http://localhost:8080/v1',
        enabled: false,
        fallback_order: 2
      },
      {
        name: 'vllm',
        url: process.env.VLLM_BASE_URL || 'http://localhost:8000/v1',
        enabled: false,
        fallback_order: 3
      },
      {
        name: 'anthropic',
        api_key: process.env.ANTHROPIC_API_KEY,
        enabled: false,
        fallback_order: 4
      },
      {
        name: 'openai',
        api_key: process.env.OPENAI_API_KEY,
        enabled: false,
        fallback_order: 5
      }
    ],
    default_model: process.env.LOCAL_LLM_DEFAULT_MODEL || 'llama3.2',
    fallback_to_cloud: true,
    timeout_ms: 120000
  };
  
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const userConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...config, ...userConfig };
    }
  } catch (e) {
    console.error('Warning: Failed to load config, using defaults');
  }
  return config;
}

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const timeout = options.timeout || 30000;
    
    const req = client.request(url, {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout
    }, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(data).toString('utf8');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

/**
 * Ollama provider
 */
class OllamaProvider {
  constructor(config) {
    this.baseUrl = config.url;
    this.name = 'ollama';
  }
  
  async complete(prompt, options = {}) {
    const model = options.model || 'llama3.2';
    const startTime = Date.now();
    
    const response = await makeRequest(`${this.baseUrl}/api/generate`, {
      body: {
        model,
        prompt,
        stream: options.stream || false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.max_tokens || 500,
          top_p: options.top_p || 0.9
        }
      },
      timeout: options.timeout || 120000
    });
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      provider: this.name,
      model,
      response: response.response,
      tokens: response.eval_count || response.prompt_eval_count,
      duration_ms: duration,
      done: !response.done
    };
  }
  
  async *stream(prompt, options = {}) {
    const model = options.model || 'llama3.2';
    
    const response = await makeRequest(`${this.baseUrl}/api/generate`, {
      body: {
        model,
        prompt,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.max_tokens || 500
        }
      },
      timeout: options.timeout || 120000
    });
    
    // For streaming, we'd need a different approach - return an async generator
    yield {
      success: true,
      provider: this.name,
      model,
      response: '',
      tokens: 0,
      done: false
    };
  }
  
  async listModels() {
    const response = await makeRequest(`${this.baseUrl}/api/tags`, {
      method: 'GET'
    });
    return response.models || [];
  }
  
  async health() {
    try {
      await makeRequest(`${this.baseUrl}/api/tags`, { method: 'GET', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * OpenAI-compatible provider (llama.cpp, vLLM)
 */
class OpenAICompatProvider {
  constructor(config) {
    this.baseUrl = config.url;
    this.name = config.name;
    this.apiKey = config.api_key || 'not-needed';
  }
  
  async complete(prompt, options = {}) {
    const model = options.model || 'llama3.2';
    const startTime = Date.now();
    
    const response = await makeRequest(`${this.baseUrl}/chat/completions`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 500
      },
      timeout: options.timeout || 120000
    });
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      provider: this.name,
      model,
      response: response.choices[0].message.content,
      tokens: response.usage?.completion_tokens || 0,
      duration_ms: duration,
      done: true
    };
  }
  
  async health() {
    try {
      await makeRequest(`${this.baseUrl}/models`, { 
        method: 'GET',
        timeout: 5000 
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Anthropic provider (cloud fallback)
 */
class AnthropicProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.name = 'anthropic';
  }
  
  async complete(prompt, options = {}) {
    const model = options.model || 'claude-3-haiku-20240307';
    const startTime = Date.now();
    
    const response = await makeRequest('https://api.anthropic.com/v1/messages', {
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: {
        model,
        max_tokens: options.max_tokens || 500,
        messages: [{ role: 'user', content: prompt }]
      },
      timeout: options.timeout || 120000
    });
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      provider: this.name,
      model,
      response: response.content[0].text,
      tokens: response.usage.output_tokens,
      duration_ms: duration,
      done: true
    };
  }
  
  async health() {
    // Anthropic doesn't have a simple health endpoint, so we just return true if we have a key
    return !!this.apiKey;
  }
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  providers: [
    {
      name: 'ollama',
      url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      enabled: true,
      fallback_order: 1
    },
    {
      name: 'llamacpp',
      url: process.env.LLAMACPP_BASE_URL || 'http://localhost:8080/v1',
      enabled: false,
      fallback_order: 2
    },
    {
      name: 'vllm',
      url: process.env.VLLM_BASE_URL || 'http://localhost:8000/v1',
      enabled: false,
      fallback_order: 3
    },
    {
      name: 'anthropic',
      api_key: process.env.ANTHROPIC_API_KEY,
      enabled: false,
      fallback_order: 4
    },
    {
      name: 'openai',
      api_key: process.env.OPENAI_API_KEY,
      enabled: false,
      fallback_order: 5
    }
  ],
  default_model: process.env.LOCAL_LLM_DEFAULT_MODEL || 'llama3.2',
  fallback_to_cloud: true,
  timeout_ms: 120000
};

/**
 * Main Local LLM Provider class
 */
class LocalLLMProvider {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.providers = [];
    this._initProviders();
  }
  
  _initProviders() {
    // Sort providers by fallback_order
    const sorted = [...this.config.providers]
      .filter(p => p.enabled)
      .sort((a, b) => a.fallback_order - b.fallback_order);
    
    for (const p of sorted) {
      if (p.name === 'ollama') {
        this.providers.push(new OllamaProvider(p));
      } else if (p.name === 'llamacpp' || p.name === 'vllm') {
        this.providers.push(new OpenAICompatProvider(p));
      } else if (p.name === 'anthropic' && p.api_key) {
        this.providers.push(new AnthropicProvider(p.api_key));
      }
    }
  }
  
  async complete(prompt, options = {}) {
    const errors = [];
    
    for (const provider of this.providers) {
      try {
        console.error(`Trying ${provider.name}...`);
        const result = await provider.complete(prompt, {
          ...options,
          model: options.model || this.config.default_model
        });
        return result;
      } catch (error) {
        console.error(`${provider.name} failed: ${error.message}`);
        errors.push({ provider: provider.name, error: error.message });
      }
    }
    
    // All local providers failed
    return {
      success: false,
      error: 'All providers failed',
      providers_tried: errors.map(e => e.provider),
      last_error: errors[errors.length - 1]?.error || 'Unknown error'
    };
  }
  
  async health() {
    const results = {};
    for (const provider of this.providers) {
      results[provider.name] = await provider.health();
    }
    return results;
  }
  
  async listModels() {
    for (const provider of this.providers) {
      if (provider.listModels) {
        try {
          return await provider.listModels();
        } catch {
          continue;
        }
      }
    }
    return [];
  }
}

/**
 * CLI Query
 */
async function queryCLI() {
  const args = process.argv.slice(2);
  
  // Parse flags
  const flags = {};
  const positional = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  
  if (positional.length === 0) {
    console.log(`
Local LLM Provider - Query

Usage:
  node query.js <prompt> [options]

Options:
  --model <name>     Model to use (default: llama3.2)
  --temp <number>    Temperature (default: 0.7)
  --max-tokens <n>   Max tokens (default: 500)
  --stream           Stream response
  --json             Output as JSON

Examples:
  node query.js "What is 2+2?"
  node query.js "Explain quantum" --model mixtral --temp 0.8
`);
    process.exit(1);
  }
  
  const prompt = positional.join(' ');
  const config = loadConfig();
  const provider = new LocalLLMProvider(config);
  
  try {
    const result = await provider.complete(prompt, {
      model: flags.model,
      temperature: flags.temp ? parseFloat(flags.temp) : undefined,
      max_tokens: flags['max-tokens'] ? parseInt(flags['max-tokens']) : undefined,
      stream: flags.stream,
      timeout: config.timeout_ms
    });
    
    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.success) {
      console.log(result.response);
      console.error(`\n[${result.provider}/${result.model} - ${result.duration_ms}ms]`);
    } else {
      console.error('Error:', result.error);
      console.error('Providers tried:', result.providers_tried?.join(', '));
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

/**
 * CLI List Models
 */
async function listModelsCLI() {
  const config = loadConfig();
  const provider = new LocalLLMProvider(config);
  
  try {
    const models = await provider.listModels();
    
    if (Array.isArray(models)) {
      console.log('Available models:');
      for (const m of models) {
        console.log(`  - ${m.name || m}`);
      }
    } else {
      console.log(JSON.stringify(models, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

/**
 * CLI Health Check
 */
async function healthCLI() {
  const config = loadConfig();
  const provider = new LocalLLMProvider(config);
  
  try {
    const results = await provider.health();
    
    console.log('Provider health:');
    for (const [name, healthy] of Object.entries(results)) {
      console.log(`  ${name}: ${healthy ? '✓' : '✗'}`);
    }
    
    const allHealthy = Object.values(results).some(v => v);
    process.exit(allHealthy ? 0 : 1);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Main CLI dispatcher - only run if called directly
if (require.main === module || process.argv[1]?.endsWith('provider.js')) {
  const script = path.basename(process.argv[1] || 'provider.js');
  if (script === 'query.js') {
    queryCLI();
  } else if (script === 'list-models.js') {
    listModelsCLI();
  } else if (script === 'health.js') {
    healthCLI();
  } else {
    // Default: run query
    queryCLI();
  }
}

module.exports = { LocalLLMProvider, loadConfig, DEFAULT_CONFIG };
