#!/usr/bin/env node
/**
 * Security Module - Skill Security Auditing
 * 
 * Scans skills for dangerous patterns and security issues
 * 
 * @module security
 * @author PopeBot
 */

const fs = require('fs').promises;
const path = require('path');

// Dangerous patterns to scan for
const DANGEROUS_PATTERNS = [
  {
    pattern: /eval\s*\(/,
    severity: 'critical',
    description: 'Uses eval() which can execute arbitrary code'
  },
  {
    pattern: /new\s+Function\s*\(/,
    severity: 'critical',
    description: 'Uses Function constructor which can execute arbitrary code'
  },
  {
    pattern: /child_process/,
    severity: 'warning',
    description: 'Uses child_process module'
  },
  {
    pattern: /spawn\s*\(/,
    severity: 'warning',
    description: 'Spawns child processes'
  },
  {
    pattern: /exec\s*\(/,
    severity: 'warning',
    description: 'Executes shell commands'
  },
  {
    pattern: /rm\s+-rf\s+\//,
    severity: 'critical',
    description: 'Dangerous delete pattern'
  },
  {
    pattern: /rm\s+-rf\s+\/\s*/,
    severity: 'critical',
    description: 'Dangerous recursive delete'
  },
  {
    pattern: /\|\s*bash/,
    severity: 'critical',
    description: 'Pipes to bash (remote code execution risk)'
  },
  {
    pattern: /\|\s*sh/,
    severity: 'critical',
    description: 'Pipes to shell (remote code execution risk)'
  },
  {
    pattern: /\|\s*exec/,
    severity: 'critical',
    description: 'Pipes to exec (command injection risk)'
  },
  {
    pattern: /download.*\|\s*(?:bash|sh)/,
    severity: 'critical',
    description: 'Download pipe to shell pattern'
  },
  {
    pattern: /curl.*-o-\s*\|/,
    severity: 'critical',
    description: 'curl pipe pattern'
  },
  {
    pattern: /wget.*-O-\s*\|/,
    severity: 'critical',
    description: 'wget pipe pattern'
  },
  {
    pattern: /setInterval\s*\(\s*eval/,
    severity: 'critical',
    description: 'Periodic eval execution'
  },
  {
    pattern: /require\s*\(\s*[^'"]*\+[^'"]*\)/,
    severity: 'warning',
    description: 'Dynamic require (code injection risk)'
  },
  {
    pattern: /import\s*\(\s*[^'"]*\+[^'"]*\)/,
    severity: 'warning',
    description: 'Dynamic import (code injection risk)'
  },
  {
    pattern: /fs\.[access|chmod|chown|rename].*\+/,
    severity: 'warning',
    description: 'Dynamic filesystem pattern'
  },
  {
    pattern: /process\.env/,
    severity: 'info',
    description: 'Accesses environment variables'
  },
  {
    pattern: /delete\s+require\./,
    severity: 'warning',
    description: 'Modifies require cache'
  },
  {
    pattern: /Object\.prototype/,
    severity: 'warning',
    description: 'Modifies Object prototype'
  },
  {
    pattern: /prototype\.pollute/,
    severity: 'critical',
    description: 'Prototype pollution pattern'
  },
  {
    pattern: /__proto__/,
    severity: 'warning',
    description: 'Accesses __proto__'
  },
  {
    pattern: /constructor\s*\[\s*"prototype"\s*\]/,
    severity: 'critical',
    description: 'Prototype access pattern'
  }
];

// Risky npm dependencies
const RISKY_PACKAGES = [
  'eval',
  'safe-eval',
  'vm2',
  'vm',
  'child_process',
  'cluster',
  'dgram',
  'net',
  'tls',
  'repl',
  'readline'
];

class Security {
  constructor(options = {}) {
    this.strictMode = options.strictMode || false;
    this.allowNetwork = options.allowNetwork || true;
    this.allowFilesystem = options.allowFilesystem || true;
  }

  /**
   * Run security audit
   * @param {Object} params - Audit parameters
   * @returns {Promise<Object>} Audit results
   */
  async audit(params = {}) {
    const { skillPath, url, name } = params;
    
    const results = {
      passed: true,
      issues: [],
      warnings: [],
      info: [],
      score: 1.0
    };
    
    if (skillPath) {
      // Audit local files
      const fileResults = await this.auditDirectory(skillPath);
      results.issues.push(...fileResults.issues);
      results.warnings.push(...fileResults.warnings);
      results.info.push(...fileResults.info);
    } else if (url) {
      // Audit remote repository
      // This would need additional implementation
      results.info.push('Remote audit not fully implemented');
    }
    
    // Calculate score
    results.score = this.calculateScore(results);
    results.passed = results.score >= 0.8;
    
    return results;
  }

  /**
   * Audit a directory
   * @param {string} dirPath - Directory to audit
   * @returns {Promise<Object>} Audit results
   */
  async auditDirectory(dirPath) {
    const results = {
      issues: [],
      warnings: [],
      info: [],
      filesScanned: 0
    };
    
    const files = await this.getJavaScriptFiles(dirPath);
    
    for (const file of files) {
      results.filesScanned++;
      try {
        const content = await fs.readFile(file, 'utf-8');
        const fileResults = this.auditFile(content, file);
        results.issues.push(...fileResults.issues);
        results.warnings.push(...fileResults.warnings);
        results.info.push(...fileResults.info);
      } catch (err) {
        results.warnings.push(`Could not read ${file}: ${err.message}`);
      }
    }
    
    // Audit package.json
    const packageResult = await this.auditPackageJson(dirPath);
    results.issues.push(...packageResult.issues);
    results.warnings.push(...packageResult.warnings);
    results.info.push(...packageResult.info);
    
    return results;
  }

  /**
   * Get all JavaScript files in directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<Array>} File paths
   */
  async getJavaScriptFiles(dirPath) {
    const files = [];
    
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
        const subFiles = await this.getJavaScriptFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && 
                 (entry.name.endsWith('.js') || 
                  entry.name.endsWith('.mjs') || 
                  entry.name.endsWith('.cjs'))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Audit a single file
   * @param {string} content - File content
   * @param {string} filepath - File path
   * @returns {Object} Audit results for file
   */
  auditFile(content, filepath) {
    const results = {
      issues: [],
      warnings: [],
      info: [],
      lines: content.split('\n').length
    };
    
    const lines = content.split('\n');
    const filename = path.basename(filepath);
    
    for (const pattern of DANGEROUS_PATTERNS) {
      // Check line by line for pattern matches
      lines.forEach((line, index) => {
        if (pattern.pattern.test(line)) {
          const message = `${filename}:${index + 1}: ${pattern.description}`;
          
          switch (pattern.severity) {
            case 'critical':
              results.issues.push(message);
              break;
            case 'warning':
              results.warnings.push(message);
              break;
            case 'info':
              results.info.push(message);
              break;
          }
        }
      });
    }
    
    return results;
  }

  /**
   * Audit package.json
   * @param {string} dirPath - Directory containing package.json
   * @returns {Promise<Object>} Audit results
   */
  async auditPackageJson(dirPath) {
    const results = {
      issues: [],
      warnings: [],
      info: [],
      hasPackageJson: false
    };
    
    try {
      const packagePath = path.join(dirPath, 'package.json');
      const content = await fs.readFile(packagePath, 'utf-8');
      const pkg = JSON.parse(content);
      results.hasPackageJson = true;
      
      // Check dependencies
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      
      for (const dep of [...deps, ...devDeps]) {
        if (RISKY_PACKAGES.includes(dep)) {
          results.warnings.push(`package.json: Potentially risky dependency: ${dep}`);
        }
      }
      
      // Check for scripts with dangerous patterns
      const scripts = Object.entries(pkg.scripts || {});
      for (const [name, script] of scripts) {
        for (const pattern of DANGEROUS_PATTERNS) {
          if (pattern.pattern.test(script)) {
            results.issues.push(`package.json script "${name}" contains dangerous pattern`);
          }
        }
      }
      
      // Check post-install scripts
      if (pkg.scripts?.postinstall) {
        results.warnings.push('package.json has postinstall script - review for security');
      }
      
    } catch {
      // No package.json
    }
    
    return results;
  }

  /**
   * Calculate security score
   * @param {Object} results - Audit results
   * @returns {number} Score between 0 and 1
   */
  calculateScore(results) {
    const criticalIssues = results.issues.filter(i => 
      DANGEROUS_PATTERNS.some(p => p.severity === 'critical' && i.includes(p.description))
    ).length;
    
    const warnings = results.warnings.length;
    
    // Start at 1.0
    let score = 1.0;
    
    // Deduct for critical issues
    score -= criticalIssues * 0.3;
    
    // Deduct for warnings
    score -= warnings * 0.1;
    
    // Don't go below 0
    return Math.max(0, score);
  }

  /**
   * Get security report summary
   * @param {Object} auditResults - Audit results
   * @returns {string} Summary
   */
  getSummary(auditResults) {
    const parts = [];
    
    if (auditResults.issues.length > 0) {
      parts.push(`${auditResults.issues.length} critical issues`);
    }
    if (auditResults.warnings.length > 0) {
      parts.push(`${auditResults.warnings.length} warnings`);
    }
    if (auditResults.info.length > 0) {
      parts.push(`${auditResults.info.length} info`);
    }
    
    return parts.join(', ') || 'Clean';
  }
}

module.exports = { Security };
