#!/usr/bin/env node

/**
 * Test suite for Model Routing skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_DIR = path.join(__dirname, 'test-tmp');
const CONFIG_DIR = path.join(TEST_DIR, '.model-routing');

// Setup test environment
function setup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  process.env.MODEL_ROUTING_DIR = CONFIG_DIR;
  console.log('✓ Test environment set up');
}

function runCommand(args) {
  const argsStr = JSON.stringify(args.args);
  // Pass JSON as a single quoted argument to avoid shell parsing issues
  const result = execSync(
    `node "${path.resolve(__dirname, 'model-router.js')}" ${args.command} '${argsStr}'`,
    { 
      encoding: 'utf-8', 
      env: { 
        ...process.env, 
        MODEL_ROUTING_DIR: CONFIG_DIR 
      },
      cwd: TEST_DIR
    }
  );
  return JSON.parse(result);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

// Test 1: Route with balanced strategy
function testRouteBalanced() {
  console.log('\n--- Test: Route (balanced) ---');
  
  const result = runCommand({
    command: 'route',
    args: { task: 'write a function', strategy: 'balanced' }
  });
  
  assert(result.success === true, 'Route should succeed');
  assert(result.selected_model, 'Should return a selected model');
  assert(result.output.includes('Routed to'), 'Should mention routed model');
  
  console.log(`Selected: ${result.selected_model.name}`);
}

// Test 2: Route with cheapest strategy
function testRouteCheapest() {
  console.log('\n--- Test: Route (cheapest) ---');
  
  const result = runCommand({
    command: 'route',
    args: { task: 'simple task', strategy: 'cheapest' }
  });
  
  assert(result.success === true, 'Route should succeed');
  assert(result.selected_model, 'Should return a selected model');
  
  console.log(`Cheapest: ${result.selected_model.name}`);
}

// Test 3: Route with fastest strategy
function testRouteFastest() {
  console.log('\n--- Test: Route (fastest) ---');
  
  const result = runCommand({
    command: 'route',
    args: { task: 'quick task', strategy: 'fastest' }
  });
  
  assert(result.success === true, 'Route should succeed');
  assert(result.selected_model.speed === 'fast', 'Should select fast model');
  
  console.log(`Fastest: ${result.selected_model.name}`);
}

// Test 4: Route with max cost
function testRouteMaxCost() {
  console.log('\n--- Test: Route (max cost) ---');
  
  const result = runCommand({
    command: 'route',
    args: { task: 'task', max_cost: 0.5 }
  });
  
  assert(result.success === true, 'Route should succeed');
  assert(result.selected_model.cost_per_mtok <= 0.5, 'Should respect max cost');
  
  console.log(`Within budget: ${result.selected_model.name}`);
}

// Test 5: Compare all models
function testCompareAll() {
  console.log('\n--- Test: Compare all ---');
  
  const result = runCommand({
    command: 'compare',
    args: { all: true }
  });
  
  assert(result.success === true, 'Compare should succeed');
  assert(result.models && result.models.length > 0, 'Should return models');
  assert(result.output.includes('Model Comparison'), 'Should have comparison table');
  
  console.log(`Compared ${result.models.length} models`);
}

// Test 6: Compare specific models
function testCompareSpecific() {
  console.log('\n--- Test: Compare specific ---');
  
  const result = runCommand({
    command: 'compare',
    args: { models: ['claude-sonnet-4-5', 'gpt-4o'] }
  });
  
  assert(result.success === true, 'Compare should succeed');
  assert(result.models && result.models.length >= 2, 'Should return specified models');
  
  console.log(`Compared: ${result.models.map(m => m.name).join(', ')}`);
}

// Test 7: List configuration
function testListConfig() {
  console.log('\n--- Test: List config ---');
  
  const result = runCommand({
    command: 'config',
    args: { list_config: true }
  });
  
  console.log('Raw result:', JSON.stringify(result));
  
  assert(result.success === true, 'Config should succeed');
  assert(result.config, 'Should return configuration');
  assert(result.config.providers, 'Should have providers');
  
  console.log('Config:', JSON.stringify(result.config.routing, null, 2));
}

// Test 8: Set strategy
function testSetStrategy() {
  console.log('\n--- Test: Set strategy ---');
  
  const result = runCommand({
    command: 'config',
    args: { set_strategy: 'fastest' }
  });
  
  assert(result.success === true, 'Should set strategy');
  assert(result.output.includes('fastest'), 'Should confirm change');
  
  // Verify
  const checkResult = runCommand({
    command: 'config',
    args: { list_config: true }
  });
  
  assert(checkResult.config.routing.default_strategy === 'fastest', 'Should persist strategy');
  
  // Reset
  runCommand({
    command: 'config',
    args: { set_strategy: 'balanced' }
  });
  
  console.log('Strategy changed and verified!');
}

// Test 9: Enable/disable provider
function testProviderToggle() {
  console.log('\n--- Test: Provider toggle ---');
  
  // Disable anthropic
  let result = runCommand({
    command: 'config',
    args: { set_provider: 'anthropic:false' }
  });
  
  assert(result.success === true, 'Should disable provider');
  
  // Check routing doesn't include disabled provider
  const routeResult = runCommand({
    command: 'route',
    args: { strategy: 'best' }
  });
  
  assert(routeResult.selected_model.provider !== 'anthropic', 'Should not route to disabled');
  
  // Re-enable
  runCommand({
    command: 'config',
    args: { set_provider: 'anthropic:true' }
  });
  
  console.log('Provider toggle works!');
}

// Main test runner
function runTests() {
  console.log('========================================');
  console.log('Model Routing Skill - Test Suite');
  console.log('========================================');
  
  try {
    setup();
    testRouteBalanced();
    testRouteCheapest();
    testRouteFastest();
    testRouteMaxCost();
    testCompareAll();
    testCompareSpecific();
    testListConfig();
    testSetStrategy();
    testProviderToggle();
    
    console.log('\n========================================');
    console.log('ALL TESTS PASSED! ✓');
    console.log('========================================');
    
    // Cleanup
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    process.exit(0);
  } catch (error) {
    console.error('\n========================================');
    console.error('TEST FAILED:', error.message);
    console.error('========================================');
    process.exit(1);
  }
}

runTests();
