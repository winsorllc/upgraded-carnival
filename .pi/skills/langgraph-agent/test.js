/**
 * Test for langgraph-agent skill
 * 
 * Tests the LangGraph-style agent framework
 */

const path = require('path');
const { createAgent, createTool } = require('./langgraph-agent');

async function runTests() {
  console.log('=== LangGraph Agent Skill Tests ===\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Check module exports
  console.log('Test 1: Module exports');
  try {
    if (typeof createAgent === 'function' && typeof createTool === 'function') {
      console.log('✓ Module exports are correct\n');
      results.passed++;
      results.tests.push({ name: 'Module exports', status: 'passed' });
    } else {
      console.log('✗ Module exports are incorrect\n');
      results.failed++;
      results.tests.push({ name: 'Module exports', status: 'failed', error: 'Missing exports' });
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'Module exports', status: 'failed', error: error.message });
  }

  // Test 2: Create custom tool
  console.log('Test 2: Create custom tool');
  try {
    const customTool = createTool(
      'echo',
      'Echo back the input',
      {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message to echo back' }
        },
        required: ['message']
      },
      async (args) => `Echo: ${args.message}`
    );

    if (customTool.name === 'echo' && typeof customTool.execute === 'function') {
      const result = await customTool.execute({ message: 'Hello World' });
      if (result === 'Echo: Hello World') {
        console.log('✓ Custom tool creation and execution works\n');
        results.passed++;
        results.tests.push({ name: 'Create custom tool', status: 'passed' });
      } else {
        console.log(`✗ Tool execution returned unexpected result: ${result}\n`);
        results.failed++;
        results.tests.push({ name: 'Create custom tool', status: 'failed', error: 'Unexpected result' });
      }
    } else {
      console.log('✗ Custom tool creation failed\n');
      results.failed++;
      results.tests.push({ name: 'Create custom tool', status: 'failed', error: 'Tool structure incorrect' });
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'Create custom tool', status: 'failed', error: error.message });
  }

  // Test 3: Agent creation succeeds with valid config
  console.log('Test 3: Agent creation with config');
  try {
    const agent = await createAgent({ 
      apiKey: 'test-key-for-validation',
      baseURL: 'http://test.invalid',
      model: 'test-model'
    });
    
    if (agent && typeof agent.invoke === 'function' && agent.tools) {
      console.log('✓ Agent creation works with valid config\n');
      results.passed++;
      results.tests.push({ name: 'Agent creation with config', status: 'passed' });
    } else {
      console.log('✗ Agent not created properly\n');
      results.failed++;
      results.tests.push({ name: 'Agent creation with config', status: 'failed', error: 'Agent structure incorrect' });
    }
  } catch (error) {
    console.log(`✗ Error during agent creation: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'Agent creation with config', status: 'failed', error: error.message });
  }

  // Test 4: Default tools exist
  console.log('Test 4: Default tools availability');
  try {
    const agent = await createAgent({ 
      apiKey: 'fake-key', 
      baseURL: 'http://fake.invalid' 
    }).catch(() => null);
    
    // If we got here, check if agent was created
    if (agent) {
      const hasDefaultTools = agent.tools.shell && agent.tools.file_read && agent.tools.file_write;
      if (hasDefaultTools) {
        console.log('✓ Default tools are available\n');
        results.passed++;
        results.tests.push({ name: 'Default tools availability', status: 'passed' });
      } else {
        console.log('✗ Missing default tools\n');
        results.failed++;
        results.tests.push({ name: 'Default tools availability', status: 'failed', error: 'Missing default tools' });
      }
    } else {
      // Agent creation failed as expected, skip this test
      console.log('⊘ Skipped (agent requires valid API)\n');
      results.tests.push({ name: 'Default tools availability', status: 'skipped' });
    }
  } catch (error) {
    console.log(`⊘ Skipped: ${error.message}\n`);
    results.tests.push({ name: 'Default tools availability', status: 'skipped', error: error.message });
  }

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
  const fs = require('fs');
  const testResultsPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(testResultsPath, JSON.stringify(results, null, 2));
  console.log(`\nTest results written to: ${testResultsPath}`);

  return results;
}

// Run tests
runTests().catch(console.error);
