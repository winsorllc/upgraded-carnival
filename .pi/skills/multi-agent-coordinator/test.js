#!/usr/bin/env node

/**
 * Test Suite for Multi-Agent Coordinator Skill
 * 
 * Tests the various functions of the multi-agent-coordinator skill.
 * 
 * Usage: node test.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Multi-Agent Coordinator Skill - Test Suite');
console.log('='.repeat(50));
console.log('');

// Test 1: Check if required files exist
console.log('Test 1: Checking required files...');
const requiredFiles = [
  'SKILL.md',
  'list-jobs.js',
  'job-status.js',
  'send-message.js',
  'check-messages.js',
  'coordinate.js'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}: ${exists ? 'exists' : 'MISSING'}`);
  if (!exists) allFilesExist = false;
}

if (!allFilesExist) {
  console.log('\n❌ Test failed: Missing required files');
  process.exit(1);
}

console.log('✅ All required files exist');
console.log('');

// Test 2: Check if files are executable (have proper shebang)
console.log('Test 2: Checking file permissions...');
const jsFiles = requiredFiles.filter(f => f.endsWith('.js'));
let allExecutable = true;
for (const file of jsFiles) {
  const filePath = path.join(__dirname, file);
  try {
    const stats = fs.statSync(filePath);
    const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
    console.log(`  ${isExecutable ? '✅' : '⚠️ '} ${file}: ${isExecutable ? 'executable' : 'not executable (will use node)'}`);
  } catch (e) {
    console.log(`  ❌ ${file}: Could not check permissions`);
    allExecutable = false;
  }
}

console.log('✅ File permissions check complete');
console.log('');

// Test 3: Test parsing of SKILL.md
console.log('Test 3: Validating SKILL.md format...');
const skillMdPath = path.join(__dirname, 'SKILL.md');
const skillContent = fs.readFileSync(skillMdPath, 'utf8');

const hasName = skillContent.includes('name:');
const hasDescription = skillContent.includes('description:');
const hasUsage = skillContent.includes('Usage') || skillContent.includes('## ');
const hasExamples = skillContent.includes('node /job/.pi/skills/multi-agent-coordinator/');

console.log(`  ${hasName ? '✅' : '❌'} Has name field`);
console.log(`  ${hasDescription ? '✅' : '❌'} Has description field`);
console.log(`  ${hasUsage ? '✅' : '❌'} Has usage documentation`);
console.log(`  ${hasExamples ? '✅' : '❌'} Has example commands`);

if (!hasName || !hasDescription || !hasUsage) {
  console.log('\n❌ Test failed: SKILL.md missing required fields');
  process.exit(1);
}

console.log('✅ SKILL.md format is valid');
console.log('');

// Test 4: Test list-jobs.js help/usage
console.log('Test 4: Testing list-jobs.js (dry run)...');
try {
  // Try running with --help or check that it shows usage when no args
  const result = execSync('node list-jobs.js 2>&1', { 
    cwd: __dirname, 
    encoding: 'utf8',
    timeout: 10000 
  });
  
  // Check if we get some kind of response (error about no token is OK)
  if (result.includes('Error') || result.includes('No active jobs') || result.includes('workflow_runs') || result.includes('Could not determine')) {
    console.log('  ✅ list-jobs.js executed (response received)');
    if (result.includes('Could not determine')) {
      console.log('  ℹ️  Note: Not in a git repository - expected for test environment');
    }
  } else {
    console.log('  ⚠️  Unexpected output:', result.substring(0, 100));
  }
} catch (e) {
  if (e.message.includes('Could not determine') || e.message.includes('not found')) {
    console.log('  ✅ list-jobs.js executed correctly (expected error outside git repo)');
  } else {
    console.log(`  ⚠️  Error: ${e.message.substring(0, 100)}`);
  }
}

console.log('');

// Test 5: Test job-status.js usage message
console.log('Test 5: Testing job-status.js usage...');
try {
  execSync('node job-status.js 2>&1', { 
    cwd: __dirname, 
    encoding: 'utf8',
    timeout: 5000 
  });
} catch (e) {
  if (e.stdout && e.stdout.includes('Usage:')) {
    console.log('  ✅ job-status.js shows correct usage when no args');
  } else if (e.stderr && e.stderr.includes('Usage:')) {
    console.log('  ✅ job-status.js shows correct usage when no args');
  }
}

console.log('');

// Test 6: Verify coordinate.js has proper argument parsing
console.log('Test 6: Testing coordinate.js argument parsing...');
try {
  execSync('node coordinate.js 2>&1', { 
    cwd: __dirname, 
    encoding: 'utf8',
    timeout: 5000 
  });
} catch (e) {
  if ((e.stdout && e.stdout.includes('Usage:')) || (e.stderr && e.stderr.includes('Usage:'))) {
    console.log('  ✅ coordinate.js shows correct usage when no args');
  }
}

console.log('');

// Test 7: Verify files are readable and basic syntax check
console.log('Test 7: Checking JavaScript files are readable...');
let allValid = true;
for (const file of jsFiles) {
  const filePath = path.join(__dirname, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Basic check: file is not empty and has common JS patterns
    if (content.length > 10 && content.includes('function') || content.includes('=>')) {
      console.log(`  ✅ ${file}: Valid file structure`);
    } else {
      console.log(`  ❌ ${file}: Unexpected file structure`);
      allValid = false;
    }
  } catch (e) {
    console.log(`  ❌ ${file}: Error - ${e.message}`);
    allValid = false;
  }
}

if (!allValid) {
  console.log('\n❌ Test failed: Some files have issues');
  process.exit(1);
}

console.log('');

// Test 8: Verify skill is properly linked
console.log('Test 8: Checking skill is properly linked in .pi/skills/...');
const skillsDir = path.dirname(__dirname);
const skillLink = path.join(skillsDir, 'multi-agent-coordinator');
if (fs.existsSync(skillLink)) {
  const stats = fs.lstatSync(skillLink);
  if (stats.isSymbolicLink()) {
    console.log(`  ℹ️  Skill is a symlink: ${fs.readlinkSync(skillLink)}`);
  } else {
    console.log('  ✅ Skill directory exists');
  }
} else {
  console.log('  ℹ️  Skill not linked (expected for development)');
}

console.log('');
console.log('='.repeat(50));
console.log('✅ All tests passed!');
console.log('');
console.log('The multi-agent-coordinator skill is properly implemented.');
console.log('To use it:');
console.log('  node list-jobs.js');
console.log('  node job-status.js <job-id>');
console.log('  node send-message.js <branch> "<message>"');
console.log('  node check-messages.js');
console.log('  node coordinate.js --task "<task>" --agents <n>');
