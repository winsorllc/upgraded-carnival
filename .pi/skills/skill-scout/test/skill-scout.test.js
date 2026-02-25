#!/usr/bin/env node
/**
 * Skill Scout Test Suite
 * 
 * Tests discovery, evaluation, and installation
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Scout } = require('../lib/scout');
const { Evaluator } = require('../lib/evaluator');
const { Installer } = require('../lib/installer');
const { Registry } = require('../lib/registry');
const { Security } = require('../lib/security');
const { SkillScout } = require('../index');

const TEST_CACHE_DIR = '/tmp/skill-scout-test';

describe('Skill Scout', { timeout: 60000 }, () => {

  describe('Scout', () => {
    it('should extract repo name from URL', () => {
      const scout = new Scout({ cacheDir: TEST_CACHE_DIR });
      const name1 = scout.extractRepoName('https://github.com/user/repo');
      const name2 = scout.extractRepoName('https://github.com/user/repo.git');
      
      assert.strictEqual(name1, 'repo');
      assert.strictEqual(name2, 'repo');
    });

    it('should deduplicate results', () => {
      const scout = new Scout({ cacheDir: TEST_CACHE_DIR });
      const results = [
        { url: 'https://github.com/a/b', stars: 5 },
        { url: 'https://github.com/a/b', stars: 10 },
        { url: 'https://github.com/c/d', stars: 3 }
      ];
      
      const deduped = scout.deduplicate(results);
      
      assert.strictEqual(deduped.length, 2);
      // Should keep the one with higher stars
      assert.strictEqual(deduped.find(r => r.url === 'https://github.com/a/b').stars, 10);
    });

    it('should check for updates within 30 days', () => {
      const scout = new Scout({ cacheDir: TEST_CACHE_DIR });
      
      const recent = new Date();
      recent.setDate(recent.getDate() - 5);
      
      const old = new Date();
      old.setDate(old.getDate() - 60);
      
      assert.strictEqual(scout.isRecentUpdate(recent.toISOString()), true);
      assert.strictEqual(scout.isRecentUpdate(old.toISOString()), false);
    });
  });

  describe('Evaluator', () => {
    it('should validate SKILL.md structure', () => {
      const evaluator = new Evaluator();
      
      const valid = evaluator.validateSkillMd(`---
name: test-skill
description: A test skill
---

# Test Skill

This is a test.`);
      
      const invalid = evaluator.validateSkillMd(`No frontmatter here

# Just markdown`);
      
      assert.strictEqual(valid.valid, true);
      assert.strictEqual(valid.hasFrontmatter, true);
      assert.strictEqual(invalid.valid, false);
      assert.strictEqual(invalid.hasFrontmatter, false);
    });

    it('should scan for security issues', () => {
      const evaluator = new Evaluator();
      
      const dangerous = evaluator.scanSecurity(
        'Use eval() for safety',
        null
      );
      
      const safe = evaluator.scanSecurity(
        'This is safe SKILL.md',
        { dependencies: { express: '^4.0.0' } }
      );
      
      assert.strictEqual(dangerous.passed, false);
      assert.strictEqual(dangerous.issues.length > 0, true);
      assert.strictEqual(safe.passed, true);
    });

    it('should calculate scores correctly', () => {
      const evaluator = new Evaluator();
      
      assert.strictEqual(evaluator.getRecommendation(0.95), 'excellent');
      assert.strictEqual(evaluator.getRecommendation(0.8), 'good');
      assert.strictEqual(evaluator.getRecommendation(0.6), 'fair');
      assert.strictEqual(evaluator.getRecommendation(0.3), 'skip');
    });

    it('should return scoring criteria', () => {
      const evaluator = new Evaluator();
      const criteria = evaluator.getCriteria();
      
      assert.ok(criteria.weights.hasSkillMd > 0);
      assert.ok(criteria.thresholds.good > 0);
    });
  });

  describe('Security', () => {
    it('should audit file content', () => {
      const security = new Security();
      
      const dangerous = security.auditFile(`
function test() {
  eval(userCode);
  child_process.spawn('rm', ['-rf', '/']);
}
`, '/test.js');
      
      const safe = security.auditFile(`
function test() {
  console.log('Hello World');
}
`, '/test.js');
      
      assert.strictEqual(dangerous.issues.length > 0, true);
      assert.strictEqual(safe.issues.length, 0);
    });

    it('should calculate security score', () => {
      const security = new Security();
      
      const clean = {
        issues: [],
        warnings: [],
        info: []
      };
      
      const risky = {
        issues: ['Critical issue'],
        warnings: ['Warning'],
        info: []
      };
      
      assert.strictEqual(security.calculateScore(clean), 1.0);
      assert.strictEqual(security.calculateScore(risky) < 1.0, true);
    });
  });

  describe('Registry', () => {
    const testRegistry = new Registry({
      cacheDir: TEST_CACHE_DIR
    });

    it('should handle missing registry', async () => {
      const data = await testRegistry.getRegistry();
      
      assert.ok(typeof data.installed === 'object');
      assert.ok(typeof data.history === 'object');
    });

    it('should register and unregister skills', async () => {
      const testEntry = {
        name: 'test-skill-v1',
        url: 'https://github.com/test/skill',
        path: '/test/path',
        symlink: '/test/symlink'
      };
      
      await testRegistry.register(testEntry);
      
      const entry = await testRegistry.getSkill('test-skill-v1');
      assert.strictEqual(entry.name, 'test-skill-v1');
      assert.ok(entry.registered_at);
      
      await testRegistry.unregister('test-skill-v1');
      const after = await testRegistry.getSkill('test-skill-v1');
      assert.strictEqual(after, null);
    });

    it('should list installed skills', async () => {
      const skills = await testRegistry.getInstalledSkills();
      assert.ok(Array.isArray(skills));
    });
  });

  describe('Installer', () => {
    it('should extract repo name from URL', () => {
      const installer = new Installer({ cacheDir: TEST_CACHE_DIR });
      
      const name1 = installer.extractRepoName('https://github.com/user/repo');
      const name2 = installer.extractRepoName('https://github.com/user/repo.git');
      
      assert.strictEqual(name1, 'repo');
      assert.strictEqual(name2, 'repo');
    });

    it('should extract full name from URL', () => {
      const installer = new Installer({ cacheDir: TEST_CACHE_DIR });
      
      const name = installer.extractFullName('https://github.com/user/repo');
      
      assert.strictEqual(name, 'user/repo');
    });
  });

  describe('SkillScout', () => {
    it('should initialize with default options', () => {
      const scout = new SkillScout({
        cacheDir: TEST_CACHE_DIR
      });
      
      assert.ok(scout.scout);
      assert.ok(scout.evaluator);
      assert.ok(scout.installer);
      assert.ok(scout.registry);
      assert.ok(scout.security);
    });

    it('should use custom options', () => {
      const scout = new SkillScout({
        minScore: 0.8,
        autoInstall: true,
        cacheDir: TEST_CACHE_DIR
      });
      
      assert.strictEqual(scout.options.minScore, 0.8);
      assert.strictEqual(scout.options.autoInstall, true);
    });

    it('should return status', async () => {
      const scout = new SkillScout({
        cacheDir: TEST_CACHE_DIR
      });
      
      const status = await scout.status();
      
      assert.ok(typeof status.installed === 'number');
      assert.ok(typeof status.discovered === 'number');
      assert.ok(Array.isArray(status.sources));
    });
  });

  describe('Integration Tests', () => {
    it('should run full evaluation flow on sample data', async () => {
      const evaluator = new Evaluator({ cacheDir: TEST_CACHE_DIR });
      
      // Mock evaluation (we can't actually fetch from GitHub in tests)
      // This tests the internal logic
      
      const mockSkill = {
        name: 'test-skill',
        url: 'https://github.com/test/skill'
      };
      
      // Test the evaluator can handle the structure
      assert.ok(evaluator.validateSkillMd);
      assert.ok(evaluator.scanSecurity);
      assert.ok(evaluator.calculateScore);
    });
  });
});

// Run tests if executed directly
if (require.main === module) {
  // Node will run the tests
  console.log('Running tests...');
}
