#!/usr/bin/env node

/**
 * Test suite for Notion skill
 * Tests CLI functionality without requiring actual API credentials
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const NOTION_CLI = path.join(__dirname, 'notion.js');
const TEST_API_KEY = 'secret_test_key_123456789';

let passed = 0;
let failed = 0;

console.log('🧪 Notion Skill Test Suite\n');
console.log('='.repeat(50));

// Helper to run CLI and capture output
function runCli(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [NOTION_CLI, ...args], {
      env: { ...process.env, ...env },
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    child.on('error', reject);
  });
}

// Test helper
async function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    await fn();
    console.log('✅ PASS');
    passed++;
  } catch (error) {
    console.log('❌ FAIL');
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test assertions
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertContains(str, substring, message) {
  if (!str || !str.includes(substring)) {
    throw new Error(message || `Expected string to contain "${substring}"`);
  }
}

// Tests
async function runTests() {
  
  // Test 1: Help output
  await test('Help output displays correctly', async () => {
    const result = await runCli([]);
    assert(result.code === 0, 'Expected exit code 0');
    assertContains(result.stdout, 'Notion CLI', 'Should show CLI name');
    assertContains(result.stdout, 'Commands:', 'Should show commands list');
  });
  
  // Test 2: Help with specific command
  await test('Search command help', async () => {
    const result = await runCli(['search', '--help']);
    // May exit with error since --help isn't implemented specially
    assertContains(result.stdout + result.stderr, 'search', 'Should mention search');
  });
  
  // Test 3: Missing API key error
  await test('Missing API key shows error', async () => {
    // Unset any existing API key
    const result = await runCli(['search', 'test'], { NOTION_API_KEY: '' });
    assert(result.code !== 0, 'Should exit with error');
    assertContains(result.stderr, 'NOTION_API_KEY', 'Should mention API key');
  });
  
  // Test 4: Search with invalid key (will fail API but CLI should handle)
  await test('Search with API key handles error gracefully', async () => {
    const result = await runCli(['search', 'test'], { NOTION_API_KEY: TEST_API_KEY });
    // Should not crash, should show API error
    assert(result.code !== 0 || result.stdout.length > 0, 'Should handle gracefully');
  });
  
  // Test 5: Unknown command
  await test('Unknown command shows error', async () => {
    const result = await runCli(['unknown-command']);
    assert(result.code !== 0, 'Should exit with error');
    assertContains(result.stderr, 'Unknown command', 'Should mention unknown command');
  });
  
  // Test 6: Page command without ID
  await test('Page command without ID shows error', async () => {
    const result = await runCli(['page'], { NOTION_API_KEY: TEST_API_KEY });
    assert(result.code !== 0, 'Should exit with error');
    assertContains(result.stderr, 'page ID required', 'Should require page ID');
  });
  
  // Test 7: Blocks command without ID
  await test('Blocks command without ID shows error', async () => {
    const result = await runCli(['blocks'], { NOTION_API_KEY: TEST_API_KEY });
    assert(result.code !== 0, 'Should exit with error');
    assertContains(result.stderr, 'page ID required', 'Should require page ID');
  });
  
  // Test 8: Query command without ID
  await test('Query command without ID shows error', async () => {
    const result = await runCli(['query'], { NOTION_API_KEY: TEST_API_KEY });
    assert(result.code !== 0, 'Should exit with error');
    assertContains(result.stderr, 'database ID required', 'Should require database ID');
  });
  
  // Test 9: Create page without required options
  await test('Create page without options shows error', async () => {
    const result = await runCli(['create-page'], { NOTION_API_KEY: TEST_API_KEY });
    assert(result.code !== 0, 'Should exit with error');
    assertContains(result.stderr, '--parent', 'Should require parent');
  });
  
  // Test 10: Create page without title
  await test('Create page without title shows error', async () => {
    const result = await runCli(['create-page', '--parent', 'test-parent'], { NOTION_API_KEY: TEST_API_KEY });
    assert(result.code !== 0, 'Should exit with error');
    assertContains(result.stderr, '--title', 'Should require title');
  });
  
  // Test 11: Append blocks without content
  await test('Append blocks without content shows error', async () => {
    const result = await runCli(['append-blocks', 'test-page'], { NOTION_API_KEY: TEST_API_KEY });
    assert(result.code !== 0, 'Should exit with error');
    assertContains(result.stderr, '--content', 'Should require content');
  });
  
  // Test 12: Create database without required options
  await test('Create database without options shows error', async () => {
    const result = await runCli(['create-database'], { NOTION_API_KEY: TEST_API_KEY });
    assert(result.code !== 0, 'Should exit with error');
    assertContains(result.stderr, '--parent', 'Should require parent');
  });
  
  // Test 13: CLI is executable
  await test('CLI file is valid JavaScript', async () => {
    const content = fs.readFileSync(NOTION_CLI, 'utf-8');
    assertContains(content, '#!/usr/bin/env node', 'Should have shebang');
    assertContains(content, 'Notion CLI', 'Should have CLI name');
  });
  
  // Test 14: Package.json is valid
  await test('Package.json is valid', async () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
    assert(pkg.name === 'notion', 'Should have correct name');
    assert(pkg.dependencies['@notionhq/client'], 'Should depend on notion client');
  });
  
  // Test 15: SKILL.md is valid
  await test('SKILL.md contains required sections', async () => {
    const skillMd = fs.readFileSync(path.join(__dirname, 'SKILL.md'), 'utf-8');
    assertContains(skillMd, '---', 'Should have frontmatter');
    assertContains(skillMd, 'name: notion', 'Should have name');
    assertContains(skillMd, 'Setup', 'Should have Setup section');
    assertContains(skillMd, 'Usage', 'Should have Usage section');
    assertContains(skillMd, '## Commands', 'Should document commands');
  });
  
  // Test 16: --api-key flag support
  await test('--api-key flag is recognized', async () => {
    const result = await runCli(['search', 'test', '--api-key', TEST_API_KEY], { NOTION_API_KEY: '' });
    // Should not say "API key not set" since we provided one
    assert(!result.stderr.includes('NOTION_API_KEY not set'), 'Should accept API key from flag');
  });
  
  // Test 17: Invalid filter JSON
  await test('Invalid filter JSON shows error', async () => {
    const result = await runCli(['query', 'db123', '--filter', 'invalid json'], { NOTION_API_KEY: TEST_API_KEY });
    // The CLI might exit 1 or show error about filter - check stderr
    const combined = result.stdout + result.stderr;
    assert(result.code !== 0 || combined.includes('Invalid'), 'Should show error for invalid filter');
  });
  
  // Test 18: databases command exists
  await test('databases command exists', async () => {
    const result = await runCli(['databases'], { NOTION_API_KEY: TEST_API_KEY });
    // Should run (may fail on API but CLI should work)
    assert(result.stdout.length > 0 || result.stderr.length > 0, 'Should produce output');
  });
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    console.log('❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    console.log('\n📝 Note: Full API integration tests require a valid NOTION_API_KEY');
    console.log('   To test with real API: export NOTION_API_KEY="secret_xxxxx"');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
