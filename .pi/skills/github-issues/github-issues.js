#!/usr/bin/env node

/**
 * GitHub Issues - Simple issue management via GitHub API
 * Based on OpenClaw's github-issues capability
 */

const https = require('https');

const BASE_URL = 'api.github.com';

// Simple colors
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
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_OUTPUT?.split('\n')?.find(s => s.startsWith('gh_token='))?.split('=')[1];
}

function githubRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const url = new URL(endpoint, `https://${BASE_URL}`);
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'thepopebot-github-issues',
      ...(token && { 'Authorization': `token ${token}` }),
      ...options.headers
    };
    
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    
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
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
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

function parseArgs(args) {
  const parsed = {
    repo: null,
    number: null,
    options: {}
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      if (!parsed.repo) parsed.repo = arg;
      else if (!parsed.number) parsed.number = parseInt(arg);
    } else if (arg === '--label' || arg === '-l') {
      parsed.options.label = args[++i];
    } else if (arg === '--body' || arg === '-b') {
      parsed.options.body = args[++i];
    } else if (arg === '--title' || arg === '-t') {
      parsed.options.title = args[++i];
    } else if (arg === '--assignee') {
      parsed.options.assignee = args[++i];
    } else if (arg === '--add-label') {
      parsed.options.addLabel = args[++i];
    } else if (arg === '--remove-label') {
      parsed.options.removeLabel = args[++i];
    } else if (arg === '--state') {
      parsed.options.state = args[++i];
    } else if (arg === '--json') {
      parsed.options.json = true;
    } else if (arg === '--comments' || arg === '-c') {
      parsed.options.comments = true;
    }
    i++;
  }
  
  return parsed;
}

async function listIssues(repo, options) {
  const [owner, repoName] = repo.split('/');
  const params = new URLSearchParams();
  params.set('state', options.state || 'open');
  if (options.label) params.set('labels', options.label);
  if (options.assignee) params.set('assignee', options.assignee);
  
  const issues = await githubRequest(`/repos/${owner}/${repoName}/issues?${params}`);
  const filtered = issues.filter(i => !i.pull_request);
  
  if (options.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }
  
  log(`\n${colors.bright}Issues in ${owner}/${repoName}${colors.reset}\n`, 'cyan');
  
  if (filtered.length === 0) {
    log('No issues found');
    return;
  }
  
  filtered.forEach(issue => {
    log(`#${issue.number}: ${issue.title}`, 'green');
    log(`  Labels: ${issue.labels.map(l => l.name).join(', ') || 'none'}`);
    log(`  State: ${issue.state}`);
    log('');
  });
}

async function getIssue(repo, number, options) {
  const [owner, repoName] = repo.split('/');
  
  const issue = await githubRequest(`/repos/${owner}/${repoName}/issues/${number}`);
  
  if (options.json) {
    console.log(JSON.stringify(issue, null, 2));
    return;
  }
  
  log(`\n${colors.bright}#${issue.number}: ${issue.title}${colors.reset}\n`, 'cyan');
  log(`State: ${issue.state}`);
  log(`Author: ${issue.user.login}`);
  log(`Labels: ${issue.labels.map(l => l.name).join(', ')}`);
  log(`Created: ${new Date(issue.created_at).toLocaleString()}`);
  log(`\n${colors.yellow}Body:${colors.reset}`);
  log(issue.body || '(No body)');
  
  if (options.comments) {
    const comments = await githubRequest(`/repos/${owner}/${repoName}/issues/${number}/comments`);
    log(`\n${colors.yellow}Comments (${comments.length}):${colors.reset}`);
    comments.forEach(c => {
      log(`\n--- ${c.user.login} ---`);
      log(c.body);
    });
  }
}

async function createIssue(repo, title, options) {
  const [owner, repoName] = repo.split('/');
  
  const body = {
    title,
    body: options.body || ''
  };
  
  if (options.label) body.labels = options.label.split(',');
  if (options.assignee) body.assignee = options.assignee;
  
  const issue = await githubRequest(`/repos/${owner}/${repoName}/issues`, {
    method: 'POST',
    body
  });
  
  log(`\n${colors.green}Created issue #${issue.number}: ${issue.title}${colors.reset}`);
  log(`URL: ${issue.html_url}`);
}

async function updateIssue(repo, number, options) {
  const [owner, repoName] = repo.split('/');
  
  const body = {};
  if (options.title) body.title = options.title;
  if (options.body) body.body = options.body;
  if (options.state) body.state = options.state;
  if (options.addLabel) body.labels = { add: options.addLabel.split(',') };
  if (options.removeLabel) body.labels = { remove: options.removeLabel.split(',') };
  if (options.assignee) body.assignee = [options.assignee];
  
  const issue = await githubRequest(`/repos/${owner}/${repoName}/issues/${number}`, {
    method: 'PATCH',
    body
  });
  
  log(`\n${colors.green}Updated issue #${issue.number}: ${issue.title}${colors.reset}`);
}

