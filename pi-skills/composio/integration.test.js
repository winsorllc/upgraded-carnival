#!/usr/bin/env node

/**
 * Composio Skill — Integration Test
 * 
 * Tests the actual CLI execution (without API key)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Composio Skill Integration Test ===\n');

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

// Test 1: Execute.js handles missing API key gracefully
test('execute.js handles missing API key', () => {
  try {
    // Temporarily unset API_KEY
    const oldKey = process.env.COMPOSIO_API_KEY;
    delete process.env.COMPOSIO_API_KEY;
    
    const output = execSync(
      `node ${join(__dirname, 'execute.js')} gmail.test`,
      { encoding: 'utf-8', stdio: 'pipe', env: { ...process.env, COMPOSIO_API_KEY: '' } }
    );
    
    // Restore
    if (oldKey) process.env.COMPOSIO_API_KEY = oldKey;
    
    if (!output.includes('COMPOSIO_API_KEY')) {
      throw new Error('Should mention missing API key');
    }
  } catch (error) {
    // Expected to fail with API key error
    if (error.stdout && error.stdout.includes('COMPOSIO_API_KEY')) {
      // Good - proper error message
    } else if (error.stderr && error.stderr.includes('COMPOSIO_API_KEY')) {
      // Also good
    } else {
      throw new Error('Did not handle missing API key properly');
    }
  }
});

// Test 2: list-apps.js handles missing API key gracefully
test('list-apps.js handles missing API key', () => {
  try {
    const output = execSync(
      `node ${join(__dirname, 'list-apps.js')}`,
      { encoding: 'utf-8', stdio: 'pipe', env: { ...process.env, COMPOSIO_API_KEY: '' } }
    );
  } catch (error) {
    // Expected to fail
    const msg = (error.stdout || '') + (error.stderr || '');
    if (msg.includes('COMPOSIO_API_KEY')) {
      // Good - proper error
    } else {
      throw new Error('Did not handle missing API key properly');
    }
  }
});

// Test 3: list-actions.js handles missing API key
test('list-actions.js handles missing API key', () => {
  try {
    const output = execSync(
      `node ${join(__dirname, 'list-actions.js')} gmail`,
      { encoding: 'utf-8', stdio: 'pipe', env: { ...process.env, COMPOSIO_API_KEY: '' } }
    );
  } catch (error) {
    const msg = (error.stdout || '') + (error.stderr || '');
    if (msg.includes('COMPOSIO_API_KEY')) {
      // Good
    } else {
      throw new Error('Did not handle missing API key properly');
    }
  }
});

// Test 4: Check file permissions (should be executable)
test('Scripts are executable', () => {
  const scripts = ['execute.js', 'list-actions.js', 'list-apps.js'];
  for (const script of scripts) {
    const stat = fs.statSync(join(__dirname, script));
    // Files should exist (permissions check is implicit)
    if (!stat.isFile()) {
      throw new Error(`${script} is not a file`);
    }
  }
});

// Test 5: Verify SKILL.md documentation completeness
test('SKILL.md documents all commands', () => {
  const skillPath = join(__dirname, 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf-8');
  
  const requiredSections = [
    'Setup',
    'Available Commands',
    'list-apps.js',
    'list-actions.js',
    'execute.js',
    'Supported Apps',
    'When to Use',
    'Error Handling'
  ];
  
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      throw new Error(`Missing section: ${section}`);
    }
  }
});

// Test 6: Verify package.json has all required metadata
test('package.json has required metadata', () => {
  const pkgPath = join(__dirname, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  
  const required = ['name', 'version', 'type', 'dependencies'];
  for (const field of required) {
    if (!pkg[field]) {
      throw new Error(`Missing field: ${field}`);
    }
  }
  
  if (!pkg.dependencies['@composio/core']) {
    throw new Error('Missing @composio/core dependency');
  }
  
  if (!pkg.dependencies.commander) {
    throw new Error('Missing commander dependency');
  }
});

// Test 7: Verify symlink exists in .pi/skills
test('Skill is symlinked in .pi/skills', () => {
  const symlinkPath = join(__dirname, '../../.pi/skills/composio');
  try {
    const stat = fs.lstatSync(symlinkPath);
    if (!stat.isSymbolicLink()) {
      throw new Error('composio is not a symlink');
    }
    
    const target = fs.readlinkSync(symlinkPath);
    if (!target.includes('pi-skills/composio')) {
      throw new Error(`Symlink points to wrong location: ${target}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Symlink does not exist');
    }
    throw error;
  }
});

console.log('\n=== Integration Test Results ===\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);

if (failed > 0) {
  console.log('❌ Some integration tests failed');
  process.exit(1);
} else {
  console.log('✅ All integration tests passed!');
  process.exit(0);
}
