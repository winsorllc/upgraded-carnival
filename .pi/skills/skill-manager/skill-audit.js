#!/usr/bin/env node
/**
 * Skill Auditor - Security audit for skills
 */

const fs = require('fs');
const path = require('path');

// Risk patterns to check
const RISK_PATTERNS = [
  {
    pattern: /curl\s+-.*\||wget\s+.*\|/i,
    severity: 'high',
    description: 'Piping remote content directly to shell'
  },
  {
    pattern: /eval\s*\(/i,
    severity: 'high',
    description: 'Use of eval() with external input'
  },
  {
    pattern: /child_process\.exec/i,
    severity: 'medium',
    description: 'Unescaped shell execution'
  },
  {
    pattern: /fs\.unlinkSync\s*\([^)]*\//i,
    severity: 'medium',
    description: 'Dangerous file deletion with absolute paths'
  },
  {
    pattern: /require\s*\(\s*['"]\.\/\.\./i,
    severity: 'low',
    description: 'Directory traversal in require'
  },
  {
    pattern: /http:\/\/[^\s]+/,
    severity: 'low',
    description: 'Insecure HTTP connection'
  },
  {
    pattern: /process\.env\[['"]\w*_(?:KEY|TOKEN|SECRET|PASS)/i,
    severity: 'info',
    description: 'Access to credential environment variables'
  },
  {
    pattern: /chmod\s+777/i,
    severity: 'medium',
    description: 'Overly permissive file permissions'
  },
  {
    pattern: /sudo\s/i,
    severity: 'high',
    description: 'Using sudo in skill'
  },
  {
    pattern: /rm\s+-rf/i,
    severity: 'high',
    description: 'Dangerous recursive delete'
  }
];

function auditFile(filePath, content) {
  const issues = [];
  const lines = content.split('\n');
  
  RISK_PATTERNS.forEach(({ pattern, severity, description }) => {
    lines.forEach((line, idx) => {
      const match = line.match(pattern);
      if (match) {
        issues.push({
          file: path.basename(filePath),
          line: idx + 1,
          severity,
          description,
          match: line.trim().slice(0, 80)
        });
      }
    });
  });
  
  return issues;
}

function auditSkill(skillPath) {
  const results = {
    skill: path.basename(skillPath),
    passed: true,
    summary: { high: 0, medium: 0, low: 0, info: 0 },
    issues: [],
    filesScanned: 0
  };
  
  try {
    const files = fs.readdirSync(skillPath, { recursive: false });
    
    files.forEach(file => {
      const ext = path.extname(file);
      if (['.js', '.sh', '.py', '.ts'].includes(ext)) {
        const filePath = path.join(skillPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const issues = auditFile(filePath, content);
        
        issues.forEach(issue => {
          results.issues.push(issue);
          results.summary[issue.severity]++;
          if (['high', 'medium'].includes(issue.severity)) {
            results.passed = false;
          }
        });
        
        results.filesScanned++;
      }
    });
  } catch (err) {
    return { error: err.message };
  }
  
  return results;
}

function main() {
  const skillPath = process.argv[2] || '/job/.pi/skills/skill-list';
  const absolute = path.resolve(skillPath);
  
  console.log(`🔒 Auditing skill: ${absolute}\n`);
  
  const results = auditSkill(absolute);
  
  if (results.error) {
    console.error(`❌ Error: ${results.error}`);
    process.exit(1);
  }
  
  // Summary
  console.log(`Files scanned: ${results.filesScanned}`);
  console.log(`Issues found: ${results.issues.length}`);
  console.log(`  High:   ${results.summary.high} ${results.summary.high ? '⚠️' : ''}`);
  console.log(`  Medium: ${results.summary.medium} ${results.summary.medium ? '⚠️' : ''}`);
  console.log(`  Low:    ${results.summary.low}`);
  console.log(`  Info:   ${results.summary.info}`);
  console.log();
  
  // Detail view
  if (results.issues.length > 0) {
    console.log('Detailed findings:\n');
    results.issues.forEach(issue => {
      const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : issue.severity === 'low' ? '🔵' : 'ℹ️';
      console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`);
      console.log(`   ${issue.description}`);
      console.log(`   Code: ${issue.match}`);
      console.log();
    });
  }
  
  if (results.passed) {
    console.log('✅ Security audit passed');
    process.exit(0);
  } else {
    console.log('❌ Security audit found issues that should be addressed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { auditSkill, auditFile, RISK_PATTERNS };