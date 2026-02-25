#!/usr/bin/env node
/**
 * Code Intelligence Impact Analysis
 * Analyze the impact of code changes
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { 
  initDatabase, 
  findDependants, 
  searchSymbols,
  closeDatabase 
} = require('./lib/indexer');

program
  .name('code-impact')
  .description('Analyze impact of code changes')
  .version('1.0.0')
  .argument('<file>', 'Target file path')
  .option('--db <path>', 'Database path', '.code-intelligence/index.db')
  .option('--function <name>', 'Analyze impact of specific function')
  .option('--class <name>', 'Analyze impact of specific class')
  .option('--depth <n>', 'Analysis depth (1-3)', '2')
  .option('--json', 'Output JSON format', false)
  .parse();

async function analyzeImpact(db, filePath, options) {
  const { funcName, className, depth } = options;
  const results = {
    target: { file: filePath },
    impact: {
      direct: [],
      indirect: [],
      files: new Set(),
      totalAffectedFiles: 0,
      risk: 'low'
    }
  };

  // Find direct dependents
  const dependents = await findDependants(db, filePath);
  
  for (const dep of dependents) {
    results.impact.direct.push(dep);
    results.impact.files.add(dep.path);
  }

  // If specific function/class, be more precise
  if (funcName || className) {
    results.target.function = funcName;
    results.target.class = className;
    
    // Search for usages of this symbol in the codebase
    const symbolName = funcName || className;
    const usages = await searchSymbols(db, symbolName, { limit: 100 });
    
    for (const usage of usages) {
      if (usage.path !== filePath) {
        results.impact.files.add(usage.path);
        results.impact.indirect.push({
          file: usage.path,
          line: usage.line,
          context: `${usage.type} ${usage.name}`
        });
      }
    }
  }

  // Calculate risk
  const affectedCount = results.impact.files.size;
  results.impact.totalAffectedFiles = affectedCount;
  
  if (affectedCount === 0) {
    results.impact.risk = 'none';
  } else if (affectedCount <= 2) {
    results.impact.risk = 'low';
  } else if (affectedCount <= 10) {
    results.impact.risk = 'medium';
  } else {
    results.impact.risk = 'high';
  }

  // Convert Set to Array for JSON serialization
  results.impact.files = Array.from(results.impact.files);

  return results;
}

async function main() {
  const opts = program.opts();
  const targetFile = path.resolve(program.args[0]);
  const dbPath = path.resolve(opts.db);

  if (!fs.existsSync(dbPath)) {
    console.error('Error: Database not found. Run `node index.js` first.');
    process.exit(1);
  }

  if (!fs.existsSync(targetFile)) {
    console.error(`Error: File not found: ${targetFile}`);
    process.exit(1);
  }

  try {
    const db = await initDatabase(dbPath);
    
    const results = await analyzeImpact(db, targetFile, {
      funcName: opts.function,
      className: opts.class,
      depth: parseInt(opts.depth)
    });

    await closeDatabase(db);

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      const baseName = path.basename(targetFile);
      console.log(`\n🔬 Impact Analysis: ${baseName}`);
      console.log('═'.repeat(60));
      
      if (opts.function || opts.class) {
        console.log(`Target: ${opts.function || opts.class}`);
      }
      
      // Risk indicator
      const riskColors = {
        none: '🟢',
        low: '🟡',
        medium: '🟠',
        high: '🔴'
      };
      
      console.log(`\nRisk Level: ${riskColors[results.impact.risk]} ${results.impact.risk.toUpperCase()}`);
      console.log(`Affected Files: ${results.impact.totalAffectedFiles}`);
      
      if (results.impact.direct.length > 0) {
        console.log('\n📥 Direct Dependencies (import this file):');
        for (const dep of results.impact.direct.slice(0, 10)) {
          const rel = path.relative(process.cwd(), dep.path);
          console.log(`  • ${rel}`);
        }
        if (results.impact.direct.length > 10) {
          console.log(`  ... and ${results.impact.direct.length - 10} more`);
        }
      }
      
      if (results.impact.indirect.length > 0) {
        console.log('\n🔗 Indirect References (may reference symbols):');
        const uniqueIndirect = [...new Map(results.impact.indirect.map(i => [i.file, i])).values()];
        for (const ref of uniqueIndirect.slice(0, 10)) {
          const rel = path.relative(process.cwd(), ref.file);
          console.log(`  • ${rel}`);
        }
        if (uniqueIndirect.length > 10) {
          console.log(`  ... and ${uniqueIndirect.length - 10} more`);
        }
      }
      
      console.log('\n💡 Recommendations:');
      switch (results.impact.risk) {
        case 'none':
          console.log('  • Safe to modify - no external dependencies');
          console.log('  • Run tests to verify functionality');
          break;
        case 'low':
          console.log('  • Review the affected file(s) before making changes');
          console.log('  • Consider adding tests for edge cases');
          break;
        case 'medium':
          console.log('  • Impact analysis recommended before changes');
          console.log('  • Consider refactoring in phases');
          console.log('  • Update documentation');
          break;
        case 'high':
          console.log('  ⚠️  High impact - proceed with caution');
          console.log('  • Create comprehensive test plan');
          console.log('  • Consider gradual rollout');
          console.log('  • Notify stakeholders');
          break;
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
