#!/usr/bin/env node
/**
 * Multi-Agent Orchestrator Test Suite
 * 
 * Tests the core functionality of the orchestration system.
 */

import { 
  SessionManager, 
  AgentPool, 
  ResultAggregator, 
  MultiAgentOrchestrator,
  AGENT_TEMPLATES 
} from '../lib/orchestrator.js';
import { promises as fs } from 'fs';
import path from 'path';

// Color codes for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`${GREEN}✓${RESET} ${message}`);
    testsPassed++;
  } else {
    console.error(`${RED}✗${RESET} ${message}`);
    testsFailed++;
    throw new Error(message);
  }
}

async function runTest(name, testFn) {
  try {
    console.log(`\n${YELLOW}Testing:${RESET} ${name}`);
    console.log('-'.repeat(50));
    await testFn();
    console.log(`${GREEN}PASSED:${RESET} ${name}`);
  } catch (error) {
    console.error(`${RED}FAILED:${RESET} ${name}`);
    console.error(`  ${error.message}`);
  }
}

// Test 1: Session Manager
async function testSessionManager() {
  const manager = new SessionManager();
  
  // Test session creation
  const session = await manager.createSession('test-session', ['task1', 'task2']);
  assert(session.id, 'Session has an ID');
  assert(session.name === 'test-session', 'Session name is set');
  assert(session.tasks.length === 2, 'Session has 2 tasks');
  assert(session.status === 'pending', 'Initial status is pending');
  
  // Test session retrieval
  const retrieved = await manager.getSession(session.id);
  assert(retrieved.id === session.id, 'Can retrieve session by ID');
  
  // Test session update
  await manager.updateSession(session.id, { 
    status: 'completed',
    results: [{ success: true }]
  });
  const updated = await manager.getSession(session.id);
  assert(updated.status === 'completed', 'Session status updated');
  assert(updated.results.length === 1, 'Session results stored');
  
  // Test session listing
  const sessions = await manager.listSessions();
  assert(sessions.length >= 1, 'Can list sessions');
  assert(sessions[0].id === session.id, 'Latest session is first');
  
  console.log(`  Created session: ${session.id}`);
}

// Test 2: Agent Pool
async function testAgentPool() {
  const pool = new AgentPool();
  
  // Test agent spawning
  const agent = await pool.spawnAgent('code-specialist');
  assert(agent.id, 'Agent has ID');
  assert(agent.type === 'code-specialist', 'Agent type is set');
  assert(agent.config.systemPrompt.includes('code'), 'Agent has system prompt');
  assert(pool.getActiveCount() === 1, 'Active count increment');
  
  // Test agent templates
  assert(Object.keys(AGENT_TEMPLATES).length >= 4, 'Has at least 4 agent templates');
  assert('code-specialist' in AGENT_TEMPLATES, 'Code specialist template exists');
  assert('security-analyst' in AGENT_TEMPLATES, 'Security analyst template exists');
  
  // Test agent cleanup
  await pool.cleanup(agent.id);
  assert(pool.getActiveCount() === 0, 'Active count decremented after cleanup');
  
  // Test agent execution (simulated)
  const agent2 = await pool.spawnAgent('summarizer');
  const result = await pool.executeTask(
    agent2,
    'Summarize this text',
    'This is a test document.',
    { context: 'test' }
  );
  assert(result.success === true, 'Agent execution reports success');
  assert(result.agent === 'summarizer', 'Result has agent type');
  assert(result.task === 'Summarize this text', 'Result has task');
  assert(typeof result.duration === 'number', 'Result has duration');
  assert(result.output.includes('SIMULATED') || result.output.length > 0, 'Result has output');
  
  console.log(`  Spawned agent: ${agent.id}`);
}

// Test 3: Result Aggregator
async function testResultAggregator() {
  const aggregator = new ResultAggregator();
  
  const mockResults = [
    { success: true, agent: 'agent1', output: 'Finding A from agent 1', confidence: 0.9, duration: 1000 },
    { success: true, agent: 'agent2', output: 'Finding B from agent 2', confidence: 0.85, duration: 1200 },
    { success: false, agent: 'agent3', output: '', error: 'Timeout', duration: 5000 }
  ];
  
  // Test concatenate mode
  const concat = await aggregator.aggregate(mockResults, 'concatenate');
  assert(concat.success === true, 'Concatenate reports some success');
  assert(concat.mode === 'concatenate', 'Mode is concatenate');
  assert(concat.output.includes('Finding A'), 'Contains agent 1 output');
  assert(concat.output.includes('Finding B'), 'Contains agent 2 output');
  
  // Test synthesize mode
  const synth = await aggregator.aggregate(mockResults, 'synthesize', 'Test context');
  assert(synth.success === true, 'Synthesize reports success');
  assert(synth.mode === 'synthesize', 'Mode is synthesize');
  assert(synth.agentCount === 3, 'Counts all agents');
  assert(synth.successfulAgents === 2, 'Counts successful agents');
  assert(synth.output.includes('Synthesized'), 'Produces synthesis output');
  
  // Test vote mode
  const vote = await aggregator.aggregate(mockResults, 'vote');
  assert(vote.success === true, 'Vote reports success');
  assert(vote.mode === 'vote', 'Mode is vote');
  assert(vote.consensus === true, 'Two out of three voted success');
  
  // Test rank mode
  const rank = await aggregator.aggregate(mockResults, 'rank');
  assert(rank.success === true, 'Rank reports success');
  assert(rank.mode === 'rank', 'Mode is rank');
  assert(rank.ranked[0].agent === 'agent1', 'Higher confidence ranked first');
  
  // Test with all successes for rank
  const allSuccess = [
    { success: true, agent: 'low', output: 'Test', confidence: 0.5 },
    { success: true, agent: 'high', output: 'Test', confidence: 0.95 },
    { success: true, agent: 'mid', output: 'Test', confidence: 0.7 }
  ];
  const rank2 = await aggregator.aggregate(allSuccess, 'rank');
  assert(rank2.ranked[0].agent === 'high', 'Highest confidence first');
  assert(rank2.ranked[1].agent === 'mid', 'Mid confidence second');
  assert(rank2.ranked[2].agent === 'low', 'Lowest confidence third');
}

