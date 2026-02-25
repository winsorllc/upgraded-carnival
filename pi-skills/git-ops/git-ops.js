#!/usr/bin/env node

/**
 * Git Operations Tool
 * Provides structured JSON output for git operations
 * Inspired by ZeroClaw's git_operations.rs
 */

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get workspace directory (default to cwd)
const workspaceDir = process.cwd();

// Colors for CLI output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Execute a git command and return output
 */
function git(command, args = []) {
  try {
    // Use execFileSync for safer argument handling (especially git format strings)
    const output = execFileSync('git', [command, ...args], {
      cwd: workspaceDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return { 
      success: false, 
      error: error.message.trim(),
      stderr: error.stderr?.trim()
    };
  }
}

/**
 * Sanitize git arguments to prevent injection
 */
function sanitizeArgs(args) {
  const dangerous = [
    '--exec=', '--upload-pack=', '--receive-pack=', 
    '--pager=', '--editor=', '--no-verify'
  ];
  
  for (const arg of args) {
    const argLower = arg.toLowerCase();
    
    // Check for dangerous options
    if (dangerous.some(d => argLower.startsWith(d))) {
      throw new Error(`Blocked dangerous git argument: ${arg}`);
    }
    
    // Check for shell injection patterns
    if (argLower.includes('$(') || argLower.includes('`') ||
        argLower.includes('|') || argLower.includes(';') ||
        argLower.includes('>')) {
      throw new Error(`Blocked shell injection pattern in: ${arg}`);
    }
    
    // Block -c config injection
    if (argLower === '-c' || argLower.startsWith('-c=')) {
      throw new Error(`Blocked config injection: ${arg}`);
    }
  }
  
  return args;
}

/**
 * Get repository status with structured output
 */
function status() {
  // Use --short for clean file status
  const shortResult = git('status', ['--short']);
  
  // Use --porcelain=2 for branch info
  const branchResult = git('status', ['--porcelain=2', '--branch']);
  
  if (!shortResult.success) {
    return { success: false, error: shortResult.error };
  }
  
  const data = {
    branch: '',
    tracking: '',
    ahead: 0,
    behind: 0,
    staged: [],
    unstaged: [],
    untracked: [],
    conflicted: []
  };
  
  const statusMap = {
    'M': 'modified',
    'A': 'added',
    'D': 'deleted',
    'R': 'renamed',
    'C': 'copied',
    'U': 'unmerged',
    '?': 'untracked',
    '!': 'ignored'
  };
  
  // Parse branch info from --porcelain=2
  if (branchResult.success) {
    for (const line of branchResult.output.split('\n')) {
      if (line.startsWith('# branch.head ')) {
        // Handle format: # branch.head <oid> [branch name]
        const rest = line.replace('# branch.head ', '');
        // Extract branch name (may have oid prefix)
        const match = rest.match(/^(\S+)\s+(.+)$/);
        if (match) {
          data.branch = match[2].replace(/ \(.*\)/, '');
        } else {
          data.branch = rest;
        }
      } else if (line.startsWith('# branch.upstream ')) {
        data.tracking = line.replace('# branch.upstream ', '');
      } else if (line.startsWith('# branch.ab ')) {
        const ab = line.replace('# branch.ab ', '');
        const match = ab.match(/([+-]\d+)\s+([+-]\d+)/);
        if (match) {
          data.ahead = parseInt(match[1]);
          data.behind = parseInt(match[2]);
        }
      }
    }
  }
  
  // Parse file status from --short
  for (const line of shortResult.output.split('\n')) {
    if (!line.trim()) continue;
    
    const x = line[0];
    const y = line[1];
    const filePath = line.substring(3).trim();
    
    // Index status (x) - staged
    if (x !== ' ' && x !== '?') {
      data.staged.push({
        path: filePath,
        status: x,
        description: statusMap[x] || 'unknown'
      });
    }
    
    // Worktree status (y) - unstaged/untracked
    if (y === '?') {
      data.untracked.push(filePath);
    } else if (y !== ' ' && y !== '?') {
      data.unstaged.push({
        path: filePath,
        status: y,
        description: statusMap[y] || 'unknown'
      });
    } else if (y === 'U') {
      data.conflicted.push({ path: filePath, status: 'U' });
    }
  }
  
  return { success: true, data };
}

/**
 * Get commit log
 */
function log(limit = 10, options = {}) {
  const format = options.format || '%H|%an|%ae|%ai|%s';
  const args = [`--format=${format}`, `-n`, String(limit)];
  
  if (options.all) {
    args.push('--all');
  }
  
  const result = git('log', args);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  const commits = result.output.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.split('|');
      if (parts.length >= 5) {
        return {
          hash: parts[0],
          shortHash: parts[0].substring(0, 7),
          author: parts[1],
          email: parts[2],
          date: parts[3],
          message: parts.slice(4).join('|')
        };
      }
      return null;
    })
    .filter(c => c !== null);
  
  return { success: true, data: commits };
}

