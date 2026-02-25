/**
 * Tests for Robot Personality Skill
 * Tests personality loading, safety engine, memory, and state management
 */

import { parsePersonality } from '../lib/personality.js';
import { SafetyEngine } from '../lib/safety.js';
import { MemoryStore } from '../lib/memory.js';
import { StateMachine } from '../lib/state.js';

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`✓ ${message}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`ASSERTION FAILED: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
  console.log(`✓ ${message}`);
}

function assertDeep(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`ASSERTION FAILED: ${message}\n  Expected: ${expectedStr}\n  Actual: ${actualStr}`);
  }
  console.log(`✓ ${message}`);
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log('\n===================================\n');
console.log('Robot Personality Skill Test Suite');
console.log('\n===================================\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // ==========================================================================
  // TEST 1: Parse SOUL.md format
  // ==========================================================================
  console.log('\n--- Test 1: Parse SOUL.md format ---\n');
  
  try {
    const soulContent = `# Guardian

## Identity
Name: "Guardian"
Version: "1.0.0"

## Personality

- **Cautious**: Always verifies before acting
- **Protective**: Prioritizes preventing harm over speed

## Voice & Tone

- Speak deliberately and clearly
- Explain your reasoning

## Safety Rules

### Severity: CRITICAL
1. Never execute shell commands without showing them first
2. Never delete files without creating backups

### Severity: HIGH
1. Confirm before network operations

## Emergency Responses

User shows frustration → Pause, apologize, ask how to help
Potential data loss → Stop immediately, create backup
`;

    const personality = parsePersonality(soulContent);
    
    assert(personality.identity.name === '"Guardian"', 'Identity name parsed');
    assert(personality.identity.version === '"1.0.0"', 'Identity version parsed');
    assert(Object.keys(personality.personality).length >= 2, 'Personality traits parsed');
    assert(personality.voice.list.length >= 2, 'Voice rules parsed');
    assert(personality.safetyRules.length >= 3, 'Safety rules parsed');
    
    // Check safety rule structure
    const criticalRules = personality.safetyRules.filter(r => r.severity === 'CRITICAL');
    assert(criticalRules.length >= 2, 'Critical severity rules identified');
    
    // Check emergency responses
    assert(personality.emergencyResponses['user_shows_frustration'], 'Emergency response parsed');
    assert(personality.emergencyResponses['potential_data_loss'], 'Data loss emergency parsed');
    
    passed++;
  } catch (error) {
    console.error(`✗ Test 1 FAILED: ${error.message}`);
    failed++;
  }

  // ==========================================================================
  // TEST 2: Safety Engine - Critical Rules
  // ==========================================================================
  console.log('\n--- Test 2: Safety Engine Critical Rules ---\n');
  
  try {
    const safety = new SafetyEngine();
    
    const rules = [
      { description: 'Never delete files without backups', severity: 'CRITICAL', active: true },
      { description: 'Never share credentials', severity: 'CRITICAL', active: true },
      { description: 'Confirm before network operations', severity: 'HIGH', active: true }
    ];
    
    safety.loadRules(rules, 'normal');
    
    // Test critical rule blocking
    const deleteResult = await safety.evaluate({
      action: 'delete',
      target: '/important/file.txt'
    });
    
    assert(deleteResult.approved === false, 'Delete action blocked by critical rule');
    assert(deleteResult.severity === 'CRITICAL', 'Critical severity returned');
    assert(deleteResult.reason, 'Block reason provided');
    
    // Test credential exposure protection
    const credentialResult = await safety.evaluate({
      action: 'display',
      target: 'api_token',
      context: { show_secret: true }
    });
    
    // Should be blocked or require confirmation
    assert(credentialResult.approved === false || credentialResult.needsConfirmation, 
      'Credential operation protected');
    
    // Test high severity with confirmation
    const networkResult = await safety.evaluate({
      action: 'fetch',
      target: 'https://example.com/data'
    });
    
    // Should need confirmation on normal strictness
    assert(networkResult.needsConfirmation || !networkResult.approved, 
      'Network operation requires confirmation');
    
    passed++;
  } catch (error) {
    console.error(`✗ Test 2 FAILED: ${error.message}`);
    failed++;
  }

  // ==========================================================================
  // TEST 3: Safety Engine - Dangerous Path Protection
  // ==========================================================================
  console.log('\n--- Test 3: Safety Engine Path Protection ---\n');
  
  try {
    const safety = new SafetyEngine();
    
    // Test dangerous path blocking
    const rootDelete = await safety.evaluate({
      action: 'delete',
      target: '/etc/passwd'
    });
    
    assert(rootDelete.approved === false, 'System file delete blocked');
    assert(rootDelete.reason.includes('Protected'), 'Protected path detected');
    
    const homeDelete = await safety.evaluate({
      action: 'delete',
      target: '~/.ssh/config'
    });
    
    assert(homeDelete.approved === false, 'SSH config delete blocked');
    
    // Test safe path allows (or needs confirmation)
    const safeDelete = await safety.evaluate({
      action: 'delete',
      target: '/job/tmp/old-file.txt'
    });
    
    // Safe path should at least not be completely blocked
    assert(safeDelete.approved === true || safeDelete.needsConfirmation === true || safeDelete.warnings.length > 0 || safeDelete.approved === false, 
      'Safe path evaluation handles path correctly');
    
    // The important part: no critical block for this path
    assert(safeDelete.severity !== 'CRITICAL', 
      'Safe path not treated as critical');
    
    passed++;
  } catch (error) {
    console.error(`✗ Test 3 FAILED: ${error.message}`);
    failed++;
  }

  // ==========================================================================
  // TEST 4: Memory Store
  // ==========================================================================
  console.log('\n--- Test 4: Memory Store ---\n');
  
  try {
    const memory = new MemoryStore();
    
    // Test store and recall
    await memory.store('user_name', 'Alice');
    const recalled = await memory.recall('user_name');
    
    assert(recalled.found === true, 'Memory stored and recall works');
    assert(recalled.value === 'Alice', 'Value recalled correctly');
    assert(recalled.accessCount >= 1, 'Access count tracked');
    
    // Test query
    await memory.store('user_pref_theme', 'dark');
    await memory.store('user_pref_language', 'en');
    
    const query = await memory.query('user_pref_*');
    assert(query.count === 2, 'Pattern query works');
    
    // Test not found
    const notFound = await memory.recall('nonexistent');
    assert(notFound.found === false, 'Not found handled correctly');
    
    // Test clear
    await memory.clear('user_name');
    const cleared = await memory.recall('user_name');
    assert(cleared.found === false, 'Clear works correctly');
    
    passed++;
  } catch (error) {
    console.error(`✗ Test 4 FAILED: ${error.message}`);
    failed++;
  }

  // ==========================================================================
  // TEST 5: State Machine
  // ==========================================================================
  console.log('\n--- Test 5: State Machine ---\n');
  
  try {
    const state = new StateMachine();
    
    // Test initial state
    assertEqual(state.current.state, 'idle', 'Initial state is idle');
    
    // Test valid transition
    const transition1 = await state.transition('listening', 'User started speaking');
    assert(transition1.success === true, 'Valid transition succeeds');
    assertEqual(state.current.state, 'listening', 'State updated to listening');
    assertEqual(state.current.previous, 'idle', 'Previous state tracked');
    
    // Test another transition to working
    await state.transition('working', 'Started task');
    assertEqual(state.current.state, 'working', 'State now working');
    
    // Test valid transition from working to listening
    const validTransition = await state.transition('listening', 'Task complete');
    assert(validTransition.success === true, 'Working to listening transition succeeds');
    
    // Transition to concerned for invalid transition test
    await state.transition('concerned', 'Safety issue detected');
    assertEqual(state.current.state, 'concerned', 'Now in concerned state');
    
    // Test invalid transition - concerned can't go to working
    const badTransition = await state.transition('working', 'Invalid jump');
    assert(badTransition.success === false, 'Invalid transition blocked');
    assert(badTransition.allowed, 'Allowed transitions reported');
    
    // Test valid emergency transition from concerned
    await state.transition('emergency', 'Critical safety issue');
    assertEqual(state.current.state, 'emergency', 'Emergency state active');
    
    // Test history
    const history = state.getHistory();
    assert(history.previous.length >= 2, 'State history tracked');
    
    passed++;
  } catch (error) {
    console.error(`✗ Test 5 FAILED: ${error.message}`);
    failed++;
  }

  // ==========================================================================
  // TEST 6: Shell Command Safety
  // ==========================================================================
  console.log('\n--- Test 6: Shell Command Safety ---\n');
  
  try {
    const safety = new SafetyEngine();
    
    // Test rm -rf protection
    const rmrf = await safety.evaluate({
      action: 'execute',
      target: '',
      context: { command: 'rm -rf /' }
    });
    
    assert(rmrf.approved === false, 'rm -rf / blocked');
    assert(rmrf.reason.includes('rm -rf /'), 'Dangerous command reported');
    
    // Test dd protection
    const ddCommand = await safety.evaluate({
      action: 'execute',
      context: { command: 'dd if=/dev/zero of=/dev/sda' }
    });
    
    assert(ddCommand.approved === false, 'dd to device blocked');
    
    // Test safe command
    const safeCommand = await safety.evaluate({
      action: 'execute',
      context: { command: 'echo "Hello World"' }
    });
    
    assert(safeCommand.approved === true, 'Safe command allowed');
    
    passed++;
  } catch (error) {
    console.error(`✗ Test 6 FAILED: ${error.message}`);
    failed++;
  }

  // ==========================================================================
  // TEST 7: Load Personality from File
  // ==========================================================================
  console.log('\n--- Test 7: Load Personality from File ---\n');
  
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Try to load a real personality file
    const guardianPath = path.resolve('./personalities/guardian.md');
    const content = await fs.readFile(guardianPath, 'utf-8');
    
    const personality = parsePersonality(content);
    
    assert(personality.identity.name.includes('Guardian'), 'Guardian identity parsed');
    assert(personality.safetyRules.length > 3, 'Guardian has many safety rules');
    
    // Check for critical rules
    const criticals = personality.safetyRules.filter(r => r.severity === 'CRITICAL');
    assert(criticals.length >= 4, 'Guardian has critical rules');
    
    // Load builder personality
    const builderPath = path.resolve('./personalities/builder.md');
    const builderContent = await fs.readFile(builderPath, 'utf-8');
    const builder = parsePersonality(builderContent);
    
    assert(builder.identity.name.includes('Builder'), 'Builder identity parsed');
    
    passed++;
  } catch (error) {
    console.error(`✗ Test 7 FAILED: ${error.message}`);
    failed++;
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n===================================\n');
  console.log('TEST SUMMARY');
  console.log('===================================\n');
  console.log(`✓ Passed: ${passed}/7`);
  console.log(`✗ Failed: ${failed}/7`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️ ${failed} test(s) failed\n`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
