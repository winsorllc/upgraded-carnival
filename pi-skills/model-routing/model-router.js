#!/usr/bin/env node

/**
 * Model Router - Intelligent LLM provider routing
 * Based on zeroclaw's model_routing_config architecture
 */

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = process.env.MODEL_ROUTING_DIR || path.join(process.cwd(), '.model-routing');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default model definitions
const DEFAULT_MODELS = {
  anthropic: {
    'claude-opus-4-5': {
      name: 'Claude Opus 4.5',
      provider: 'anthropic',
      context: 200000,
      cost_per_mtok: 15,
      cost_per_ptok: 75,
      speed: 'slow',
      strengths: ['reasoning', 'coding', 'writing'],
      max_output: 4096
    },
    'claude-sonnet-4-5': {
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      context: 200000,
      cost_per_mtok: 3,
      cost_per_ptok: 15,
      speed: 'medium',
      strengths: ['coding', 'general'],
      max_output: 4096
    },
    'claude-haiku-3-5': {
      name: 'Claude Haiku 3.5',
      provider: 'anthropic',
      context: 200000,
      cost_per_mtok: 0.8,
      cost_per_ptok: 4,
      speed: 'fast',
      strengths: ['fast', 'general'],
      max_output: 4096
    }
  },
  openai: {
    'gpt-4o': {
      name: 'GPT-4o',
      provider: 'openai',
      context: 128000,
      cost_per_mtok: 5,
      cost_per_ptok: 15,
      speed: 'medium',
      strengths: ['general', 'vision'],
      max_output: 4096
    },
    'gpt-4o-mini': {
      name: 'GPT-4o Mini',
      provider: 'openai',
      context: 128000,
      cost_per_mtok: 0.15,
      cost_per_ptok: 0.6,
      speed: 'fast',
      strengths: ['fast', 'general'],
      max_output: 16384
    },
    'o1': {
      name: 'OpenAI o1',
      provider: 'openai',
      context: 128000,
      cost_per_mtok: 15,
      cost_per_ptok: 60,
      speed: 'slow',
      strengths: ['reasoning', 'math'],
      max_output: 32768
    }
  },
  google: {
    'gemini-2-flash': {
      name: 'Gemini 2.0 Flash',
      provider: 'google',
      context: 1000000,
      cost_per_mtok: 0,
      cost_per_ptok: 0,
      speed: 'fast',
      strengths: ['fast', 'long-context'],
      max_output: 8192
    },
    'gemini-1-5-pro': {
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      context: 2000000,
      cost_per_mtok: 1.25,
      cost_per_ptok: 5,
      speed: 'medium',
      strengths: ['reasoning', 'long-context', 'vision'],
      max_output: 8192
    }
  }
};

// Ensure config directory exists
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

// Load configuration
function loadConfig() {
  ensureConfigDir();
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {
      return getDefaultConfig();
    }
  }
  return getDefaultConfig();
}

// Get default configuration
function getDefaultConfig() {
  return {
    providers: {
      anthropic: { enabled: true, priority: 1 },
      openai: { enabled: true, priority: 2 },
      google: { enabled: true, priority: 3 }
    },
    routing: {
      default_strategy: 'balanced',
      cost_threshold: 1.0,
      speed_threshold: 'fast',
      prefer_cheaper: false
    },
    custom_models: {}
  };
}

// Save configuration
function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Get all available models
function getAllModels() {
  const config = loadConfig();
  const models = JSON.parse(JSON.stringify(DEFAULT_MODELS));
  
  // Add custom models
  if (config.custom_models) {
    for (const [provider, providerModels] of Object.entries(config.custom_models)) {
      if (!models[provider]) {
        models[provider] = {};
      }
      for (const [key, model] of Object.entries(providerModels)) {
        models[provider][key] = { ...model, provider, custom: true };
      }
    }
  }
  
  // Filter by enabled providers
  const enabledModels = {};
  for (const [provider, providerModels] of Object.entries(models)) {
    if (config.providers[provider]?.enabled) {
      enabledModels[provider] = providerModels;
    }
  }
  
  return enabledModels;
}

