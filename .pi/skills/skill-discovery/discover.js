#!/usr/bin/env node
/**
 * SkillForge Discovery - GitHub skill scout for PopeBot
 * 
 * Discovers potential skills from GitHub repositories matching skill-related queries.
 * Based on ZeroClaw's SkillForge architecture.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_QUERIES = [
  'thepopebot skill',
  'ai agent skill',
  'popebot tools',
  'autonomous agent skill'
];

const CONFIG = {
  minScore: parseFloat(process.env.SKILLFORGE_MIN_SCORE) || 0.7,
  outputDir: process.env.SKILLFORGE_OUTPUT_DIR || '/job/tmp/skills',
  githubToken: process.env.GITHUB_TOKEN || null,
  limit: 20,
  verbose: false
};

// Parse command line arguments
const args = process.argv.slice(2);
const argQueries = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--query' && args[i + 1]) {
    argQueries.push(args[i + 1]);
    i++;
  } else if (args[i] === '--limit' && args[i + 1]) {
    CONFIG.limit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--verbose' || args[i] === '-v') {
    CONFIG.verbose = true;
  } else if (args[i] === '--min-score' && args[i + 1]) {
    CONFIG.minScore = parseFloat(args[i + 1]);
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
SkillForge Discovery - Discover new PopeBot skills from GitHub

Usage: node discover.js [options]

Options:
  --query <text>     Add custom search query (can be used multiple times)
  --limit <num>      Maximum results (default: 20)
  --verbose, -v      Show detailed output
  --min-score <num>  Minimum score for auto recommendation (default: 0.7)
  --help, -h         Show this help message

Environment Variables:
  GITHUB_TOKEN              Personal access token for higher rate limits
  SKILLFORGE_MIN_SCORE      Minimum score threshold (default: 0.7)
  SKILLFORGE_OUTPUT_DIR     Output directory for manifests (default: /job/tmp/skills)
`);
    process.exit(0);
  }
}

const queries = argQueries.length > 0 ? argQueries : DEFAULT_QUERIES;

// Known bad patterns (whole word matches)
const BAD_PATTERNS = [
  'malware', 'exploit', 'hack', 'crack', 'keygen',
  'ransomware', 'trojan', 'spyware', 'virus'
];

/**
 * Make GitHub API request
 */
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

/**
 * Check if text contains a bad pattern as whole word
 */
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

/**
 * Score compatibility (0.0-1.0)
 */
function scoreCompatibility(repo) {
  const lang = (repo.language || '').toLowerCase();
  
  if (lang === 'javascript' || lang === 'typescript') {
    return 1.0; // Perfect for PopeBot
  } else if (lang === 'python') {
    return 0.7; // Can work with Node.js bridge
  } else if (lang === 'rust' || lang === 'go') {
    return 0.5; // Would need wrapper
  } else if (lang) {
    return 0.3; // Unknown language
  }
  return 0.2; // No language specified
}

/**
 * Score quality (0.0-1.0) based on stars (log scale)
 */
function scoreQuality(stars) {
  // log2(stars + 1) / 12, capped at 1.0
  const raw = Math.log2(stars + 1) / 12;
  return Math.min(raw, 1.0);
}

/**
 * Score security (0.0-1.0)
 */
