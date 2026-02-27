#!/usr/bin/env node
/**
 * Model Router - Route between LLM providers
 */
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.cwd(), '.model-router.json');

const KNOWN_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', models: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku'], defaultUrl: 'https://api.anthropic.com/v1', requiresKey: 'ANTHROPIC_API_KEY' },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'], defaultUrl: 'https://api.openai.com/v1', requiresKey: 'OPENAI_API_KEY' },
  { id: 'groq', name: 'Groq', models: ['llama-3.1-70b', 'mixtral-8x7b', 'gemma-2-9b'], defaultUrl: 'https://api.groq.com/openai/v1', requiresKey: 'GROQ_API_KEY' },
  { id: 'google', name: 'Google (Gemini)', models: ['gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'], defaultUrl: 'https://generativelanguage.googleapis.com/v1beta', requiresKey: 'GOOGLE_API_KEY' },
  { id: 'together', name: 'Together AI', models: ['meta-llama/Llama-3.1-70B', 'mistralai/Mixtral-8x22B'], defaultUrl: 'https://api.together.xyz/v1', requiresKey: 'TOGETHER_API_KEY' },
  { id: 'mistral', name: 'Mistral', models: ['mistral-large', 'mistral-medium', 'mistral-small'], defaultUrl: 'https://api.mistral.ai/v1', requiresKey: 'MISTRAL_API_KEY' },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'], defaultUrl: 'https://api.deepseek.com/v1', requiresKey: 'DEEPSEEK_API_KEY' },
  { id: 'openrouter', name: 'OpenRouter', models: ['openrouter/auto'], defaultUrl: 'https://openrouter.ai/api/v1', requiresKey: 'OPENROUTER_API_KEY' },
  { id: 'ollama', name: 'Ollama (local)', models: ['llama3.2', 'mistral', 'qwen2.5'], defaultUrl: 'http://localhost:11434/v1', requiresKey: null },
  { id: 'custom', name: 'Custom Endpoint', models: ['custom'], defaultUrl: '', requiresKey: 'CUSTOM_API_KEY' }
];

const TASK_MODELS = {
  coding: { provider: 'anthropic', model: 'claude-opus-4' },
  research: { provider: 'anthropic', model: 'claude-sonnet-4' },
  summarize: { provider: 'anthropic', model: 'claude-haiku' },
  creative: { provider: 'openai', model: 'gpt-4o' },
  fast: { provider: 'groq', model: 'llama-3.1-70b' },
  vision: { provider: 'openai', model: 'gpt-4o' },
  long_context: { provider: 'anthropic', model: 'claude-opus-4' }
};

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  }
  return {
    version: '1.0',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4',
    fallbacks: [],
    routing: TASK_MODELS,
    providers: {}
  };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function parseArgs(args) {
  const result = {
    command: null,
    task: null,
    provider: null,
    model: null,
    primary: null,
    fallback: null,
    prompt: null,
    file: null,
    url: null,
    json: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--command': result.command = args[++i]; break;
      case '--task': result.task = args[++i]; break;
      case '--provider': result.provider = args[++i]; break;
      case '--model': result.model = args[++i]; break;
      case '--primary': result.primary = args[++i]; break;
      case '--fallback': result.fallback = args[++i]; break;
      case '--prompt': result.prompt = args[++i]; break;
      case '--file': result.file = args[++i]; break;
      case '--url': result.url = args[++i]; break;
      case '--json': result.json = true; break;
    }
  }
  return result;
}

function listProviders() {
  const config = loadConfig();
  
  return KNOWN_PROVIDERS.map(p => {
    const hasKey = p.requiresKey ? process.env[p.requiresKey] !== undefined : true;
    const configured = config.providers[p.id] !== undefined;
    
    return {
      ...p,
      available: hasKey,
      configured: configured,
      envVar: p.requiresKey
    };
  });
}

function configureRouting(task, provider, model) {
  const config = loadConfig();
  
  config.routing[task] = { provider, model };
  saveConfig(config);
  
  return { task, provider, model };
}

function setFallback(primary, fallbacks) {
  const config = loadConfig();
  
  config.fallbacks = fallbacks.split(',').map(s => s.trim());
  saveConfig(config);
  
  return { primary, fallbacks: config.fallbacks };
}