// Route a task to the optimal model
function routeTask(args) {
  const { 
    task, 
    strategy = 'balanced',
    max_cost,
    require_vision = false,
    require_long_context = false,
    max_output = 4096,
    prefer_speed
  } = args;
  
  const models = getAllModels();
  const candidates = [];
  
  // Collect all candidate models
  for (const [provider, providerModels] of Object.entries(models)) {
    for (const [key, model] of Object.entries(providerModels)) {
      // Check requirements
      if (require_vision && !model.strengths.includes('vision')) continue;
      if (require_long_context && model.context < 100000) continue;
      if (model.max_output < max_output) continue;
      if (max_cost && model.cost_per_mtok > max_cost) continue;
      if (prefer_speed && model.speed !== prefer_speed) continue;
      
      candidates.push({ id: key, ...model });
    }
  }
  
  if (candidates.length === 0) {
    return {
      success: false,
      output: 'No models match the requirements',
      error: 'No suitable model found',
      suggestions: [
        'Try increasing max_cost',
        'Disable vision requirement',
        'Reduce max_output'
      ]
    };
  }
  
  // Score and rank candidates based on strategy
  const scored = candidates.map(model => {
    let score = 0;
    
    switch (strategy) {
      case 'cheapest':
        score = -model.cost_per_mtok * 10;
        break;
      case 'fastest':
        const speedToScore = { fast: 3, medium: 2, slow: 1 };
        score = speedToScore[model.speed] || 0;
        break;
      case 'best':
        score = (model.strengths?.length || 0) * 2;
        if (model.context > 100000) score += 1;
        break;
      case 'balanced':
      default:
        // Normalize scores
        const costToScore = Math.max(0, 5 - (model.cost_per_mtok || 0));
        const speedToScore2 = { fast: 3, medium: 2, slow: 1 };
        const speedValue = speedToScore2[model.speed] || 1;
        const contextValue = Math.min(5, model.context / 200000);
        score = costToScore + speedValue + contextValue;
        break;
    }
    
    return { ...model, score };
  });
  
  // Sort by score (higher is better)
  scored.sort((a, b) => b.score - a.score);
  
  const selected = scored[0];
  const runnerUp = scored.length > 1 ? scored[1] : null;
  
  // Estimate cost for a typical task
  const estimatedTokens = 1000; // 1K input
  const estimatedCost = (estimatedTokens / 1000000) * selected.cost_per_mtok + 
                        (selected.max_output / 1000000) * selected.cost_per_ptok;
  
  return {
    success: true,
    output: `Routed to: ${selected.name} (${selected.provider})\n` +
      `Strategy: ${strategy}\n` +
      `Context: ${selected.context.toLocaleString()} tokens\n` +
      `Speed: ${selected.speed}\n` +
      `Cost per 1M input: $${selected.cost_per_mtok}\n` +
      `Cost per 1M output: $${selected.cost_per_ptok}\n` +
      `Estimated cost for 1K tokens: $${estimatedCost.toFixed(4)}\n` +
      (runnerUp ? `\nAlternative: ${runnerUp.name} (score: ${runnerUp.score})` : ''),
    error: null,
    selected_model: selected,
    alternatives: scored.slice(1, 4)
  };
}

// Compare models
function compareModels(args) {
  const { models = [], all = false } = args;
  const allModels = getAllModels();
  
  let compareList = [];
  
  if (all) {
    // Compare all models
    for (const [provider, providerModels] of Object.entries(allModels)) {
      for (const [key, model] of Object.entries(providerModels)) {
        compareList.push({ id: key, provider, ...model });
      }
    }
  } else if (models.length > 0) {
    // Compare specific models
    for (const modelId of models) {
      for (const [provider, providerModels] of Object.entries(allModels)) {
        if (providerModels[modelId]) {
          compareList.push({ id: modelId, provider, ...providerModels[modelId] });
          break;
        }
      }
    }
  } else {
    // Default: compare top models from each provider
    for (const [provider, providerModels] of Object.entries(allModels)) {
      const keys = Object.keys(providerModels);
      if (keys.length > 0) {
        compareList.push({ id: keys[0], provider, ...providerModels[keys[0]] });
      }
    }
  }
  
  if (compareList.length === 0) {
    return {
      success: false,
      output: 'No models to compare',
      error: 'No models found'
    };
  }
  
  // Build comparison table
  let output = 'Model Comparison\n';
  output += '=' .repeat(80) + '\n\n';
  
  // Header
  output += 'Model'.padEnd(25) + 'Provider'.padEnd(12) + 'Context'.padEnd(12) + 
            'Speed'.padEnd(8) + '$/M in'.padEnd(10) + '$/M out\n';
  output += '-'.repeat(80) + '\n';
  
  for (const model of compareList) {
    output += (model.name || model.id).slice(0, 24).padEnd(25);
    output += model.provider.padEnd(12);
    output += (model.context / 1000 + 'K').padEnd(12);
    output += (model.speed || '?').padEnd(8);
    output += ('$' + model.cost_per_mtok).padEnd(10);
    output += ('$' + model.cost_per_ptok) + '\n';
  }
  
  output += '\nContext = context window size\n';
  output += '$/M = cost per million tokens\n';
  
  return {
    success: true,
    output,
    error: null,
    models: compareList
  };
}

