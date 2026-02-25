#!/usr/bin/env node

/**
 * Trello Skill Test Suite
 * 
 * Tests the Trello integration skill by:
 * 1. Validating the SKILL.md structure
 * 2. Testing credential configuration
 * 3. Testing API endpoint construction
 * 4. Verifying common operations have valid curl commands
 */

const fs = require('fs');
const path = require('path');

const SKILL_DIR = '/job/pi-skills/trello';
const TEST_CRED_DIR = '/job/tmp/trello-test';

function setup() {
  // Clean up any previous test
  if (fs.existsSync(TEST_CRED_DIR)) {
    fs.rmSync(TEST_CRED_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_CRED_DIR, { recursive: true });
}

function runTests() {
  console.log('\n==================================================');
  console.log('🧪 Trello Skill Test Suite');
  console.log('==================================================\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: SKILL.md exists
  console.log('📋 Test 1: SKILL.md exists');
  try {
    const skillPath = path.join(SKILL_DIR, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      console.log('✅ PASS: SKILL.md exists\n');
      passed++;
    } else {
      console.log('❌ FAIL: SKILL.md not found\n');
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 2: SKILL.md has proper frontmatter
  console.log('📋 Test 2: SKILL.md has proper frontmatter');
  try {
    const skillPath = path.join(SKILL_DIR, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf-8');
    
    const hasName = content.includes('name: trello');
    const hasDescription = content.includes('description:');
    const hasApiSection = content.includes('api.trello.com');
    
    if (hasName && hasDescription && hasApiSection) {
      console.log('✅ PASS: SKILL.md properly structured\n');
      passed++;
    } else {
      console.log('❌ FAIL: SKILL.md missing required sections\n');
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 3: Contains required API endpoints
  console.log('📋 Test 3: Contains required Trello API endpoints');
  try {
    const skillPath = path.join(SKILL_DIR, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf-8');
    
    const requiredEndpoints = [
      '/boards',
      '/lists',
      '/cards',
      '/search'
    ];
    
    const missing = requiredEndpoints.filter(e => !content.includes(e));
    
    if (missing.length === 0) {
      console.log('✅ PASS: All required API endpoints documented\n');
      passed++;
    } else {
      console.log('❌ FAIL: Missing endpoints: ' + missing.join(', ') + '\n');
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 4: Contains setup instructions
  console.log('📋 Test 4: Contains setup instructions');
  try {
    const skillPath = path.join(SKILL_DIR, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf-8');
    
    const hasApiKey = content.includes('API Key') || content.includes('API key');
    const hasToken = content.includes('token');
    const hasAppKeyUrl = content.includes('app-key');
    
    if (hasApiKey && hasToken && hasAppKeyUrl) {
      console.log('✅ PASS: Setup instructions present\n');
      passed++;
    } else {
      console.log('❌ FAIL: Missing setup instructions\n');
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 5: Contains credential storage instructions
  console.log('📋 Test 5: Contains credential storage instructions');
  try {
    const skillPath = path.join(SKILL_DIR, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf-8');
    
    const hasConfigDir = content.includes('~/.config/trello');
    const hasEnvExport = content.includes('export TRELLO');
    
    if (hasConfigDir || hasEnvExport) {
      console.log('✅ PASS: Credential storage instructions present\n');
      passed++;
    } else {
      console.log('❌ FAIL: Missing credential storage instructions\n');
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 6: Contains common operations
  console.log('📋 Test 6: Contains common Trello operations');
  try {
    const skillPath = path.join(SKILL_DIR, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf-8');
    
    const operations = [
      'List Your Boards',
      'Create a New Card',
      'Update a Card',
      'Move Card',
      'Create a New Board'
    ];
    
    const missing = operations.filter(op => !content.includes(op));
    
    if (missing.length === 0) {
      console.log('✅ PASS: All common operations documented\n');
      passed++;
    } else {
      console.log('❌ FAIL: Missing operations: ' + missing.join(', ') + '\n');
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 7: Credential file creation works
  console.log('📋 Test 7: Credential file creation');
  try {
    const credContent = 'TRELLO_API_KEY="test_key"\nTRELLO_TOKEN="test_token"';
    fs.writeFileSync(path.join(TEST_CRED_DIR, 'credentials.env'), credContent);
    
    if (fs.existsSync(path.join(TEST_CRED_DIR, 'credentials.env'))) {
      const loaded = fs.readFileSync(path.join(TEST_CRED_DIR, 'credentials.env'), 'utf-8');
      if (loaded.includes('test_key') && loaded.includes('test_token')) {
        console.log('✅ PASS: Credential file creation works\n');
        passed++;
      } else {
        console.log('❌ FAIL: Credential file content incorrect\n');
        failed++;
      }
    } else {
      console.log('❌ FAIL: Credential file not created\n');
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 8: Verify curl commands are properly formatted
  console.log('📋 Test 8: Curl commands are properly formatted');
  try {
    const skillPath = path.join(SKILL_DIR, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf-8');
    
    // Check for proper curl command patterns
    const curlPatterns = [
      /curl -X (POST|PUT|GET)/,
      /api\.trello\.com/,
      /key=\$TRELLO_API_KEY/,
      /token=\$TRELLO_TOKEN/
    ];
    
    const allPresent = curlPatterns.every(pattern => pattern.test(content));
    
    if (allPresent) {
      console.log('✅ PASS: Curl commands properly formatted\n');
      passed++;
    } else {
      console.log('❌ FAIL: Some curl commands missing proper formatting\n');
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 9: Contains jq examples
  console.log('📋 Test 9: Contains jq examples for JSON parsing');
  try {
    const skillPath = path.join(SKILL_DIR, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf-8');
    
    if (content.includes('jq ')) {
      console.log('✅ PASS: Contains jq examples\n');
      passed++;
    } else {
      console.log('❌ FAIL: Missing jq examples\n');
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 10: Skill is symlinked in .pi/skills
  console.log('📋 Test 10: Skill is active (symlinked in .pi/skills)');
  try {
    const symlinkPath = '/job/.pi/skills/trello';
    if (fs.existsSync(symlinkPath)) {
      const stats = fs.lstatSync(symlinkPath);
      if (stats.isSymbolicLink()) {
        console.log('✅ PASS: Skill is active (symlinked)\n');
        passed++;
      } else {
        console.log('❌ FAIL: Path exists but is not a symlink\n');
        failed++;
      }
    } else {
      console.log('❌ FAIL: Skill not symlinked in .pi/skills\n');
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Summary
  console.log('==================================================');
  console.log('\n📊 Test Results: ' + passed + ' passed, ' + failed + ' failed\n');
  
  if (failed > 0) {
    return { passed, failed, success: false };
  }
  
  return { passed, failed, success: true };
}

function cleanup() {
  if (fs.existsSync(TEST_CRED_DIR)) {
    fs.rmSync(TEST_CRED_DIR, { recursive: true });
  }
}

// Run tests
try {
  setup();
  const results = runTests();
  cleanup();
  
  if (results.success) {
    console.log('✅ All tests completed successfully!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed!\n');
    process.exit(1);
  }
} catch (e) {
  console.error('\n❌ Test suite failed: ' + e.message);
  cleanup();
  process.exit(1);
}
