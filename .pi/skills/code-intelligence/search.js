#!/usr/bin/env node
/**
 * Code Intelligence Search
 * Search the codebase for symbols and patterns
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { initDatabase, searchSymbols, getAllFiles, closeDatabase } = require('./lib/indexer');

program
  .name('code-search')
  .description('Search codebase symbols and definitions')
  .version('1.0.0')
  .argument('<query>', 'Search query')
  .option('--db <path>', 'Database path', '.code-intelligence/index.db')
  .option('--type <type>', 'Filter by type (function, class, export)')
  .option('--ext <ext>', 'Filter by file extensions (comma-separated)')
  .option('--limit <n>', 'Maximum results', '50')
  .option('--json', 'Output JSON format', false)
  .parse();

async function main() {
  const opts = program.opts();
  const query = program.args[0];
  const dbPath = path.resolve(opts.db);

  if (!fs.existsSync(dbPath)) {
    console.error('Error: Database not found. Run `node index.js` first.');
    process.exit(1);
  }

  try {
    const db = await initDatabase(dbPath);
    
    // Search for symbols
    const symbols = await searchSymbols(db, query, {
      type: opts.type,
      limit: parseInt(opts.limit)
    });

    // Filter by extension if specified
    let results = symbols;
    if (opts.ext) {
      const exts = opts.ext.split(',').map(e => e.trim().toLowerCase());
      results = symbols.filter(s => {
        const ext = path.extname(s.path).toLowerCase();
        return exts.includes(ext);
      });
    }

    await closeDatabase(db);

    if (opts.json) {
      console.log(JSON.stringify({
        query,
        results_count: results.length,
        results: results.map(r => ({
          name: r.name,
          type: r.type,
          file: r.path,
          language: r.language,
          line: r.line,
          extra: r.extra ? JSON.parse(r.extra) : null
        }))
      }, null, 2));
    } else {
      if (results.length === 0) {
        console.log(`No results found for "${query}"`);
        return;
      }

      console.log(`\n🔍 Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`);
      console.log('═'.repeat(60));

      // Group by file
      const byFile = results.reduce((acc, r) => {
        if (!acc[r.path]) acc[r.path] = [];
        acc[r.path].push(r);
        return acc;
      }, {});

      for (const [filePath, matches] of Object.entries(byFile)) {
        console.log(`\n📄 ${filePath}`);
        console.log('─'.repeat(60));
        
        for (const match of matches) {
          const icon = match.type === 'function' ? '⚡' : 
                       match.type === 'class' ? '🏛️' : '📤';
          const extra = match.extra ? JSON.parse(match.extra) : {};
          
          console.log(`  ${icon} ${match.name} (${match.type})`);
          console.log(`     Line ${match.line}`);
          
          if (extra.signature) {
            console.log(`     ${extra.signature}`);
          }
          if (extra.extends) {
            console.log(`     extends ${extra.extends}`);
          }
        }
      }
      
      console.log('');
    }

  } catch (err) {
    if (opts.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}

main();
