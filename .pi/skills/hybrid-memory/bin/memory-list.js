#!/usr/bin/env node
/**
 * memory-list: List stored memories
 */

const { listMemories } = require('../lib/store');

const args = process.argv.slice(2);

function showHelp() {
  console.log(`Usage:
  memory-list [options]

Options:
  --limit, -l     Number of results (default: 20)
  --offset        Pagination offset (default: 0)
  --help, -h      Show this help

Examples:
  memory-list
  memory-list --limit 10
`);
}

(async () => {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const options = {
    limit: 20,
    offset: 0
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '-l' || arg === '--limit') {
      options.limit = parseInt(nextArg) || 20;
      i++;
    } else if (arg === '--offset') {
      options.offset = parseInt(nextArg) || 0;
      i++;
    }
  }

  try {
    const memories = await listMemories(options);
    
    if (memories.length === 0) {
      console.log('No memories found');
      process.exit(0);
    }

    console.log(`📚 ${memories.length} Memories\n`);
    console.log('='.repeat(60));

    for (const m of memories) {
      console.log(`\n🆔 ${m.id}`);
      console.log(`📎 Source: ${m.source || 'unknown'}`);
      if (m.tags.length > 0) {
        console.log(`🔖 Tags: ${m.tags.join(', ')}`);
      }
      console.log(`📝 ${m.content}`);
      console.log('-'.repeat(40));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
