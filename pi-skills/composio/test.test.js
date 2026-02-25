#!/usr/bin/env node

/**
 * Composio Skill — Test Suite
 * 
 * Tests the composio skill functionality
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Composio Skill Test Suite ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    failed++;
  }
}

// Test 1: Check if package.json exists
test('package.json exists', () => {
  const pkgPath = join(__dirname, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error('package.json not found');
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  if (!pkg.dependencies['@composio/core']) {
    throw new Error('Missing @composio/core dependency');
  }
});

// Test 2: Check if all required files exist
test('Required files exist', () => {
  const files = ['execute.js', 'list-actions.js', 'list-apps.js', 'SKILL.md'];
  for (const file of files) {
    const filePath = join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing file: ${file}`);
    }
  }
});

// Test 3: Check SKILL.md format
test('SKILL.md has correct frontmatter', () => {
  const skillPath = join(__dirname, 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf-8');
  
  if (!content.startsWith('---')) {
    throw new Error('Missing frontmatter start');
  }
  
  if (!content.includes('name: composio')) {
    throw new Error('Missing skill name');
  }
  
  if (!content.includes('description:')) {
    throw new Error('Missing skill description');
  }
});

// Test 4: Check execute.js syntax
test('execute.js has valid syntax', () => {
  try {
    execSync(`node --check ${join(__dirname, 'execute.js')}`, { stdio: 'pipe' });
  } catch (error) {
    throw new Error('Syntax error in execute.js');
  }
});

// Test 5: Check list-actions.js syntax
test('list-actions.js has valid syntax', () => {
  try {
    execSync(`node --check ${join(__dirname, 'list-actions.js')}`, { stdio: 'pipe' });
  } catch (error) {
    throw new Error('Syntax error in list-actions.js');
  }
});

// Test 6: Check list-apps.js syntax
test('list-apps.js has valid syntax', () => {
  try {
    execSync(`node --check ${join(__dirname, 'list-apps.js')}`, { stdio: 'pipe' });
  } catch (error) {
    throw new Error('Syntax error in list-apps.js');
  }
});

// Test 7: Check help output
test('execute.js shows help', () => {
  try {
    const output = execSync(`node ${join(__dirname, 'execute.js')} --help`, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (!output.includes('Execute a Composio action')) {
      throw new Error('Help text not found');
    }
  } catch (error) {
    // Help might go to stderr, which is ok
    if (!error.stderr?.includes('Execute')) {
      // Try with stderr
      try {
        const errOutput = execSync(`node ${join(__dirname, 'execute.js')} --help 2>&1`, { 
          encoding: 'utf-8'
        });
        if (!errOutput.includes('Execute')) {
          throw new Error('Help output failed');
        }
      } catch (e) {
        throw new Error('Help output failed');
      }
    }
  }
});

console.log('\n=== Test Results ===\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);

if (failed > 0) {
  console.log('❌ Some tests failed');
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
  process.exit(0);
}
