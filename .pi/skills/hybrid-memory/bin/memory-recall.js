#!/usr/bin/env node
/**
 * memory-recall: Quick context recall for agents
 */

const { recall } = require('../lib/search');

const args = process.argv.slice(2);

function showHelp() {
  console.log(`Usage:
  memory-recall "Context query" [options]

Options:
  --top-k, -k     Number of results (default: 5)
  --threshold, -t Minimum similarity threshold (default: 0.6)
  --help, -h      Show this help

Examples:
  memory-recall "How do I configure the database?"
  memory-recall "error handling patterns" --top-k 3
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
    topK: 5,
    threshold: 0.6
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '-k' || arg === '--top-k') {
      options.topK = parseInt(nextArg) || 5;
      i++;
    } else if (arg === '-t' || arg === '--threshold') {
      options.threshold = parseFloat(nextArg) || 0.6;
      i++;
    } else if (!query && !arg.startsWith('-')) {
      query = arg;
    }
  }

  if (!query) {
    console.error('❌ No query specified');
    process.exit(1);
  }

  console.log(`🧠 Recalling memories for: "${query}"\n`);

  try {
    const results = await recall(query, options);

    if (results.length === 0) {
      console.log('❌ No relevant memories found');
      process.exit(0);
    }

    console.log(`✅ Found ${results.length} relevant memories\n`);

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      console.log(`${i + 1}. ${'─'.repeat(56)}`);
      console.log(`   Relevance: ${(r.scores.hybrid * 100).toFixed(1)}%`);
      console.log(`   Source: ${r.source || 'unknown'}`);
      console.log('');
      
      // Indent content
      const lines = r.content.split('\n');
      for (const line of lines.slice(0, 10)) {
        console.log(`   ${line}`);
      }
      if (lines.length > 10) {
        console.log(`   ... (${lines.length - 10} more lines)`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
