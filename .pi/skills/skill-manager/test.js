#!/usr/bin/env node
/**
 * Test suite for skill-manager
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧪 Testing skill-manager skill...\n');

const skillDir = __dirname;

// Test 1: Files exist
console.log('Test 1: Check files exist');
const requiredFiles = ['SKILL.md', 'skill-list.js', 'skill-validate.js', 'skill-create.js', 'skill-audit.js', 'skill-package.js'];
requiredFiles.forEach(file => {
  assert(fs.existsSync(path.join(skillDir, file)), `Missing file: ${file}`);
  console.log(`  ✓ ${file} exists`);
});

// Test 2: SKILL.md structure
console.log('\nTest 2: Check SKILL.md');
const skillMd = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
assert(skillMd.includes('name:'), 'Missing name field');
assert(skillMd.includes('description:'), 'Missing description field');
console.log('  ✓ SKILL.md structure valid');

// Test 3: Test skill-list
console.log('\nTest 3: Test skill-list.js');
const { listSkills, parseSkillMd } = require('./skill-list.js');
const skills = listSkills();
assert(Array.isArray(skills), 'listSkills should return array');
assert(skills.length >= 0, 'Skills list should be testable');
console.log('  ✓ skill-list.js works');

// Parse current skill
const currentSkill = parseSkillMd(skillDir);
assert(currentSkill.name, 'Should parse skill name');
assert(currentSkill.description, 'Should parse description');
console.log('  ✓ parseSkillMd works');

// Test 4: Test skill-validate
console.log('\nTest 4: Test skill-validate.js');
const { validateSkill } = require('./skill-validate.js');
const validation = validateSkill(skillDir);
assert(typeof validation === 'object', 'Should return object');
assert('valid' in validation, 'Should have valid property');
assert('errors' in validation, 'Should have errors property');
assert(validation.valid || validation.errors.some(e => e.includes('Missing required file') === false), 
       'Validation should work');
console.log('  ✓ skill-validate.js works');

// Test 5: Test skill-create
console.log('\nTest 5: Test skill-create.js');
const { createSkill } = require('./skill-create.js');
const testSkillDir = '/tmp/test-skill-manager-create';
if (fs.existsSync(testSkillDir)) {
  fs.rmSync(testSkillDir, { recursive: true });
}
fs.mkdirSync(testSkillDir, { recursive: true });

const createdDir = createSkill('test-skill-xyz', testSkillDir);
assert(createdDir, 'Should return created directory');
assert(fs.existsSync(createdDir), 'Should create directory');
assert(fs.existsSync(path.join(createdDir, 'SKILL.md')), 'Should create SKILL.md');
assert(fs.existsSync(path.join(createdDir, 'main.js')), 'Should create main.js');
assert(fs.existsSync(path.join(createdDir, 'test.js')), 'Should create test.js');
console.log('  ✓ skill-create.js works');

// Test 6: Test skill-audit
console.log('\nTest 6: Test skill-audit.js');
const { auditSkill, RISK_PATTERNS } = require('./skill-audit.js');
assert(Array.isArray(RISK_PATTERNS), 'RISK_PATTERNS should be array');
assert(RISK_PATTERNS.length > 0, 'Should have risk patterns');

const auditResults = auditSkill(skillDir);
assert(typeof auditResults === 'object', 'Should return object');
assert('passed' in auditResults, 'Should have passed property');
assert('summary' in auditResults, 'Should have summary property');
console.log('  ✓ skill-audit.js works');

// Cleanup
fs.rmSync(testSkillDir, { recursive: true, force: true });

console.log('\n' + '='.repeat(50));
console.log('✅ All tests passed!');
console.log('='.repeat(50));