/**
 * Environment Diagnostics
 * Check system tools and runtime environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIN_NODE_VERSION = 18;

/**
 * Run environment diagnostics
 * @returns {Promise<Array>} Diagnostic items
 */
async function run() {
  const results = [];
  
  // Check Node.js version
  results.push(checkNodeVersion());
  
  // Check Docker
  results.push(checkDocker());
  
  // Check Git
  results.push(checkGit());
  
  // Check GitHub CLI
  results.push(checkGitHubCLI());
  
  // Check common tools
  results.push(...checkCommonTools());
  
  return results;
}

function checkNodeVersion() {
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    
    if (major >= MIN_NODE_VERSION) {
      return {
        category: 'environment',
        check: 'node-version',
        severity: 'ok',
        message: `Node.js ${version} (>= ${MIN_NODE_VERSION})`
      };
    } else {
      return {
        category: 'environment',
        check: 'node-version',
        severity: 'error',
        message: `Node.js ${version} is too old (need >= ${MIN_NODE_VERSION})`,
        remediation: 'Upgrade Node.js to version 18 or later'
      };
    }
  } catch (err) {
    return {
      category: 'environment',
      check: 'node-version',
      severity: 'error',
      message: `Could not determine Node.js version: ${err.message}`
    };
  }
}

function checkDocker() {
  try {
    const output = execSync('docker --version', { encoding: 'utf8', stdio: 'pipe' });
    const version = output.match(/Docker version ([\d.]+)/)?.[1] || 'unknown';
    
    // Try to check if docker daemon is running
    let daemonStatus = 'ok';
    let daemonMessage = 'Docker daemon running';
    try {
      execSync('docker info', { encoding: 'utf8', stdio: 'pipe', timeout: 5000 });
    } catch (err) {
      daemonStatus = 'warning';
      daemonMessage = 'Docker daemon not accessible (may be expected in container)';
    }
    
    return {
      category: 'environment',
      check: 'docker',
      severity: 'ok',
      message: `Docker ${version} installed`,
      details: daemonMessage
    };
  } catch (err) {
    return {
      category: 'environment',
      check: 'docker',
      severity: 'warning',
      message: 'Docker not found',
      remediation: 'Install Docker for containerized operations',
      details: err.message
    };
  }
}

function checkGit() {
  try {
    const version = execSync('git --version', { encoding: 'utf8', stdio: 'pipe' });
    const match = version.match(/git version ([\d.]+)/);
    
    // Check git config
    let configOk = true;
    let configMessage = 'Git configured';
    try {
      const userName = execSync('git config user.name', { encoding: 'utf8', stdio: 'pipe' }).trim();
      const userEmail = execSync('git config user.email', { encoding: 'utf8', stdio: 'pipe' }).trim();
      if (!userName || !userEmail) {
        configOk = false;
        configMessage = 'Git user.name or user.email not set';
      }
    } catch (err) {
      configOk = false;
      configMessage = 'Git config not set';
    }
    
    return {
      category: 'environment',
      check: 'git',
      severity: configOk ? 'ok' : 'warning',
      message: match ? `Git ${match[1]} installed` : 'Git installed',
      details: configMessage,
      ...(configOk ? {} : { remediation: 'Run: git config --global user.name "Name" && git config --global user.email "email@example.com"' })
    };
  } catch (err) {
    return {
      category: 'environment',
      check: 'git',
      severity: 'error',
      message: 'Git not found',
      remediation: 'Install Git: https://git-scm.com/downloads'
    };
  }
}

function checkGitHubCLI() {
  try {
    const output = execSync('gh --version', { encoding: 'utf8', stdio: 'pipe' });
    const match = output.match(/gh version ([\d.]+)/);
    
    // Check auth status
    let authStatus = 'unknown';
    try {
      execSync('gh auth status', { encoding: 'utf8', stdio: 'pipe' });
      authStatus = 'authenticated';
    } catch (err) {
      authStatus = 'not-authenticated';
    }
    
    return {
      category: 'environment',
      check: 'github-cli',
      severity: authStatus === 'authenticated' ? 'ok' : 'warning',
      message: match ? `GitHub CLI ${match[1]} installed` : 'GitHub CLI installed',
      details: authStatus === 'authenticated' ? 'Authenticated to GitHub' : 'Not authenticated',
      ...(authStatus === 'authenticated' ? {} : { remediation: 'Run: gh auth login' })
    };
  } catch (err) {
    return {
      category: 'environment',
      check: 'github-cli',
      severity: 'warning',
      message: 'GitHub CLI not found',
      remediation: 'Install: https://github.com/cli/cli#installation'
    };
  }
}

function checkCommonTools() {
  const tools = [
    { name: 'curl', check: 'curl-version', optional: false },
    { name: 'jq', check: 'jq-available', optional: true },
    { name: 'npm', check: 'npm-available', optional: false }
  ];
  
  const results = [];
  
  for (const tool of tools) {
    try {
      execSync(`which ${tool.name}`, { encoding: 'utf8', stdio: 'pipe' });
      results.push({
        category: 'environment',
        check: tool.check,
        severity: 'ok',
        message: `${tool.name} available`
      });
    } catch (err) {
      results.push({
        category: 'environment',
        check: tool.check,
        severity: tool.optional ? 'warning' : 'error',
        message: `${tool.name} not found`,
        ...(tool.optional ? {} : { remediation: `Install ${tool.name}` })
      });
    }
  }
  
  return results;
}

module.exports = { run };
