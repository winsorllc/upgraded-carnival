#!/usr/bin/env node

/**
 * Advanced Git Operations CLI
 * Based on zeroclaw's git_operations tool
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run git command
function git(args, options = {}) {
  try {
    return execSync(`git ${args}`, { 
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });
  } catch (e) {
    throw new Error(e.message);
  }
}

// Check if in git repo
function isGitRepo() {
  try {
    git('rev-parse --git-dir');
    return true;
  } catch {
    return false;
  }
}

// Get current branch
function getCurrentBranch() {
  return git('rev-parse --abbrev-ref HEAD').trim();
}

// Branch operations
function branch(args) {
  const { name, startPoint, delete: deleteBranch, force } = args;
  
  if (!isGitRepo()) {
    return { success: false, output: 'Not a git repository', error: 'Not a git repo' };
  }
  
  try {
    if (deleteBranch) {
      const flag = force ? '-D' : '-d';
      git(`branch ${flag} ${deleteBranch}`);
      return { success: true, output: `Deleted branch: ${deleteBranch}`, error: null };
    }
    
    if (!name) {
      return { success: false, output: 'Branch name required', error: 'Missing name' };
    }
    
    const branchCmd = startPoint ? `branch ${name} ${startcheckoutPoint}` : ` -b ${name}`;
    git(branchCmd);
    
    return { success: true, output: `Created and switched to branch: ${name}`, error: null };
  } catch (e) {
    return { success: false, output: e.message, error: e.message };
  }
}

// List branches
function listBranches(args) {
  const { all, verbose } = args;
  
  if (!isGitRepo()) {
    return { success: false, output: 'Not a git repository', error: 'Not a git repo' };
  }
  
  try {
    const flag = all ? '-a' : (verbose ? '-vv' : '');
    const output = git(`branch ${flag}`);
    const branches = output.split('\n').map(b => b.trim()).filter(b => b);
    
    let formatted = `Branches (${branches.length} total):\n\n`;
    
    for (const branch of branches) {
      const isCurrent = branch.startsWith('*');
      const name = branch.replace(/^\*?\s*/, '');
      const isRemote = name.startsWith('remotes/');
      
      if (verbose) {
        formatted += `${isCurrent ? '✓ ' : '  '}${name}\n`;
      } else {
        formatted += `${isCurrent ? '● ' : '○ '}${name}\n`;
      }
    }
    
    return { success: true, output: formatted, error: null, branches };
  } catch (e) {
    return { success: false, output: e.message, error: e.message };
  }
}

// Commit log
function commitLog(args) {
  const { limit = 10, stat, oneline } = args;
  
  if (!isGitRepo()) {
    return { success: false, output: 'Not a git repository', error: 'Not a git repo' };
  }
  
  try {
    let format = oneline ? '%h|%s|%an|%ad' : '%h|%s|%b|%an|%ad|%ar';
    let flags = `-n ${limit}`;
    if (stat) flags += ' --stat';
    
    const output = git(`log ${flags} --format="${format}"`);
    const commits = output.split('\n---COMMIT---').map(c => c.trim()).filter(c => c);
    
    let formatted = `Recent Commits (${commits.length} shown):\n\n`;
    
    for (const commit of commits) {
      const parts = commit.split('|');
      const [hash, subject, body, author, date, relative] = parts;
      
      formatted += `● ${hash} ${subject}\n`;
      if (!oneline) {
        if (body) formatted += `  ${body.slice(0, 80)}...\n`;
        formatted += `  ${author} - ${relative || date}\n`;
      }
      formatted += '\n';
    }
    
    return { success: true, output: formatted, error: null, commits: commits.length };
  } catch (e) {
    return { success: false, output: e.message, error: e.message };
  }
}

// Diff operations
function diff(args) {
  const { from, to, file, staged, cached, stat, nameOnly } = args;
  
  if (!isGitRepo()) {
    return { success: false, output: 'Not a git repository', error: 'Not a git repo' };
  }
  
  try {
    let diffArgs = '';
    
    if (staged || cached) diffArgs += '--cached ';
    if (stat) diffArgs += '--stat ';
    if (nameOnly) diffArgs += '--name-only ';
    
    if (from && to) {
      diffArgs += `${from}..${to}`;
    } else if (from) {
      diffArgs += from;
    } else if (file) {
      diffArgs += file;
    }
    
    const output = git(`diff ${diffArgs}`.trim());
    
    if (!output) {
      return { success: true, output: 'No changes found', error: null, hasChanges: false };
    }
    
    const hasChanges = output.trim().length > 0;
    let formatted = hasChanges ? `Changes:\n\n${output}` : 'No changes';
    
    if (stat) {
      const files = output.split('\n').filter(l => l.includes('|'));
      return { success: true, output: formatted, error: null, hasChanges, files: files.length };
    }
    
    return { success: true, output: formatted, error: null, hasChanges };
  } catch (e) {
    return { success: false, output: e.message, error: e.message };
  }
}

// Git status
function status(args) {
  const { short, branch: showBranch } = args;
  
  if (!isGitRepo()) {
    return { success: false, output: 'Not a git repository', error: 'Not a git repo' };
  }
  
  try {
    const flag = short ? '-s' : '';
    let output = git(`status ${flag}`.trim());
    
    const currentBranch = getCurrentBranch();
    const isClean = !output.includes('nothing to commit');
    
    if (short) {
      const lines = output.split('\n').filter(l => l.trim());
      const staged = lines.filter(l => l.startsWith(' ')).length;
      const modified = lines.filter(l => l.startsWith('M') || l.startsWith('AM')).length;
      
      output = `Branch: ${currentBranch}\n`;
      output += `Status: ${isClean ? 'Clean' : 'Dirty'}\n`;
      if (modified > 0) output += `Modified: ${modified} files\n`;
      
      return { success: true, output, error: null, isClean, currentBranch };
    }
    
    return { success: true, output, error: null, isClean, currentBranch };
  } catch (e) {
    return { success: false, output: e.message, error: e.message };
  }
}

// CLI routing
const command = process.argv[2];
let args = {};

if (process.argv[3]) {
  try {
    args = JSON.parse(process.argv[3]);
  } catch {
    args = {};
  }
}

let result;

switch (command) {
  case 'branch':
    result = branch(args);
    break;
  case 'branches':
    result = listBranches(args);
    break;
  case 'log':
    result = commitLog(args);
    break;
  case 'diff':
    result = diff(args);
    break;
  case 'status':
    result = status(args);
    break;
  default:
    result = {
      success: false,
      output: `Unknown command: ${command}. Available: branch, branches, log, diff, status`,
      error: 'Unknown command'
    };
}

console.log(JSON.stringify(result, null, 2));
