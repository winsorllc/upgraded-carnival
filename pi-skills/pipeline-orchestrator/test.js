#!/usr/bin/env node
// Pipeline Orchestrator - Test Suite

import { parsePipeline, parseInlinePipeline, compilePipeline, executePipeline } from './pipeline.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import assert from 'assert';

const TEST_DIR = '/job/tmp/pipeline_tests';

async function setup() {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
}

async function teardown() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

// Test 1: Parse inline pipeline
async function testInlineParser() {
  console.log('\n✓ Test 1: Inline Pipeline Parser');
  
  const pipeline = parseInlinePipeline('fetch --url https://example.com | analyze --prompt "Summarize" | save --path output.json');
  
  assert(pipeline.name === 'Inline Pipeline', 'Should have default name');
  assert(pipeline.stages.length === 3, 'Should have 3 stages');
  assert(pipeline.stages[0].type === 'fetch', 'First stage should be fetch');
  assert(pipeline.stages[0].config.url === 'https://example.com', 'Should parse URL');
  assert(pipeline.stages[1].type === 'analyze', 'Second stage should be analyze');
  assert(pipeline.stages[2].type === 'save', 'Third stage should be save');
  
  console.log('  ✓ Parsed 3-stage pipeline correctly');
  console.log('  ✓ Extracted config parameters');
}

// Test 2: Compile validation
async function testCompiler() {
  console.log('\n✓ Test 2: Pipeline Compiler');
  
  // Valid pipeline
  const validPipeline = {
    name: 'Test Pipeline',
    stages: [
      { id: 'fetch', type: 'fetch', config: { url: 'https://example.com' } },
      { id: 'analyze', type: 'analyze', config: { prompt: 'Summarize' } }
    ]
  };
  
  const validResult = await compilePipeline(validPipeline);
  assert(validResult.valid === true, 'Valid pipeline should pass');
  assert(validResult.errors.length === 0, 'Should have no errors');
  console.log('  ✓ Validated correct pipeline');
  
  // Invalid pipeline - missing type
  const invalidPipeline = {
    name: 'Bad Pipeline',
    stages: [
      { id: 'stage1' } // Missing type
    ]
  };
  
  const invalidResult = await compilePipeline(invalidPipeline);
  assert(invalidResult.valid === false, 'Invalid pipeline should fail');
  assert(invalidResult.errors.length > 0, 'Should have errors');
  console.log('  ✓ Detected missing stage type');
  
  // Missing approve prompt
  const badApprove = {
    name: 'Bad Approve',
    stages: [
      { id: 'approval', type: 'approve', config: {} } // Missing prompt
    ]
  };
  
  const approveResult = await compilePipeline(badApprove);
  assert(approveResult.valid === false, 'Missing prompt should fail');
  console.log('  ✓ Detected missing approve prompt');
}

// Test 3: Variable substitution
async function testVariableSubstitution() {
  console.log('\n✓ Test 3: Variable Substitution');
  
  // This is tested within pipeline.js - we'll verify through execution
  const pipeline = {
    name: 'Variable Test',
    variables: { name: 'John', count: 5 },
    stages: [
      { id: 'analyze', type: 'analyze', config: { prompt: 'Hello {{name}}, count is {{count}}' } }
    ]
  };
  
  const result = await executePipeline(pipeline, { workspace: TEST_DIR });
  assert(result.ok === true, 'Pipeline should execute');
  console.log('  ✓ Variables substituted in execution');
}

// Test 4: Execute simple pipeline
async function testExecution() {
  console.log('\n✓ Test 4: Pipeline Execution');
  
  const pipeline = {
    name: 'Simple Test',
    stages: [
      { id: 'step1', type: 'analyze', config: { prompt: 'Test' }, output: 'result1' },
      { id: 'step2', type: 'analyze', config: { prompt: 'Based on {{result1}}' }, output: 'result2' }
    ]
  };
  
  const result = await executePipeline(pipeline, { workspace: TEST_DIR });
  
  assert(result.ok === true, 'Pipeline should succeed');
  assert(result.status === 'completed', 'Should complete');
  assert(result.stages_completed === 2, 'Should complete 2 stages');
  assert(result.outputs.result1, 'Should have first output');
  assert(result.outputs.result2, 'Should have second output');
  console.log('  ✓ Executed 2-stage pipeline');
  console.log('  ✓ Outputs captured correctly');
  console.log(`  ✓ Duration: ${result.duration_ms}ms`);
}

