#!/usr/bin/env node

/**
 * Code Review Assistant
 * Analyzes GitHub pull requests, code diffs, and files for bugs, security issues, and best practices
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const SKILL_DIR = path.dirname(__filename);

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    input: null,
    format: 'text',
    focus: 'all',
    branch: null,
    files: [],
    diff: null
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case '--json':
        options.format = 'json';
        break;
      case '--text':
        options.format = 'text';
        break;
      case '--focus':
        options.focus = args[++i];
        break;
      case '--branch':
        options.branch = args[++i];
        break;
      case '--files':
        while (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          options.files.push(args[++i]);
        }
        break;
      case '--diff':
        // Collect remaining args as diff
        options.diff = args.slice(++i).join(' ');
        i = args.length;
        break;
      default:
        if (!arg.startsWith('--') && !options.input) {
          options.input = arg;
        }
    }
    i++;
  }
  
  return options;
}

/**
 * Execute a command and return output
 */
function exec(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      ...options 
    }).trim();
  } catch (error) {
    if (options.silent) return null;
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

/**
 * Fetch pull request details from GitHub
 */
function fetchPR(prUrl) {
  // Parse PR URL: https://github.com/owner/repo/pull/123
  const match = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!match) {
    throw new Error('Invalid PR URL. Expected format: https://github.com/owner/repo/pull/123');
  }
  
  const [, owner, repo, prNumber] = match;
  
  // Get PR details
  const prJson = exec(`gh pr view ${prNumber} --repo ${owner}/${repo} --json title,url,author,state,additions,deletions,files`);
  const pr = JSON.parse(prJson);
  
  // Get diff
  const diff = exec(`gh pr diff ${prNumber} --repo ${owner}/${repo} --no-color`);
  
  return {
    pr: {
      url: prUrl,
      title: pr.title,
      repo: `${owner}/${repo}`,
      author: pr.author?.login || 'unknown',
      state: pr.state,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      filesChanged: pr.files?.length || 0
    },
    diff,
    files: pr.files || []
  };
}

/**
 * Fetch branch diff
 */
function fetchBranchDiff(branch) {
  const diff = exec(`git diff main...${branch} --no-color 2>/dev/null || git diff master...${branch} --no-color 2>/dev/null || git diff HEAD...${branch} --no-color`);
  
  return {
    pr: {
      title: `Branch: ${branch}`,
      repo: 'current',
      branch,
      additions: (diff.match(/^\+/gm) || []).length,
      deletions: (diff.match(/^\-/gm) || []).length
    },
    diff,
    files: []
  };
}

/**
 * Fetch file contents
 */
function fetchFiles(filePaths) {
  let diff = '';
  const files = [];
  
  for (const filePath of filePaths) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      diff += `--- a/${filePath}\n`;
      diff += `+++ b/${filePath}\n`;
      lines.forEach((line, i) => {
        diff += `+${line}\n`;
      });
      files.push({ path: filePath });
    } catch (e) {
      // File doesn't exist, show as new file
      console.error(`Warning: File not found: ${filePath}`);
    }
  }
  
  return {
    pr: {
      title: `Files: ${filePaths.join(', ')}`,
      repo: 'current',
      filesChanged: filePaths.length
    },
    diff,
    files
  };
}

/**
 * Analyze code using LLM
 */
async function analyzeCode(diff, focus, repo) {
  // Build the prompt
  const focusInstructions = {
    security: 'Focus specifically on security vulnerabilities: injection attacks, exposed secrets, authentication issues, authorization problems, and data exposure risks.',
    bugs: 'Focus specifically on bug detection: null pointer risks, race conditions, logic errors, edge cases, and potential crashes.',
    'best-practices': 'Focus specifically on code style, maintainability, and best practices: naming conventions, code organization, and following language idioms.',
    performance: 'Focus specifically on performance issues: memory leaks, inefficient algorithms, unnecessary computations, and N+1 queries.',
    all: 'Provide a comprehensive review covering security vulnerabilities, bugs, code quality, and best practices.'
  };
  
  const truncatedDiff = diff.length > 30000 ? diff.substring(0, 30000) + '\n\n[... Truncated - too large to analyze fully ...]' : diff;
  
  const prompt = `You are an expert code reviewer. Analyze the following code changes and identify issues.

${focusInstructions[focus] || focusInstructions.all}

Provide your review in JSON format:
{
  "issues": [
    {
      "severity": "high|medium|low",
      "category": "security|bugs|best-practices|performance",
      "file": "filename",
      "line": line_number,
      "message": "Brief description of the issue",
      "suggestion": "How to fix or improve"
    }
  ],
  "summary": {
    "total": number,
    "high": number,
    "medium": number,
    "low": number,
    "recommendation": "Overall recommendation"
  }
}

If no issues found, return an empty issues array with summary showing 0 for all counts.

Code changes to review:
\`\`\`diff
${truncatedDiff}
\`\`\`
`;

  // Call LLM - try multiple providers
  let response;
  const env = process.env;
  
  if (env.ANTHROPIC_API_KEY) {
    response = await callAnthropic(prompt, env.ANTHROPIC_API_KEY);
  } else if (env.OPENAI_API_KEY) {
    response = await callOpenAI(prompt, env.OPENAI_API_KEY);
  } else if (env.GOOGLE_API_KEY) {
    response = await callGoogle(prompt, env.GOOGLE_API_KEY);
  } else {
    throw new Error('No LLM API key found. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY');
  }
  
  // Parse JSON from response
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  } catch (e) {
    console.error('Failed to parse LLM response as JSON:', response);
    return {
      issues: [],
      summary: { total: 0, high: 0, medium: 0, low: 0, recommendation: 'Unable to analyze code - LLM response parsing failed' }
    };
  }
}

