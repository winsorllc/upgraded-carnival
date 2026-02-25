#!/usr/bin/env node
/**
 * memory-store: Store new memories
 */

const { storeMemory, storeFromFile } = require('../lib/store');
const fs = require('fs');

const args = process.argv.slice(2);

function showHelp() {
  console.log(`Usage:
  memory-store "Content to store" [options]
  memory-store -f /path/to/file.md [options]

Options:
  --tags, -t      Comma-separated tags (e.g., "project,meeting")
  --source, -s    Source attribution
  --id            Custom memory ID
  --help, -h      Show this help

Examples:
  memory-store "User prefers dark mode" --tags preferences,ui
  memory-store -f docs/api.md --tags documentation --source "API Docs"
`);
}

async function main() {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Parse arguments
  let content = null;
  let filePath = null;
  const options = {
    tags: [],
    source: null,
    id: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '-f' || arg === '--file') {
      filePath = nextArg;
      i++;
    } else if (arg === '-t' || arg === '--tags') {
      options.tags = nextArg.split(',').map(t => t.trim());
      i++;
    } else if (arg === '-s' || arg === '--source') {
      options.source = nextArg;
      i++;
    } else if (arg === '--id') {
      options.id = nextArg;
      i++;
    } else if (!content && !arg.startsWith('-')) {
      content = arg;
    }
  }

  try {
    let result;

    if (filePath) {
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
      }
      console.log(`📄 Storing from file: ${filePath}`);
      result = await storeFromFile(filePath, options);
    } else if (content) {
      console.log('💾 Storing memory...');
      result = await storeMemory(content, options);
    } else {
      console.error('❌ No content or file specified');
      process.exit(1);
    }

    if (result.batchId) {
      // Multi-chunk result
      console.log(`\n✅ Stored ${result.chunks} chunks from file`);
      console.log(`📦 Batch ID: ${result.batchId}`);
      console.log('\nMemory IDs:');
      for (const r of result.results) {
        console.log(`  • ${r.id}`);
      }
    } else {
      // Single memory result
      console.log('\n✅ Memory stored successfully!');
      console.log(`🆔 ID: ${result.id}`);
      console.log(`🔖 Tags: ${result.tags.join(', ') || 'none'}`);
      console.log(`📎 Source: ${result.source || 'manual'}`);
      console.log(`📝 Content preview: ${result.content.slice(0, 100)}${result.content.length > 100 ? '...' : ''}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
