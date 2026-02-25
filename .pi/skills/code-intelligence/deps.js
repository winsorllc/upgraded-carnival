#!/usr/bin/env node
/**
 * Code Intelligence Dependencies
 * Analyze code dependencies and relationships
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { 
  initDatabase, 
  findDependants, 
  findImports,
  buildDependencyChain,
  closeDatabase 
} = require('./lib/indexer');

program
  .name('code-deps')
  .description('Analyze code dependencies')
  .version('1.0.0')
  .argument('<file>', 'Target file path')
  .option('--db <path>', 'Database path', '.code-intelligence/index.db')
  .option('--dependents', 'Show files that depend on this file', false)
  .option('--imports', 'Show files this file imports', false)
  .option('--chain', 'Show full dependency chain', false)
  .option('--json', 'Output JSON format', false)
  .parse();

async function main() {
  const opts = program.opts();
  const targetFile = path.resolve(program.args[0]);
  const dbPath = path.resolve(opts.db);

  if (!fs.existsSync(dbPath)) {
    console.error('Error: Database not found. Run `node index.js` first.');
    process.exit(1);
  }

  // If neither flag is set, show both
  const showDependents = opts.dependents || (!opts.imports && !opts.chain);
  const showImports = opts.imports || (!opts.dependents && !opts.chain);
  const showChain = opts.chain;

  try {
    const db = await initDatabase(dbPath);
    const results = { file: targetFile };

    if (showDependents) {
      results.dependents = await findDependants(db, targetFile);
    }

    if (showImports) {
      results.imports = await findImports(db, targetFile);
    }

    if (showChain) {
      results.chain = await buildDependencyChain(db, targetFile);
    }

    await closeDatabase(db);

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(`\n📊 Dependency Analysis: ${path.basename(targetFile)}`);
      console.log('═'.repeat(60));

      if (showDependents && results.dependents) {
        console.log('\n⬅️  Dependents (files that import this):');
        if (results.dependents.length === 0) {
          console.log('   (none found)');
        } else {
          for (const dep of results.dependents) {
            const relative = path.relative(process.cwd(), dep.path);
            console.log(`   • ${relative}`);
            console.log(`     imports as: "${dep.import_source}" at line ${dep.line}`);
          }
        }
      }

      if (showImports && results.imports) {
        console.log('\n➡️  Imports (files this file depends on):');
        if (results.imports.length === 0) {
          console.log('   (none found)');
        } else {
          for (const imp of results.imports) {
            const display = imp.path.startsWith('/') 
              ? path.relative(process.cwd(), imp.path)
              : imp.path;
            console.log(`   • ${display}`);
            if (imp.line) {
              console.log(`     at line ${imp.line}`);
            }
          }
        }
      }

      if (showChain && results.chain) {
        console.log('\n⛓️  Dependency Chain:');
        if (results.chain.length === 0) {
          console.log('   (no external dependencies)');
        } else {
          const seen = new Set();
          for (const link of results.chain) {
            const key = `${link.file}->${link.imports}`;
            if (!seen.has(key)) {
              seen.add(key);
              const from = path.relative(process.cwd(), link.file);
              const to = link.imports.startsWith('/')
                ? path.relative(process.cwd(), link.imports)
                : link.imports;
              console.log(`   ${from}`);
              console.log(`   └─▶ ${to}`);
            }
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