function scoreSecurity(repo) {
  let score = 0.5; // Base score

  // License bonus
  if (repo.license && repo.license.spdx_id && repo.license.spdx_id !== 'NOASSERTION') {
    score += 0.3;
  }

  // Bad pattern penalty
  const name = repo.name || '';
  const description = repo.description || '';
  if (containsBadPattern(name) || containsBadPattern(description)) {
    score -= 0.5;
  }

  // Recency bonus (updated within 180 days)
  if (repo.updated_at) {
    const updated = new Date(repo.updated_at);
    const now = new Date();
    const ageDays = (now - updated) / (1000 * 60 * 60 * 24);
    if (ageDays >= 0 && ageDays <= 180) {
      score += 0.2;
    }
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate total weighted score
 */
function calculateTotalScore(scores) {
  return (
    scores.compatibility * 0.30 +
    scores.quality * 0.35 +
    scores.security * 0.35
  );
}

/**
 * Get recommendation based on score
 */
function getRecommendation(totalScore) {
  if (totalScore >= CONFIG.minScore) {
    return 'AUTO';
  } else if (totalScore >= 0.4) {
    return 'MANUAL';
  } else {
    return 'SKIP';
  }
}

/**
 * Evaluate a repository
 */
function evaluateRepo(repo) {
  const scores = {
    compatibility: scoreCompatibility(repo),
    quality: scoreQuality(repo.stargazers_count || 0),
    security: scoreSecurity(repo)
  };

  const totalScore = calculateTotalScore(scores);
  const recommendation = getRecommendation(totalScore);

  return {
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    description: repo.description || 'No description',
    owner: repo.owner ? repo.owner.login : 'unknown',
    language: repo.language,
    stars: repo.stargazers_count || 0,
    license: repo.license ? repo.license.spdx_id : null,
    hasLicense: !!(repo.license && repo.license.spdx_id && repo.license.spdx_id !== 'NOASSERTION'),
    updatedAt: repo.updated_at,
    scores,
    totalScore,
    recommendation
  };
}

/**
 * Search GitHub for repositories
 */
async function searchGitHub(query) {
  const encodedQuery = encodeURIComponent(query);
  const endpoint = `/search/repositories?q=${encodedQuery}&sort=stars&order=desc&per_page=30`;
  
  try {
    const result = await githubRequest(endpoint);
    return result.items || [];
  } catch (error) {
    if (CONFIG.verbose) {
      console.error(`Search failed for "${query}": ${error.message}`);
    }
    return [];
  }
}

/**
 * Deduplicate results by URL
 */
function deduplicate(repos) {
  const seen = new Set();
  return repos.filter(repo => {
    if (seen.has(repo.html_url)) {
      return false;
    }
    seen.add(repo.html_url);
    return true;
  });
}

/**
 * Main discovery function
 */
async function discover() {
  console.log('=== SkillForge Discovery ===\n');
  console.log(`Searching with ${queries.length} query(s)...`);
  if (CONFIG.verbose) {
    queries.forEach(q => console.log(`  - "${q}"`));
  }
  console.log(`Rate limit: ${CONFIG.githubToken ? 'Authenticated (5000/hr)' : 'Unauthenticated (10/hr)'}\n`);

  // Collect all candidates
  let allRepos = [];
  for (const query of queries) {
    if (CONFIG.verbose) {
      console.log(`Searching: "${query}"`);
    }
    const repos = await searchGitHub(query);
    if (CONFIG.verbose) {
      console.log(`  Found ${repos.length} results`);
    }
    allRepos.push(...repos);
  }

  // Deduplicate
  const uniqueRepos = deduplicate(allRepos);
  if (CONFIG.verbose) {
    console.log(`\nAfter deduplication: ${uniqueRepos.length} unique repositories\n`);
  }

  // Evaluate and limit
  const evaluated = uniqueRepos.slice(0, CONFIG.limit).map(evaluateRepo);

  // Count by recommendation
  const autoCount = evaluated.filter(r => r.recommendation === 'AUTO').length;
  const manualCount = evaluated.filter(r => r.recommendation === 'MANUAL').length;
  const skipCount = evaluated.filter(r => r.recommendation === 'SKIP').length;

  // Print report
  console.log('=== Discovery Report ===');
  console.log(`Discovered: ${evaluated.length} candidates`);
  console.log(`Auto-integratable: ${autoCount}`);
  console.log(`Manual review: ${manualCount}`);
  console.log(`Skipped: ${skipCount}\n`);

  if (evaluated.length === 0) {
    console.log('No candidates found. Try different search queries.');
    return evaluated;
  }

  console.log('--- Candidates ---\n');

  evaluated.forEach((result, index) => {
    const icon = result.recommendation === 'AUTO' ? '⭐' : 
                 result.recommendation === 'MANUAL' ? '⚠️' : '⛔';
    
    console.log(`${index + 1}. ${result.name} ${icon} ${result.recommendation} (${result.totalScore.toFixed(2)})`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Owner: ${result.owner}`);
    console.log(`   Language: ${result.language || 'Unknown'} | Stars: ${result.stars} | License: ${result.license || 'None'}`);
    console.log(`   Description: ${result.description.substring(0, 100)}${result.description.length > 100 ? '...' : ''}`);
    console.log(`   Scores: Compatibility=${result.scores.compatibility.toFixed(2)}, Quality=${result.scores.quality.toFixed(2)}, Security=${result.scores.security.toFixed(2)}`);
    console.log();
  });

  // Save detailed report to file
  const reportPath = path.join(CONFIG.outputDir, 'skill-discovery-report.json');
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    queries,
    totalDiscovered: uniqueRepos.length,
    evaluated: evaluated.length,
    recommendations: { auto: autoCount, manual: manualCount, skip: skipCount },
    candidates: evaluated
  }, null, 2));

  if (CONFIG.verbose) {
    console.log(`Detailed report saved to: ${reportPath}`);
  }

  return evaluated;
}

// Run discovery
discover()
  .then(results => {
    if (results.length > 0) {
      console.log('\n=== Next Steps ===');
      console.log('To evaluate a specific candidate:');
      console.log(`  node evaluate.js <repository-url>`);
      console.log('\nTo generate a skill manifest:');
      console.log(`  node generate.js --name "skill-name" --url "<repo-url>" --description "What it does"`);
    }
  })
  .catch(error => {
    console.error('Discovery failed:', error.message);
    process.exit(1);
  });
