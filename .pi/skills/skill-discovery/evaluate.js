#!/usr/bin/env node
/**
 * SkillForge Evaluator - Detailed evaluation of a specific repository
 * 
 * Evaluates a single GitHub repository for skill integration suitability.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  minScore: parseFloat(process.env.SKILLFORGE_MIN_SCORE) || 0.7,
  githubToken: process.env.GITHUB_TOKEN || null
};

// Parse command line arguments
const args = process.argv.slice(2);
let targetUrl = null;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--url' || args[i] === '-u') && args[i + 1]) {
    targetUrl = args[i + 1];
    i++;
  } else if (args[i] === '--min-score' && args[i + 1]) {
    CONFIG.minScore = parseFloat(args[i + 1]);
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
SkillForge Evaluator - Evaluate a specific repository

Usage: node evaluate.js <repository-url> [options]
   or: node evaluate.js --url <repository-url> [options]

Options:
  --url, -u <url>      GitHub repository URL
  --min-score <num>    Minimum score for auto recommendation (default: 0.7)
  --help, -h           Show this help message

Examples:
  node evaluate.js https://github.com/user/repo-name
  node evaluate.js --url https://github.com/user/repo-name --min-score 0.6

Environment Variables:
  GITHUB_TOKEN              Personal access token for higher rate limits
  SKILLFORGE_MIN_SCORE      Minimum score threshold (default: 0.7)
`);
    process.exit(0);
  } else if (!args[i].startsWith('-') && !targetUrl) {
    targetUrl = args[i];
  }
}

if (!targetUrl) {
  console.error('Error: Repository URL is required');
  console.error('Usage: node evaluate.js <repository-url>');
  console.error('Use --help for more information');
  process.exit(1);
}

// Extract owner and repo from URL
function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);
  if (!match) {
    return null;
  }
  return { owner: match[1], repo: match[2] };
}

// Known bad patterns
const BAD_PATTERNS = [
  'malware', 'exploit', 'hack', 'crack', 'keygen',
  'ransomware', 'trojan', 'spyware', 'virus'
];

function containsBadPattern(text) {
  const lower = text.toLowerCase();
  for (const pattern of BAD_PATTERNS) {
    const regex = new RegExp(`\\b${pattern}\\b`, 'i');
    if (regex.test(lower)) {
      return true;
    }
  }
  return false;
}

// Make GitHub API request
function githubRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, 'https://api.github.com');
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'PopeBot-SkillForge/1.0'
      }
    };

    if (CONFIG.githubToken) {
      options.headers['Authorization'] = `Bearer ${CONFIG.githubToken}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else if (res.statusCode === 404) {
          reject(new Error('Repository not found'));
        } else if (res.statusCode === 403) {
          reject(new Error('Rate limit exceeded. Set GITHUB_TOKEN for higher limits.'));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} ${res.statusMessage}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Scoring functions
function scoreCompatibility(repo) {
  const lang = (repo.language || '').toLowerCase();
  
  if (lang === 'javascript' || lang === 'typescript') {
    return 1.0;
  } else if (lang === 'python') {
    return 0.7;
  } else if (lang === 'rust' || lang === 'go') {
    return 0.5;
  } else if (lang) {
    return 0.3;
  }
  return 0.2;
}

function scoreQuality(stars, hasReadme, hasTopics) {
  let score = Math.log2(stars + 1) / 12;
  
  // Bonus for having README
  if (hasReadme) {
    score += 0.15;
  }
  
  // Bonus for having topics
  if (hasTopics) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0);
}

function scoreSecurity(repo, name, description) {
  let score = 0.5;

  // License bonus
  if (repo.license && repo.license.spdx_id && repo.license.spdx_id !== 'NOASSERTION') {
    score += 0.3;
  }

  // Bad pattern penalty
  if (containsBadPattern(name) || containsBadPattern(description)) {
    score -= 0.5;
  }

  // Recency bonus
  if (repo.updated_at) {
    const updated = new Date(repo.updated_at);
    const now = new Date();
    const ageDays = (now - updated) / (1000 * 60 * 60 * 24);
    if (ageDays >= 0 && ageDays <= 180) {
      score += 0.2;
    } else if (ageDays > 365) {
      score -= 0.1; // Penalty for very old repos
    }
  }

  return Math.max(0, Math.min(1, score));
}

function calculateTotalScore(scores) {
  return (
    scores.compatibility * 0.30 +
    scores.quality * 0.35 +
    scores.security * 0.35
  );
}

function getRecommendation(totalScore) {
  if (totalScore >= CONFIG.minScore) {
    return { type: 'AUTO', message: 'Safe to auto-integrate' };
  } else if (totalScore >= 0.4) {
    return { type: 'MANUAL', message: 'Needs human review' };
  } else {
    return { type: 'SKIP', message: 'Not recommended for integration' };
  }
}

async function evaluateRepository(url) {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error('Invalid GitHub URL format');
  }

  console.log('=== SkillForge Repository Evaluation ===\n');
  console.log(`Evaluating: ${url}`);
  console.log(`Minimum score for AUTO: ${CONFIG.minScore}\n`);

  // Fetch repository details
  const repo = await githubRequest(`/repos/${parsed.owner}/${parsed.repo}`);
  
  // Check for README
  let hasReadme = false;
  try {
    await githubRequest(`/repos/${parsed.owner}/${parsed.repo}/readme`);
    hasReadme = true;
  } catch (e) {
    // No README or error
  }

  // Fetch topics
  let hasTopics = false;
  let topics = [];
  try {
    const topicsData = await githubRequest(`/repos/${parsed.owner}/${parsed.repo}/topics`, {
      headers: { 'Accept': 'application/vnd.github.mercy-preview+json' }
    });
    topics = topicsData.names || [];
    hasTopics = topics.length > 0;
  } catch (e) {
    // Topics not available
  }

  // Calculate scores
  const scores = {
    compatibility: scoreCompatibility(repo),
    quality: scoreQuality(repo.stargazers_count, hasReadme, hasTopics),
    security: scoreSecurity(repo, repo.name, repo.description || '')
  };

  const totalScore = calculateTotalScore(scores);
  const recommendation = getRecommendation(totalScore);

  // Print detailed report
  console.log('--- Repository Details ---\n');
  console.log(`Name: ${repo.full_name}`);
  console.log(`Description: ${repo.description || 'No description'}`);
  console.log(`URL: ${repo.html_url}`);
  console.log(`Owner: ${repo.owner.login}`);
  console.log(`Created: ${new Date(repo.created_at).toLocaleDateString()}`);
  console.log(`Updated: ${new Date(repo.updated_at).toLocaleDateString()}`);
  console.log(`Language: ${repo.language || 'Not specified'}`);
  console.log(`Stars: ${repo.stargazers_count}`);
  console.log(`Forks: ${repo.forks_count}`);
  console.log(`Watchers: ${repo.watchers_count}`);
  console.log(`License: ${repo.license ? repo.license.spdx_id : 'None'}`);
  console.log(`Has README: ${hasReadme ? 'Yes' : 'No'}`);
  console.log(`Topics: ${topics.length > 0 ? topics.join(', ') : 'None'}`);
  console.log(`Default Branch: ${repo.default_branch}`);
  console.log(`Is Fork: ${repo.fork ? 'Yes' : 'No'}`);
  console.log(`Is Archived: ${repo.archived ? 'Yes' : 'No'}`);
  console.log();

  console.log('--- Scoring Breakdown ---\n');
  
  console.log(`Compatibility: ${scores.compatibility.toFixed(3)} (weight: 30%)`);
  console.log(`  - Language: ${repo.language || 'Unknown'}`);
  console.log(`  - JavaScript/TypeScript = 1.0, Python = 0.7, Others = 0.2-0.5`);
  console.log();
  
  console.log(`Quality: ${scores.quality.toFixed(3)} (weight: 35%)`);
  console.log(`  - Stars: ${repo.stargazers_count} (log scale score)`);
  console.log(`  - Has README: ${hasReadme ? '+0.15' : '0'}`);
  console.log(`  - Has Topics: ${hasTopics ? '+0.1' : '0'}`);
  console.log();
  
  console.log(`Security: ${scores.security.toFixed(3)} (weight: 35%)`);
  console.log(`  - Base score: 0.5`);
  console.log(`  - License: ${repo.license ? '+0.3' : '0'}`);
  console.log(`  - Bad patterns: ${containsBadPattern(repo.name) || containsBadPattern(repo.description || '') ? '-0.5' : '0'}`);
  const updated = new Date(repo.updated_at);
  const ageDays = Math.floor((new Date() - updated) / (1000 * 60 * 60 * 24));
  console.log(`  - Recency (${ageDays} days): ${ageDays <= 180 ? '+0.2' : ageDays > 365 ? '-0.1' : '0'}`);
  console.log();

  console.log('--- Final Score ---\n');
  const icon = recommendation.type === 'AUTO' ? '⭐' : recommendation.type === 'MANUAL' ? '⚠️' : '⛔';
  console.log(`${icon} Recommendation: ${recommendation.type}`);
  console.log(`Total Score: ${totalScore.toFixed(3)}`);
  console.log(`Threshold: ${CONFIG.minScore}`);
  console.log(`Reasoning: ${recommendation.message}`);
  console.log();

  console.log('--- Integration Readiness ---\n');
  
  // Check for skill indicators
  const skillIndicators = [];
  if (topics.some(t => t.includes('skill') || t.includes('popebot') || t.includes('agent'))) {
    skillIndicators.push('Has skill-related topics');
  }
  if ((repo.description || '').toLowerCase().includes('skill')) {
    skillIndicators.push('Description mentions "skill"');
  }
  if (hasReadme) {
    skillIndicators.push('Has documentation (README)');
  }
  if (repo.license) {
    skillIndicators.push('Has open source license');
  }

  if (skillIndicators.length > 0) {
    console.log('Positive indicators:');
    skillIndicators.forEach(ind => console.log(`  ✓ ${ind}`));
  } else {
    console.log('No specific skill indicators found - may need manual adaptation');
  }
  console.log();

  // Save evaluation report
  const outputDir = process.env.SKILLFORGE_OUTPUT_DIR || '/job/tmp/skills';
  fs.mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, `evaluation-${parsed.repo}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    repository: {
      name: repo.full_name,
      url: repo.html_url,
      description: repo.description,
      owner: repo.owner.login,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      license: repo.license ? repo.license.spdx_id : null,
      topics,
      updatedAt: repo.updated_at
    },
    scores,
    totalScore,
    recommendation: recommendation.type,
    reasoning: recommendation.message,
    hasReadme,
    skillIndicators
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Evaluation report saved to: ${reportPath}`);
  console.log();

  // Show next steps
  console.log('--- Next Steps ---\n');
  if (recommendation.type !== 'SKIP') {
    console.log('To generate a skill manifest:');
    console.log(`  node generate.js --name "${parsed.repo}" \\`);
    console.log(`    --url "${repo.html_url}" \\`);
    console.log(`    --description "${(repo.description || 'No description').substring(0, 80)}"`);
  } else {
    console.log('This repository is not recommended for integration.');
    console.log('Consider looking for alternatives with higher scores.');
  }

  return report;
}

// Run evaluation
evaluateRepository(targetUrl)
  .catch(error => {
    console.error('Evaluation failed:', error.message);
    process.exit(1);
  });
