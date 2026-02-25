#!/usr/bin/env node

/**
 * Multi-Agent Task Coordinator
 * 
 * Breaks down a large task and coordinates multiple agents to work on it in parallel.
 * Creates separate job branches for each sub-task and aggregates results.
 * 
 * Usage: node coordinate.js --task "<task description>" --agents <number>
 * 
 * Example:
 *   node coordinate.js --task "Analyze all logs and create a report" --agents 3
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Get repository info from git remote
function getRepoInfo() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/(?:github\.com[:/]|github\.com\/)([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2].replace('.git', '') };
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

function getGitHubToken() {
  return process.env.GH_TOKEN || 
         process.env.GITHUB_TOKEN || 
         process.env.AGENT_GH_TOKEN;
}

function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown';
  }
}

function generateJobId() {
  return 'xxxxxxxx'.replace(/x/g, () => 
    Math.floor(Math.random() * 16).toString(16)
  );
}

// Simple HTTP request helper
function httpRequest(url, options) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function createJobBranch(repoInfo, token, jobId, task, parentBranch) {
  const { owner, repo } = repoInfo;
  
  // First, get the SHA of the main branch
  const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`;
  const refResponse = await httpRequest(refUrl, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  
  if (refResponse.status !== 200) {
    throw new Error(`Failed to get main branch SHA: ${refResponse.body}`);
  }
  
  const refData = JSON.parse(refResponse.body);
  const mainSha = refData.object.sha;
  
  // Create a new ref for the job branch
  const branchName = `job/${jobId}`;
  const createRefUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs`;
  
  const createRefResponse = await httpRequest(createRefUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: mainSha
    })
  });
  
  if (createRefResponse.status !== 201) {
    // Branch might already exist, try to use it
    console.log(`Note: Branch may already exist, continuing...`);
  }
  
  // Create the job.md file
  const jobContent = `# Job Task

## Task
${task}

## Coordinator
This job was created by the Multi-Agent Coordinator from branch: ${parentBranch}

## Notes
- This is a sub-task of a larger coordinated effort
- Results should be saved to the logs directory
- Coordinate with other agents via the messages system
`;

  const encodedContent = Buffer.from(jobContent).toString('base64');
  
  // Create logs directory and job.md
  const logsDirUrl = `https://api.github.com/repos/${owner}/${repo}/contents/logs/${jobId}`;
  
  const createLogsResponse = await httpRequest(logsDirUrl, {
    method: 'PUT',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      message: `Create job directory for ${jobId}`,
      content: Buffer.from('').toString('base64'),
      branch: branchName
    })
  });
  
  // Create job.md file
  const jobFileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/logs/${jobId}/job.md`;
  
  const jobFileResponse = await httpRequest(jobFileUrl, {
    method: 'PUT',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      message: `Add job task for ${jobId}`,
      content: encodedContent,
      branch: branchName
    })
  });
  
  return branchName;
}

async function coordinateTask(task, numAgents) {
  const repoInfo = getRepoInfo();
  const token = getGitHubToken();
  const currentBranch = getCurrentBranch();
  
  if (!repoInfo) {
    console.error('Error: Could not determine repository from git remote');
    process.exit(1);
  }
  
  if (!token) {
    console.error('Error: GitHub token not found');
    console.error('Set GH_TOKEN, GITHUB_TOKEN, or AGENT_GH_TOKEN environment variable');
    process.exit(1);
  }
  
  console.log('🚀 Multi-Agent Task Coordinator');
  console.log('================================');
  console.log('');
  console.log(`Task: ${task}`);
  console.log(`Agents: ${numAgents}`);
  console.log(`Coordinator: ${currentBranch}`);
  console.log('');
  
  // Split task into sub-tasks for each agent
  const subTasks = [];
  
  if (numAgents === 1) {
    subTasks.push({
      id: generateJobId(),
      task: task,
      description: 'Full task'
    });
  } else {
    // Break down the task into parts
    const taskBreakdown = [
      `Part 1: Research and gather information for: ${task}`,
      `Part 2: Analyze and process data for: ${task}`,
      `Part 3: Compile findings and create summary for: ${task}`
    ];
    
    // If more than 3 agents, add more parts
    for (let i = 3; i < numAgents; i++) {
      taskBreakdown.push(`Part ${i + 1}: Additional work on: ${task}`);
    }
    
    for (let i = 0; i < Math.min(numAgents, taskBreakdown.length); i++) {
      subTasks.push({
        id: generateJobId(),
        task: taskBreakdown[i],
        description: `Part ${i + 1}`
      });
    }
  }
  
  console.log(`Created ${subTasks.length} sub-tasks`);
  console.log('');
  
  // Create job branches for each sub-task
  const branches = [];
  
  for (const subTask of subTasks) {
    console.log(`Creating job branch for: ${subTask.description}...`);
    
    try {
      const branchName = await createJobBranch(repoInfo, token, subTask.id, subTask.task, currentBranch);
      branches.push({
        ...subTask,
        branch: branchName
      });
      console.log(`  ✅ Created ${branchName}`);
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('');
  console.log('================================');
  console.log('✅ Coordination complete!');
  console.log('');
  console.log('Created jobs:');
  branches.forEach(b => {
    console.log(`  - ${b.branch}: ${b.description}`);
  });
  console.log('');
  console.log('The job branches have been created. GitHub Actions will');
  console.log('automatically spin up Docker agents to work on each sub-task.');
  console.log('');
  console.log('Use list-jobs.js to monitor progress.');
  
  // Output JSON for programmatic use
  console.log('\n--- JSON OUTPUT ---');
  console.log(JSON.stringify({
    coordinator: currentBranch,
    original_task: task,
    num_agents: numAgents,
    jobs: branches
  }, null, 2));
}

// Parse command line arguments
const args = process.argv.slice(2);
let task = '';
let numAgents = 2;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--task' && args[i + 1]) {
    task = args[i + 1];
    i++;
  } else if (args[i] === '--agents' && args[i + 1]) {
    numAgents = parseInt(args[i + 1], 10);
    i++;
  }
}

if (!task) {
  console.error('Usage: node coordinate.js --task "<task description>" --agents <number>');
  console.error('');
  console.error('Example:');
  console.error('  node coordinate.js --task "Analyze all logs and create a report" --agents 3');
  process.exit(1);
}

if (numAgents < 1 || numAgents > 10) {
  console.error('Error: Number of agents must be between 1 and 10');
  process.exit(1);
}

coordinateTask(task, numAgents);