async function callAnthropic(apiKey, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
}

async function callOpenAI(apiKey, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGoogle(apiKey, prompt) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google API error: ${error}`);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Format review as text
 */
function formatText(pr, analysis) {
  let output = '============================================================\n';
  output += `Code Review: ${pr.title}\n`;
  output += '============================================================\n';
  
  if (pr.repo) output += `Repo: ${pr.repo}\n`;
  if (pr.author) output += `Author: @${pr.author}\n`;
  if (pr.filesChanged) output += `Files changed: ${pr.filesChanged}\n`;
  if (pr.additions) output += `Additions: ${pr.additions} | Deletions: ${pr.deletions || 0}\n`;
  output += '\n';
  
  // Group issues by category
  const categories = {
    security: '--- Security Issues ---',
    bugs: '--- Bugs ---',
    'best-practices': '--- Best Practices ---',
    performance: '--- Performance Issues ---'
  };
  
  for (const [category, header] of Object.entries(categories)) {
    const categoryIssues = analysis.issues.filter(i => i.category === category);
    if (categoryIssues.length > 0 || category === 'security') {
      output += header + '\n';
      
      if (categoryIssues.length === 0) {
        output += '✅ No issues found\n';
      } else {
        for (const issue of categoryIssues) {
          const severityIcon = issue.severity === 'high' ? '⚠️' : issue.severity === 'medium' ? '🐛' : '💡';
          output += `${severityIcon} [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line || '?'} - ${issue.message}\n`;
          if (issue.suggestion) {
            output += `   → ${issue.suggestion}\n`;
          }
        }
      }
      output += '\n';
    }
  }
  
  // Summary
  output += '--- Summary ---\n';
  output += `Overall: ${analysis.summary.high} high, ${analysis.summary.medium} medium, ${analysis.summary.low} low priority issues\n`;
  output += `Recommendation: ${analysis.summary.recommendation}\n`;
  
  return output;
}

/**
 * Quick inline code check
 */
async function quickCheck(code, language) {
  const prompt = `You are a code reviewer. Review this ${language || 'code'} snippet for issues.

Provide JSON response:
{
  "issues": [
    {
      "severity": "high|medium|low",
      "message": "issue description",
      "suggestion": "how to fix"
    }
  ],
  "summary": {
    "total": count,
    "high": count,
    "medium": count,
    "low": count,
    "recommendation": "overall advice"
  }
}

Code:
\`\`\`${language}
${code}
\`\`\`
`;

  return analyzeCode(code, 'all', 'inline');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Handle quick-check mode
  if (args[0] === 'quick-check') {
    const code = args.slice(1, -1).join(' ') || '';
    const language = args[args.length - 1] || 'text';
    const result = await quickCheck(code, language);
    console.log(formatText({ title: 'Quick Check' }, result));
    return;
  }
  
  const options = parseArgs(args);
  
  if (!options.input && !options.branch && !options.files.length && !options.diff) {
    console.error('Usage:');
    console.error('  review.js <pr-url>                    - Review a GitHub PR');
    console.error('  review.js --branch <branch>           - Review branch diff');
    console.error('  review.js --files <file1> <file2>     - Review specific files');
    console.error('  review.js --diff <diff>               - Review a diff');
    console.error('  review.js --focus security <pr-url>   - Focus on specific area');
    console.error('  review.js --json <pr-url>             - JSON output');
    console.error('');
    console.error('Quick check:');
    console.error('  quick-check.js "<code>" <language>    - Quick inline check');
    process.exit(1);
  }
  
  try {
    // Fetch code changes
    let prData;
    if (options.input) {
      prData = fetchPR(options.input);
    } else if (options.branch) {
      prData = fetchBranchDiff(options.branch);
    } else if (options.files.length) {
      prData = fetchFiles(options.files);
    } else if (options.diff) {
      prData = {
        pr: { title: 'Diff Review', repo: 'provided' },
        diff: options.diff,
        files: []
      };
    } else {
      throw new Error('No input provided');
    }
    
    // Analyze with LLM
    const analysis = await analyzeCode(prData.diff, options.focus, prData.pr.repo);
    
    // Output
    if (options.format === 'json') {
      console.log(JSON.stringify({
        pr: prData.pr,
        ...analysis
      }, null, 2));
    } else {
      console.log(formatText(prData.pr, analysis));
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