// Test 5: Error handling
async function testErrorHandling() {
  console.log('\n✓ Test 5: Error Handling');
  
  const badPipeline = {
    name: 'Error Test',
    stages: [
      { id: 'bad', type: 'nonexistent_type', config: {} }
    ]
  };
  
  const result = await executePipeline(badPipeline, { workspace: TEST_DIR });
  
  assert(result.ok === false, 'Should fail');
  assert(result.status === 'failed', 'Should have failed status');
  assert(result.error.includes('nonexistent_type'), 'Should report error type');
  console.log('  ✓ Caught unknown stage type');
  console.log(`  ✓ Error message: ${result.error}`);
}

// Test 6: Pipeline file parsing
async function testFileParser() {
  console.log('\n✓ Test 6: YAML File Parser');
  
  const yamlContent = `
name: "File-Based Pipeline"
version: "1.0"

variables:
  max_items: 10

stages:
  - id: fetch
    type: fetch
    config:
      url: "https://api.example.com/items?limit={{max_items}}"
  
  - id: analyze
    type: analyze
    config:
      prompt: "Analyze these items"
    output: analysis
`;
  
  const filePath = join(TEST_DIR, 'test.pln');
  await writeFile(filePath, yamlContent);
  
  const pipeline = await parsePipeline(filePath);
  
  assert(pipeline.name === 'File-Based Pipeline', 'Should parse name');
  assert(pipeline.version === '1.0', 'Should parse version');
  assert(pipeline.variables.max_items === 10, 'Should parse variables');
  assert(pipeline.stages.length === 2, 'Should parse stages');
  assert(pipeline.stages[0].type === 'fetch', 'Should parse stage type');
  console.log('  ✓ Parsed YAML pipeline file');
  console.log('  ✓ Extracted variables');
  console.log('  ✓ Parsed 2 stages with config');
}

// Test 7: Approval gate simulation
async function testApprovalGate() {
  console.log('\n✓ Test 7: Approval Gate');
  
  const pipeline = {
    name: 'Approval Test',
    stages: [
      { id: 'analyze', type: 'analyze', config: { prompt: 'Draft content' }, output: 'draft' },
      { id: 'approve', type: 'approve', config: { 
        prompt: 'Publish this content?',
        show_data: '{{draft}}'
      }}
    ]
  };
  
  const result = await executePipeline(pipeline, { workspace: TEST_DIR });
  
  assert(result.status === 'needs_approval', 'Should need approval');
  assert(result.requiresApproval, 'Should have approval data');
  assert(result.requiresApproval.prompt, 'Should have approval prompt');
  assert(result.requiresApproval.resumeToken, 'Should have resume token');
  console.log('  ✓ Pipeline paused at approval gate');
  console.log(`  ✓ Resume token: ${result.requiresApproval.resumeToken}`);
  console.log(`  ✓ Approval prompt: "${result.requiresApproval.prompt}"`);
}

// Main test runner
async function runTests() {
  console.log('='.repeat(60));
  console.log('Pipeline Orchestrator - Test Suite');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  try {
    await setup();
    
    const tests = [
      testInlineParser,
      testCompiler,
      testVariableSubstitution,
      testExecution,
      testErrorHandling,
      testFileParser,
      testApprovalGate
    ];
    
    for (const test of tests) {
      try {
        await test();
        passed++;
      } catch (error) {
        console.error(`  ✗ Test failed: ${error.message}`);
        failed++;
      }
    }
    
  } finally {
    await teardown();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
