/**
 * Heartbeat Skill Test Suite
 * 
 * Tests for the self-monitoring system.
 */

import { 
  runHealthCheck, 
  runStatusReport, 
  runMaintenance,
  executeHeartbeat 
} from '../lib/runners.js';
import { 
  parseHeartbeatFile, 
  scheduleHeartbeat, 
  listHeartbeats,
  parseInterval 
} from '../lib/scheduler.js';
import { 
  getHistory, 
  getAllStatuses, 
  getSummary,
  recordRun 
} from '../lib/status.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Test configuration
const TEST_HEARTBEAT_FILE = '/tmp/test-heartbeat.md';
const TEST_STATUS_DIR = '/tmp/.heartbeat-test';

// Override constants for testing
process.env.HEARTBEAT_FILE = TEST_HEARTBEAT_FILE;

// Color codes for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BLUE = '\x1b[34m';

// Test results
let passed = 0;
let failed = 0;
const failures = [];

/**
 * Test assertion helper
 */
function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ${GREEN}✓${RESET} ${message}`);
  } else {
    failed++;
    console.log(`  ${RED}✗${RESET} ${message}`);
    failures.push(message);
  }
}

/**
 * Run a test
 */
async function test(name, fn) {
  process.stdout.write(`\n${BLUE}▶${RESET} ${name}\n`);
  try {
    await fn();
  } catch (err) {
    failed++;
    console.log(`  ${RED}✗${RESET} Exception: ${err.message}`);
    failures.push(`${name}: ${err.message}`);
  }
}

/**
 * Setup test environment
 */
async function setup() {
  console.log('\n' + '='.repeat(60));
  console.log('Heartbeat Skill Test Suite');
  console.log('='.repeat(60));
  
  // Create test directories
  try {
    await rm(TEST_STATUS_DIR, { recursive: true });
  } catch (e) {}
  await mkdir(TEST_STATUS_DIR, { recursive: true });
}

/**
 * Cleanup test environment
 */
async function cleanup() {
  try {
    await rm(TEST_STATUS_DIR, { recursive: true });
    await rm(TEST_HEARTBEAT_FILE);
  } catch (e) {}
}

/**
 * Run all tests
 */
async function runTests() {
  await setup();
  
  // Test parseInterval
  await test('parseInterval converts time strings', () => {
    assert(parseInterval('30s') === 30000, '30 seconds = 30000ms');
    assert(parseInterval('5m') === 300000, '5 minutes = 300000ms');
    assert(parseInterval('1h') === 3600000, '1 hour = 3600000ms');
    assert(parseInterval('1d') === 86400000, '1 day = 86400000ms');
    assert(parseInterval('1w') === 604800000, '1 week = 604800000ms');
    assert(parseInterval('invalid') === null, 'Invalid interval returns null');
  });
  
  // Test heartbeat scheduling
  await test('scheduleHeartbeat creates heartbeat', async () => {
    const task = await scheduleHeartbeat({
      name: 'test-health',
      type: 'health',
      interval: '30m',
      enabled: true
    });
    
    assert(task.name === 'test-health', 'Task has correct name');
    assert(task.type === 'health', 'Task has correct type');
    assert(task.interval === '30m', 'Task has correct interval');
    assert(task.enabled === true, 'Task is enabled');
    assert(task.runs === 0, 'Initial runs count is 0');
    assert(task.created, 'Task has creation timestamp');
  });
  
  // Test listHeartbeats
  await test('listHeartbeats returns scheduled tasks', async () => {
    await scheduleHeartbeat({
      name: 'test-report',
      type: 'report',
      interval: '1h',
      enabled: true
    });
    
    const tasks = await listHeartbeats();
    assert(Array.isArray(tasks), 'Returns array');
    assert(tasks.length >= 2, 'Returns at least 2 tasks');
    assert(tasks.some(t => t.name === 'test-health'), 'Includes test-health');
    assert(tasks.some(t => t.name === 'test-report'), 'Includes test-report');
  });
  
  // Test runHealthCheck
  await test('runHealthCheck returns health status', async () => {
    const result = await runHealthCheck();
    
    assert(result.timestamp, 'Has timestamp');
    assert(result.type === 'health', 'Has correct type');
    assert(result.status, 'Has status');
    assert(['ok', 'warning', 'error'].includes(result.status), 'Status is valid');
    assert(result.checks, 'Has checks object');
    assert(result.checks.disk, 'Has disk check');
    assert(result.checks.memory, 'Has memory check');
    assert(result.checks.jobs, 'Has jobs check');
    assert(result.checks.git, 'Has git check');
  });
  
  // Test runStatusReport
  await test('runStatusReport returns system report', async () => {
    const result = await runStatusReport();
    
    assert(result.timestamp, 'Has timestamp');
    assert(result.type === 'report', 'Has correct type');
    assert(result.summary, 'Has summary');
    assert(typeof result.summary.jobs !== 'undefined', 'Has job stats');
    assert(typeof result.summary.skills === 'number', 'Skill count is number');
    assert(result.summary.system, 'Has system info');
  });
  
  // Test runMaintenance
  await test('runMaintenance returns maintenance results', async () => {
    const result = await runMaintenance({ daysToKeep: 30 });
    
    assert(result.timestamp, 'Has timestamp');
    assert(result.type === 'maintenance', 'Has correct type');
    assert(Array.isArray(result.tasks), 'Has tasks array');
    assert(result.tasks.length >= 2, 'Has at least 2 tasks');
    
    const archiveTask = result.tasks.find(t => t.name === 'archive-old-logs');
    assert(archiveTask, 'Has archive task');
    assert(archiveTask.status === 'success' || archiveTask.status === 'partial', 
           'Archive task has valid status');
  });
  
  // Test executeHeartbeat with different types
  await test('executeHeartbeat runs different types', async () => {
    const health = await executeHeartbeat('health');
    assert(health.type === 'health', 'Health type works');
    
    const report = await executeHeartbeat('report');
    assert(report.type === 'report', 'Report type works');
    
    const maintenance = await executeHeartbeat('maintenance');
    assert(maintenance.type === 'maintenance', 'Maintenance type works');
    
    const custom = await executeHeartbeat('custom-action');
    assert(custom.type === 'custom', 'Custom type works');
    assert(custom.action === 'custom-action', 'Custom action preserved');
  });
  
  // Test recordRun
  await test('recordRun tracks execution history', async () => {
    const testResult = {
      timestamp: new Date().toISOString(),
      status: 'ok',
      type: 'test'
    };
    
    await recordRun('test-runner', testResult);
    
    const history = await getHistory(10);
    const hasEntry = history.some(h => 
      h.name === 'test-runner' && h.status === 'ok'
    );
    assert(hasEntry, 'Run is recorded in history');
  });
  
  // Test getSummary
  await test('getSummary provides statistics', async () => {
    const summary = await getSummary();
    
    assert(summary.timestamp, 'Has timestamp');
    assert(summary.heartbeats, 'Has heartbeats section');
    assert(typeof summary.heartbeats.total === 'number', 'Has total count');
    assert(typeof summary.heartbeats.active === 'number', 'Has active count');
    assert(summary.runs, 'Has runs section');
    assert(summary.health, 'Has health section');
    assert(summary.health.successRate, 'Has success rate');
  });
  
  // Test parseHeartbeatFile
  await test('parseHeartbeatFile parses markdown', async () => {
    const content = `# Heartbeat Config
    
- health: Check system every 30 minutes
- report: Daily summary every day at 9 AM
- maintenance: Weekly cleanup every week`;
    
    await writeFile(TEST_HEARTBEAT_FILE, content);
    const tasks = await parseHeartbeatFile(TEST_HEARTBEAT_FILE);
    
    assert(Array.isArray(tasks), 'Returns array');
    assert(tasks.length === 3, 'Parses 3 tasks');
    assert(tasks[0].type === 'health', 'First is health');
    assert(tasks[1].type === 'report', 'Second is report');
    assert(tasks[2].type === 'maintenance', 'Third is maintenance');
  });
  
  // Cleanup
  await cleanup();
  
  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('Test Results');
  console.log('='.repeat(60));
  console.log(`Total: ${passed + failed}`);
  console.log(`${GREEN}Passed: ${passed}${RESET}`);
  console.log(`${failed > 0 ? RED : GREEN}Failed: ${failed}${RESET}`);
  
  if (failures.length > 0) {
    console.log('\n' + RED + 'Failures:' + RESET);
    failures.forEach(f => console.log(`  - ${f}`));
  }
  
  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});