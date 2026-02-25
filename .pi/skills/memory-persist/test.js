/**
 * Test for memory-persist skill
 */

const path = require('path');
const fs = require('fs');
const {
  memory_store,
  memory_recall,
  memory_delete,
  memory_list,
  memory_clear,
  getMemoryPath
} = require('./memory-persist');

// Override memory path for testing
const TEST_MEMORY_PATH = path.join(__dirname, 'test-memory.json');
const originalGetMemoryPath = require('./memory-persist').getMemoryPath;

async function runTests() {
  console.log('=== Memory Persist Skill Tests ===\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Helper to clean up before/after tests
  function cleanup() {
    if (fs.existsSync(TEST_MEMORY_PATH)) {
      fs.unlinkSync(TEST_MEMORY_PATH);
    }
  }

  // Override getMemoryPath for testing
  const originalModule = require('./memory-persist');
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  cleanup();

  // Test 1: Store a memory
  console.log('Test 1: Store memory');
  try {
    const result = memory_store('test_key', 'test_value');
    if (result === 'Stored: test_key') {
      console.log('✓ Memory stored successfully\n');
      results.passed++;
      results.tests.push({ name: 'Store memory', status: 'passed' });
    } else {
      console.log(`✗ Unexpected result: ${result}\n`);
      results.failed++;
      results.tests.push({ name: 'Store memory', status: 'failed', error: result });
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'Store memory', status: 'failed', error: error.message });
  }

  // Test 2: Recall the memory
  console.log('Test 2: Recall memory');
  try {
    const result = memory_recall('test_key');
    const parsed = JSON.parse(result);
    if (parsed.test_key === 'test_value') {
      console.log('✓ Memory recalled successfully\n');
      results.passed++;
      results.tests.push({ name: 'Recall memory', status: 'passed' });
    } else {
      console.log(`✗ Unexpected result: ${result}\n`);
      results.failed++;
      results.tests.push({ name: 'Recall memory', status: 'failed', error: 'Wrong value' });
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'Recall memory', status: 'failed', error: error.message });
  }

  // Test 3: Search by value
  console.log('Test 3: Search by value');
  try {
    memory_store('another_key', 'hello world');
    const result = memory_recall('hello');
    if (result.includes('hello world')) {
      console.log('✓ Value search works\n');
      results.passed++;
      results.tests.push({ name: 'Search by value', status: 'passed' });
    } else {
      console.log(`✗ Search failed: ${result}\n`);
      results.failed++;
      results.tests.push({ name: 'Search by value', status: 'failed', error: 'No match found' });
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'Search by value', status: 'failed', error: error.message });
  }

  // Test 4: List memories
  console.log('Test 4: List memories');
  try {
    const result = memory_list();
    if (result.includes('test_key') && result.includes('another_key')) {
      console.log('✓ List memories works\n');
      results.passed++;
      results.tests.push({ name: 'List memories', status: 'passed' });
    } else {
      console.log(`✗ List incomplete: ${result}\n`);
      results.failed++;
      results.tests.push({ name: 'List memories', status: 'failed', error: 'Missing keys' });
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'List memories', status: 'failed', error: error.message });
  }

  // Test 5: Delete a memory
  console.log('Test 5: Delete memory');
  try {
    const result = memory_delete('test_key');
    if (result === 'Deleted: test_key') {
      const recall = memory_recall('test_key');
      if (recall.includes('No matches')) {
        console.log('✓ Memory deleted successfully\n');
        results.passed++;
        results.tests.push({ name: 'Delete memory', status: 'passed' });
      } else {
        console.log('✗ Memory still exists after deletion\n');
        results.failed++;
        results.tests.push({ name: 'Delete memory', status: 'failed', error: 'Memory persists' });
      }
    } else {
      console.log(`✗ Unexpected result: ${result}\n`);
      results.failed++;
      results.tests.push({ name: 'Delete memory', status: 'failed', error: result });
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'Delete memory', status: 'failed', error: error.message });
  }

  // Test 6: Clear all memories
  console.log('Test 6: Clear all memories');
  try {
    const result = memory_clear();
    if (result === 'Cleared all memories') {
      const list = memory_list();
      if (list.includes('No memories stored')) {
        console.log('✓ Clear all works\n');
        results.passed++;
        results.tests.push({ name: 'Clear all memories', status: 'passed' });
      } else {
        console.log('✗ Memories still exist after clear\n');
        results.failed++;
        results.tests.push({ name: 'Clear all memories', status: 'failed', error: 'Memories persist' });
      }
    } else {
      console.log(`✗ Unexpected result: ${result}\n`);
      results.failed++;
      results.tests.push({ name: 'Clear all memories', status: 'failed', error: result });
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'Clear all memories', status: 'failed', error: error.message });
  }

  // Test 7: Persistence across operations
  console.log('Test 7: Persistence verification');
  try {
    memory_store('persist_test', 'should_persist');
    // Simulate reloading by calling loadMemory directly
    const { loadMemory } = require('./memory-persist');
    const data = loadMemory();
    if (data.persist_test === 'should_persist') {
      console.log('✓ Persistence works across operations\n');
      results.passed++;
      results.tests.push({ name: 'Persistence verification', status: 'passed' });
    } else {
      console.log('✗ Data not persisted\n');
      results.failed++;
      results.tests.push({ name: 'Persistence verification', status: 'failed', error: 'Data lost' });
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'Persistence verification', status: 'failed', error: error.message });
  }

  // Cleanup
  cleanup();

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);
  console.log('\nTest Details:');
  results.tests.forEach(test => {
    const status = test.status === 'passed' ? '✓' : test.status === 'failed' ? '✗' : '⊘';
    console.log(`  ${status} ${test.name}`);
  });

  // Write test results to file
  const testResultsPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(testResultsPath, JSON.stringify(results, null, 2));
  console.log(`\nTest results written to: ${testResultsPath}`);

  return results;
}

// Run tests
runTests().catch(console.error);
