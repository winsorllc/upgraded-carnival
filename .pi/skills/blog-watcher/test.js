#!/usr/bin/env node
/**
 * Test script for blog-watcher skill
 * Verifies skill structure and functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILL_DIR = path.join(__dirname);
const SKILL_FILE = path.join(SKILL_DIR, 'SKILL.md');

console.log('🧪 Testing blog-watcher skill...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Test 1: SKILL.md exists
test('SKILL.md exists', () => {
  assert(fs.existsSync(SKILL_FILE), 'SKILL.md not found');
});

// Test 2: SKILL.md has valid YAML frontmatter
test('SKILL.md has valid frontmatter', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  assert(frontmatterMatch, 'No YAML frontmatter found');
  
  const frontmatter = frontmatterMatch[1];
  assert(frontmatter.includes('name:'), 'Missing name field');
  assert(frontmatter.includes('description:'), 'Missing description field');
});

// Test 3: Frontmatter has correct skill name
test('Skill name is blog-watcher', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = frontmatterMatch[1];
  assert(frontmatter.includes('name: blog-watcher'), 'Incorrect skill name');
});

// Test 4: Description mentions RSS/Atom/feeds
test('Description mentions RSS/feeds', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = frontmatterMatch[1];
  const hasFeedKeyword = frontmatter.toLowerCase().includes('rss') || 
                         frontmatter.toLowerCase().includes('feed') ||
                         frontmatter.toLowerCase().includes('blog');
  assert(hasFeedKeyword, 'Description should mention RSS, feeds, or blogs');
});

// Test 5: SKILL.md has body content
test('SKILL.md has body content', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  const body = content.replace(/^---[\s\S]*?---/, '').trim();
  assert(body.length > 100, 'Body content is too short');
});

// Test 6: Body contains installation instructions
test('Body contains installation instructions', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  const hasInstall = content.toLowerCase().includes('install');
  assert(hasInstall, 'Missing installation instructions');
});

// Test 7: Body contains common commands
test('Body contains common commands', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  const hasAdd = content.includes('blogwatcher add');
  const hasScan = content.includes('blogwatcher scan');
  const hasArticles = content.includes('blogwatcher articles');
  assert(hasAdd && hasScan && hasArticles, 'Missing common commands (add, scan, articles)');
});

// Test 8: Check if blogwatcher is available (optional)
test('blogwatcher CLI availability (optional)', () => {
  try {
    execSync('blogwatcher --version', { stdio: 'pipe' });
    console.log('   (blogwatcher is installed)');
  } catch (e) {
    console.log('   (blogwatcher not installed - can be installed with: go install github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest)');
  }
  // This test always passes - it's just informational
});

// Test 9: Verify skill structure follows PopeBot conventions
test('Follows skill naming conventions', () => {
  const dirName = path.basename(SKILL_DIR);
  assert(dirName === 'blog-watcher', 'Directory should be kebab-case');
  assert(!dirName.includes(' '), 'Directory should not contain spaces');
});

// Test 10: Check skill is not too large
test('SKILL.md is not excessively large', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  const lines = content.split('\n').length;
  assert(lines < 300, `Skill file has ${lines} lines - consider reducing if > 200 lines`);
});

console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