/**
 * List branches
 */
function branch(options = {}) {
  const args = ['-v', '--format=%(refname:short)|%(objectname:short)|%(upstream:short)'];
  
  const result = git('branch', args);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  const branches = {
    current: '',
    local: [],
    remote: []
  };
  
  // Get current branch separately
  const currentResult = git('branch', ['--show-current']);
  if (currentResult.success) {
    branches.current = currentResult.output;
  }
  
  // Parse all branches
  for (const line of result.output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const parts = trimmed.split('|');
    const branchName = parts[0];
    
    if (!branchName) continue;
    
    if (!branchName.startsWith('remotes/')) {
      branches.local.push(branchName);
    }
  }
  
  // Get remote branches separately
  const remoteResult = git('branch', ['-r', '-v', '--format=%(refname:short)']);
  if (remoteResult.success) {
    for (const line of remoteResult.output.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.includes('HEAD')) {
        branches.remote.push(trimmed);
      }
    }
  }
  
  return { success: true, data: branches };
}

/**
 * Get diff output
 */
function diff(options = {}) {
  const args = [];
  if (options.staged) args.push('--staged');
  if (options.stat) args.push('--stat');
  if (options.nameOnly) args.push('--name-only');
  if (options.branch) args.push(options.branch);
  
  const result = git('diff', args);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  // Parse diff stats if requested
  if (options.stat) {
    const lines = result.output.split('\n').filter(l => l.trim());
    const stats = { files: [], total: { files: 0, insertions: 0, deletions: 0 } };
    
    for (const line of lines) {
      const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*[+-]+$/);
      if (match) {
        const file = match[1].trim();
        const changes = parseInt(match[2]);
        stats.files.push({ file, changes });
        stats.total.files++;
        stats.total.insertions += line.includes('+') ? changes : 0;
        stats.total.deletions += line.includes('-') ? changes : 0;
      }
    }
    
    return { success: true, data: stats };
  }
  
  return { success: true, data: { raw: result.output } };
}

/**
 * Get diff between commits
 */
function diffCommits(commit1, commit2) {
  const result = git('diff', [commit1, commit2]);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  return { success: true, data: { raw: result.output } };
}

/**
 * Stash operations
 */
function stash(operation, index = 0) {
  let result;
  
  switch (operation) {
    case 'list':
      result = git('stash', ['list', '--format=%gd|%gs|%ci']);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      const stashes = result.output.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split('|');
          return {
            index: parseInt(parts[0]?.replace('stash@{', '') || '0'),
            message: parts[1] || '',
            date: parts[2] || ''
          };
        });
      
      return { success: true, data: stashes };
      
    case 'show':
      result = git('stash', ['show', `stash@{${index}}`, '--stat']);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      // Parse the show output
      const files = result.output.split('\n')
        .filter(line => line.includes('|'))
        .map(line => {
          const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*[+-]+$/);
          if (match) {
            return {
              file: match[1].trim(),
              changes: parseInt(match[2])
            };
          }
          return null;
        })
        .filter(f => f !== null);
      
      return { success: true, data: { raw: result.output, files } };
      
    case 'push':
      result = git('stash', ['push', '-m', `WIP: ${new Date().toISOString()}`]);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true, data: { message: 'Changes stashed' } };
      
    case 'pop':
      result = git('stash', ['pop', `stash@{${index}}`]);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true, data: { message: 'Stash applied and dropped' } };
      
    case 'drop':
      result = git('stash', ['drop', `stash@{${index}}`]);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true, data: { message: 'Stash dropped' } };
      
    default:
      return { success: false, error: `Unknown stash operation: ${operation}` };
  }
}

/**
 * Get remote information
 */
function remote() {
  const result = git('remote', ['-v']);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  const remotes = {};
  for (const line of result.output.split('\n')) {
    const match = line.match(/^(\S+)\s+(\S+)\s+\((\w+)\)$/);
    if (match) {
      const name = match[1];
      const url = match[2];
      const type = match[3];
      if (!remotes[name]) remotes[name] = {};
      remotes[name][type] = url;
    }
  }
  
  return { success: true, data: remotes };
}

/**
 * Get repository info
 */
function revparse(options = {}) {
  if (options.all) {
    const result = git('rev-parse', ['--all', '--abbrev-ref', 'HEAD']);
    return result;
  }
  
  const args = [];
  if (options.short) args.push('--short');
  if (options.verify !== false) args.push('--verify');
  
  const result = git('rev-parse', [options.type || 'HEAD', ...args]);
  
  return result;
}

/**
 * Commit operations
 */
