#!/usr/bin/env node

/**
 * Check Messages
 * 
 * Check if any messages have been left for the current agent.
 * Messages are stored in the messages/<branch>/ directory in the repository.
 * 
 * Usage: node check-messages.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

async function checkMessages() {
  const repoInfo = getRepoInfo();
  const token = getGitHubToken();
  const currentBranch = getCurrentBranch();
  
  if (!repoInfo) {
    console.error('Error: Could not determine repository from git remote');
    process.exit(1);
  }
  
  const { owner, repo } = repoInfo;
  
  // Query the messages directory for the current branch
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/messages/${currentBranch}`;
  
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
    
    if (response.status === 404) {
      console.log('No messages found.');
      console.log(`No messages directory exists for branch: ${currentBranch}`);
      return;
    }
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`GitHub API error: ${response.status}`);
      console.error(error);
      process.exit(1);
    }
    
    const files = await response.json();
    
    if (!Array.isArray(files) || files.length === 0) {
      console.log('No messages found.');
      return;
    }
    
    // Filter for JSON files
    const messageFiles = files.filter(f => f.name.endsWith('.json'));
    
    if (messageFiles.length === 0) {
      console.log('No messages found.');
      return;
    }
    
    console.log(`Found ${messageFiles.length} message(s) for ${currentBranch}:`);
    console.log('');
    
    const messages = [];
    
    for (const file of messageFiles) {
      // Fetch each message file
      const fileResponse = await fetch(file.download_url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (fileResponse.ok) {
        const msg = await fileResponse.json();
        messages.push(msg);
        
        console.log(`📬 Message from: ${msg.from}`);
        console.log(`   Timestamp: ${new Date(msg.timestamp).toLocaleString()}`);
        console.log(`   Message: ${msg.message}`);
        console.log('');
      }
    }
    
    // Output JSON for programmatic use
    console.log('--- JSON OUTPUT ---');
    console.log(JSON.stringify({
      branch: currentBranch,
      total_messages: messages.length,
      messages: messages
    }, null, 2));
    
  } catch (error) {
    console.error('Error checking messages:', error.message);
    process.exit(1);
  }
}

checkMessages();
