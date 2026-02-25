#!/usr/bin/env node
/**
 * memory-search: Search memories
 */

const { hybridSearch, vectorSearch, keywordSearch } = require('../lib/search');

const args = process.argv.slice(2);

function showHelp() {
  console.log(`Usage:
  memory-search "Your query" [options]

Options:
  --mode, -m      Search mode: hybrid (default), vector, keyword
  --limit, -l     Number of results (default: 10)
  --threshold, -t Minimum score threshold (default: 0)
  --help, -h      Show this help

Examples:
  memory-search "authentication middleware"
  memory-search "database config" --mode vector --limit 5
  memory-search "deployment" --mode keyword --threshold 0.5
`);
}

async function main() {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Parse arguments
  let query = null;
  const options = {
    mode: 'hybrid',
    limit: 10,
    threshold: 0
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '-m' || arg === '--mode') {
      options.mode = nextArg;
      i++;
    } else if (arg === '-l' || arg === '--limit') {
      options.limit = parseInt(nextArg) || 10;
      i++;
    } else if (arg === '-t' || arg === '--threshold') {
      options.threshold = parseFloat(nextArg) || 0;
      i++;
    } else if (!query && !arg.startsWith('-')) {
      query = arg;
    }
  }

  if (!query) {
    console.error('❌ No query specified');
    process.exit(1);
  }

  console.log(`🔍 Searching: "${query}"`);
  console.log(`📊 Mode: ${options.mode}`);
  console.log('');

  try {
    const startTime = Date.now();
    let results;

    switch (options.mode) {
      case 'vector':
        results = await vectorSearch(query, options);
        break;
      case 'keyword':
        results = keywordSearch(query, options);
        break;
      case 'hybrid':
      default:
        results = await hybridSearch(query, options);
        break;
    }

    const duration = Date.now() - startTime;

    if (results.length === 0) {
      console.log('❌ No results found');
      process.exit(0);
    }

    console.log(`✅ Found ${results.length} results in ${duration}ms\n`);

    for (const r of results) {
      console.log('─'.repeat(60));
      console.log(`🆔 ${r.id}`);
      console.log(`📎 Source: ${r.source || 'unknown'}`);
      console.log(`🔖 Tags: ${r.tags.join(', ') || 'none'}`);
      
      if (r.scores) {
        const scores = [];
        if (r.scores.vector !== undefined) scores.push(`vector: ${(r.scores.vector).toFixed(3)}`);
        if (r.scores.keyword !== undefined) scores.push(`keyword: ${(r.scores.keyword).toFixed(3)}`);
        if (r.scores.hybrid !== undefined) scores.push(`hybrid: ${(r.scores.hybrid).toFixed(3)}`);
        console.log(`📈 Scores: ${scores.join(' | ')}`);
      }
      
      console.log('');
      const preview = r.content.slice(0, 300);
      console.log(preview + (r.content.length > 300 ? '...' : ''));
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
