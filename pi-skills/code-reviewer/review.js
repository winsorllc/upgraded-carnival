#!/usr/bin/env node
/**
 * Code Reviewer - Automated code quality analysis
 * Inspired by CodeRabbit and modern code review tools
 */

import fs from 'fs';
import path from 'path';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Parse arguments
const args = process.argv.slice(2);
const target = args[0] || '.';
const focusSecurity = args.includes('--security');
const focusPerformance = args.includes('--performance');
const focusStyle = args.includes('--style');
const focusAll = !focusSecurity && !focusPerformance && !focusStyle;

// Patterns for different issue types
const patterns = {
  security: [
    {
      pattern: /eval\s*\(/,
      message: 'Use of eval() is dangerous - consider safer alternatives',
      severity: 'critical'
    },
    {
      pattern: /new\s+Function\s*\(/,
      message: 'Dynamic function creation is a security risk',
      severity: 'critical'
    },
    {
      pattern: /innerHTML\s*=|document\.write\s*\(/,
      message: 'Potential XSS vulnerability - use textContent or createElement instead',
      severity: 'critical'
    },
    {
      pattern: /(?:password|secret|token|auth)\s*[:=]\s*["']/i,
      message: 'Potential hardcoded credential detected',
      severity: 'warning'
    },
    {
      pattern: /SELECT.*\+.*\+|INSERT.*\+.*\+|UPDATE.*\+.*\+|DELETE.*\+/i,
      message: 'Potential SQL injection - use parameterized queries',
      severity: 'critical'
    },
    {
      pattern: /\.exec\s*\(\s*[`"'].*\$/,
      message: 'Shell command injection risk - validate input',
      severity: 'critical'
    },
    {
      pattern: /https?:\/\/\S+(?:password|secret|api[_-]?key)/i,
      message: 'Sensitive data in URL detected',
      severity: 'warning'
    }
  ],
  performance: [
    {
      pattern: /for\s*\([^)]*\)\s*\{[^}]*for\s*\(/,
      message: 'Nested loops detected - consider optimizing algorithm',
      severity: 'warning'
    },
    {
      pattern: /\.indexOf\s*\([^)]*\)\s*!==?\s*-1/g,
      message: 'Use .includes() instead of .indexOf() !== -1',
      severity: 'suggestion'
    },
    {
      pattern: /\.map\s*\([^)]*\)\.filter|\.filter\s*\([^)]*\)\.map/,
      message: 'Chained array methods - consider combining into one iteration',
      severity: 'suggestion'
    },
    {
      pattern: /console\.log\s*\(/,
      message: 'Console.log found - remove in production code',
      severity: 'suggestion'
    },
    {
      pattern: /JSON\.stringify\(\s*[^)]*\s*\)\s*!==?\s*JSON\.stringify/,
      message: 'Deep equality check using JSON.stringify is slow for large objects',
      severity: 'warning'
    }
  ],
  style: [
    {
      pattern: /var\s+/,
      message: 'Use const or let instead of var',
      severity: 'suggestion'
    },
    {
      pattern: /function\s*\([^)]*\)\s*\{/,
      message: 'Consider using arrow functions for consistency',
      severity: 'suggestion'
    },
    {
      pattern: /\btemp\b|\btmp\b|\bx\b|\by\b|\bi\b|\bj\b|\bk\b/,
      message: 'Non-descriptive variable name detected',
      severity: 'suggestion'
    },
    {
      pattern: /if\s*\([^)]+\)\s*return\s+true;?\s*else\s*return\s+false;?/,
      message: 'Simplify: return condition directly',
      severity: 'suggestion'
    },
    {
      pattern: /==\s*(null|undefined)|!=\s*(null|undefined)/,
      message: 'Use === or !== for strict equality',
      severity: 'suggestion'
    },
    {
      pattern: /\/\/.*TODO|\/\/.*FIXME|#.*TODO|#.*FIXME/,
      message: 'TODO/FIXME comment found',
      severity: 'suggestion'
    },
    {
      pattern: /;\n\s*\}/,
      message: 'Unnecessary semicolon before closing brace',
      severity: 'suggestion'
    }
  ]
};

// File extensions to analyze
const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.sh', '.bash'];

function getFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Skip common directories to ignore
      if (['node_modules', '.git', 'dist', 'build', 'coverage', '.pi', 'logs'].includes(item.name)) {
        continue;
      }
      getFiles(fullPath, files);
    } else if (supportedExtensions.includes(path.extname(item.name))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  const categories = [];
  if (focusAll || focusSecurity) categories.push('security');
  if (focusAll || focusPerformance) categories.push('performance');
  if (focusAll || focusStyle) categories.push('style');
  
  for (const category of categories) {
    for (const { pattern, message, severity } of patterns[category]) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
          issues.push({
            line: i + 1,
            category,
            severity,
            message,
            code: line.trim().substring(0, 50)
          });
        }
      }
    }
  }
  
  return issues;
}

function printReport(files, allIssues) {
  console.log(colors.cyan + '═'.repeat(64) + colors.reset);
  console.log(colors.bold + '                     CODE REVIEW REPORT                     ' + colors.reset);
  console.log(colors.cyan + '═'.repeat(64) + colors.reset);
  console.log();
  
  let totalCritical = 0;
  let totalWarning = 0;
  let totalSuggestion = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const issues = allIssues[i];
    
    if (issues.length === 0) continue;
    
    console.log(colors.bold + `File: ${file}` + colors.reset);
    console.log(`Issues Found: ${issues.length}`);
    console.log(colors.cyan + '─'.repeat(64) + colors.reset);
    
    for (const issue of issues) {
      const severityColor = issue.severity === 'critical' ? colors.red : 
                          issue.severity === 'warning' ? colors.yellow : colors.blue;
      const icon = issue.severity === 'critical' ? '✗' :
                   issue.severity === 'warning' ? '!' : '•';
      
      console.log();
      console.log(`${severityColor}${icon} [${issue.category.toUpperCase()}] Line ${issue.line}: ${issue.message}${colors.reset}`);
      console.log(`  ${colors.cyan}>${colors.reset} ${issue.code.substring(0, 60)}`);
      
      if (issue.severity === 'critical') totalCritical++;
      else if (issue.severity === 'warning') totalWarning++;
      else totalSuggestion++;
    }
    
    console.log();
    console.log(colors.cyan + '─'.repeat(64) + colors.reset);
  }
  
  const total = totalCritical + totalWarning + totalSuggestion;
  
  console.log();
  console.log(colors.cyan + '═'.repeat(64) + colors.reset);
  
  if (total > 0) {
    console.log(colors.bold + `Total: ${total} issues (${colors.red}${totalCritical} critical${colors.reset}, ${colors.yellow}${totalWarning} warnings${colors.reset}, ${colors.blue}${totalSuggestion} suggestions${colors.reset})` + colors.bold);
  } else {
    console.log(colors.green + colors.bold + '✓ No issues found - code looks good!' + colors.reset);
  }
  
  console.log(colors.cyan + '═'.repeat(64) + colors.reset);
}

function saveReport(files, allIssues) {
  const logsDir = '/job/logs';
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  let report = '# Code Review Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  let totalCritical = 0;
  let totalWarning = 0;
  let totalSuggestion = 0;
  
  for (let i = 0; i < files.length; i++) {
    const issues = allIssues[i];
    if (issues.length === 0) continue;
    
    report += `## File: ${files[i]}\n\n`;
    
    for (const issue of issues) {
      report += `- **[${issue.severity.toUpperCase()}]** Line ${issue.line} (${issue.category})\n`;
      report += `  - ${issue.message}\n`;
      report += `  - \`${issue.code}\`\n\n`;
      
      if (issue.severity === 'critical') totalCritical++;
      else if (issue.severity === 'warning') totalWarning++;
      else totalSuggestion++;
    }
  }
  
  const total = totalCritical + totalWarning + totalSuggestion;
  report += `\n## Summary\n\n`;
  report += `- **Total Issues**: ${total}\n`;
  report += `- **Critical**: ${totalCritical}\n`;
  report += `- **Warnings**: ${totalWarning}\n`;
  report += `- **Suggestions**: ${totalSuggestion}\n\n`;
  
  fs.writeFileSync(path.join(logsDir, 'CODE_REVIEW.md'), report);
  console.log();
  console.log(colors.green + `Full report saved to: logs/CODE_REVIEW.md${colors.reset}`);
}

// Main
if (!fs.existsSync(target)) {
  console.error(colors.red + `Error: Target path not found: ${target}${colors.reset}`);
  process.exit(1);
}

let files;
if (fs.statSync(target).isDirectory()) {
  files = getFiles(target);
} else {
  files = [target];
}

const allIssues = files.map(analyzeFile);
printReport(files, allIssues);
saveReport(files, allIssues);
