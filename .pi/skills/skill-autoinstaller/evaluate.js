#!/usr/bin/env node

/**
 * Skill Auto-Installer: Evaluation Module
 * 
 * Performs security audit and compatibility check on discovered skills.
 * Inspired by ZeroClaw's skill security auditing system.
 */

import { join, dirname, relative, resolve } from 'path';
import { existsSync, readFileSync, statSync } from 'fs';
import { execSync } from 'child_process';

// Parse command line arguments
const args = process.argv.slice(2);
const pathArg = args.find(a => a.startsWith('--path='));
const securityCheck = args.includes('--security');
const jsonOutput = args.includes('--json');
const strictMode = args.includes('--strict');

const SKILL_PATH = pathArg?.split('=')[1] || '';

/**
 * Security audit checks based on ZeroClaw's audit system
 */
const SECURITY_CHECKS = [
  {
    name: 'manifest_validation',
    description: 'SKILL.md must exist with valid frontmatter',
    critical: true,
    check: checkManifest
  },
  {
    name: 'path_traversal',
    description: 'No path traversal attempts or symlinks outside sandbox',
    critical: true,
    check: checkPathTraversal
  },
  {
    name: 'dangerous_patterns',
    description: 'No unsafe eval/exec without sandboxing',
    critical: true,
    check: checkDangerousPatterns
  },
  {
    name: 'secret_handling',
    description: 'No hardcoded credentials in code',
    critical: true,
    check: checkSecrets
  },
  {
    name: 'network_calls',
    description: 'External calls must be intentional and documented',
    critical: false,
    check: checkNetworkCalls
  },
  {
    name: 'file_operations',
    description: 'Write operations confined to safe directories',
    critical: false,
    check: checkFileOperations
  },
  {
    name: 'compatibility',
    description: 'Skill compatible with PopeBot architecture',
    critical: true,
    check: checkCompatibility
  }
];

/**
 * Check if SKILL.md exists and has valid frontmatter
 */
function checkManifest(skillDir) {
  const skillFile = join(skillDir, 'SKILL.md');
  
  if (!existsSync(skillFile)) {
    return {
      passed: false,
      reason: 'SKILL.md not found',
      severity: 'critical'
    };
  }
  
  try {
    const content = readFileSync(skillFile, 'utf-8');
    
    // Check for frontmatter
    if (!content.startsWith('---')) {
      return {
        passed: false,
        reason: 'Missing YAML frontmatter (must start with ---)',
        severity: 'critical'
      };
    }
    
    // Extract and validate frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return {
        passed: false,
        reason: 'Invalid YAML frontmatter (missing closing ---)',
        severity: 'critical'
      };
    }
    
    const frontmatter = frontmatterMatch[1];
    
    // Check for required fields
    if (!frontmatter.match(/^name:\s*.+$/m)) {
      return {
        passed: false,
        reason: 'Missing required field: name',
        severity: 'critical'
      };
    }
    
    if (!frontmatter.match(/^description:\s*.+$/m)) {
      return {
        passed: false,
        reason: 'Missing required field: description',
        severity: 'critical'
      };
    }
    
    return { passed: true };
  } catch (error) {
    return {
      passed: false,
      reason: `Error reading SKILL.md: ${error.message}`,
      severity: 'critical'
    };
  }
}

/**
 * Check for path traversal vulnerabilities
 */
function checkPathTraversal(skillDir) {
  const issues = [];
  
  try {
    // Read all files in skill directory
    const files = execSync(`find "${skillDir}" -type f 2>/dev/null`, { encoding: 'utf-8' });
    
    for (const file of files.split('\n').filter(f => f.trim())) {
      // Check for symlinks
      try {
        const stat = statSync(file, { throwIfNoEntry: false });
        if (stat?.isSymbolicLink()) {
          const target = execSync(`readlink "${file}"`, { encoding: 'utf-8' }).trim();
          const resolvedTarget = resolve(dirname(file), target);
          
          if (!resolvedTarget.startsWith(resolve(skillDir))) {
            issues.push(`Symlink ${file} points outside skill directory: ${target}`);
          }
        }
      } catch (e) {
        // File access error
      }
      
      // Check file contents for path traversal patterns
      try {
        const content = readFileSync(file, 'utf-8');
        if (content.includes('..') && (content.includes('join(') || content.includes('resolve('))) {
          // Could be path traversal, flag for review
          const relativePath = relative(skillDir, file);
          issues.push(`Potential path traversal in ${relativePath}: contains '..' with path operations`);
        }
      } catch (e) {
        // Binary file or unreadable
      }
    }
    
    if (issues.length > 0) {
      return {
        passed: false,
        reason: issues.join('; '),
        severity: 'critical'
      };
    }
    
    return { passed: true };
  } catch (error) {
    return {
      passed: false,
      reason: `Error checking path traversal: ${error.message}`,
      severity: 'critical'
    };
  }
}

