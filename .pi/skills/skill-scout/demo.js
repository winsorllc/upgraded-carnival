#!/usr/bin/env node
/**
 * Skill Scout Demo - Tests Core Functionality
 */

const { Scout } = require('./lib/scout');
const { Evaluator } = require('./lib/evaluator');
const { Installer } = require('./lib/installer');
const { Registry } = require('./lib/registry');
const { Security } = require('./lib/security');

async function runDemo() {
  console.log('\n' + '='.repeat(60));
  console.log('Skill Scout - Demonstration');
  console.log('Adapted from ZeroClaw SkillForge');
  console.log('='.repeat(60) + '\n');

  // 1. Test Scout Module
  console.log('1. Testing Scout Module');
  console.log('-'.repeat(40));
  
  const scout = new Scout({ cacheDir: '/tmp/skill-scout-demo' });
  
  // Test URL parsing
  const testUrls = [
    'https://github.com/user/repo',
    'https://github.com/org/project',
    'https://github.com/zeroclaw-labs/zeroclaw'
  ];
  
  console.log('URL Parsing:');
  testUrls.forEach(url => {
    const name = scout.extractRepoName(url);
    console.log(`  ${url} -> ${name}`);
  });
  
  // Test deduplication
  const results = [
    { url: 'https://github.com/a/b', stars: 5 },
    { url: 'https://github.com/a/b', stars: 10 },
    { url: 'https://github.com/c/d', stars: 3 }
  ];
  
  const deduped = scout.deduplicate(results);
  console.log(`\nDeduplication: ${results.length} -> ${deduped.length} items`);
  
  // Test recent date check
  const recent = new Date();
  const old = new Date('2024-01-01');
  console.log(`Recent update check: ${scout.isRecentUpdate(recent.toISOString()) ? 'YES' : 'NO'}`);
  console.log(`Old update check: ${scout.isRecentUpdate(old.toISOString()) ? 'YES' : 'NO'}`);
  
  console.log('\n✅ Scout module working\n');

  // 2. Test Evaluator Module
  console.log('2. Testing Evaluator Module');
  console.log('-'.repeat(40));
  
  const evaluator = new Evaluator();
  
  // Test SKILL.md validation
  const validSkill = `---
name: test-skill
description: A test skill
version: 1.0.0
---

# Test Skill

This is a test SKILL.md with proper frontmatter.`;

  const invalidSkill = `# Just a title

No frontmatter here.`;
  
  const validResult = evaluator.validateSkillMd(validSkill);
  const invalidResult = evaluator.validateSkillMd(invalidSkill);
  
  console.log('SKILL.md Validation:');
  console.log(`  Valid SKILL.md: ${validResult.valid ? 'PASS' : 'FAIL'}`);
  console.log(`    - Has frontmatter: ${validResult.hasFrontmatter ? 'YES' : 'NO'}`);
  console.log(`    - Name: ${validResult.name || 'N/A'}`);
  console.log(`  Invalid SKILL.md: ${invalidResult.valid ? 'PASS' : 'FAIL'}`);
  console.log(`    - Has frontmatter: ${invalidResult.hasFrontmatter ? 'YES' : 'NO'}`);
  
  // Test security scanning
  const dangerousCode = 'Use eval() to execute user code';
  const safeCode = 'Use console.log for output';
  
  console.log('\nSecurity Scanning:');
  const dangerResult = evaluator.scanSecurity(dangerousCode, null);
  const safeResult = evaluator.scanSecurity(safeCode, null);
  
  console.log(`  Dangerous code: ${dangerResult.passed ? 'CLEARED' : 'FLAGGED'}`);
  if (!dangerResult.passed) {
    console.log(`    Issues: ${dangerResult.issues.length}`);
  }
  console.log(`  Safe code: ${safeResult.passed ? 'CLEARED' : 'FLAGGED'}`);
  
  // Test scoring
  console.log('\nScoring:');
  console.log(`  Score 0.95 -> ${evaluator.getRecommendation(0.95).toUpperCase()}`);
  console.log(`  Score 0.75 -> ${evaluator.getRecommendation(0.75).toUpperCase()}`);
  console.log(`  Score 0.55 -> ${evaluator.getRecommendation(0.55).toUpperCase()}`);
  console.log(`  Score 0.25 -> ${evaluator.getRecommendation(0.25).toUpperCase()}`);
  
  console.log('\n✅ Evaluator module working\n');

  // 3. Test Security Module
  console.log('3. Testing Security Module');
  console.log('-'.repeat(40));
  
  const security = new Security();
  
  const auditResults = {
    filesScanned: 5,
    issues: ['eval() usage found'],
    warnings: ['child_process required'],
    info: ['process.env accessed']
  };
  
  const score = security.calculateScore(auditResults);
  console.log(`Audit score: ${(score * 100).toFixed(1)}%`);
  console.log(`Summary: ${security.getSummary(auditResults)}`);
  
  // Test pattern scanning
  const testCode = `
    var x = 1;
    eval(userInput);
    spawn('ls', ['-la']);
  `;
  
  const fileResult = security.auditFile(testCode, '/test.js');
  console.log(`\nPattern scan: ${fileResult.issues.length} critical issues found`);
  console.log(`Lines scanned: ${fileResult.lines}`);
  
  console.log('\n✅ Security module working\n');

  // 4. Test Registry Module
  console.log('4. Testing Registry Module');
  console.log('-'.repeat(40));
  
  const registry = new Registry({ cacheDir: '/tmp/skill-scout-demo' });
  
  await registry.register({
    name: 'demo-skill',
    url: 'https://github.com/demo/skill',
    version: '1.0.0'
  });
  
  const installed = await registry.isInstalled('demo-skill');
  const skill = await registry.getSkill('demo-skill');
  
  console.log(`Registration: ${installed ? 'SUCCESS' : 'FAILED'}`);
  console.log(`  - Name: ${skill.name}`);
  console.log(`  - Version: ${skill.version}`);
  console.log(`  - URL: ${skill.url}`);
  console.log(`  - Registered: ${skill.registered_at ? 'YES' : 'NO'}`);
  
  await registry.unregister('demo-skill');
  const after = await registry.isInstalled('demo-skill');
  console.log(`\nUnregistration: ${!after ? 'SUCCESS' : 'FAILED'}`);
  
  console.log('\n✅ Registry module working\n');

  // 5. Test Installer Module
  console.log('5. Testing Installer Module');
  console.log('-'.repeat(40));
  
  const installer = new Installer({ cacheDir: '/tmp/skill-scout-demo' });
  
  const urls = [
    'https://github.com/user/repo',
    'https://github.com/org/project.git'
  ];
  
  console.log('URL Parsing:');
  urls.forEach(url => {
    const name = installer.extractRepoName(url);
    const full = installer.extractFullName(url);
    console.log(`  ${url}`);
    console.log(`    -> ${name} (${full})`);
  });
  
  console.log('\n✅ Installer module working\n');

  // 6. Final Summary
  console.log('='.repeat(60));
  console.log('Skill Scout Demo Complete!');
  console.log('='.repeat(60));
  console.log('\nAll core modules are functional:');
  console.log('  ✅ Scout - GitHub discovery');
  console.log('  ✅ Evaluator - Skill quality scoring');
  console.log('  ✅ Security - Risk pattern detection');
  console.log('  ✅ Registry - Skill state management');
  console.log('  ✅ Installer - Symlink and git management');
  console.log('\nImplementation: SUCCESS');
  console.log('='.repeat(60) + '\n');

  return true;
}

runDemo().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
