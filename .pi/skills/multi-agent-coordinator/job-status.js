#!/usr/bin/env node

/**
 * Job Status
 * 
 * Get detailed status of a specific GitHub Actions workflow run.
 * 
 * Usage: node job-status.js <job-id>
 */

const { execSync } = require('child_process');

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

async function getJobStatus(jobId) {
  const repoInfo = getRepoInfo();
  const token = getGitHubToken();
  
  if (!repoInfo) {
    console.error('Error: Could not determine repository from git remote');
    process.exit(1);
  }
  
  const { owner, repo } = repoInfo;
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${jobId}`;
  
  const options = {
    headers: {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`GitHub API error: ${response.status}`);
      console.error(error);
      process.exit(1);
    }
    
    const run = await response.json();
    
    console.log(`Job #${run.id}`);
    console.log('================');
    console.log(`Branch: ${run.head_branch}`);
    console.log(`Status: ${run.status}`);
    console.log(`Conclusion: ${run.conclusion || 'in progress'}`);
    console.log(`Workflow: ${run.name}`);
    console.log(`Run Number: ${run.run_number}`);
    console.log(`Event: ${run.event}`);
    console.log(`Created: ${new Date(run.created_at).toISOString()}`);
    console.log(`Updated: ${new Date(run.updated_at).toISOString()}`);
    console.log(`URL: ${run.html_url}`);
    
    if (run.head_sha) {
      console.log(`Commit: ${run.head_sha.substring(0, 7)}`);
    }
    
    // Output JSON for programmatic use
    console.log('\n--- JSON OUTPUT ---');
    console.log(JSON.stringify({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      branch: run.head_branch,
      run_number: run.run_number,
      event: run.event,
      created_at: run.created_at,
      updated_at: run.updated_at,
      html_url: run.html_url,
      head_sha: run.head_sha
    }, null, 2));
    
  } catch (error) {
    console.error('Error fetching job status:', error.message);
    process.exit(1);
  }
}

// Get job ID from command line
const jobId = process.argv[2];

if (!jobId) {
  console.error('Usage: node job-status.js <job-id>');
  console.error('Use list-jobs.js to find active job IDs');
  process.exit(1);
}

getJobStatus(jobId);
