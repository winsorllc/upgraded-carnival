#!/usr/bin/env node

/**
 * gh-issues — Auto-fix GitHub Issues with Parallel Sub-agents
 * 
 * Fetches GitHub issues, spawns sub-agents to implement fixes, and opens PRs.
 */

import { spawn } from 'child_process';
import { writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  maxAgents: 5,           // Max parallel sub-agents
  retryAttempts: 3,       // API retry attempts
  retryDelay: 5000,       // Retry delay in ms
  defaultLimit: 10,       // Default issue limit
  defaultInterval: 5,     // Default watch interval (minutes)
};

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const parsed = {
    repo: null,
    label: null,
    limit: CONFIG.defaultLimit,
    milestone: null,
    assignee: null,
    state: 'open',
    fork: null,
    watch: false,
    interval: CONFIG.defaultInterval,
    dryRun: false,
    yes: false,
    cron: false,
    model: null,
    notifyChannel: null,
    reviewsOnly: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    // Positional: owner/repo
    if (!arg.startsWith('--') && !arg.startsWith('-') && !parsed.repo) {
      parsed.repo = arg;
      i++;
      continue;
    }
    
    switch (arg) {
      case '--label':
        parsed.label = args[++i];
        break;
      case '--limit':
        parsed.limit = parseInt(args[++i], 10);
        break;
      case '--milestone':
        parsed.milestone = args[++i];
        break;
      case '--assignee':
        parsed.assignee = args[++i];
        break;
      case '--state':
        parsed.state = args[++i];
        break;
      case '--fork':
        parsed.fork = args[++i];
        break;
      case '--watch':
        parsed.watch = true;
        break;
      case '--interval':
        parsed.interval = parseInt(args[++i], 10);
        break;
      case '--dry-run':
        parsed.dryRun = true;
        break;
      case '--yes':
        parsed.yes = true;
        break;
      case '--cron':
        parsed.cron = true;
        parsed.yes = true; // Cron mode implies auto-yes
        break;
      case '--model':
        parsed.model = args[++i];
        break;
      case '--notify-channel':
        parsed.notifyChannel = args[++i];
        break;
      case '--reviews-only':
        parsed.reviewsOnly = true;
        break;
    }
    i++;
  }

  return parsed;
}

/**
 * Resolve GitHub token from environment or config
 */
async function resolveToken() {
  // Check environment variable
  if (process.env.GH_TOKEN) {
    return process.env.GH_TOKEN;
  }

  // Check config file
  try {
    const configPath = join(process.env.HOME, '.thepopebot', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    if (config.skills?.['gh-issues']?.apiKey) {
      return config.skills['gh-issues'].apiKey;
    }
  } catch (err) {
    // Config file doesn't exist or is invalid
  }

  throw new Error(
    'GH_TOKEN not found. Set environment variable or configure in ~/.thepopebot/config.json'
  );
}

/**
 * Detect repo from git remote or use provided value
 */
async function detectRepo(providedRepo) {
  if (providedRepo) {
    return providedRepo;
  }

  // Try to detect from git remote
  return new Promise((resolve, reject) => {
    const git = spawn('git', ['remote', 'get-url', 'origin']);
    let output = '';
    
    git.stdout.on('data', (data) => {
      output += data.toString();
    });

    git.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Not in a git repository or no origin remote'));
        return;
      }

      // Parse repo from URL
      const url = output.trim();
      const match = url.match(/github\.com[:/]([^/]+)\/([^.]+)\.git$/);
      if (match) {
        resolve(`${match[1]}/${match[2]}`);
      } else {
        reject(new Error('Could not parse owner/repo from git remote'));
      }
    });
  });
}

/**
 * Fetch issues from GitHub API
 */
async function fetchIssues(token, repo, options) {
  const [owner, name] = repo.split('/');
  
  // Build query parameters
  const params = new URLSearchParams({
    state: options.state,
    per_page: Math.min(options.limit, 100),
    sort: 'created',
    direction: 'desc',
  });

  if (options.label) {
    params.append('labels', options.label);
  }

  if (options.milestone) {
    params.append('milestone', options.milestone);
  }

  if (options.assignee) {
    params.append('assignee', options.assignee === '@me' ? 'currentUser' : options.assignee);
  }

  const url = `https://api.github.com/repos/${owner}/${name}/issues?${params}`;

  console.log(`Fetching issues from: ${url}`);

  // Fetch with retry
  for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'thepopebot-gh-issues',
        },
      });

      if (!response.ok) {
        if (response.status === 403 && attempt < CONFIG.retryAttempts) {
          console.log(`Rate limited, retrying in ${CONFIG.retryDelay}ms...`);
          await sleep(CONFIG.retryDelay * attempt);
          continue;
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const issues = await response.json();
      console.log(`Fetched ${issues.length} issues`);
      
      return issues;
    } catch (err) {
      if (attempt === CONFIG.retryAttempts) {
        throw err;
      }
      await sleep(CONFIG.retryDelay);
    }
  }

  return [];
}

/**
 * Spawn a sub-agent to fix an issue
 */