// Configure model routing
function configureModel(args) {
  const { 
    set_provider,
    set_strategy,
    set_threshold,
    add_custom_model,
    list_config
  } = args;
  
  const config = loadConfig();
  
  if (list_config) {
    return {
      success: true,
      output: 'Current Configuration:\n\n' + JSON.stringify(config, null, 2),
      error: null,
      config
    };
  }
  
  if (set_provider !== undefined) {
    const [provider, enabled] = set_provider.split(':');
    if (config.providers[provider]) {
      config.providers[provider].enabled = enabled === 'true';
      saveConfig(config);
      return {
        success: true,
        output: `Provider ${provider} set to ${enabled === 'true' ? 'enabled' : 'disabled'}`,
        error: null
      };
    }
    return { success: false, output: `Unknown provider: ${provider}`, error: 'Invalid provider' };
  }
  
  if (set_strategy) {
    const validStrategies = ['balanced', 'cheapest', 'fastest', 'best'];
    if (!validStrategies.includes(set_strategy)) {
      return {
        success: false,
        output: `Invalid strategy: ${set_strategy}. Valid: ${validStrategies.join(', ')}`,
        error: 'Invalid strategy'
      };
    }
    config.routing.default_strategy = set_strategy;
    saveConfig(config);
    return {
      success: true,
      output: `Default strategy set to: ${set_strategy}`,
      error: null
    };
  }
  
  if (set_threshold) {
    config.routing.cost_threshold = parseFloat(set_threshold);
    saveConfig(config);
    return {
      success: true,
      output: `Cost threshold set to: $${config.routing.cost_threshold}/M tokens`,
      error: null
    };
  }
  
  if (add_custom_model) {
    try {
      const modelDef = JSON.parse(add_custom_model);
      const { provider, name, ...modelProps } = modelDef;
      
      if (!config.custom_models) config.custom_models = {};
      if (!config.custom_models[provider]) config.custom_models[provider] = {};
      
      const modelId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      config.custom_models[provider][modelId] = modelProps;
      
      saveConfig(config);
      return {
        success: true,
        output: `Added custom model: ${name} (${provider})`,
        error: null
      };
    } catch (e) {
      return {
        success: false,
        output: 'Invalid model definition JSON',
        error: e.message
      };
    }
  }
  
  return {
    success: true,
    output: 'No changes made. Use list_config, set_provider, set_strategy, set_threshold, or add_custom_model',
    error: null
  };
}

// CLI routing
const command = process.argv[2];
let args = {};

// Try to get args from argv[3], stdin, or file
if (process.argv[3]) {
  try {
    // Try parsing directly first (works when shell passes it properly)
    args = JSON.parse(process.argv[3]);
  } catch (e) {
    // Shell may have messed up the JSON - try reading from stdin
    try {
      const stdinData = fs.readFileSync(0, 'utf-8').trim();
      if (stdinData) {
        args = JSON.parse(stdinData);
      }
    } catch (e2) {
      // Last resort: try argv[3] as a file path
      const filePath = process.argv[3];
      if (fs.existsSync(filePath)) {
        try {
          args = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e3) {
          console.error(JSON.stringify({
            success: false,
            output: 'Failed to parse args: ' + e.message,
            error: 'Parse error'
          }));
          process.exit(1);
        }
      }
    }
  }
}

let result;

switch (command) {
  case 'route':
    result = routeTask(args);
    break;
  case 'compare':
    result = compareModels(args);
    break;
  case 'config':
    result = configureModel(args);
    break;
  default:
    result = {
      success: false,
      output: `Unknown command: ${command}. Available: route, compare, config`,
      error: 'Unknown command'
    };
}

console.log(JSON.stringify(result, null, 2));
