#!/usr/bin/env node

/**
 * Delegate Agent - Status Checker
 */

const { execSync } = require('child_process');
const https = require('https');

const GITHUB_TOKEN = process.env.GH_TOKEN;
const GITHUB_OWNER = process.env.GH_OWNER;
const GITHUB_REPO = process.env.GH_REPO;

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
            reject(new Error(`GitHub API error: ${res.statusCode}`));
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getStatus(delegateId) {
  try {
    const runs = await githubRequest('GET', `/actions/runs?branch=delegate/${delegateId}&per_page=1`);
    if (runs.workflow_runs && runs.workflow_runs.length > 0) {
      const run = runs.workflow_runs[0];
      return {
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
        created_at: run.created_at,
        updated_at: run.updated_at
      };
    }
    return { status: 'no_run_found' };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

const args = process.argv.slice(2);
if (!args[0]) {
  console.error('Usage: node delegate-status.js <delegate-id>');
  process.exit(1);
}

getStatus(args[0]).then(status => {
  console.log(JSON.stringify(status, null, 2));
});
