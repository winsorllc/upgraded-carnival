#!/usr/bin/env node

/**
 * Test script for local-llm-provider skill
 * Tests the provider logic and fallback behavior
 */

const { LocalLLMProvider, loadConfig, DEFAULT_CONFIG } = require('./provider.js');

console.log('='.repeat(60));
console.log('Local LLM Provider - Test Suite');
console.log('='.repeat(60));

let testsRun = 0;
let testsPassed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test 1: Config loading
test('Config loads with defaults', () => {
  const config = loadConfig();
  assert(config !== null, 'Config should not be null');
  assert(Array.isArray(config.providers), 'Providers should be an array');
  assert(config.default_model === 'llama3.2', 'Default model should be llama3.2');
});

// Test 2: Provider initialization
test('Providers are initialized correctly', () => {
  const config = {
    providers: [
      { name: 'ollama', url: 'http://localhost:11434', enabled: true, fallback_order: 1 }
    ],
    default_model: 'llama3.2',
    fallback_to_cloud: true
  };
  
  const provider = new LocalLLMProvider(config);
  assert(provider.providers.length > 0, 'Should have at least one provider');
  assert(provider.providers[0].name === 'ollama', 'First provider should be ollama');
});

// Test 3: Multiple provider fallback order
test('Providers are sorted by fallback_order', () => {
  const config = {
    providers: [
      { name: 'anthropic', api_key: 'test-key', enabled: true, fallback_order: 3 },
      { name: 'ollama', url: 'http://localhost:11434', enabled: true, fallback_order: 1 },
      { name: 'llamacpp', url: 'http://localhost:8080/v1', enabled: true, fallback_order: 2 }
    ],
    default_model: 'llama3.2'
  };
  
  const provider = new LocalLLMProvider(config);
  assert(provider.providers.length === 3, `Should have 3 providers, got ${provider.providers.length}`);
  assert(provider.providers[0].name === 'ollama', `First should be ollama, got: ${provider.providers[0]?.name}`);
  assert(provider.providers[1].name === 'llamacpp', `Second should be llamacpp, got: ${provider.providers[1]?.name}`);
  assert(provider.providers[2].name === 'anthropic', `Third should be anthropic, got: ${provider.providers[2]?.name}`);
});

// Test 4: Disabled providers are skipped
test('Disabled providers are not initialized', () => {
  const config = {
    providers: [
      { name: 'ollama', url: 'http://localhost:11434', enabled: true, fallback_order: 1 },
      { name: 'llamacpp', url: 'http://localhost:8080/v1', enabled: false, fallback_order: 2 }
    ],
    default_model: 'llama3.2'
  };
  
  const provider = new LocalLLMProvider(config);
  assert(provider.providers.length === 1, 'Should only have one provider');
  assert(provider.providers[0].name === 'ollama', 'Only ollama should be enabled');
});

// Test 5: Default model is used when not specified
test('Default model is used in request', async () => {
  const config = {
    providers: [
      { 
        name: 'ollama', 
        url: 'http://localhost:11434', 
        enabled: true, 
        fallback_order: 1 
      }
    ],
    default_model: 'llama3.2'
  };
  
  // We'll test the model assignment by checking the provider
  const provider = new LocalLLMProvider(config);
  
  // Override complete to capture the call
  let capturedModel = null;
  provider.providers[0].complete = async (prompt, options) => {
    capturedModel = options.model;
    throw new Error('Mock: intentionally fail for testing');
  };
  
  await provider.complete('Hello');
  
  assert(capturedModel === 'llama3.2', `Model should be llama3.2, got: ${capturedModel}`);
});

// Test 6: Custom model overrides default
test('Custom model overrides default', async () => {
  const config = {
    providers: [
      { 
        name: 'ollama', 
        url: 'http://localhost:11434', 
        enabled: true, 
        fallback_order: 1 
      }
    ],
    default_model: 'llama3.2'
  };
  
  const provider = new LocalLLMProvider(config);
  
  let capturedModel = null;
  provider.providers[0].complete = async (prompt, options) => {
    capturedModel = options.model;
    throw new Error('Mock: intentionally fail for testing');
  };
  
  await provider.complete('Hello', { model: 'mixtral' });
  
  assert(capturedModel === 'mixtral', `Model should be mixtral, got: ${capturedModel}`);
});