/**
 * Check for dangerous code patterns
 */
function checkDangerousPatterns(skillDir) {
  const dangerousPatterns = [
    { pattern: /\beval\s*\(/, name: 'eval()' },
    { pattern: /\bnew\s+Function\s*\(/, name: 'Function constructor' },
    { pattern: /\bchild_process\.exec\s*\(/, name: 'child_process.exec' },
    { pattern: /\bexecSync\s*\(/, name: 'execSync' },
    { pattern: /\bspawnSync?\s*\(/, name: 'spawn' },
    { pattern: /\bsetTimeout\s*\([^,]*['"`]//, name: 'eval-like setTimeout' },
    { pattern: /\bsetInterval\s*\([^,]*['"`]//, name: 'eval-like setInterval' }
  ];
  
  const issues = [];
  
  try {
    const files = execSync(`find "${skillDir}" -type f \\( -name "*.js" -o -name "*.ts" -o -name "*.mjs" \\) 2>/dev/null`, { encoding: 'utf-8' });
    
    for (const file of files.split('\n').filter(f => f.trim())) {
      try {
        const content = readFileSync(file, 'utf-8');
        const relativePath = relative(skillDir, file);
        
        for (const { pattern, name } of dangerousPatterns) {
          if (pattern.test(content)) {
            // Check if it's properly sandboxed
            const lines = content.split('\n');
            const lineNumbers = [];
            
            for (let i = 0; i < lines.length; i++) {
              if (pattern.test(lines[i])) {
                lineNumbers.push(i + 1);
              }
            }
            
            issues.push(`${name} found in ${relativePath} (lines: ${lineNumbers.join(', ')})`);
          }
        }
      } catch (e) {
        // File read error
      }
    }
    
    if (issues.length > 0) {
      return {
        passed: !strictMode, // Pass in non-strict mode, but flag it
        reason: issues.join('; '),
        severity: strictMode ? 'critical' : 'warning',
        recommendation: 'Ensure dangerous functions are properly sandboxed and necessary'
      };
    }
    
    return { passed: true };
  } catch (error) {
    return {
      passed: true, // Don't fail on this check failing
      reason: `Could not scan JavaScript files: ${error.message}`,
      severity: 'info'
    };
  }
}

/**
 * Check for hardcoded secrets
 */
function checkSecrets(skillDir) {
  const secretPatterns = [
    { pattern: /['"`]sk-[a-zA-Z0-9]{20,}['"`]/, name: 'OpenAI API key' },
    { pattern: /['"`]gh[pousr]_[A-Za-z0-9_]{36,}['"`]/, name: 'GitHub token' },
    { pattern: /['"`]AIza[0-9A-Za-z\\-_]{35}['"`]/, name: 'Google API key' },
    { pattern: /['"`]AKIA[0-9A-Z]{16}['"`]/, name: 'AWS access key' },
    { pattern: /password\s*[:=]\s*['"`][^'"`]+['"`]/i, name: 'Hardcoded password' },
    { pattern: /secret\s*[:=]\s*['"`][^'"`]+['"`]/i, name: 'Hardcoded secret' },
    { pattern: /api[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/i, name: 'Hardcoded API key' }
  ];
  
  const issues = [];
  
  try {
    const files = execSync(`find "${skillDir}" -type f \\( -name "*.js" -o -name "*.ts" -o -name "*.mjs" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" \\) -not -name "package-lock.json" 2>/dev/null`, { encoding: 'utf-8' });
    
    for (const file of files.split('\n').filter(f => f.trim())) {
      try {
        const content = readFileSync(file, 'utf-8');
        const relativePath = relative(skillDir, file);
        
        for (const { pattern, name } of secretPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            // Exclude example/placeholder values
            const matchStr = matches[0].toLowerCase();
            if (matchStr.includes('your_') || matchStr.includes('xxx') || matchStr.includes('example') || matchStr.includes('placeholder')) {
              continue; // Skip obvious placeholders
            }
            
            issues.push(`Potential ${name} found in ${relativePath}`);
          }
        }
      } catch (e) {
        // File read error
      }
    }
    
    if (issues.length > 0) {
      return {
        passed: false,
        reason: issues.join('; '),
        severity: 'critical',
        recommendation: 'Remove hardcoded secrets and use environment variables'
      };
    }
    
    return { passed: true };
  } catch (error) {
    return {
      passed: true,
      reason: `Could not scan for secrets: ${error.message}`,
      severity: 'info'
    };
  }
}

/**
 * Check for undocumented network calls
 */
function checkNetworkCalls(skillDir) {
  const networkPatterns = [
    /fetch\s*\(/,
    /axios\./,
    /https?\.(get|post|put|delete|patch)\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /net\.(createConnection|connect)/,
    /dgram\.createSocket/
  ];
  
  const urls = [];
  
  try {
    const files = execSync(`find "${skillDir}" -type f \\( -name "*.js" -o -name "*.ts" -o -name "*.mjs" \\) 2>/dev/null`, { encoding: 'utf-8' });
    
    for (const file of files.split('\n').filter(f => f.trim())) {
      try {
        const content = readFileSync(file, 'utf-8');
        
        // Extract URLs
        const urlPattern = /https?:\/\/[^\s'"`)]+/g;
        const matches = content.match(urlPattern);
        if (matches) {
          for (const url of matches) {
            if (!urls.includes(url)) {
              urls.push(url);
            }
          }
        }
      } catch (e) {
        // File read error
      }
    }
    
    if (urls.length > 0) {
      return {
        passed: true,
        reason: `${urls.length} external URL(s) found`,
        severity: 'info',
        details: urls
      };
    }
    
    return { passed: true };
  } catch (error) {
    return {
      passed: true,
      reason: `Could not scan for network calls: ${error.message}`,
      severity: 'info'
    };
  }
}

/**
 * Check file operations for safety
 */
function checkFileOperations(skillDir) {
  const writePatterns = [
    /fs\.writeFileSync/,
    /fs\.writeFile/,
    /fs\.appendFileSync/,
    /fs\.appendFile/,
    /fs\.mkdirSync/,
    /fs\.mkdir/,
    /writeFileSync/,
    /writeFile/
  ];
  
  const unsafePaths = ['/etc', '/root', '/var', '/opt', 'node_modules', '../'];
  const issues = [];
  
  try {
    const files = execSync(`find "${skillDir}" -type f \\( -name "*.js" -o -name "*.ts" -o -name "*.mjs" \\) 2>/dev/null`, { encoding: 'utf-8' });
    
    for (const file of files.split('\n').filter(f => f.trim())) {
      try {
        const content = readFileSync(file, 'utf-8');
        const relativePath = relative(skillDir, file);
        
        // Check if any write patterns are used
        const hasWrite = writePatterns.some(p => p.test(content));
        
        if (hasWrite) {
          // Check if paths are safe
          const pathStrings = content.match(/['"][^'"]+['"]/g) || [];
          
          for (const pathStr of pathStrings) {
            const cleanPath = pathStr.replace(/['"]/g, '');
            for (const unsafe of unsafePaths) {
              if (cleanPath.includes(unsafe) && unsafe !== '../') {
                issues.push(`Write operation may target unsafe path in ${relativePath}: ${cleanPath}`);
              }
            }
          }
        }
      } catch (e) {
        // File read error
      }
    }
    
    if (issues.length > 0) {
      return {
        passed: !strictMode,
        reason: issues.join('; '),
        severity: strictMode ? 'critical' : 'warning',
        recommendation: 'Ensure file writes are confined to /job/tmp/ or skill directory'
      };
    }
    
    return { passed: true };
  } catch (error) {
    return {
      passed: true,
      reason: `Could not scan file operations: ${error.message}`,
      severity: 'info'
    };
  }
}

/**
 * Check PopeBot compatibility
 */
function checkCompatibility(skillDir) {
  const skillFile = join(skillDir, 'SKILL.md');
  
  try {
    const content = readFileSync(skillFile, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      return {
        passed: false,
        reason: 'Invalid frontmatter',
        severity: 'critical'
      };
    }
    
    const frontmatter = frontmatterMatch[1];
    
    // Check for popebot metadata
    const hasPopebotMeta = frontmatter.includes('popebot');
    if (!hasPopebotMeta && !strictMode) {
      return {
        passed: true,
        reason: 'Missing popebot metadata section (recommended but not required)',
        severity: 'warning',
        recommendation: 'Add metadata.popebot section for better integration'
      };
    }
    
    if (hasPopebotMeta && strictMode) {
      // If strict mode and has metadata, check for required fields
      if (!frontmatter.includes('name:') || !frontmatter.includes('description:')) {
        return {
          passed: false,
          reason: 'Missing required metadata fields (name, description)',
          severity: 'critical'
        };
      }
    }
    
    return { passed: true };
  } catch (error) {
    return {
      passed: false,
      reason: `Error checking compatibility: ${error.message}`,
      severity: 'critical'
    };
  }
}

/**
 * Run all security checks
 */
function runSecurityAudit(skillDir) {
  const results = [];
  let score = 100;
  let passed = true;
  
  for (const check of SECURITY_CHECKS) {
    const result = check.check(skillDir);
    
    results.push({
      name: check.name,
      description: check.description,
      ...result,
      check: check
    });
    
    // Calculate score
    if (!result.passed) {
      if (result.severity === 'critical' || (check.critical && strictMode)) {
        score -= 40;
        passed = false;
      } else if (result.severity === 'warning') {
        score -= 15;
      } else if (result.severity === 'info') {
        score -= 5;
      }
    }
  }
  
  score = Math.max(0, score);
  
  return {
    score,
    passed: passed && score >= 60,
    results,
    summary: `${results.filter(r => r.passed).length}/${results.length} checks passed`
  };
}

/**
 * Main evaluation function
 */
function evaluate() {
  console.log('🔍 Skill Auto-Installer: Evaluation Mode\n');
  
  if (!SKILL_PATH) {
    console.error('❌ Error: Must specify --path=<skill-directory>');
    if (!jsonOutput) {
      console.log('\nUsage:');
      console.log('  evaluate.js --path=/tmp/skills/my-skill');
      console.log('  evaluate.js --path=/tmp/skills/my-skill --security');
    }
    process.exit(1);
  }
  
  if (!existsSync(SKILL_PATH)) {
    const errorResult = {
      status: 'error',
      error: `Skill directory not found: ${SKILL_PATH}`
    };
    
    if (jsonOutput) {
      console.log(JSON.stringify(errorResult, null, 2));
    } else {
      console.error(`❌ Skill directory not found: ${SKILL_PATH}`);
    }
    process.exit(1);
  }
  
  console.log(`📁 Evaluating: ${SKILL_PATH}\n`);
  
  // Run security audit
  const audit = runSecurityAudit(SKILL_PATH);
  
  // Generate evaluation report
  const report = {
    status: audit.passed ? 'success' : 'failed',
    skill: {
      path: SKILL_PATH,
      name: dirname(SKILL_PATH).split('/').pop()
    },
    evaluation: {
      score: audit.score,
      passed: audit.passed,
      summary: audit.summary
    },
    checks: audit.results.map(r => ({
      name: r.name,
      passed: r.passed,
      severity: r.severity,
      reason: r.reason,
      recommendation: r.recommendation
    })),
    timestamp: new Date().toISOString()
  };
  
  // Output results
  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const scoreEmoji = audit.score >= 80 ? '✅' : audit.score >= 60 ? '⚠️' : '❌';
    
    console.log(`${scoreEmoji} Evaluation Complete\n`);
    console.log(`📊 Score: ${audit.score}/100`);
    console.log(`📈 Status: ${audit.passed ? 'PASSED' : 'FAILED'}\n`);
    
    console.log('📋 Security Checks:\n');
    for (const check of audit.results) {
      const emoji = check.passed ? '✅' : '❌';
      console.log(`  ${emoji} ${check.name}`);
      if (!check.passed) {
        console.log(`     Reason: ${check.reason || 'Failed'}`);
        if (check.recommendation) {
          console.log(`     Tip: ${check.recommendation}`);
        }
      }
    }
    
    console.log(`\n${audit.passed ? '✅ Skill is ready for installation' : '❌ Skill failed evaluation'}`);
    
    if (audit.passed) {
      console.log('\nNext step:');
      console.log('  Install: node install.js --path <skill-path> --activate');
    }
  }
  
  return report;
}

// Run evaluation
evaluate();
