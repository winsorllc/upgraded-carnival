#!/usr/bin/env node

/**
 * Delegate Agent - Spawn sub-agents for parallel task execution
 * 
 * This tool enables multi-agent workflows by:
 * 1. Creating a job branch for the sub-agent
 * 2. Writing the task to logs/<uuid>/job.md
 * 3. Triggering GitHub Actions to run the sub-agent
 * 4. Polling for completion and returning results
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration from environment
const GITHUB_TOKEN = process.env.GH_TOKEN;
const GITHUB_OWNER = process.env.GH_OWNER;
const GITHUB_REPO = process.env.GH_REPO;
const APP_URL = process.env.APP_URL;

const BASE_DIR = __dirname;

// Ensure logs directory exists
const LOGS_DIR = path.join(BASE_DIR, '..', '..', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Generate a UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Execute a GitHub API request
 */
function githubRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}${endpoint}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'thepopebot-delegate-agent'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`GitHub API error: ${res.statusCode} - ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Create a branch for the delegate agent
 */
async function createDelegateBranch(delegateId, agentName, jobPrompt) {
  const branchName = `delegate/${delegateId}/${agentName}`;
  const commitMessage = `Delegate agent: ${agentName}`;
  
  // Get the default branch SHA
  const ref = await githubRequest('GET', '/git/refs/heads/main');
  const baseSha = ref.object.sha;
  
  // Create the branch
  try {
    await githubRequest('POST', '/git/refs', {
      ref: `refs/heads/${branchName}`,
      sha: baseSha
    });
  } catch (e) {
    // Branch might already exist, try to update it
    try {
      await githubRequest('PATCH', `/git/refs/heads/${branchName}`, {
        sha: baseSha,
        force: true
      });
    } catch (e2) {
      // Ignore if it doesn't exist
    }
  }
  
  // Create job.md in logs directory
  const logsDir = path.join(LOGS_DIR, delegateId);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(logsDir, 'job.md'),
    `# Delegate Task: ${agentName}\n\n${jobPrompt}\n`,
    'utf8'
  );
  
  // Commit and push
  try {
    // Get current commit
    const commit = await githubRequest('GET', `/commits/${branchName}`);
    const treeSha = commit.commit.tree.sha;
    
    // Create blob for job.md
    const jobContent = fs.readFileSync(path.join(logsDir, 'job.md'), 'utf8');
    const blob = await githubRequest('POST', '/git/blobs', {
      content: Buffer.from(jobContent).toString('base64'),
      encoding: 'base64'
    });
    
    // Create new tree
    const tree = await githubRequest('POST', '/git/trees', {
      base_tree: treeSha,
      tree: [{
        path: `logs/${delegateId}/job.md`,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      }]
    });
    
    // Create commit
    const newCommit = await githubRequest('POST', '/git/commits', {
      message: commitMessage,
      tree: tree.sha,
      parents: [commit.sha]
    });
    
    // Update reference
    await githubRequest('PATCH', `/git/refs/heads/${branchName}`, {
      sha: newCommit.sha
    });
    
  } catch (e) {
    console.error('Error committing:', e.message);
  }
  
  return branchName;
}

/**
 * Wait for the delegate agent to complete
 */
