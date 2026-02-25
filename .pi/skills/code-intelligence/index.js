#!/usr/bin/env node
/**
 * Code Intelligence Indexer
 * Scans codebase and builds searchable index
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { findSourceFiles } = require('./lib/parser');
const { 
  initDatabase, 
  indexFile, 
  getStats,
  closeDatabase 
} = require('./lib/indexer');

program
  .name('code-index')
  .description('Index codebase for intelligent search')
  .version('1.0.0')
  .option('--scan <path>', 'Root directory to scan', '.')
  .option('--output <path>', 'Output database path', '.code-intelligence/index.db')
  .option('--verbose', 'Show detailed output', false)
  .option('--json', 'Output JSON format', false)
  .parse();

async function main() {
  const opts = program.opts();
  const rootDir = path.resolve(opts.scan);
  const dbPath = path.resolve(opts.output);

  if (!fs.existsSync(rootDir)) {
    console.error(`Error: Directory not found: ${rootDir}`);
    process.exit(1);
  }

  console.log(`🔍 Scanning ${rootDir}...`);
  console.log(`💾 Database: ${dbPath}`);
  
  const startTime = Date.now();
  let indexed = 0;
  let failed = 0;

  try {
    // Find all source files
    const files = findSourceFiles(rootDir);
    
    if (!opts.json) {
      console.log(`📁 Found ${files.length} source files`);
      console.log('');
    }

    // Initialize database
    const db = await initDatabase(dbPath);

    // Index each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = path.relative(rootDir, file);
      
      if (opts.verbose && !opts.json) {
        process.stdout.write(`  [${i + 1}/${files.length}] ${relativePath}... `);
      }

      try {
        const result = await indexFile(db, file, rootDir);
        if (result) {
          indexed++;
          if (opts.verbose && !opts.json) {
            process.stdout.write(`✓ (${result.functions} funcs, ${result.classes} classes)\n`);
          }
        } else if (opts.verbose && !opts.json) {
          process.stdout.write(`(no symbols)\n`);
        }
      } catch (err) {
        failed++;
        if (opts.verbose && !opts.json) {
          process.stdout.write(`✗ ${err.message}\n`);
        }
      }
    }

    // Get final stats
    const stats = await getStats(db);
    await closeDatabase(db);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (opts.json) {
      console.log(JSON.stringify({
        success: true,
        stats: {
          files_scanned: files.length,
          files_indexed: indexed,
          errors: failed,
          total_functions: stats.function_count,
          total_classes: stats.class_count,
          total_dependencies: stats.dependency_count,
          duration_seconds: parseFloat(duration)
        }
      }, null, 2));
    } else {
      console.log('');
      console.log('📊 Index Complete!');
      console.log('═══════════════════════════════════════');
      console.log(`   Files scanned:   ${files.length.toLocaleString()}`);
      console.log(`   Files indexed:   ${indexed.toLocaleString()}`);
      console.log(`   Errors:          ${failed}`);
      console.log(`   Total functions: ${stats.function_count.toLocaleString()}`);
      console.log(`   Total classes:   ${stats.class_count.toLocaleString()}`);
      console.log(`   Dependencies:    ${stats.dependency_count.toLocaleString()}`);
      console.log(`   Duration:        ${duration}s`);
      console.log('═══════════════════════════════════════');
    }

  } catch (err) {
    if (opts.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`✗ Fatal error: ${err.message}`);
    }
    process.exit(1);
  }
}

main();
