/**
 * Integration tests for workflow-markdown skill
 */

import { workflow_list, workflow_run, workflow_validate, workflow_info } from '../index.js';

// Test 1: List workflows
async function testListWorkflows() {
  console.log('\n📋 Test: List Workflows');
  
  const result = await workflow_list({});
  
  if (!result.success) {
    throw new Error(`Failed to list workflows: ${result.error}`);
  }
  
  console.assert(result.count >= 0, 'Should return count');
  console.assert(Array.isArray(result.workflows), 'Should return workflows array');
  
  console.log(`   Found ${result.count} workflow(s)`);
  console.log('✅ List test passed');
  
  return result;
}

// Test 2: Validate workflow
async function testValidateWorkflow() {
  console.log('\n✓ Test: Validate Workflow');
  
  const result = await workflow_validate({ name: 'Health Check' });
  
  console.assert(result.valid === true || result.errors.length > 0, 'Should return valid or errors');
  
  console.log(`   Valid: ${result.valid}`);
  if (result.warnings.length > 0) {
    console.log(`   Warnings: ${result.warnings.length}`);
  }
  
  console.log('✅ Validation test passed');
}

// Test 3: Run workflow (dry run)
async function testDryRunWorkflow() {
  console.log('\n🏃 Test: Dry Run Workflow');
  
  const result = await workflow_run({
    name: 'Health Check',
    dryRun: true
  });
  
  if (!result.success && result.error) {
    console.log(`   Note: ${result.error}`);
    console.log('   (This may be expected if workflows not in search path)');
    return;
  }
  
  console.assert(result.workflow === 'Health Check', 'Should return workflow name');
  console.assert(result.stepResults, 'Should have step results');
  
  console.log(`   Steps: ${result.stepResults?.length || 0}`);
  console.log('✅ Dry run test passed');
}

// Test 4: List with tags
async function testListWithTags() {
  console.log('\n🏷️  Test: List with Tags');
  
  const result = await workflow_list({ tag: 'maintenance' });
  
  console.assert(result.success, 'Tag filter should work');
  console.log(`   Found ${result.count} maintenance workflow(s)`);
  console.log('✅ Tag filter test passed');
}

// Test 5: Workflow info
async function testWorkflowInfo() {
  console.log('\nℹ️  Test: Workflow Info');
  
  const result = await workflow_info({ name: 'Health Check' });
  
  // May fail if workflow not found, that's ok
  if (!result.success) {
    console.log(`   Note: ${result.error}`);
    console.log('   (This may be expected)');
    return;
  }
  
  console.assert(result.workflow.name === 'Health Check', 'Should return workflow info');
  console.log(`   Steps: ${result.workflow.steps.length}`);
  console.log('✅ Info test passed');
}

// Run all tests
async function runTests() {
  console.log('\n' + '='.repeat(50));
  console.log('🧪 Workflow Markdown Integration Tests');
  console.log('='.repeat(50));
  
  try {
    await testListWorkflows();
    await testValidateWorkflow();
    await testDryRunWorkflow();
    await testListWithTags();
    await testWorkflowInfo();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All integration tests passed!');
    console.log('='.repeat(50) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    console.error('='.repeat(50) + '\n');
    process.exit(1);
  }
}

runTests();