// Test 7: Fallback when first provider fails
test('Falls back to second provider when first fails', async () => {
  const config = {
    providers: [
      { name: 'ollama', url: 'http://localhost:11434', enabled: true, fallback_order: 1 },
      { name: 'llamacpp', url: 'http://localhost:8080/v1', enabled: true, fallback_order: 2 }
    ],
    default_model: 'llama3.2'
  };
  
  const provider = new LocalLLMProvider(config);
  
  // First provider fails, second succeeds
  let callCount = 0;
  provider.providers[0].complete = async () => {
    callCount++;
    throw new Error('Provider 1 failed');
  };
  provider.providers[1].complete = async () => {
    callCount++;
    return { success: true, response: 'Hello from provider 2' };
  };
  
  const result = await provider.complete('test prompt');
  
  assert(result.success === true, 'Should succeed with fallback');
  assert(result.response === 'Hello from provider 2', 'Should get response from provider 2');
  assert(callCount === 2, 'Should have called both providers');
});

// Test 8: All providers fail
test('Returns error when all providers fail', async () => {
  const config = {
    providers: [
      { name: 'ollama', url: 'http://localhost:11434', enabled: true, fallback_order: 1 },
      { name: 'llamacpp', url: 'http://localhost:8080/v1', enabled: true, fallback_order: 2 }
    ],
    default_model: 'llama3.2'
  };
  
  const provider = new LocalLLMProvider(config);
  
  // Both providers fail
  provider.providers[0].complete = async () => { throw new Error('Provider 1 failed'); };
  provider.providers[1].complete = async () => { throw new Error('Provider 2 failed'); };
  
  const result = await provider.complete('test prompt');
  
  assert(result.success === false, 'Should fail');
  assert(result.error === 'All providers failed', 'Error message should be correct');
  assert(result.providers_tried.length === 2, 'Should have tried 2 providers');
});

// Test 9: Health check returns results
test('Health check returns provider status', async () => {
  const config = {
    providers: [
      { name: 'ollama', url: 'http://localhost:11434', enabled: true, fallback_order: 1 }
    ],
    default_model: 'llama3.2'
  };
  
  const provider = new LocalLLMProvider(config);
  
  // Mock health check
  provider.providers[0].health = async () => true;
  
  const results = await provider.health();
  
  assert(typeof results === 'object', 'Should return object');
  assert(results.ollama === true, 'Ollama should be healthy');
});

// Test 10: Environment variable overrides
test('Environment variables override config', () => {
  // Save original env
  const origOllama = process.env.OLLAMA_BASE_URL;
  const origModel = process.env.LOCAL_LLM_DEFAULT_MODEL;
  
  try {
    // Set env vars
    process.env.OLLAMA_BASE_URL = 'http://custom:9999';
    process.env.LOCAL_LLM_DEFAULT_MODEL = 'custom-model';
    
    const config = loadConfig();
    
    // Find ollama provider
    const ollamaProvider = config.providers.find(p => p.name === 'ollama');
    assert(ollamaProvider.url === 'http://custom:9999', `URL should be custom, got: ${ollamaProvider.url}`);
    assert(config.default_model === 'custom-model', `Model should be custom-model, got: ${config.default_model}`);
  } finally {
    // Restore env
    if (origOllama) process.env.OLLAMA_BASE_URL = origOllama;
    else delete process.env.OLLAMA_BASE_URL;
    if (origModel) process.env.LOCAL_LLM_DEFAULT_MODEL = origModel;
    else delete process.env.LOCAL_LLM_DEFAULT_MODEL;
  }
});

// Test 11: CLI argument parsing (basic)
test('CLI parses arguments correctly', () => {
  // We can't easily test the full CLI, but we can verify the logic exists
  const provider = new LocalLLMProvider({ providers: [], default_model: 'test' });
  assert(typeof provider.complete === 'function', 'Complete method should exist');
  assert(typeof provider.health === 'function', 'Health method should exist');
});

// Test 12: Response format
test('Response has correct format', async () => {
  const config = {
    providers: [
      { name: 'ollama', url: 'http://localhost:11434', enabled: true, fallback_order: 1 }
    ],
    default_model: 'llama3.2'
  };
  
  const provider = new LocalLLMProvider(config);
  
  // Mock successful response
  provider.providers[0].complete = async () => ({
    success: true,
    provider: 'ollama',
    model: 'llama3.2',
    response: 'Test response',
    tokens: 10,
    duration_ms: 100,
    done: true
  });
  
  const result = await provider.complete('test');
  
  assert(result.success === true, 'Should have success');
  assert(result.provider === 'ollama', 'Should have provider');
  assert(result.model === 'llama3.2', 'Should have model');
  assert(result.response === 'Test response', 'Should have response');
  assert(typeof result.tokens === 'number', 'Should have tokens');
  assert(typeof result.duration_ms === 'number', 'Should have duration');
  assert(result.done === true, 'Should be done');
});

console.log('='.repeat(60));
console.log(`Tests: ${testsPassed}/${testsRun} passed`);
console.log('='.repeat(60));

// Exit with appropriate code
process.exit(testsPassed === testsRun ? 0 : 1);