// Test 4: Full Orchestrator (Single Delegation)
async function testSingleDelegation() {
  const orchestrator = new MultiAgentOrchestrator();
  
  const result = await orchestrator.delegateTask({
    agentType: 'code-specialist',
    task: 'Review this code',
    input: 'function add(a, b) { return a + b; }',
    context: { language: 'javascript' }
  });
  
  assert(result.sessionId, 'Returns session ID');
  assert(result.result.success === true, 'Delegation succeeds');
  assert(result.result.agent === 'code-specialist', 'Has correct agent type');
  assert(result.result.output.length > 0, 'Has output');
  
  // Verify session was saved
  const session = await orchestrator.getSession(result.sessionId);
  assert(session !== null, 'Session exists');
  assert(session.status === 'completed', 'Session marked complete');
  
  console.log(`  Session ID: ${result.sessionId}`);
}

// Test 5: Parallel Delegation
async function testParallelDelegation() {
  const orchestrator = new MultiAgentOrchestrator();
  
  const tasks = [
    { agentType: 'security-analyst', task: 'Check security', context: {} },
    { agentType: 'code-specialist', task: 'Check code quality', context: {} }
  ];
  
  const result = await orchestrator.parallelDelegates({
    tasks,
    input: 'const password = "secret123";',
    aggregateMode: 'synthesize'
  });
  
  assert(result.sessionId, 'Returns session ID');
  assert(result.results.length === 2, 'Has two results');
  assert(result.aggregated, 'Has aggregated result');
  assert(result.aggregated.mode === 'synthesize', 'Uses requested mode');
  assert(result.aggregated.output.length > 0, 'Has synthesised output');
  
  console.log(`  Session ID: ${result.sessionId}`);
}

// Test 6: Error Handling
async function testErrorHandling() {
  const pool = new AgentPool();
  const aggregator = new ResultAggregator();
  
  // Test with invalid agent type
  try {
    await pool.spawnAgent('nonexistent-agent');
    assert(false, 'Should throw for invalid agent type');
  } catch (e) {
    assert(e.message.includes('Unknown agent type'), 'Throws correct error message');
  }
  
  // Test aggregator with empty results
  const empty = await aggregator.aggregate([], 'synthesize');
  assert(empty.success === false, 'Empty results show no success');
  
  // Test aggregator with all failures
  const allFail = [
    { success: false, agent: 'a', error: 'Network error' },
    { success: false, agent: 'b', error: 'Timeout' }
  ];
  const failed = await aggregator.aggregate(allFail, 'synthesize');
  assert(failed.successfulAgents === 0, 'Reports zero successful agents');
}

// Test 7: Agent Templates Content
async function testAgentTemplates() {
  const templates = AGENT_TEMPLATES;
  
  // Check each template has required fields
  for (const [name, template] of Object.entries(templates)) {
    assert(template.systemPrompt, `${name} has systemPrompt`);
    assert(template.systemPrompt.length > 50, `${name} systemPrompt is substantial`);
    assert(template.model, `${name} has model`);
    assert(typeof template.temperature === 'number', `${name} has temperature`);
    assert(template.temperature >= 0 && template.temperature <= 1, `${name} temperature is valid`);
    assert(typeof template.maxTokens === 'number', `${name} has maxTokens`);
    
    console.log(`  ✓ ${name}: ${template.model} @ ${template.temperature}`);
  }
}

// Test 8: Performance
async function testPerformance() {
  const orchestrator = new MultiAgentOrchestrator();
  
  const start = Date.now();
  await orchestrator.delegateTask({
    agentType: 'code-specialist',
    task: 'Quick check',
    input: 'const x = 1;'
  });
  const duration = Date.now() - start;
  
  assert(duration < 15000, `Delegation completes in reasonable time (${duration}ms)`);
  console.log(`  Execution time: ${duration}ms`);
}

// Main test runner
async function runAllTests() {
  console.log(`${YELLOW}=====================================${RESET}`);
  console.log(`${YELLOW}MULTI-AGENT ORCHESTRATOR TEST SUITE${RESET}`);
  console.log(`${YELLOW}=====================================${RESET}`);
  console.log();
  
  try {
    await runTest('Session Manager', testSessionManager);
    await runTest('Agent Pool', testAgentPool);
    await runTest('Result Aggregator', testResultAggregator);
    await runTest('Single Task Delegation', testSingleDelegation);
    await runTest('Parallel Delegation', testParallelDelegation);
    await runTest('Error Handling', testErrorHandling);
    await runTest('Agent Templates', testAgentTemplates);
    await runTest('Performance', testPerformance);
    
    console.log();
    console.log('='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`${GREEN}Passed:${RESET} ${testsPassed} tests`);
    
    if (testsFailed > 0) {
      console.log(`${RED}Failed:${RESET} ${testsFailed} tests`);
      process.exit(1);
    } else {
      console.log(`${GREEN}All tests passed!${RESET}`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`${RED}Test runner failed:${RESET}`, error);
    process.exit(1);
  }
}

runAllTests();
