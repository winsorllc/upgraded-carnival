#!/usr/bin/env node

/**
 * Send Message to Another Agent
 * 
 * Leaves a message for another agent by creating a file in their working directory.
 * The message will be picked up when that agent next checks for messages.
 * 
 * Usage: node send-message.js <job-branch> "<message>"
 * 
 * Example: node send-message.js job/abc-123 "Hey, can you help with the frontend?"
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

async function sendMessage(targetBranch, message) {
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
  
  const { owner, repo } = repoInfo;
  
  // Create message file content
  const timestamp = new Date().toISOString();
  const messageId = `msg_${Date.now()}`;
  
  const messageContent = {
    id: messageId,
    from: currentBranch,
    to: targetBranch,
    message: message,
    timestamp: timestamp,
    read: false
  };
  
  // Encode the message as base64 to avoid issues with special characters in file content
  const content = JSON.stringify(messageContent, null, 2);
  const encodedContent = Buffer.from(content).toString('base64');
  
  // File path in the repo
  const filePath = `messages/${targetBranch}/${messageId}.json`;
  
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  
  const options = {
    method: 'PUT',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      message: `Message from ${currentBranch} to ${targetBranch}`,
      content: encodedContent,
      branch: 'main'
    })
  };
  
  try {
    // First check if messages directory exists on main branch
    // If not, create it
    const dirUrl = `https://api.github.com/repos/${owner}/${repo}/contents/messages`;
    const dirResponse = await fetch(dirUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    // If directory doesn't exist (404), create it
    if (dirResponse.status === 404) {
      const createDirUrl = `https://api.github.com/repos/${owner}/${repo}/contents/messages/.gitkeep`;
      await fetch(createDirUrl, {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          message: 'Create messages directory',
          content: Buffer.from('').toString('base64'),
          branch: 'main'
        })
      });
    }
    
    // Now try to create the message file
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`GitHub API error: ${response.status}`);
      console.error(error);
      process.exit(1);
    }
    
    const result = await response.json();
    
    console.log('✅ Message sent successfully!');
    console.log('');
    console.log(`To: ${targetBranch}`);
    console.log(`From: ${currentBranch}`);
    console.log(`Message: ${message}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`File: ${filePath}`);
    console.log(`URL: ${result.content?.html_url || 'N/A'}`);
    
  } catch (error) {
    console.error('Error sending message:', error.message);
    process.exit(1);
  }
}

// Get parameters from command line
const targetBranch = process.argv[2];
const message = process.argv[3];

if (!targetBranch || !message) {
  console.error('Usage: node send-message.js <job-branch> "<message>"');
  console.error('');
  console.error('Example:');
  console.error('  node send-message.js job/abc-123 "Can you help with the frontend?"');
  process.exit(1);
}

sendMessage(targetBranch, message);
