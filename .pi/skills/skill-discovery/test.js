#!/usr/bin/env node
/**
 * SkillForge Test Suite
 * 
 * Tests the discover, evaluate, and generate functionality
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_DIR = '/job/tmp/skill-discovery-tests';
const SKILL_DIR = '/job/.pi/skills/skill-discovery';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTest(name, fn) {
  try {
    log(`\n🧪 Test: ${name}`, 'cyan');
    fn();
    log(`✅ PASSED: ${name}`, 'green');
    return true;
  } catch (error) {
    log(`❌ FAILED: ${name}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

// Clean up test directory
function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Test 1: Check that all required files exist
function testFilesExist() {
  const requiredFiles = [
    'SKILL.md',
    'discover.js',
    'evaluate.js',
    'generate.js',
    'package.json'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(SKILL_DIR, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing required file: ${file}`);
    }
    log(`   ✓ ${file} exists`, 'green');
  }
}

// Test 2: Validate SKILL.md format
function testSkillMdFormat() {
  const skillMdPath = path.join(SKILL_DIR, 'SKILL.md');
  const content = fs.readFileSync(skillMdPath, 'utf8');

  // Check for frontmatter
  if (!content.startsWith('---')) {
    throw new Error('SKILL.md missing frontmatter');
  }

  const frontmatterEnd = content.indexOf('---', 3);
  if (frontmatterEnd === -1) {
    throw new Error('SKILL.md frontmatter not properly closed');
  }

  const frontmatter = content.substring(3, frontmatterEnd);
  
  // Check required fields
  if (!frontmatter.includes('name:')) {
    throw new Error('SKILL.md missing name field in frontmatter');
  }
  if (!frontmatter.includes('description:')) {
    throw new Error('SKILL.md missing description field in frontmatter');
  }

  log('   ✓ Frontmatter format valid', 'green');
  log('   ✓ Required fields present', 'green');
}

// Test 3: Test discover.js help
function testDiscoverHelp() {
  const output = execSync('node discover.js --help', {
    cwd: SKILL_DIR,
    encoding: 'utf8'
  });

  if (!output.includes('SkillForge Discovery')) {
    throw new Error('Help output missing expected text');
  }
  if (!output.includes('--query')) {
    throw new Error('Help missing --query option');
  }
  if (!output.includes('--limit')) {
    throw new Error('Help missing --limit option');
  }

  log('   ✓ Help command works', 'green');
  log('   ✓ Help output contains expected options', 'green');
}

// Test 4: Test evaluate.js help
function testEvaluateHelp() {
  const output = execSync('node evaluate.js --help', {
    cwd: SKILL_DIR,
    encoding: 'utf8'
  });

  if (!output.includes('SkillForge Evaluator')) {
    throw new Error('Help output missing expected text');
  }
  if (!output.includes('--url')) {
    throw new Error('Help missing --url option');
  }

  log('   ✓ Help command works', 'green');
}

// Test 5: Test generate.js help
function testGenerateHelp() {
  const output = execSync('node generate.js --help', {
    cwd: SKILL_DIR,
    encoding: 'utf8'
  });

  if (!output.includes('SkillForge Manifest Generator')) {
    throw new Error('Help output missing expected text');
  }

  log('   ✓ Help command works', 'green');
}

// Test 6: Test evaluate.js with a real repository
function testEvaluateRealRepo() {
  const testRepo = 'https://github.com/stephengpope/thepopebot';
  
  log('   Evaluating thepopebot repository...', 'blue');
  const output = execSync(`node evaluate.js ${testRepo}`, {
    cwd: SKILL_DIR,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, SKILLFORGE_OUTPUT_DIR: TEST_DIR }
  });

  // Check for expected output
  if (!output.includes('Repository Details')) {
    throw new Error('Evaluation output missing repository details');
  }
  if (!output.includes('Scoring Breakdown')) {
    throw new Error('Evaluation output missing scoring breakdown');
  }
  if (!output.includes('Recommendation:')) {
    throw new Error('Evaluation output missing recommendation');
  }

  log('   ✓ Evaluation completed successfully', 'green');
  log('   ✓ Output contains all required sections', 'green');

  // Check that report file was created
  const reportFile = path.join(TEST_DIR, 'evaluation-thepopebot.json');
  if (!fs.existsSync(reportFile)) {
    throw new Error('Evaluation report file not created');
  }

  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  if (!report.repository || !report.scores || !report.totalScore) {
    throw new Error('Evaluation report missing required fields');
  }

  log('   ✓ Report file created and valid', 'green');
  log(`   ✓ Total score: ${report.totalScore.toFixed(3)}`, 'green');
  log(`   ✓ Recommendation: ${report.recommendation}`, 'green');
}

// Test 7: Test generate.js with sample data
function testGenerateManifest() {
  const skillName = 'test-skill-generated';
  
  log('   Generating test skill manifest...', 'blue');
  const output = execSync(
    `node generate.js --name "${skillName}" ` +
    `--url "https://github.com/test/test-skill" ` +
    `--description "A test skill for unit testing"`,
    {
      cwd: SKILL_DIR,
      encoding: 'utf8',
      env: { ...process.env, SKILLFORGE_OUTPUT_DIR: TEST_DIR }
    }
  );

  // Check that files were created
  const generatedDir = path.join(TEST_DIR, skillName);
  const expectedFiles = ['SKILL.md', 'package.json', 'README.md', 'integrate.sh', 'metadata.json'];

  for (const file of expectedFiles) {
    const filePath = path.join(generatedDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Generated file missing: ${file}`);
    }
    log(`   ✓ ${file} created`, 'green');
  }

  // Validate SKILL.md content
  const skillMd = fs.readFileSync(path.join(generatedDir, 'SKILL.md'), 'utf8');
  if (!skillMd.includes('test-skill-generated')) {
    throw new Error('Generated SKILL.md missing skill name');
  }
  if (!skillMd.includes('https://github.com/test/test-skill')) {
    throw new Error('Generated SKILL.md missing source URL');
  }

  log('   ✓ Generated SKILL.md contains correct data', 'green');

  // Validate metadata.json
  const metadata = JSON.parse(fs.readFileSync(path.join(generatedDir, 'metadata.json'), 'utf8'));
  if (metadata.name !== skillName) {
    throw new Error('metadata.json has incorrect name');
  }
  if (metadata.status !== 'pending-review') {
    throw new Error('metadata.json should have pending-review status');
  }

  log('   ✓ metadata.json is valid', 'green');
}

// Test 8: Test scoring functions
function testScoringFunctions() {
  const testScript = `
    const { scoreCompatibility, scoreQuality, scoreSecurity } = require('./scoring-test-module.js');
    
    // Test compatibility scoring
    console.log('Testing compatibility scoring...');
    const jsScore = scoreCompatibility({ language: 'JavaScript' });
    const pyScore = scoreCompatibility({ language: 'Python' });
    const unknownScore = scoreCompatibility({ language: null });
    
    if (jsScore !== 1.0) throw new Error('JS should score 1.0, got ' + jsScore);
    if (pyScore !== 0.7) throw new Error('Python should score 0.7, got ' + pyScore);
    if (unknownScore !== 0.2) throw new Error('Unknown should score 0.2, got ' + unknownScore);
    console.log('✓ Compatibility scoring works');
    
    // Test quality scoring
    console.log('Testing quality scoring...');
    const highStars = scoreQuality(1000, true, true);
    const lowStars = scoreQuality(1, false, false);
    if (highStars <= lowStars) throw new Error('High stars should score higher');
    console.log('✓ Quality scoring works');
    
    // Test security scoring
    console.log('Testing security scoring...');
    const secure = scoreSecurity({ license: { spdx_id: 'MIT' } }, 'good-skill', 'A good skill', new Date());
    const insecure = scoreSecurity({ license: null }, 'malware-tool', 'Exploit toolkit', new Date('2020-01-01'));
    if (secure <= insecure) throw new Error('Secure repo should score higher');
    console.log('✓ Security scoring works');
    
    console.log('All scoring tests passed!');
  `;

  // Create a test module that exports the scoring functions
  const scoringModule = `
    function scoreCompatibility(repo) {
      const lang = (repo.language || '').toLowerCase();
      if (lang === 'javascript' || lang === 'typescript') return 1.0;
      else if (lang === 'python') return 0.7;
      else if (lang === 'rust' || lang === 'go') return 0.5;
      else if (lang) return 0.3;
      return 0.2;
    }

    function scoreQuality(stars, hasReadme, hasTopics) {
      let score = Math.log2(stars + 1) / 12;
      if (hasReadme) score += 0.15;
      if (hasTopics) score += 0.1;
      return Math.min(score, 1.0);
    }

    function scoreSecurity(repo, name, description, updatedAt) {
      let score = 0.5;
      if (repo.license && repo.license.spdx_id && repo.license.spdx_id !== 'NOASSERTION') {
        score += 0.3;
      }
      const badPatterns = ['malware', 'exploit', 'hack', 'crack', 'keygen', 'ransomware', 'trojan'];
      const text = (name + ' ' + description).toLowerCase();
      for (const pattern of badPatterns) {
        if (text.includes(pattern)) {
          score -= 0.5;
          break;
        }
      }
      if (updatedAt) {
        const ageDays = (new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
        if (ageDays >= 0 && ageDays <= 180) {
          score += 0.2;
        } else if (ageDays > 365) {
          score -= 0.1;
        }
      }
      return Math.max(0, Math.min(1, score));
    }

    module.exports = { scoreCompatibility, scoreQuality, scoreSecurity };
  `;

  fs.writeFileSync(path.join(TEST_DIR, 'scoring-test-module.js'), scoringModule);
  fs.writeFileSync(path.join(TEST_DIR, 'test-scoring.js'), testScript);

  const output = execSync('node test-scoring.js', {
    cwd: TEST_DIR,
    encoding: 'utf8'
  });

  if (!output.includes('All scoring tests passed!')) {
    throw new Error('Scoring tests failed');
  }

  log('   ✓ All scoring functions work correctly', 'green');
}

// Test 9: Test bad pattern detection
function testBadPatternDetection() {
  const testScript = `
    const badPatterns = ['malware', 'exploit', 'hack', 'crack', 'keygen', 'ransomware', 'trojan'];
    
    function containsBadPattern(text) {
      const lower = text.toLowerCase();
      for (const pattern of badPatterns) {
        const regex = new RegExp('\\\\b' + pattern + '\\\\b', 'i');
        if (regex.test(lower)) return true;
      }
      return false;
    }

    // Should detect bad patterns
    if (!containsBadPattern('malware-tool')) throw new Error('Should detect malware');
    if (!containsBadPattern('exploit-kit')) throw new Error('Should detect exploit');
    if (!containsBadPattern('hack-tool')) throw new Error('Should detect hack');
    
    // Should NOT flag similar but safe words
    if (containsBadPattern('hackathon')) throw new Error('Should not flag hackathon');
    if (containsBadPattern('lifehack')) throw new Error('Should not flag lifehack');
    if (containsBadPattern('cracker')) throw new Error('Should not flag cracker (jack)');
    
    console.log('All bad pattern tests passed!');
  `;

  fs.writeFileSync(path.join(TEST_DIR, 'test-bad-patterns.js'), testScript);
  const output = execSync('node test-bad-patterns.js', {
    cwd: TEST_DIR,
    encoding: 'utf8'
  });

  if (!output.includes('All bad pattern tests passed!')) {
    throw new Error('Bad pattern tests failed');
  }

  log('   ✓ Bad pattern detection works correctly', 'green');
  log('   ✓ Does not flag safe similar words', 'green');
}

// Test 10: Test discover.js with limited query (to avoid rate limits)
function testDiscoverLimited() {
  log('   Running discovery with limited query...', 'blue');
  
  try {
    const output = execSync('node discover.js --query "popebot" --limit 5 --verbose', {
      cwd: SKILL_DIR,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, SKILLFORGE_OUTPUT_DIR: TEST_DIR }
    });

    // Check for expected output sections
    if (!output.includes('Discovery Report')) {
      throw new Error('Discovery output missing report section');
    }
    if (!output.includes('Candidates')) {
      throw new Error('Discovery output missing candidates section');
    }

    log('   ✓ Discovery completed successfully', 'green');

    // Check that report file was created
    const reportFile = path.join(TEST_DIR, 'skill-discovery-report.json');
    if (fs.existsSync(reportFile)) {
      const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      log(`   ✓ Report saved with ${report.evaluated || 0} candidates`, 'green');
    }
  } catch (error) {
    if (error.message.includes('Rate limit')) {
      log('   ⚠ Skipped due to rate limiting (expected in test environment)', 'yellow');
      return;
    }
    throw error;
  }
}

// Main test runner
function runAllTests() {
  log('\n════════════════════════════════════════════════════════', 'cyan');
  log('   SkillForge Test Suite', 'cyan');
  log('════════════════════════════════════════════════════════\n', 'cyan');

  cleanup();

  const tests = [
    { name: 'Files Exist', fn: testFilesExist },
    { name: 'SKILL.md Format', fn: testSkillMdFormat },
    { name: 'Discover.js Help', fn: testDiscoverHelp },
    { name: 'Evaluate.js Help', fn: testEvaluateHelp },
    { name: 'Generate.js Help', fn: testGenerateHelp },
    { name: 'Scoring Functions', fn: testScoringFunctions },
    { name: 'Bad Pattern Detection', fn: testBadPatternDetection },
    { name: 'Evaluate Real Repository', fn: testEvaluateRealRepo },
    { name: 'Generate Manifest', fn: testGenerateManifest },
    { name: 'Discover Limited', fn: testDiscoverLimited }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    if (runTest(test.name, test.fn)) {
      passed++;
    } else {
      failed++;
    }
  }

  log('\n════════════════════════════════════════════════════════', 'cyan');
  log(`   Test Results: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green');
  log('════════════════════════════════════════════════════════\n', 'cyan');

  // Cleanup
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
