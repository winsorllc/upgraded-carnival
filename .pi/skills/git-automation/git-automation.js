#!/usr/bin/env node

/**
 * Git Automation - Automate Git operations
 * 
 * Usage:
 *   git-automation.js --branch feature/new-feature --message "Add new feature"
 *   git-automation.js --pr --title "PR Title" --body "Description"
 *   git-automation.js --log --count 10
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to run git commands
function git(...args) {
  try {
    return execSync(`git ${args.join(' ')}`, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    return { error: error.message, stdout: error.stdout, stderr: error.stderr };
  }
}

// Get current repo info
function getRepoInfo() {
  const info = {
    root: null,
    currentBranch: null,
    remotes: []
  };
  
  try {
    info.root = git('rev-parse', '--show-toplevel');
    info.currentBranch = git('rev-parse', '--abbrev-ref', 'HEAD');
    
    const remotesOutput = git('remote', '-v');
    if (remotesOutput) {
      const remotes = remotesOutput.split('\n').filter(r => r.trim());
      remotes.forEach(r => {
        const match = r.match(/(\S+)\s+\((\w+)\)/);
        if (match) {
          info.remotes.push({ name: match[1], type: match[2] });
        }
      });
    }
  } catch (e) {
    // Not a git repo
  }
  
  return info;
}

// Create and checkout branch
function createBranch(branchName) {
  const result = git('checkout', '-b', branchName);
  if (result.error) {
    return { success: false, error: result.error };
  }
  return { success: true, branch: branchName };
}

// Commit changes
function commit(message) {
  // Check if there are staged changes
  let status = git('status', '--porcelain');
  
  if (!status) {
    return { success: false, message: 'No changes to commit' };
  }
  
  // Stage all changes
  git('add', '-A');
  
  // Commit
  const result = git('commit', '-m', message);
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  // Get commit hash
  const hash = git('rev-parse', 'HEAD');
  const shortHash = git('rev-parse', '--short', 'HEAD');
  
  return { 
    success: true, 
    message: 'Changes committed',
    hash,
    shortHash
  };
}

// Create pull request (GitHub CLI)
function createPR(title, body, branch) {
  // Check if gh is installed
  try {
    execSync('which gh', { stdio: 'ignore' });
  } catch (e) {
    return { success: false, error: 'GitHub CLI (gh) not installed' };
  }
  
  const currentBranch = branch || git('rev-parse', '--abbrev-ref', 'HEAD');
  
  try {
    const result = execSync(
      `gh pr create --title "${title}" --body "${body || ''}" --base main`,
      { encoding: 'utf-8' }
    ).trim();
    
    return { success: true, url: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// List branches
function listBranches() {
  const result = git('branch', '-a');
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  const branches = result.split('\n').map(b => b.trim()).filter(b => b);
  return { 
    success: true, 
    branches: branches.map(b => ({
      name: b.replace(/^\* /, ''),
      current: b.startsWith('* ')
    }))
  };
}

// Show commit log
function showLog(count = 10) {
  const result = git('log', `--max-count=${count}`, '--oneline', '--decorate');
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  const commits = result.split('\n').filter(c => c.trim());
  return { 
    success: true, 
    commits: commits.map(c => {
      const match = c.match(/^([a-f0-9]+)\s+\(([^)]+)\)\s+(.+)$/);
      if (match) {
        return { hash: match[1], refs: match[2], message: match[3] };
      }
      return { raw: c };
    })
  };
}

// Push to remote
function push(branch = null, all = false) {
  let result;
  
  if (all) {
    result = git('push', '--all', 'origin');
  } else if (branch) {
    result = git('push', '-u', 'origin', branch);
  } else {
    result = git('push');
  }
  
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  return { success: true, message: 'Pushed successfully' };
}

// Get diff
function getDiff(file = null) {
  let result;
  
  if (file) {
    result = git('diff', file);
  } else {
    result = git('diff');
  }
  
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  return { success: true, diff: result };
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  branch: null,
  commit: false,
  message: null,
  pr: false,
  title: null,
  body: null,
  listBranches: false,
  log: false,
  count: 10,
  push: false,
  all: false,
  diff: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  switch (arg) {
    case '--branch':
      options.branch = nextArg;
      i++;
      break;
    case '--commit':
      options.commit = true;
      break;
    case '--message':
      options.message = nextArg;
      i++;
      break;
    case '--pr':
      options.pr = true;
      break;
    case '--title':
      options.title = nextArg;
      i++;
      break;
    case '--body':
      options.body = nextArg;
      i++;
      break;
    case '--list-branches':
      options.listBranches = true;
      break;
    case '--log':
      options.log = true;
      break;
    case '--count':
      options.count = parseInt(nextArg);
      i++;
      break;
    case '--push':
      options.push = true;
      break;
    case '--all':
      options.all = true;
      break;
    case '--diff':
      options.diff = true;
      break;
    case '--help':
    case '-h':
      console.log(`
Git Automation - Automate Git operations

Usage:
  git-automation.js --branch <branch> --message <msg>
  git-automation.js --pr --title <title> --body <body>
  git-automation.js --log --count 10

Options:
  --branch <name>    Create and switch to branch
  --commit           Commit staged changes
  --message <msg>    Commit message
  --pr               Create pull request
  --title <title>    PR title
  --body <body>      PR body
  --list-branches    List all branches
  --log              Show commit log
  --count <n>        Number of commits (default: 10)
  --push             Push to remote
  --all              Push all branches
  --diff             Show working directory diff

Examples:
  git-automation.js --branch feature/new-feature --message "Add new feature"
  git-automation.js --commit --message "Fix bug"
  git-automation.js --pr --title "New Feature" --body "Description"
      `.trim());
      process.exit(0);
  }
}

// Main execution
function main() {
  const repoInfo = getRepoInfo();
  
  if (options.branch) {
    console.log(JSON.stringify(createBranch(options.branch), null, 2));
  } else if (options.commit) {
    if (!options.message) {
      console.error('Error: --message is required for commit');
      process.exit(1);
    }
    console.log(JSON.stringify(commit(options.message), null, 2));
  } else if (options.pr) {
    if (!options.title) {
      console.error('Error: --title is required for PR');
      process.exit(1);
    }
    console.log(JSON.stringify(createPR(options.title, options.body), null, 2));
  } else if (options.listBranches) {
    console.log(JSON.stringify(listBranches(), null, 2));
  } else if (options.log) {
    console.log(JSON.stringify(showLog(options.count), null, 2));
  } else if (options.push) {
    console.log(JSON.stringify(push(null, options.all), null, 2));
  } else if (options.diff) {
    console.log(JSON.stringify(getDiff(), null, 2));
  } else {
    // Default: show repo info
    console.log(JSON.stringify(repoInfo, null, 2));
  }
}

main();