async function spawnSubAgent(issue, repo, options) {
  const branchName = `fix/issue-${issue.number}-${slugify(issue.title)}`;
  
  const prompt = `Fix GitHub issue #${issue.number}: "${issue.title}"

Issue Body:
${issue.body || 'No description provided.'}

Comments:
${issue.comments > 0 ? '(Comments would be fetched and included here)' : 'No comments.'}

Repo: ${repo}
Branch: ${branchName}

Please:
1. Analyze the issue
2. Implement a fix
3. Test the changes
4. Commit with message: "Fix #${issue.number}: ${issue.title}"
5. Open a pull request

${options.fork ? `Push to fork: ${options.fork}` : ''}
`;

  console.log(`\n🤖 Spawning sub-agent for issue #${issue.number}: ${issue.title}`);
  console.log(`   Branch: ${branchName}`);

  if (options.dryRun) {
    console.log('   [DRY RUN] Would spawn agent with prompt:', prompt.substring(0, 200) + '...');
    return { issue, branch: branchName, status: 'dry-run' };
  }

  // In real implementation, this would use the delegate-task skill
  // For now, we'll simulate with a child process
  return { issue, branch: branchName, status: 'spawned', prompt };
}

/**
 * Slugify a string for branch names
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Monitor PRs until they're merged or closed
 */
async function monitorPRs(token, repo, agents) {
  const [owner, name] = repo.split('/');
  
  console.log('\n📊 Monitoring PRs...');
  
  const results = [];
  
  for (const agent of agents) {
    if (agent.status === 'dry-run') {
      results.push({ ...agent, pr: null, merged: false });
      continue;
    }

    // In real implementation, this would poll GitHub API for PR status
    console.log(`  ⏳ ${agent.branch}: Waiting for PR...`);
    
    // Simulate monitoring
    await sleep(1000);
    
    results.push({
      ...agent,
      pr: `https://github.com/${owner}/${name}/pull/123`,
      merged: false,
      status: 'pending-review',
    });
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  console.log('🔧 gh-issues — Auto-fix GitHub Issues\n');

  try {
    // Resolve token
    const token = await resolveToken();
    
    // Detect or validate repo
    const repo = await detectRepo(options.repo);
    const sourceRepo = repo;
    const pushRepo = options.fork || repo;
    
    console.log(`Repo: ${sourceRepo}`);
    if (options.fork) {
      console.log(`Push to fork: ${pushRepo}`);
    }
    console.log(`Limit: ${options.limit}`);
    if (options.label) {
      console.log(`Label filter: ${options.label}`);
    }
    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No agents will be spawned\n');
    }

    // Phase 2: Fetch issues
    console.log('\n📥 Fetching issues...\n');
    const issues = await fetchIssues(token, sourceRepo, options);

    if (issues.length === 0) {
      console.log('✅ No issues found matching criteria');
      return;
    }

    console.log(`Found ${issues.length} issues:\n`);
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. #${issue.number}: ${issue.title}`);
      console.log(`     ${issue.html_url}`);
    });

    // Phase 3: Confirm (unless --yes or --dry-run)
    if (!options.yes && !options.dryRun) {
      console.log(`\n⚠️  About to spawn ${issues.length} sub-agents.`);
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      await sleep(5000);
    }

    // Skip agent spawning for reviews-only mode
    if (options.reviewsOnly) {
      console.log('\n📝 Reviews-only mode: Skipping issue processing');
      return;
    }

    // Phase 4: Spawn sub-agents
    console.log('\n🚀 Spawning sub-agents...\n');
    const agents = [];
    
    for (const issue of issues) {
      const agent = await spawnSubAgent(issue, pushRepo, options);
      agents.push(agent);
      
      // Rate limit agent spawning
      if (!options.dryRun) {
        await sleep(1000);
      }
    }

    // Phase 5: Monitor (unless --cron)
    if (!options.cron && !options.dryRun) {
      const results = await monitorPRs(token, pushRepo, agents);
      
      console.log('\n📊 Results:\n');
      results.forEach((result, i) => {
        const icon = result.merged ? '✅' : result.status === 'pending-review' ? '⏳' : '❌';
        console.log(`  ${icon} #${result.issue.number}: ${result.pr || result.branch}`);
      });

      // Send notification if channel specified
      if (options.notifyChannel && results.some(r => r.merged)) {
        console.log(`\n📬 Sending notification to channel ${options.notifyChannel}`);
        // In real implementation, this would use agent-send or poll-create skill
      }
    } else if (options.cron) {
      console.log('\n⏰ Cron mode: Agents spawned, exiting...');
    }

    // Phase 6: Watch mode
    if (options.watch) {
      console.log(`\n👁️  Watch mode enabled. Polling every ${options.interval} minutes...`);
      
      while (options.watch) {
        await sleep(options.interval * 60 * 1000);
        console.log(`\n🔄 Polling for new issues...`);
        // Recursively call main or implement polling logic
        break; // For now, just break after one iteration
      }
    }

    console.log('\n✅ Done!');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  main();
}

export { parseArgs, resolveToken, detectRepo, fetchIssues, spawnSubAgent };
