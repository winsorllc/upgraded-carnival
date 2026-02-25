#!/usr/bin/env node

/**
 * PR Description Generator
 * 
 * Analyzes git changes and generates intelligent PR descriptions.
 * Supports multiple output formats: default, markdown, and JSON.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Simple patterns for detecting change types
const CHANGE_PATTERNS = {
  feature: /add|create|implement|new|introduce/i,
  fix: /fix|bug|patch|repair|resolve/i,
  refactor: /refactor|restructure|cleanup|optimize/i,
  docs: /docs?|readme|comment|document/i,
  test: /test|spec|unit|integration|mock/i,
  chore: /chore|maintain|update|upgrade|config/i,
  breaking: /breaking|major|remove|delete.*api/i
};

const FILE_TYPE_DESCRIPTIONS = {
  '.ts': 'TypeScript',
  '.js': 'JavaScript',
  '.tsx': 'React TypeScript',
  '.jsx': 'React JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.md': 'Markdown',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.html': 'HTML'
};

function getOptions() {
  const args = process.argv.slice(2);
  const options = {
    branch: null,
    baseBranch: 'main',
    fromCommit: null,
    toCommit: null,
    uncommitted: false,
    outputFormat: 'default',
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--json') {
      options.outputFormat = 'json';
    } else if (arg === '--markdown' || arg === '-m') {
      options.outputFormat = 'markdown';
    } else if (arg === '--uncommitted' || arg === '-u') {
      options.uncommitted = true;
    } else if (arg === '--from' && args[i + 1]) {
      options.fromCommit = args[++i];
    } else if (arg === '--to' && args[i + 1]) {
      options.toCommit = args[++i];
    } else if (!arg.startsWith('-')) {
      if (!options.branch) {
        options.branch = arg;
      } else {
        options.baseBranch = arg;
      }
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
PR Description Generator

Usage: node generate.js [options] [branch] [baseBranch]

Options:
  --help, -h           Show this help message
  --json               Output as JSON
  --markdown, -m       Output as markdown (for PR body)
  --uncommitted, -u    Analyze uncommitted changes
  --from <commit>      Start commit (for commit range)
  --to <commit>        End commit (for commit range)

Examples:
  node generate.js                     # Current branch vs main
  node generate.js my-branch develop   # my-branch vs develop
  node generate.js --uncommitted       # Uncommitted changes
  node generate.js --from v1.0 --to HEAD # Commit range
  node generate.js --markdown          # Markdown output
`);
}

function runGit(command) {
  try {
    return execSync(command, { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    return null;
  }
}

function getCurrentBranch() {
  return runGit('git rev-parse --abbrev-ref HEAD');
}

function getDiff(uncommitted = false) {
  if (uncommitted) {
    return runGit('git diff --stat');
  }
  return runGit(`git diff ${options.baseBranch}...HEAD --stat`);
}

function getDetailedDiff(uncommitted = false) {
  if (uncommitted) {
    return runGit('git diff');
  }
  return runGit(`git diff ${options.baseBranch}...HEAD`);
}

function getCommitHistory(limit = 10) {
  if (options.fromCommit && options.toCommit) {
    return runGit(`git log ${options.fromCommit}..${options.toCommit} --oneline`);
  }
  if (options.branch) {
    return runGit(`git log ${options.baseBranch}..${options.branch} --oneline -n ${limit}`);
  }
  return runGit(`git log ${options.baseBranch}..HEAD --oneline -n ${limit}`);
}

function getCommitCount() {
  if (options.fromCommit && options.toCommit) {
    return runGit(`git rev-list ${options.fromCommit}..${options.toCommit} --count`);
  }
  if (options.branch) {
    return runGit(`git rev-list ${options.baseBranch}..${options.branch} --count`);
  }
  return runGit(`git rev-list ${options.baseBranch}..HEAD --count`);
}

function getFileTypes(files) {
  const types = {};
  for (const file of files) {
    const ext = path.extname(file);
    if (ext) {
      types[ext] = (types[ext] || 0) + 1;
    }
  }
  return types;
}

function detectChangeType(files, diff) {
  const types = new Set();
  const content = files.join(' ') + ' ' + (diff || '');
  
  for (const [type, pattern] of Object.entries(CHANGE_PATTERNS)) {
    if (pattern.test(content)) {
      types.add(type);
    }
  }
  
  return types.size > 0 ? Array.from(types) : ['update'];
}

function detectBreakingChanges(files, diff) {
  const breakingIndicators = [
    /breaking\s*change/i,
    /breaking\s*change/i,
    /major\s*version/i,
    /remove.*deprecated/i,
    /delete.*api/i,
    /public\s+(?:class|function|interface).*remove/i
  ];
  
  const content = files.join(' ') + ' ' + (diff || '').slice(0, 5000);
  
  for (const indicator of breakingIndicators) {
    if (indicator.test(content)) {
      return true;
    }
  }
  return false;
}

function analyzeChanges(diffStat, detailedDiff) {
  const stats = { added: 0, modified: 0, deleted: 0, files: [] };
  
  if (!diffStat) {
    return { ...stats, files: [] };
  }
  
  const lines = diffStat.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Parse lines like: "auth/login.ts | 10 ++---"
    // or: " 1 file changed, 10 insertions(+), 5 deletions(-)"
    
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      const file = parts[0];
      const changes = parts[1] || '';
      
      if (file && !file.includes('changed')) {
        stats.files.push({
          file: file,
          type: changes.includes('+') ? 'added' : (changes.includes('-') ? 'deleted' : 'modified'),
          changes: changes.trim()
        });
        
        if (changes.includes('+') && !changes.includes('-')) {
          stats.added++;
        } else if (changes.includes('-') && !changes.includes('+')) {
          stats.deleted++;
        } else {
          stats.modified++;
        }
      }
    }
  }
  
  return stats;
}

function generateSummary(stats, changeTypes, commitCount) {
  const typeStr = changeTypes.join(', ');
  
  let summary = '';
  
  if (changeTypes.includes('feature')) {
    summary = 'Added new functionality';
  } else if (changeTypes.includes('fix')) {
    summary = 'Fixed an issue';
  } else if (changeTypes.includes('refactor')) {
    summary = 'Refactored existing code';
  } else if (changeTypes.includes('docs')) {
    summary = 'Updated documentation';
  } else if (changeTypes.includes('test')) {
    summary = 'Updated tests';
  } else {
    summary = 'Made changes to the codebase';
  }
  
  // Add file-specific context
  if (stats.files.length > 0) {
    const directories = [...new Set(stats.files.map(f => f.file.split('/')[0]))].slice(0, 3);
    if (directories.length > 0) {
      summary += ` in ${directories.join(', ')}`;
    }
  }
  
  summary += `.`;
  
  if (commitCount && parseInt(commitCount) > 1) {
    summary += ` ${commitCount} commits.`;
  }
  
  return summary;
}

function formatOutput(result, format) {
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  
  if (format === 'markdown') {
    let md = `## Summary\n${result.summary}\n\n`;
    md += `## Changes\n`;
    for (const file of result.files) {
      md += `- \`${file.file}\` - ${file.description || (file.type + ' file')}\n`;
    }
    md += `\n## Files Changed\n`;
    md += `- Added: ${result.stats.added}\n`;
    md += `- Modified: ${result.stats.modified}\n`;
    md += `- Deleted: ${result.stats.deleted}\n`;
    
    if (result.breaking) {
      md += `\n## ⚠️ Breaking Changes\nThis PR contains breaking changes.\n`;
    }
    
    if (result.commits && result.commits.length > 0) {
      md += `\n## Commits\n`;
      for (const commit of result.commits) {
        md += `- ${commit}\n`;
      }
    }
    
    console.log(md);
    return;
  }
  
  // Default format
  console.log(`\n📋 PR Description Generator`);
  console.log(`============================\n`);
  
  console.log(`## Summary`);
  console.log(result.summary);
  console.log(`\n## Changes`);
  
  if (result.files.length === 0) {
    console.log(`(No files changed)`);
  } else {
    for (const file of result.files.slice(0, 10)) {
      const icon = file.type === 'added' ? '✨' : (file.type === 'deleted' ? '🗑️' : '📝');
      console.log(`${icon} ${file.file}`);
    }
    if (result.files.length > 10) {
      console.log(`... and ${result.files.length - 10} more files`);
    }
  }
  
  console.log(`\n## Statistics`);
  console.log(`• Added: ${result.stats.added}`);
  console.log(`• Modified: ${result.stats.modified}`);
  console.log(`• Deleted: ${result.stats.deleted}`);
  console.log(`• Total: ${result.stats.added + result.stats.modified + result.stats.deleted}`);
  
  if (result.breaking) {
    console.log(`\n⚠️ Breaking Changes: YES`);
  }
  
  if (result.commits && result.commits.length > 0) {
    console.log(`\n## Recent Commits (${result.commits.length} total)`);
    for (const commit of result.commits.slice(0, 5)) {
      console.log(`• ${commit}`);
    }
  }
  
  console.log('');
}

// Main execution
const options = getOptions();

if (options.help) {
  showHelp();
  process.exit(0);
}

let diffStat, detailedDiff, commitHistory, commitCount;

if (options.uncommitted) {
  diffStat = runGit('git diff --stat');
  detailedDiff = runGit('git diff');
  commitHistory = null;
  commitCount = '0';
} else {
  const currentBranch = options.branch || getCurrentBranch();
  diffStat = runGit(`git diff ${options.baseBranch}...HEAD --stat`);
  detailedDiff = runGit(`git diff ${options.baseBranch}...HEAD`);
  
  if (options.fromCommit && options.toCommit) {
    commitHistory = runGit(`git log ${options.fromCommit}..${options.toCommit} --oneline`);
    commitCount = runGit(`git rev-list ${options.fromCommit}..${options.toCommit} --count`);
  } else {
    commitHistory = runGit(`git log ${options.baseBranch}..HEAD --oneline -n 10`);
    commitCount = runGit(`git rev-list ${options.baseBranch}..HEAD --count`);
  }
}

const stats = analyzeChanges(diffStat, detailedDiff);
const fileList = stats.files.map(f => f.file);
const changeTypes = detectChangeType(fileList, detailedDiff);
const breaking = detectBreakingChanges(fileList, detailedDiff);
const summary = generateSummary(stats, changeTypes, commitCount);

const commits = commitHistory ? commitHistory.split('\n').filter(c => c) : [];

const result = {
  summary,
  files: stats.files,
  stats: {
    added: stats.added,
    modified: stats.modified,
    deleted: stats.deleted
  },
  changeTypes,
  breaking,
  commits,
  commitCount
};

formatOutput(result, options.outputFormat);