function routeRequest(task, prompt, config) {
  const routing = config.routing[task] || { provider: config.defaultProvider, model: config.defaultModel };
  
  // Check if provider is available
  const provider = KNOWN_PROVIDERS.find(p => p.id === routing.provider);
  const available = provider && (!provider.requiresKey || process.env[provider.requiresKey]);
  
  if (!available && config.fallbacks.length > 0) {
    // Try fallbacks
    for (const fallback of config.fallbacks) {
      const fbProvider = KNOWN_PROVIDERS.find(p => p.id === fallback);
      if (fbProvider && (!fbProvider.requiresKey || process.env[fbProvider.requiresKey])) {
        return { provider: fallback, model: config.routing[task]?.model || fbProvider.models[0], prompt, fallback: true };
      }
    }
  }
  
  return { provider: routing.provider, model: routing.model, prompt, fallback: false };
}

function checkStatus() {
  const providers = listProviders();
  
  return providers.map(p => {
    const status = p.available ? 'healthy' : 'not_configured';
    return {
      provider: p.id,
      name: p.name,
      status: status,
      models: p.models.slice(0, 3),
      envVar: p.requiresKey
    };
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.command) {
    console.log('Model Router - Route between LLM providers');
    console.log('');
    console.log('Usage: model-router.js --command <cmd> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  list                List available providers');
    console.log('  config              Configure routing');
    console.log('  fallback            Set fallback providers');
    console.log('  route               Route a request');
    console.log('  status              Check provider status');
    console.log('');
    console.log('Options:');
    console.log('  --task <type>       Task type (coding, research, summarize)');
    console.log('  --provider <name>   Provider name');
    console.log('  --model <name>      Model name');
    console.log('  --primary <prov>    Primary provider for fallback');
    console.log('  --fallback <list>   Comma-separated fallback providers');
    console.log('  --prompt <text>     Prompt to route');
    console.log('  --json              Output as JSON');
    process.exit(1);
  }
  
  switch (args.command) {
    case 'list': {
      const providers = listProviders();
      
      if (args.json) {
        console.log(JSON.stringify(providers, null, 2));
      } else {
        console.log('Available Providers');
        console.log('═══════════════════');
        console.log('');
        
        for (const p of providers) {
          const status = p.available ? '✓' : '✗';
          const config = p.configured ? '[configured]' : '';
          console.log(`${status} ${p.name.padEnd(15)} ${config}`);
          console.log(`  ID: ${p.id}`);
          console.log(`  Models: ${p.models.join(', ')}`);
          if (p.requiresKey) {
            console.log(`  Env Var: ${p.requiresKey}`);
          }
          console.log('');
        }
        
        const available = providers.filter(p => p.available).length;
        console.log(`Available: ${available}/${providers.length} providers`);
      }
      break;
    }
    
    case 'config': {
      if (!args.task || !args.provider) {
        console.error('Error: --task and --provider required');
        process.exit(1);
      }
      
      const result = configureRouting(args.task, args.provider, args.model);
      
      if (args.json) {
        console.log(JSON.stringify({ success: true, config: result }, null, 2));
      } else {
        console.log('✓ Routing configured');
        console.log(`  Task: ${result.task}`);
        console.log(`  Provider: ${result.provider}`);
        console.log(`  Model: ${result.model || 'default'}`);
      }
      break;
    }
    
    case 'fallback': {
      if (!args.fallback) {
        console.error('Error: --fallback required');
        process.exit(1);
      }
      
      const result = setFallback(args.primary, args.fallback);
      
      if (args.json) {
        console.log(JSON.stringify({ success: true, ...result }, null, 2));
      } else {
        console.log('✓ Fallback providers configured');
        console.log(`  Primary: ${result.primary || 'default'}`);
        console.log(`  Fallbacks: ${result.fallbacks.join(', ')}`);
      }
      break;
    }
    
    case 'route': {
      const config = loadConfig();
      const task = args.task || 'default';
      const prompt = args.prompt || (args.file ? `Process file: ${args.file}` : 'Direct request');
      
      const result = routeRequest(task, prompt, config);
      
      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('Route Configuration');
        console.log('═══════════════════');
        console.log(`Task: ${task}`);
        console.log(`Provider: ${result.provider}${result.fallback ? ' (fallback)' : ''}`);
        console.log(`Model: ${result.model}`);
        console.log(`Prompt: ${result.prompt.substring(0, 100)}${result.prompt.length > 100 ? '...' : ''}`);
      }
      break;
    }
    
    case 'status': {
      const status = checkStatus();
      
      if (args.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log('Provider Status');
        console.log('═══════════════');
        console.log('');
        
        for (const s of status) {
          const icon = s.status === 'healthy' ? '●' : '○';
          console.log(`${icon} ${s.name.padEnd(20)} ${s.status.toUpperCase()}`);
        }
        
        const healthy = status.filter(s => s.status === 'healthy').length;
        console.log(`\nHealthy: ${healthy}/${status.length}`);
      }
      break;
    }
    
    default:
      console.error(`Unknown command: ${args.command}`);
      process.exit(1);
  }
}

main();