#!/usr/bin/env node
/**
 * Evaluator Module - Skill Scoring and Quality Assessment
 * 
 * Evaluates discovered skills for quality, security, and compatibility
 * Based on ZeroClaw's Evaluator
 * 
 * @module evaluator
 * @author PopeBot
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Scoring weights
const SCORING = {
  hasSkillMd: 2.0,
  hasPackageJson: 1.0,
  hasReadme: 0.5,
  hasTests: 1.0,
  securityPassed: 1.0,
  recentUpdate: 1.0,
  stars10Plus: 0.5,
  hasLicense: 0.5,
  compatibility: 1.0
};

class Evaluator {
  constructor(options = {}) {
    this.minScore = options.minScore || 0.7;
    this.maxScore = options.maxScore || 10;
    this.cacheDir = options.cacheDir || './.scout/cache';
  }

  /**
   * Evaluate one or more skills
   * @param {Object} params - Evaluation parameters
   * @returns {Promise<Array>} Evaluation results
   */
  async evaluate(params = {}) {
    const { urls, url, name } = params;
    
    const targets = [];
    
    if (url) {
      targets.push({ url, name: name || this.extractRepoName(url) });
    } else if (urls && Array.isArray(urls)) {
      targets.push(...urls.map(u => ({ url: u, name: this.extractRepoName(u) })));
    } else {
      throw new Error('No URLs to evaluate');
    }
    
    const results = [];
    
    for (const target of targets) {
      console.log(`🔬 Evaluating: ${target.name}`);
      
      const result = await this.evaluateSingle(target);
      results.push(result);
      
      // Log progress
      const scorePct = (result.score * 100).toFixed(0);
      console.log(`   Score: ${scorePct}% (${result.recommendation})\n`);
    }
    
    // Cache evaluations
    await this.cacheEvaluations(results);
    
    return results;
  }

  /**
   * Evaluate a single skill
   * @param {Object} target - Skill target
   * @returns {Promise<Object>} Evaluation result
   */
  async evaluateSingle(target) {
    const { url, name } = target;
    const fullName = this.extractFullName(url);
    
    if (!fullName) {
      return {
        name,
        url,
        score: 0,
        recommendation: 'skip',
        reasons: ['Could not parse repository URL'],
        details: {}
      };
    }
    
    try {
      // Fetch repository details
      const repoData = await this.fetchRepoData(fullName);
      
      // Fetch key files
      const skillMd = await this.fetchSkillMd(fullName);
      const packageJson = await this.fetchPackageJson(fullName);
      const readme = await this.fetchReadme(fullName);
      const testFiles = await this.fetchTestFiles(fullName);
      
      // Validate SKILL.md
      const skillValidation = this.validateSkillMd(skillMd);
      
      // Security scan
      const securityScan = this.scanSecurity(skillMd, packageJson);
      
      // Calculate scores
      const scores = {
        hasSkillMd: skillValidation.valid ? SCORING.hasSkillMd : 0,
        hasPackageJson: packageJson ? SCORING.hasPackageJson : 0,
        hasReadme: readme ? SCORING.hasReadme : 0,
        hasTests: testFiles.length > 0 ? SCORING.hasTests : 0,
        securityPassed: securityScan.passed ? SCORING.securityPassed : 0,
        recentUpdate: this.isRecentUpdate(repoData.updated_at) ? SCORING.recentUpdate : 0,
        stars10Plus: (repoData.stargazers_count || 0) >= 10 ? SCORING.stars10Plus : 0,
        hasLicense: repoData.license ? SCORING.hasLicense : 0,
        compatibility: this.checkCompatibility(skillValidation, packageJson)
      };
      
      // Calculate total score (normalized to 0-1)
      const maxPossible = Object.values(SCORING).reduce((a, b) => a + b, 0);
      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
      const normalizedScore = Math.min(totalScore / maxPossible, 1);
      
      // Determine recommendation
      const recommendation = this.getRecommendation(normalizedScore);
      
      return {
        name: skillValidation.name || name,
        url,
        score: normalizedScore,
        recommendation,
        reasons: this.generateReasons(scores, skillValidation, securityScan),
        details: {
          scores,
          github: repoData,
          skillMd: skillValidation,
          security: securityScan,
          fileStats: {
            hasSkillMd: !!skillMd,
            hasPackageJson: !!packageJson,
            hasReadme: !!readme,
            testFileCount: testFiles.length
          }
        }
      };
      
    } catch (err) {
      return {
        name,
        url,
        score: 0,
        recommendation: 'skip',
        reasons: [`Evaluation failed: ${err.message}`],
        details: {}
      };
    }
  }

  /**
   * Fetch GitHub repository data
   * @param {string} fullName - Owner/repo
   * @returns {Promise<Object>} Repo data
   */
  async fetchRepoData(fullName) {
    const url = `https://api.github.com/repos/${fullName}`;
    
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'PopeBot-SkillScout/1.0'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.message) reject(new Error(json.message));
            else resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Timeout')));
    });
  }

  /**
   * Fetch SKILL.md content
   * @param {string} fullName - Owner/repo
   * @returns {Promise<string|null>} SKILL.md content
   */
  async fetchSkillMd(fullName) {
    const paths = ['SKILL.md', '.pi/skills/SKILL.md', 'skills/SKILL.md'];
    
    for (const path of paths) {
      const content = await this.fetchFile(fullName, path);
      if (content) return content;
    }
    
    return null;
  }

  /**
   * Fetch package.json
   * @param {string} fullName - Owner/repo
   * @returns {Promise<Object|null>} Package data
   */
  async fetchPackageJson(fullName) {
    try {
      const content = await this.fetchFile(fullName, 'package.json');
      if (content) return JSON.parse(content);
    } catch {
      // Ignore parse errors
    }
    return null;
  }

  /**
   * Fetch README
   * @param {string} fullName - Owner/repo
   * @returns {Promise<string|null>} README content
   */
  async fetchReadme(fullName) {
    const files = ['README.md', 'readme.md', 'Readme.md'];
    
    for (const file of files) {
      const content = await this.fetchFile(fullName, file);
      if (content) return content;
    }
    
    return null;
  }

  /**
   * Fetch test files
   * @param {string} fullName - Owner/repo
   * @returns {Promise<Array>} Test files
   */
  async fetchTestFiles(fullName) {
    // Simplified - check for common test patterns
    const testPatterns = ['test', 'tests', '__tests__', '*.test.js', '*.spec.js'];
    const files = [];
    
    for (const pattern of testPatterns) {
      try {
        const exists = await this.checkPathExists(fullName, pattern);
        if (exists) files.push(pattern);
      } catch {}
    }
    
    return files;
  }

  /**
   * Fetch a file from GitHub
   * @param {string} fullName - Owner/repo
   * @param {string} filePath - File path
   * @returns {Promise<string|null>} File content
   */
  async fetchFile(fullName, filePath) {
    const url = `https://api.github.com/repos/${fullName}/contents/${filePath}`;
    
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'PopeBot-SkillScout/1.0'
        }
      }, (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.content) {
              // Base64 decode content
              const decoded = Buffer.from(json.content, 'base64').toString('utf-8');
              resolve(decoded);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      });
      
      req.on('error', () => resolve(null));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  /**
   * Check if a path exists
   * @param {string} fullName - Owner/repo
   * @param {string} path - Path to check
   * @returns {Promise<boolean>}
   */
  async checkPathExists(fullName, path) {
    try {
      const url = `https://api.github.com/repos/${fullName}/contents/${path}`;
      const res = await new Promise((resolve) => {
        const req = https.get(url, {
          headers: { 'User-Agent': 'PopeBot-SkillScout/1.0' }
        }, (res) => resolve(res.statusCode === 200));
        req.on('error', () => resolve(false));
        req.setTimeout(3000, () => { req.destroy(); resolve(false); });
      });
      return res;
    } catch {
      return false;
    }
  }

  /**
   * Validate SKILL.md structure
   * @param {string} content - SKILL.md content
   * @returns {Object} Validation result
   */
  validateSkillMd(content) {
    if (!content) {
      return { valid: false, errors: ['SKILL.md not found'] };
    }
    
    const errors = [];
    
    // Check frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      errors.push('No YAML frontmatter');
    } else {
      const frontmatter = frontmatterMatch[1];
      if (!frontmatter.includes('name:')) errors.push('Missing name in frontmatter');
      if (!frontmatter.includes('description:')) errors.push('Missing description in frontmatter');
    }
    
    // Check for key sections
    if (!content.includes('# ')) errors.push('No H1 heading');
    
    // Extract name
    const nameMatch = content.match(/name:\s*(.+)/);
    const name = nameMatch ? nameMatch[1].trim() : null;
    
    return {
      valid: errors.length === 0,
      name,
      errors,
      hasFrontmatter: !!frontmatterMatch
    };
  }

  /**
   * Scan for security issues
   * @param {string} skillMd - SKILL.md content
   * @param {Object} packageJson - Package data
   * @returns {Object} Security scan result
   */
  scanSecurity(skillMd, packageJson) {
    const issues = [];
    const dangerousPatterns = [
      /eval\s*\(/g,
      /exec\s*\(/g,
      /child_process/g,
      /spawn\s*\(/g,
      /rm\s+-rf\s+\//g,
      /curl\s*\|.*bash/g,
      /wget.*-O-\s*\|/g
    ];
    
    // Check SKILL.md for dangerous patterns
    if (skillMd) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(skillMd)) {
          issues.push(`Dangerous pattern: ${pattern}`);
        }
      }
    }
    
    // Check dependencies for known risky packages
    if (packageJson) {
      const deps = Object.keys(packageJson.dependencies || {});
      const riskyPackages = ['eval', 'child_process', 'vm2'];
      for (const pkg of riskyPackages) {
        if (deps.includes(pkg)) {
          issues.push(`Potentially risky dependency: ${pkg}`);
        }
      }
    }
    
    return {
      passed: issues.length === 0,
      issues,
      score: issues.length === 0 ? 1.0 : Math.max(0, 1 - issues.length * 0.2)
    };
  }

  /**
   * Check if update is recent (within 30 days)
   * @param {string} updatedAt - ISO date
   * @returns {boolean}
   */
  isRecentUpdate(updatedAt) {
    if (!updatedAt) return false;
    const updateDate = new Date(updatedAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return updateDate > thirtyDaysAgo;
  }

  /**
   * Check compatibility with PopeBot
   * @param {Object} skillValidation - Skill validation result
   * @param {Object} packageJson - Package data
   * @returns {number} Compatibility score
   */
  checkCompatibility(skillValidation, packageJson) {
    let score = 0;
    
    // Has proper SKILL.md
    if (skillValidation.valid) score += 0.5;
    
    // Has package.json with appropriate fields
    if (packageJson) {
      if (packageJson.description) score += 0.2;
      if (packageJson.keywords?.includes('pi') || packageJson.keywords?.includes('popebot')) {
        score += 0.3;
      }
    }
    
    return score;
  }

  /**
   * Get recommendation based on score
   * @param {number} score - Normalized score
   * @returns {string} Recommendation
   */
  getRecommendation(score) {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.7) return 'good';
    if (score >= 0.5) return 'fair';
    return 'skip';
  }

  /**
   * Generate human-readable reasons
   * @param {Object} scores - Scores object
   * @param {Object} skillValidation - Validation result
   * @param {Object} securityScan - Security result
   * @returns {Array} Reasons
   */
  generateReasons(scores, skillValidation, securityScan) {
    const reasons = [];
    
    if (scores.hasSkillMd > 0) reasons.push('Has proper SKILL.md');
    else reasons.push('Missing or invalid SKILL.md');
    
    if (skillValidation.errors?.length > 0) {
      reasons.push(...skillValidation.errors);
    }
    
    if (scores.hasPackageJson > 0) reasons.push('Has package.json');
    if (scores.hasTests > 0) reasons.push('Has test files');
    if (scores.recentUpdate > 0) reasons.push('Recently updated');
    if (scores.stars10Plus > 0) reasons.push('Community popular (10+ stars)');
    
    if (!securityScan.passed) {
      reasons.push(...securityScan.issues);
    }
    
    return reasons;
  }

  /**
   * Extract full name from GitHub URL
   * @param {string} url - GitHub URL
   * @returns {string|null} owner/repo
   */
  extractFullName(url) {
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    return match ? match[1].replace(/\.git$/, '') : null;
  }

  /**
   * Extract repo name from URL
   * @param {string} url - GitHub URL
   * @returns {string} Repo name
   */
  extractRepoName(url) {
    const fullName = this.extractFullName(url);
    return fullName ? fullName.split('/')[1] : 'unknown';
  }

  /**
   * Cache evaluations
   * @param {Array} results - Evaluation results
   */
  async cacheEvaluations(results) {
    try {
      const cacheFile = path.join(this.cacheDir, 'evaluations.json');
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      const existing = await this.loadCachedEvaluations();
      const combined = [...existing, ...results];
      
      // Deduplicate
      const deduped = Array.from(
        new Map(combined.map(r => [r.url, r])).values()
      );
      
      await fs.writeFile(cacheFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        count: deduped.length,
        results: deduped
      }, null, 2));
    } catch (err) {
      console.warn('Failed to cache evaluations:', err.message);
    }
  }

  /**
   * Load cached evaluations
   * @returns {Promise<Array>} Cached evaluations
   */
  async loadCachedEvaluations() {
    try {
      const cacheFile = path.join(this.cacheDir, 'evaluations.json');
      const data = await fs.readFile(cacheFile, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.results || [];
    } catch {
      return [];
    }
  }

  /**
   * Get evaluation criteria
   * @returns {Object} Scoring criteria
   */
  getCriteria() {
    return {
      weights: SCORING,
      thresholds: {
        excellent: 0.9,
        good: 0.7,
        fair: 0.5,
        skip: 0.0
      },
      maxScore: Object.values(SCORING).reduce((a, b) => a + b, 0)
    };
  }
}

module.exports = { Evaluator };
