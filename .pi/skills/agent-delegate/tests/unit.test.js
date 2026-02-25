#!/usr/bin/env node

/**
 * Agent Delegate - Unit Tests
 */

const { strict: assert } = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Import the module
const delegate = require('../delegate.js');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

console.log('\n=== Agent Delegate Unit Tests ===\n');

// Test 1: Argument parsing - basic
test('parseArgs - basic arguments', () => {
  const args = ['--task', 'Review code', '--model', 'claude-3-opus'];
  const result = delegate.parseArgs(args);
  
  assertEqual(result.task, 'Review code');
  assertEqual(result.model, 'claude-3-opus');
  assertEqual(result.verbose, false);
});

// Test 2: Argument parsing - files
test('parseArgs - multiple files', () => {
  const args = ['--task', 'Review', '--files', './src/a.ts ./src/b.ts'];
  const result = delegate.parseArgs(args);
  
  assertEqual(result.files.length, 2);
  assertEqual(result.files[0], './src/a.ts');
  assertEqual(result.files[1], './src/b.ts');
});

// Test 3: Argument parsing - depth
test('parseArgs - custom depth', () => {
  const args = ['--task', 'Review', '--depth', '2', '--max-depth', '5'];
  const result = delegate.parseArgs(args);
  
  assertEqual(result.depth, 2);
  assertEqual(result.maxDepth, 5);
});

// Test 4: Argument parsing - parallel tasks
test('parseArgs - parallel task definition', () => {
  const args = [
    '--parallel',
    '--task-1', 'Security review',
    '--task-2', 'Performance review',
    '--task-3', 'Style review'
  ];
  const result = delegate.parseArgs(args);
  
  assertEqual(result.parallel, true);
  assertEqual(Object.keys(result.tasks).length, 3);
  assertEqual(result.tasks[1], 'Security review');
  assertEqual(result.tasks[2], 'Performance review');
  assertEqual(result.tasks[3], 'Style review');
});

// Test 5: Context package building
test('buildContextPackage - basic structure', () => {
  const options = {
    task: 'Test task',
    depth: 1,
    maxDepth: 3,
    system: 'Test system',
    files: [],
    context: null
  };
  
  const context = delegate.buildContextPackage(options);
  
  assertEqual(context.delegateTask, 'Test task');
  assertEqual(context.delegationDepth, 1);
  assertEqual(context.maxDepth, 3);
  assertEqual(context.parentSystem, 'Test system');
  assertEqual(context.allowFurtherDelegation, true);
});

// Test 6: Context package - depth limiting
test('buildContextPackage - max depth reached', () => {
  const options = {
    task: 'Test task',
    depth: 2,
    maxDepth: 3,
    files: [],
    context: null
  };
  
  const context = delegate.buildContextPackage(options);
  
  assertEqual(context.allowFurtherDelegation, false);
});

// Test 7: System prompt building
test('buildSystemPrompt - includes depth info', () => {
  const options = {
    depth: 1,
    maxDepth: 3
  };
  
  const prompt = delegate.buildSystemPrompt(options);
  
  assert(prompt.toLowerCase().includes('depth'), 'System prompt should mention depth');
  assert(prompt.includes('1'), 'Should include current depth');
  assert(prompt.includes('3'), 'Should include max depth');
});

// Test 8: System prompt - max depth warning
test('buildSystemPrompt - max depth warning', () => {
  const options = {
    depth: 2,
    maxDepth: 3
  };
  
  const prompt = delegate.buildSystemPrompt(options);
  
  assert(prompt.includes('CANNOT delegate further'), 'Should warn about max depth');
});

// Test 9: Delegate prompt building
test('buildDelegatePrompt - includes task', () => {
  const contextPackage = {
    delegateTask: 'Analyze security',
    delegationDepth: 0,
    maxDepth: 3,
    allowFurtherDelegation: true,
    parentAnalysis: null,
    relevantFiles: []
  };
  
  const prompt = delegate.buildDelegatePrompt(contextPackage);
  
  assert(prompt.includes('Analyze security'), 'Should include task');
  assert(prompt.includes('Depth'), 'Should include depth info');
});

// Test 10: Delegate prompt - with files
test('buildDelegatePrompt - includes file context', () => {
  const contextPackage = {
    delegateTask: 'Review code',
    delegationDepth: 0,
    maxDepth: 3,
    allowFurtherDelegation: true,
    parentAnalysis: null,
    relevantFiles: [
      { path: './src/test.ts', content: 'console.log("test");' }
    ]
  };
  
  const prompt = delegate.buildDelegatePrompt(contextPackage);
  
  assert(prompt.includes('./src/test.ts'), 'Should include file path');
  assert(prompt.includes('console.log'), 'Should include file content');
});

// Test 11: Delegate prompt - with parent analysis
test('buildDelegatePrompt - includes parent context', () => {
  const contextPackage = {
    delegateTask: 'Build on analysis',
    delegationDepth: 1,
    maxDepth: 3,
    allowFurtherDelegation: true,
    parentAnalysis: 'Parent found 3 issues...',
    relevantFiles: []
  };
  
  const prompt = delegate.buildDelegatePrompt(contextPackage);
  
  assert(prompt.includes('Parent Analysis'), 'Should have parent analysis section');
  assert(prompt.includes('Parent found 3 issues'), 'Should include parent content');
});

// Test 12: Module exports
test('module exports all functions', () => {
  assert(typeof delegate.parseArgs === 'function', 'parseArgs should be exported');
  assert(typeof delegate.buildContextPackage === 'function', 'buildContextPackage should be exported');
  assert(typeof delegate.buildSystemPrompt === 'function', 'buildSystemPrompt should be exported');
  assert(typeof delegate.buildDelegatePrompt === 'function', 'buildDelegatePrompt should be exported');
  assert(typeof delegate.executeDelegate === 'function', 'executeDelegate should be exported');
  assert(typeof delegate.executeParallelDelegates === 'function', 'executeParallelDelegates should be exported');
});

// Test 13: Default values
test('parseArgs - defaults', () => {
  const args = ['--task', 'Test'];
  const result = delegate.parseArgs(args);
  
  assertEqual(result.model, 'claude-sonnet-4-5-20250929', 'Default model');
  assertEqual(result.depth, 0, 'Default depth');
  assertEqual(result.maxDepth, 3, 'Default max depth');
  assertEqual(result.parallel, false, 'Default parallel');
  assertEqual(result.verbose, false, 'Default verbose');
});

// Test 14: Environment variable depth override
test('parseArgs - env DELEGATE_DEPTH', () => {
  process.env.DELEGATE_DEPTH = '2';
  const args = ['--task', 'Test'];
  const result = delegate.parseArgs(args);
  
  assertEqual(result.depth, 2, 'Should use env DELEGATE_DEPTH');
  delete process.env.DELEGATE_DEPTH;
});

// Test 15: Error on missing task (non-parallel)
test('parseArgs - non-parallel without task', () => {
  const args = ['--model', 'claude-3'];
  const result = delegate.parseArgs(args);
  
  assertEqual(result.task, null, 'Task should be null when not provided');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total:  ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  console.log('\n❌ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed');
  process.exit(0);
}
