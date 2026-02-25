#!/usr/bin/env node

/**
 * List Active Jobs
 * 
 * Lists all currently running GitHub Actions workflow runs.
 * Useful for discovering what other agents are currently working on.
 * 
 * Usage: node list-jobs.js
 */

const { execSync } = require('child_process');

// Get repository info from git remote
function getRepoInfo() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    // Parse git@github.com:owner/repo.git or https://github.com/owner/repo.git
    const match = remoteUrl.match(/(?:github\.com[:/]|github\.com\/)([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2].replace('.git', '') };
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

// Get GitHub token
function getGitHubToken() {
  // Check various possible env vars
  return process.env.GH_TOKEN || 
         process.env.GITHUB_TOKEN || 
         process.env.AGENT_GH_TOKEN;
}

async function listJobs() {
  const repoInfo = getRepoInfo();
  const token = getGitHubToken();
  
  if (!repoInfo) {
    console.error('Error: Could not determine repository from git remote');
    console.error('Make sure you\'re in a git repository with a GitHub remote');
    process.exit(1);
  }
  
  const { owner, repo } = repoInfo;
  
  // Query GitHub API for workflow runs
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?status=in_progress`;
  
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
    
    const data = await response.json();
    
    // Filter for job/* branches (PopeBot jobs)
    const jobRuns = data.workflow_runs?.filter(run => 
      run.head_branch && run.head_branch.startsWith('job/')
    ) || [];
    
    if (jobRuns.length === 0) {
      console.log('No active jobs found.');
      console.log('');
      console.log('Active workflow runs (non-job branches):');
      data.workflow_runs?.forEach(run => {
        console.log(`  - ${run.head_branch}: ${run.name} (${run.status})`);
      });
      return;
    }
    
    console.log(`Found ${jobRuns.length} active job(s):`);
    console.log('');
    
    jobRuns.forEach(run => {
      console.log(`Job: ${run.head_branch}`);
      console.log(`  Status: ${run.status}`);
      console.log(`  Workflow: ${run.name}`);
      console.log(`  Started: ${new Date(run.created_at).toISOString()}`);
      console.log(`  URL: ${run.html_url}`);
      console.log('');
    });
    
    // Also output JSON for programmatic use
    console.log('--- JSON OUTPUT ---');
    console.log(JSON.stringify({
      total_count: jobRuns.length,
      jobs: jobRuns.map(run => ({
        id: run.id,
        name: run.name,
        status: run.status,
        branch: run.head_branch,
        started_at: run.created_at,
        html_url: run.html_url
      }))
    }, null, 2));
    
  } catch (error) {
    console.error('Error fetching jobs:', error.message);
    process.exit(1);
  }
}

listJobs();
