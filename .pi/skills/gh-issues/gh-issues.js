#!/usr/bin/env node

/**
 * GitHub Issues CLI - Fetch and process GitHub issues with auto-fix sub-agents
 * Based on OpenClaw's gh-issues tool
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const https = require('https');

const BASE_URL = 'api.github.com';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function getToken() {
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
}

function githubRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    if (!token) {
      return reject(new Error('GH_TOKEN environment variable not set'));
    }

    const url = new URL(endpoint, `https://${BASE_URL}`);
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'thepopebot-gh-issues',
      'Authorization': `token ${token}`
    };

    const reqOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`GitHub API error: ${res.statusCode} ${JSON.stringify(json)}`));
          }
        } catch (e) {
          reject(new Error(`GitHub API error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

function parseRepo(repo) {
  // Handle owner/repo format
  if (repo.includes('/')) {
    return repo.split('/');
  }
  // Try to get from git remote
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remote.match(/[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      return [match[1], match[2]];
    }
  } catch (e) {
    // Ignore
  }
  throw new Error('Please specify owner/repo or run from a git repository');
}

async function cmdList(args) {
  let repo = args[0];
  if (!repo) {
    try {
      const parsed = parseRepo();
      repo = parsed.join('/');
    } catch (e) {
      log('Error: Please specify owner/repo', 'red');
      process.exit(1);
    }
  }
  
  if (!repo) {
    log('Error: Please specify owner/repo', 'red');
    process.exit(1);
  }
  
  const [owner, repoName] = repo.split('/');
  
  let endpoint = `/repos/${owner}/${repoName}/issues?state=open`;
  
  const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : null;
  const assignee = args.includes('--assignee') ? args[args.indexOf('--assignee') + 1] : null;
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 30;
  const state = args.includes('--state') ? args[args.indexOf('--state') + 1] : 'open';
  const milestone = args.includes('--milestone') ? args[args.indexOf('--milestone') + 1] : null;
  
  const params = new URLSearchParams();
  params.set('state', state);
  if (label) params.set('labels', label);
  if (assignee) params.set('assignee', assignee);
  if (milestone) params.set('milestone', milestone);
  params.set('per_page', Math.min(limit, 100));
  
  const issues = await githubRequest(`/repos/${owner}/${repoName}/issues?${params}`);
  
  // Filter out pull requests
  const realIssues = issues.filter(issue => !issue.pull_request);
  
  log(`\n${colors.bright}Open Issues in ${owner}/${repoName}${colors.reset}\n`, 'cyan');
  
  if (realIssues.length === 0) {
    log('No issues found', 'yellow');
    return;
  }
  
  realIssues.slice(0, limit).forEach(issue => {
    const labels = issue.labels.map(l => l.name).join(', ') || 'none';
    log(`#${issue.number}: ${issue.title}`, 'green');
    log(`  Labels: ${labels}`);
    log(`  Assignees: ${issue.assignees.map(a => a.login).join(', ') || 'none'}`);
    log(`  Created: ${new Date(issue.created_at).toLocaleDateString()}`);
    log('');
  });
  
  log(`Total: ${realIssues.length} issues\n`, 'blue');
}

async function cmdGet(args) {
  const repo = args[0] || parseRepo().join('/');
  const issueNum = parseInt(args[1]);
  
  if (!issueNum) {
    log('Error: Please specify issue number', 'red');
    process.exit(1);
  }
  
  const [owner, repoName] = repo.split('/');
  
  const issue = await githubRequest(`/repos/${owner}/${repoName}/issues/${issueNum}`);
  const showComments = args.includes('--comments') || args.includes('-c');
  
  log(`\n${colors.bright}#${issue.number}: ${issue.title}${colors.reset}\n`, 'cyan');
  log(`State: ${issue.state}`);
  log(`Author: ${issue.user.login}`);
  log(`Labels: ${issue.labels.map(l => l.name).join(', ')}`);
  log(`Assignees: ${issue.assignees.map(a => a.login).join(', ')}`);
  log(`Created: ${new Date(issue.created_at).toLocaleString()}`);
  log(`Updated: ${new Date(issue.updated_at).toLocaleString()}`);
  log(`\n${colors.yellow}Body:${colors.reset}`);
  log(issue.body || '(No body)');
  
  if (showComments) {
    const comments = await githubRequest(`/repos/${owner}/${repoName}/issues/${issueNum}/comments`);
    log(`\n${colors.yellow}Comments (${comments.length}):${colors.reset}`);
    comments.forEach(comment => {
      log(`\n--- ${comment.user.login} on ${new Date(comment.created_at).toLocaleString()} ---`);
      log(comment.body);
    });
  }
}

async function cmdComments(args) {
  const repo = args[0];
  const issueNum = parseInt(args[1]);
  
  if (!repo || !issueNum) {
    log('Error: Please specify repo and issue number', 'red');
    process.exit(1);
  }
  
  const [owner, repoName] = repo.split('/');
  const comments = await githubRequest(`/repos/${owner}/${repoName}/issues/${issueNum}/comments`);
  
  log(`\n${colors.bright}Comments on #${issueNum}${colors.reset}\n`, 'cyan');
  
  if (comments.length === 0) {
    log('No comments yet');
    return;
  }
  
  comments.forEach(comment => {
    log(`\n--- ${comment.user.login} on ${new Date(comment.created_at).toLocaleString()} ---`);
    log(comment.body);
  });
}

async function cmdSearch(args) {
  const repo = args[0];
  const query = args.slice(1).join(' ').replace('--label', '').replace('--assignee', '').trim();
  
  if (!repo && !query) {
    log('Error: Please specify search query', 'red');
    process.exit(1);
  }
  
  let searchQuery = query;
  if (repo && !query.includes('repo:')) {
    searchQuery = `repo:${repo} ${query}`;
  }
  
  const results = await githubRequest(`/search/issues?q=${encodeURIComponent(searchQuery)}`);
  
  log(`\n${colors.bright}Search Results (${results.total_count})${colors.reset}\n`, 'cyan');
  
  results.items.forEach(issue => {
    log(`#${issue.number}: ${issue.title}`, 'green');
    log(`  Labels: ${issue.labels.map(l => l.name).join(', ')}`);
    log(`  State: ${issue.state}`);
    log('');
  });
}

async function cmdAutoFix(args) {
  const repo = args[0];
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 3;
  const dryRun = args.includes('--dry-run');
  const fork = args.includes('--fork');
  const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : null;
  
  if (!repo) {
    log('Error: Please specify owner/repo', 'red');
    process.exit(1);
  }
  
  const [owner, repoName] = repo.split('/');
  
  let endpoint = `/repos/${owner}/${repoName}/issues?state=open&per_page=${limit}`;
  if (label) endpoint += `&labels=${label}`;
  
  const issues = await githubRequest(endpoint);
  const realIssues = issues.filter(issue => !issue.pull_request).slice(0, limit);
  
  log(`\n${colors.bright}Auto-Fix Mode${colors.reset}`);
  log(`Repository: ${owner}/${repoName}`);
  log(`Issues to process: ${realIssues.length}`);
  if (dryRun) log(`Mode: DRY RUN\n`, 'yellow');
  
  for (const issue of realIssues) {
    log(`\n${colors.green}Processing #${issue.number}: ${issue.title}${colors.reset}`);
    
    if (dryRun) {
      log(`  Would spawn agent to fix this issue`);
      continue;
    }
    
    // Spawn a sub-agent to fix this issue
    const jobDescription = `
Fix GitHub issue #${issue.number} in ${owner}/${repoName}

Issue Title: ${issue.title}
Issue Body:
${issue.body}

Please analyze this issue and create a fix. When done, add a comment to the issue with the fix details.
`;
    
    // Try to spawn a delegate agent if available
    try {
      const delegateScript = path.join(__dirname, '../delegate-agent/delegate-spawn.js');
      if (fs.existsSync(delegateScript)) {
        const { spawn } = require('child_process');
        const proc = spawn('node', [delegateScript, '--job', jobDescription], {
          stdio: 'inherit'
        });
        await new Promise((resolve, reject) => {
          proc.on('close', code => code === 0 ? resolve() : reject(new Error(`Exit code: ${code}`)));
        });
        log(`  Agent completed for issue #${issue.number}`);
      } else {
        log(`  Delegate agent not available - manual fix needed`, 'yellow');
      }
    } catch (e) {
      log(`  Error: ${e.message}`, 'red');
    }
  }
}

async function cmdReviews(args) {
  const repo = args[0];
  const watch = args.includes('--watch');
  const interval = args.includes('--interval') ? parseInt(args[args.indexOf('--interval') + 1]) : 5;
  
  if (!repo) {
    log('Error: Please specify owner/repo', 'red');
    process.exit(1);
  }
  
  const [owner, repoName] = repo.split('/');
  
  async function checkReviews() {
    const pulls = await githubRequest(`/repos/${owner}/${repoName}/pulls?state=open`);
    
    log(`\n${colors.bright}Open Pull Requests with Reviews${colors.reset}\n`, 'cyan');
    
    let foundAny = false;
    for (const pr of pulls) {
      const reviews = await githubRequest(`/repos/${owner}/${repoName}/pulls/${pr.number}/reviews`);
      if (reviews.length > 0) {
        foundAny = true;
        log(`#${pr.number}: ${pr.title}`, 'green');
        log(`  Reviews: ${reviews.length}`);
        const latest = reviews[reviews.length - 1];
        log(`  Latest: ${latest.state} by ${latest.user.login}`);
        log('');
      }
    }
    
    if (!foundAny) {
      log('No PRs with reviews found');
    }
  }
  
  if (watch) {
    log(`Watching for new review comments every ${interval} minutes...\n`);
    await checkReviews();
    // Note: Full watch implementation would need setInterval
  } else {
    await checkReviews();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log(`
${colors.bright}GitHub Issues CLI${colors.reset}
Fetch and process GitHub issues with auto-fix sub-agents.

${colors.cyan}Commands:${colors.reset}
  list <repo>              List issues
  get <repo> <num>         Get issue details
  comments <repo> <num>    Get issue comments
  search <repo> <query>   Search issues
  auto-fix <repo>         Process issues with sub-agents
  reviews <repo>          Check PR reviews

${colors.cyan}Options:${colors.reset}
  --label <name>          Filter by label
  --assignee <user>       Filter by assignee
  --limit <num>           Max results (default: 30)
  --state <state>         open, closed, all
  --watch                 Keep polling
  --interval <min>        Poll interval in minutes
  --dry-run               Show issues without processing
  --fork                  Use fork for branches

${colors.cyan}Environment:${colors.reset}
  GH_TOKEN                GitHub personal access token

${colors.cyan}Examples:${colors.reset}
  gh-issues list owner/repo --label bug
  gh-issues get owner/repo 42
  gh-issues auto-fix owner/repo --label bug --limit 3 --dry-run
  gh-issues reviews owner/repo --watch
`);
    process.exit(0);
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  try {
    switch (command) {
      case 'list':
        await cmdList(commandArgs);
        break;
      case 'get':
        await cmdGet(commandArgs);
        break;
      case 'comments':
        await cmdComments(commandArgs);
        break;
      case 'search':
        await cmdSearch(commandArgs);
        break;
      case 'auto-fix':
      case 'autofix':
        await cmdAutoFix(commandArgs);
        break;
      case 'reviews':
        await cmdReviews(commandArgs);
        break;
      default:
        log(`Unknown command: ${command}`, 'red');
        log('Run gh-issues --help for usage');
        process.exit(1);
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