async function waitForCompletion(delegateId, timeout = 300000) {
  const startTime = Date.now();
  const checkInterval = 10000; // 10 seconds
  
  while (Date.now() - startTime < timeout) {
    try {
      // Check for PR or status
      const prs = await githubRequest('GET', '/pulls', `?state=all&head=delegate/${delegateId}`);
      const pr = prs.find(p => p.head.ref.startsWith(`delegate/${delegateId}`));
      
      if (pr) {
        if (pr.merged_at) {
          return { status: 'completed', pr };
        }
        if (pr.state === 'closed') {
          return { status: 'failed', pr };
        }
      }
      
      // Also check workflow runs
      const runs = await githubRequest('GET', `/actions/runs?branch=delegate/${delegateId}&per_page=1`);
      if (runs.workflow_runs && runs.workflow_runs.length > 0) {
        const run = runs.workflow_runs[0];
        if (run.status === 'completed') {
          if (run.conclusion === 'success') {
            return { status: 'completed', run };
          } else {
            return { status: 'failed', run };
          }
        }
      }
      
    } catch (e) {
      console.error('Error checking status:', e.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  return { status: 'timeout' };
}

/**
 * Spawn a sub-agent
 */
async function spawnDelegateAgent(name, prompt, options = {}) {
  const model = options.model || process.env.LLM_MODEL || 'claude-sonnet-4-20250514';
  const timeout = (options.timeout || 300) * 1000;
  
  const delegateId = generateUUID();
  
  console.log(`Spawning delegate agent: ${name}`);
  console.log(`Delegate ID: ${delegateId}`);
  console.log(`Model: ${model}`);
  
  try {
    // Create the branch and job file
    await createDelegateBranch(delegateId, name, prompt);
    
    // Wait for completion
    console.log('Waiting for delegate agent to complete...');
    const result = await waitForCompletion(delegateId, timeout);
    
    if (result.status === 'completed') {
      console.log('Delegate agent completed successfully');
      
      // Try to fetch results
      try {
        const logsPath = path.join(LOGS_DIR, delegateId);
        const sessionFiles = fs.readdirSync(logsPath).filter(f => f.endsWith('.jsonl'));
        
        if (sessionFiles.length > 0) {
          const sessionLog = fs.readFileSync(
            path.join(logsPath, sessionFiles[0]),
            'utf8'
          );
          
          // Extract last assistant message
          const lines = sessionLog.split('\n').filter(l => l.trim());
          const lastLine = lines[lines.length - 1];
          if (lastLine) {
            const entry = JSON.parse(lastLine);
            if (entry.type === 'result') {
              return {
                success: true,
                delegateId,
                agentName: name,
                result: entry.content || entry.text
              };
            }
          }
        }
      } catch (e) {
        // Results might not be available yet
      }
      
      return {
        success: true,
        delegateId,
        agentName: name,
        message: 'Delegate agent completed'
      };
      
    } else if (result.status === 'failed') {
      return {
        success: false,
        delegateId,
        agentName: name,
        error: 'Delegate agent failed'
      };
    } else {
      return {
        success: false,
        delegateId,
        agentName: name,
        error: 'Delegate agent timed out'
      };
    }
    
  } catch (e) {
    return {
      success: false,
      agentName: name,
      error: e.message
    };
  }
}

/**
 * List active delegate agents
 */
async function listDelegateAgents() {
  try {
    const branches = await githubRequest('GET', '/git/refs/heads');
    const delegateBranches = branches.filter(b => b.ref.startsWith('refs/heads/delegate/'));
    
    return delegateBranches.map(b => ({
      name: b.ref.replace('refs/heads/delegate/', ''),
      sha: b.object.sha
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Get delegate agent status
 */
async function getDelegateStatus(delegateId) {
  try {
    const runs = await githubRequest('GET', `/actions/runs?branch=delegate/${delegateId}&per_page=1`);
    if (runs.workflow_runs && runs.workflow_runs.length > 0) {
      const run = runs.workflow_runs[0];
      return {
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url
      };
    }
    return { status: 'unknown' };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

// CLI handling
const args = process.argv.slice(2);
const command = args[0];

if (command === 'spawn') {
  const name = args[1];
  const prompt = args[2];
  
  // Parse options
  const options = {};
  for (let i = 3; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      options.model = args[i + 1];
      i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[i + 1], 10);
      i++;
    }
  }
  
  if (!name || !prompt) {
    console.error('Usage: delegate-spawn.js <name> <prompt> [--model <model>] [--timeout <seconds>]');
    process.exit(1);
  }
  
  spawnDelegateAgent(name, prompt, options)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(e => {
      console.error(JSON.stringify({ error: e.message }));
      process.exit(1);
    });
  
} else if (command === 'list') {
  listDelegateAgents()
    .then(agents => {
      console.log(JSON.stringify(agents, null, 2));
    })
    .catch(e => {
      console.error(JSON.stringify({ error: e.message }));
      process.exit(1);
    });
  
} else if (command === 'status') {
  const delegateId = args[1];
  if (!delegateId) {
    console.error('Usage: delegate-status.js <delegate-id>');
    process.exit(1);
  }
  
  getDelegateStatus(delegateId)
    .then(status => {
      console.log(JSON.stringify(status, null, 2));
    })
    .catch(e => {
      console.error(JSON.stringify({ error: e.message }));
      process.exit(1);
    });
  
} else {
  console.log('Delegate Agent CLI');
  console.log('');
  console.log('Commands:');
  console.log('  spawn <name> <prompt> [--model <model>] [--timeout <seconds>]');
  console.log('  list');
  console.log('  status <delegate-id>');
  console.log('');
  console.log('Environment variables required:');
  console.log('  GH_TOKEN, GH_OWNER, GH_REPO');
}
