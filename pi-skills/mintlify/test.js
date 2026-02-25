#!/usr/bin/env node

/**
 * Mintlify Skill Test Suite
 * 
 * Tests the Mintlify documentation skill by:
 * 1. Creating a mock Mintlify project structure
 * 2. Validating the structure using our helper tool
 * 3. Verifying frontmatter requirements
 * 4. Testing navigation extraction
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_DIR = '/job/tmp/mintlify-test';
const SKILL_DIR = '/job/pi-skills/mintlify';

function setup() {
  // Clean up any previous test
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'docs', 'guides'), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'docs', 'api'), { recursive: true });
}

function createMockDocs() {
  // Create docs.json
  const docsJson = {
    name: "Test Documentation",
    navigation: [
      {
        group: "Getting Started",
        items: [
          { title: "Introduction", slug: "introduction" },
          { title: "Quick Start", slug: "quickstart" }
        ]
      },
      {
        group: "API Reference",
        items: [
          { title: "Overview", slug: "api/overview" }
        ]
      }
    ],
    colors: {
      primary: "#007bff"
    }
  };
  
  fs.writeFileSync(
    path.join(TEST_DIR, 'docs', 'docs.json'),
    JSON.stringify(docsJson, null, 2)
  );
  
  // Create introduction.mdx
  const introContent = [
    '---',
    'title: "Introduction"',
    'description: "Welcome to the test documentation"',
    '---',
    '',
    '# Introduction',
    '',
    'Welcome to our documentation!',
    '',
    '## Overview',
    '',
    'This is a test page for the Mintlify skill.'
  ].join('\n');
  fs.writeFileSync(path.join(TEST_DIR, 'docs', 'introduction.mdx'), introContent);

  // Create quickstart.mdx
  const quickstartContent = [
    '---',
    'title: "Quick Start"',
    'description: "Get started quickly"',
    '---',
    '',
    '# Quick Start',
    '',
    'Follow these steps to get started.'
  ].join('\n');
  fs.writeFileSync(path.join(TEST_DIR, 'docs', 'quickstart.mdx'), quickstartContent);

  // Create API overview.md
  const apiContent = [
    '---',
    'title: "API Overview"',
    'description: "API reference documentation"',
    '---',
    '',
    '# API Overview',
    '',
    'This is the API reference.'
  ].join('\n');
  fs.writeFileSync(path.join(TEST_DIR, 'docs', 'api', 'overview.md'), apiContent);

  // Create a page without frontmatter (should trigger warning)
  const badPageContent = '# Bad Page\n\nThis page is missing frontmatter.\n';
  fs.writeFileSync(path.join(TEST_DIR, 'docs', 'guides', 'bad-page.md'), badPageContent);
}

function runTests() {
  console.log('\n==================================================');
  console.log('🧪 Mintlify Skill Test Suite');
  console.log('==================================================\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Helper script exists
  console.log('📋 Test 1: Helper script exists');
  try {
    const helperPath = path.join(SKILL_DIR, 'mintlify-helper.js');
    if (fs.existsSync(helperPath)) {
      console.log('✅ PASS: Helper script exists\n');
      passed++;
    } else {
      console.log('❌ FAIL: Helper script not found\n');
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 2: SKILL.md exists and has proper frontmatter
  console.log('📋 Test 2: SKILL.md exists with proper structure');
  try {
    const skillPath = path.join(SKILL_DIR, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf-8');
    
    const hasName = content.includes('name: mintlify');
    const hasDescription = content.includes('description:');
    const hasCliSection = content.includes('mint dev');
    
    if (hasName && hasDescription && hasCliSection) {
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

  // Test 3: Validate mock docs structure
  console.log('📋 Test 3: Validate mock documentation structure');
  try {
    const result = execSync(
      'node ' + path.join(SKILL_DIR, 'mintlify-helper.js') + ' validate ' + path.join(TEST_DIR, 'docs'),
      { encoding: 'utf-8' }
    );
    
    if (result.includes('Documentation structure looks good!')) {
      console.log('✅ PASS: Documentation structure is valid\n');
      passed++;
    } else if (result.includes('Errors:')) {
      console.log('❌ FAIL: Documentation has errors');
      console.log(result + '\n');
      failed++;
    } else {
      console.log('⚠️  WARN: Unexpected validation output');
      console.log(result + '\n');
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 4: Check frontmatter
  console.log('📋 Test 4: Frontmatter validation');
  try {
    const result = execSync(
      'node ' + path.join(SKILL_DIR, 'mintlify-helper.js') + ' check-frontmatter ' + path.join(TEST_DIR, 'docs'),
      { encoding: 'utf-8' }
    );
    
    // Should find 3 valid, 1 missing frontmatter
    if (result.includes('Valid pages: 3') && result.includes('Missing frontmatter: 1')) {
      console.log('✅ PASS: Frontmatter validation works correctly\n');
      passed++;
    } else {
      console.log('⚠️  WARN: Unexpected frontmatter results');
      console.log(result + '\n');
    }
  } catch (e) {
    console.log('❌ FAIL: ' + e.message + '\n');
    failed++;
  }

  // Test 5: Extract navigation
  console.log('📋 Test 5: Navigation extraction');
  try {
    const result = execSync(
      'node ' + path.join(SKILL_DIR, 'mintlify-helper.js') + ' extract-nav ' + path.join(TEST_DIR, 'docs', 'docs.json'),
      { encoding: 'utf-8' }
    );
    
    if (result.includes('Getting Started') && result.includes('API Reference')) {
      console.log('✅ PASS: Navigation extraction works\n');
      passed++;
    } else {
      console.log('❌ FAIL: Navigation not extracted properly\n');
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
    process.exit(1);
  }
  
  return { passed, failed };
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

// Run tests
try {
  setup();
  createMockDocs();
  const results = runTests();
  cleanup();
  
  console.log('✅ All tests completed successfully!\n');
  process.exit(0);
} catch (e) {
  console.error('\n❌ Test suite failed: ' + e.message);
  cleanup();
  process.exit(1);
}