function commit(message, options = {}) {
  // Stage files
  const addArgs = options.all ? ['-A'] : ['-u'];
  const addResult = git('add', addArgs);
  
  if (!addResult.success) {
    return { success: false, error: `Failed to stage files: ${addResult.error}` };
  }
  
  // Create commit
  const args = ['commit', '-m', message];
  if (options.amend) args.push('--amend');
  
  const result = git('commit', args.slice(1)); // Remove 'commit' from args
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  // Get the commit hash
  const hashResult = git('rev-parse', ['HEAD']);
  
  return { 
    success: true, 
    data: { 
      message, 
      hash: hashResult.success ? hashResult.output : null 
    } 
  };
}

/**
 * Checkout operation
 */
function checkout(branch, options = {}) {
  const args = [];
  if (options.b) args.push('-b');
  args.push(branch);
  
  const result = git('checkout', args);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  return { success: true, data: { branch, created: options.b || false } };
}

/**
 * Create branch
 */
function branchCreate(branchName, options = {}) {
  const args = options.d ? ['-d', branchName] : ['-D', branchName];
  
  const result = git('branch', args);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  return { success: true, data: { branch: branchName, deleted: options.d } };
}

/**
 * Get file content at specific revision
 */
function show(revision, filePath) {
  const args = filePath ? [revision, '--', filePath] : [revision];
  const result = git('show', args);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  return { success: true, data: { raw: result.output } };
}

/**
 * Main CLI handler
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(JSON.stringify({
      error: 'Usage: git-ops.js <command> [options]',
      commands: ['status', 'log', 'branch', 'diff', 'stash', 'remote', 'revparse', 'commit', 'checkout', 'show']
    }, null, 2));
    process.exit(1);
  }
  
  const command = args[0];
  const options = {};
  
  // Parse options
  let i = 1;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--staged' || arg === '-S') {
      options.staged = true;
    } else if (arg === '--all' || arg === '-a') {
      options.all = true;
    } else if (arg === '--stat') {
      options.stat = true;
    } else if (arg === '--name-only') {
      options.nameOnly = true;
    } else if (arg === '--current') {
      options.current = true;
    } else if (arg === '--create') {
      options.create = args[++i];
    } else if (arg === '--limit' || arg === '-n') {
      options.limit = parseInt(args[++i]);
    } else if (arg === '--amend') {
      options.amend = true;
    } else if (arg === '--all-files' || arg === '-A') {
      options.all = true;
    } else if (arg === '-m') {
      options.message = args[++i];
    } else if (arg === '-b') {
      options.b = true;
    } else if (arg === '-d' || arg === '-D') {
      options.d = arg === '-d';
    } else if (arg.startsWith('--')) {
      // Store raw args for diff
      if (command === 'diff' && !arg.startsWith('--')) {
        options.branch = arg;
      }
    } else if (!arg.startsWith('-')) {
      // Positional arguments
      if (command === 'log' && !isNaN(arg)) {
        options.limit = parseInt(arg);
      } else if (command === 'stash' && !isNaN(arg)) {
        options.index = parseInt(arg);
      }
    }
    i++;
  }
  
  let result;
  
  try {
    sanitizeArgs(args);
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.message }, null, 2));
    process.exit(1);
  }
  
  switch (command) {
    case 'status':
      result = status();
      break;
      
    case 'log':
      result = log(options.limit || 10, options);
      break;
      
    case 'branch':
      if (options.create) {
        result = git('branch', [options.create]);
        result = result.success ? { success: true, data: { branch: options.create, created: true } } : result;
      } else {
        result = branch(options);
      }
      break;
      
    case 'diff':
      result = diff(options);
      break;
      
    case 'stash':
      const stashOp = args[1] || 'list';
      result = stash(stashOp, options.index || 0);
      break;
      
    case 'remote':
      result = remote();
      break;
      
    case 'revparse':
      result = revparse(options);
      break;
      
    case 'commit':
      if (!options.message) {
        result = { success: false, error: 'Commit message required (-m "message")' };
      } else {
        result = commit(options.message, options);
      }
      break;
      
    case 'checkout':
      if (args[1]) {
        result = checkout(args[1], options);
      } else {
        result = { success: false, error: 'Branch name required' };
      }
      break;
      
    case 'show':
      if (args[1]) {
        result = show(args[1], args[2]);
      } else {
        result = { success: false, error: 'Revision required' };
      }
      break;
      
    default:
      result = { success: false, error: `Unknown command: ${command}` };
  }
  
  // Wrap in standard response format
  const response = {
    success: result.success,
    command,
    ...(result.success ? { data: result.data } : { error: result.error })
  };
  
  console.log(JSON.stringify(response, null, 2));
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  status,
  log,
  branch,
  diff,
  stash,
  remote,
  revparse,
  commit,
  checkout,
  show,
  git
};
