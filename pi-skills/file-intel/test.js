#!/usr/bin/env node

/**
 * File Intelligence - Test Suite
 * 
 * Tests all three main tools: analyze-dependencies, find-related, detect-patterns
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname);

function runTest(name, fn) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    const result = fn();
    if (result === false) {
      console.log(`❌ FAILED: ${name}`);
      process.exitCode = 1;
    } else {
      console.log(`✅ PASSED: ${name}`);
    }
    return true;
  } catch (err) {
    console.log(`❌ ERROR: ${name}`);
    console.log(`   ${err.message}`);
    process.exitCode = 1;
    return false;
  }
}

function testAnalyzeDependencies() {
  console.log('   Testing single file analysis...');
  const result = execSync(`node ${BASE_DIR}/analyze-dependencies.js /job/package.json`, { encoding: 'utf-8' });
  const parsed = JSON.parse(result);
  
  if (parsed.language !== 'unknown') throw new Error('Expected language unknown for JSON file');
  console.log(`   ✓ Language detection works`);
  
  console.log('   Testing JS file with imports...');
  const result2 = execSync(`node ${BASE_DIR}/analyze-dependencies.js /job/pi-skills/brave-search/search.js`, { encoding: 'utf-8' });
  const parsed2 = JSON.parse(result2);
  
  if (parsed2.language !== 'javascript') throw new Error('Expected javascript');
  if (parsed2.imports.internal.length === 0) throw new Error('Expected internal imports');
  if (parsed2.imports.external.length === 0) throw new Error('Expected external imports');
  console.log(`   ✓ Found ${parsed2.imports.internal.length} internal, ${parsed2.imports.external.length} external deps`);
  
  console.log('   Testing re-export handling...');
  const result3 = execSync(`node ${BASE_DIR}/analyze-dependencies.js /job/app/api/\\[...thepopebot\\]/route.js`, { encoding: 'utf-8' });
  const parsed3 = JSON.parse(result3);
  
  if (parsed3.imports.external.length === 0) throw new Error('Expected external imports for re-export');
  console.log(`   ✓ Re-export handling works`);
  
  return true;
}

function testFindRelated() {
  console.log('   Testing find-related for API route...');
  const result = execSync(`node ${BASE_DIR}/find-related.js /job/app/api/\\[...thepopebot\\]/route.js`, { encoding: 'utf-8' });
  const parsed = JSON.parse(result);
  
  if (!parsed.target) throw new Error('Missing target');
  if (!parsed.root) throw new Error('Missing root');
  if (!parsed.related || parsed.related.length === 0) throw new Error('No related files found');
  console.log(`   ✓ Found ${parsed.related.length} related files`);
  
  // Check that top result makes sense
  const topResult = parsed.related[0];
  if (!topResult.file || !topResult.score) throw new Error('Missing file or score');
  console.log(`   ✓ Top result: ${topResult.file} (score: ${topResult.score})`);
  
  return true;
}

function testDetectPatterns() {
  console.log('   Testing pattern detection...');
  const result = execSync(`node ${BASE_DIR}/detect-patterns.js /job --types "components,utils"`, { encoding: 'utf-8' });
  
  // Just ensure it runs without error - the output includes JSON
  if (!result.includes('Structure Analysis')) throw new Error('Expected structure output');
  if (!result.includes('Pattern Detection')) throw new Error('Expected pattern output');
  console.log(`   ✓ Structure analysis works`);
  console.log(`   ✓ Pattern detection works`);
  
  return true;
}

function testIntegration() {
  console.log('   Testing integration: analyze-structure + detect-patterns...');
  const result = execSync(`node ${BASE_DIR}/detect-patterns.js /job/app`, { encoding: 'utf-8' });
  
  // Just ensure it runs without error
  if (!result.includes('Structure Analysis')) throw new Error('Expected structure output');
  console.log(`   ✓ Integration test passed`);
  
  return true;
}

// Run tests
console.log('='.repeat(60));
console.log('FILE INTELLIGENCE - TEST SUITE');
console.log('='.repeat(60));

runTest('analyze-dependencies.js', testAnalyzeDependencies);
runTest('find-related.js', testFindRelated);
runTest('detect-patterns.js', testDetectPatterns);
runTest('Integration test', testIntegration);

console.log('\n' + '='.repeat(60));
console.log('ALL TESTS COMPLETED');
console.log('='.repeat(60));