async function closeIssue(repo, number, reopen = false) {
  const [owner, repoName] = repo.split('/');
  
  const issue = await githubRequest(`/repos/${owner}/${repoName}/issues/${number}`, {
    method: 'PATCH',
    body: { state: reopen ? 'open' : 'closed' }
  });
  
  log(`\n${colors.green}Issue #${issue.number} is now ${issue.state}${colors.reset}`);
}

async function commentIssue(repo, number, comment) {
  const [owner, repoName] = repo.split('/');
  
  const result = await githubRequest(`/repos/${owner}/${repoName}/issues/${number}/comments`, {
    method: 'POST',
    body: { body: comment }
  });
  
  log(`\n${colors.green}Added comment to issue #${number}${colors.reset}`);
  log(`URL: ${result.html_url}`);
}

async function listComments(repo, number) {
  const [owner, repoName] = repo.split('/');
  
  const comments = await githubRequest(`/repos/${owner}/${repoName}/issues/${number}/comments`);
  
  log(`\n${colors.bright}Comments on #${number}${colors.reset}\n`, 'cyan');
  
  if (comments.length === 0) {
    log('No comments');
    return;
  }
  
  comments.forEach(c => {
    log(`--- ${c.user.login} on ${new Date(c.created_at).toLocaleString()} ---`);
    log(c.body);
    log('');
  });
}

async function searchIssues(query) {
  const results = await githubRequest(`/search/issues?q=${encodeURIComponent(query)}`);
  
  log(`\n${colors.bright}Search Results (${results.total_count})${colors.reset}\n`, 'cyan');
  
  results.items.forEach(issue => {
    log(`#${issue.number}: ${issue.title}`, 'green');
    log(`  Labels: ${issue.labels.map(l => l.name).join(', ')}`);
    log(`  State: ${issue.state}`);
    log('');
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log(`
${colors.bright}GitHub Issues Manager${colors.reset}
Simple issue management via GitHub API

${colors.cyan}Commands:${colors.reset}
  list <repo> [options]              List issues
  get <repo> <num> [options]        Get issue details
  create <repo> <title> [options]   Create issue
  update <repo> <num> [options]      Update issue
  close <repo> <num>                Close issue
  reopen <repo> <num>                Reopen issue
  comment <repo> <num> <text>        Add comment
  comments <repo> <num>              List comments
  search <query>                    Search issues

${colors.cyan}Options:${colors.reset}
  --label, -l <name>        Label(s)
  --body, -b <text>        Body text
  --title, -t <text>       Title
  --assignee <user>        Assignee
  --add-label <label>      Add label
  --remove-label <label>  Remove label
  --state <state>          open/closed
  --comments, -c          Include comments
  --json                  JSON output

${colors.cyan}Examples:${colors.reset}
  github-issues.js list owner/repo
  github-issues.js list owner/repo --label bug
  github-issues.js get owner/repo 42
  github-issues.js create owner/repo "New bug" --body "Description" --label bug
  github-issues.js close owner/repo 42
`);
    process.exit(0);
  }
  
  const cmd = args[0];
  const cmdArgs = args.slice(1);
  
  if (!getToken()) {
    log('Error: GH_TOKEN environment variable not set', 'red');
    process.exit(1);
  }
  
  try {
    switch (cmd) {
      case 'list': {
        const { repo, options } = parseArgs(cmdArgs);
        await listIssues(repo, options);
        break;
      }
      case 'get': {
        const { repo, number, options } = parseArgs(cmdArgs);
        await getIssue(repo, number, options);
        break;
      }
      case 'create': {
        const { repo, number, options } = parseArgs(cmdArgs);
        await createIssue(repo, number, options); // number is actually title here
        break;
      }
      case 'update': {
        const { repo, number, options } = parseArgs(cmdArgs);
        await updateIssue(repo, number, options);
        break;
      }
      case 'close': {
        const { repo, number } = parseArgs(cmdArgs);
        await closeIssue(repo, number, false);
        break;
      }
      case 'reopen': {
        const { repo, number } = parseArgs(cmdArgs);
        await closeIssue(repo, number, true);
        break;
      }
      case 'comment': {
        const repo = cmdArgs[0];
        const num = parseInt(cmdArgs[1]);
        const text = cmdArgs.slice(2).join(' ');
        await commentIssue(repo, num, text);
        break;
      }
      case 'comments': {
        const { repo, number } = parseArgs(cmdArgs);
        await listComments(repo, number);
        break;
      }
      case 'search': {
        await searchIssues(cmdArgs.join(' '));
        break;
      }
      default:
        log(`Unknown command: ${cmd}`, 'red');
        process.exit(1);
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
