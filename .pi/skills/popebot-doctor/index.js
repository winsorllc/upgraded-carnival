#!/usr/bin/env node
/**
 * PopeBot Doctor - Main Entry Point
 * Comprehensive diagnostics and health checking for the PopeBot environment
 */

const diagnostics = require('./lib/diagnostics');
const report = require('./lib/report');
const repair = require('./lib/repair');

const SKILL_VERSION = '1.0.0';

/**
 * Run comprehensive diagnostics
 * @param {Object} options - Diagnostic options
 * @returns {Promise<Object>} Diagnostic results
 */
async function popebotDoctorRun(options = {}) {
  const { 
    categories = ['environment', 'skills', 'api', 'config', 'filesystem'],
    autoRepair = false,
    format = 'object' // 'object', 'json'
  } = options;
  
  console.log('🩺 PopeBot Doctor v' + SKILL_VERSION);
  console.log('   Running diagnostics...\n');
  
  const startTime = Date.now();
  const results = await diagnostics.run(categories);
  const duration = Date.now() - startTime;
  
  // Add metadata
  results.meta = {
    version: SKILL_VERSION,
    timestamp: new Date().toISOString(),
    duration: duration + 'ms',
    categories: categories
  };
  
  // Auto-repair if requested
  if (autoRepair && results.summary.errors > 0) {
    console.log('\n🔧 Attempting auto-repair...\n');
    const repairResult = await repair.run(results);
    results.repairs = repairResult;
  }
  
  // Print summary to console
  printSummary(results);
  
  return format === 'json' ? JSON.stringify(results, null, 2) : results;
}

/**
 * Quick health check
 * @param {Object} options - Check options
 * @returns {Promise<boolean>} True if healthy
 */
async function popebotDoctorCheck(options = {}) {
  const { category = null } = options;
  
  const categories = category ? [category] : ['environment', 'skills'];
  const results = await diagnostics.run(categories, { quick: true });
  
  return results.summary.errors === 0;
}

/**
 * Attempt to repair issues
 * @param {Object} options - Repair options
 * @returns {Promise<Object>} Repair results
 */
async function popebotDoctorRepair(options = {}) {
  const { 
    all = false,
    category = null,
    dryRun = false,
    results = null
  } = options;
  
  // If no results provided, run diagnostics first
  const diagnosticResults = results || await diagnostics.run(
    category ? [category] : ['environment', 'skills', 'api', 'config', 'filesystem']
  );
  
  if (dryRun) {
    console.log('🔧 Dry run mode - no changes will be made\n');
  }
  
  const repairOptions = { all, category, dryRun };
  const repairResult = await repair.run(diagnosticResults, repairOptions);
  
  return repairResult;
}

/**
 * Generate formatted report
 * @param {Object} options - Report options
 * @returns {Promise<string>} Formatted report
 */
async function popebotDoctorReport(options = {}) {
  const { 
    format = 'markdown',
    output = null,
    severity = null, // 'error', 'warning', or null for all
    results = null
  } = options;
  
  // If no results provided, run diagnostics
  const diagnosticResults = results || await diagnostics.run();
  
  // Filter by severity if requested
  let filteredResults = diagnosticResults;
  if (severity) {
    filteredResults = {
      ...diagnosticResults,
      items: diagnosticResults.items.filter(i => i.severity === severity)
    };
  }
  
  // Generate report
  const reportContent = await report.generate(filteredResults, format);
  
  // Save to file if requested
  if (output) {
    const fs = require('fs');
    fs.writeFileSync(output, reportContent);
    console.log(`📄 Report saved to: ${output}`);
  }
  
  return reportContent;
}

/**
 * Print diagnostic summary to console
 * @param {Object} results - Diagnostic results
 */
function printSummary(results) {
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));
  
  const { summary } = results;
  console.log(`\n✅ OK:      ${summary.ok}`);
  console.log(`⚠️  Warning: ${summary.warning}`);
  console.log(`❌ Error:   ${summary.error}`);
  console.log(`\nTotal checks: ${summary.total}`);
  
  // Print errors first
  const errors = results.items.filter(i => i.severity === 'error');
  if (errors.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('ERRORS REQUIRING ATTENTION:');
    console.log('-'.repeat(60));
    errors.forEach(item => {
      console.log(`\n[${item.category}] ${item.check}`);
      console.log(`    ${item.message}`);
      if (item.remediation) {
        console.log(`    💡 Fix: ${item.remediation}`);
      }
    });
  }
  
  // Print warnings
  const warnings = results.items.filter(i => i.severity === 'warning');
  if (warnings.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('WARNINGS:');
    console.log('-'.repeat(60));
    warnings.slice(0, 5).forEach(item => {
      console.log(`[${item.category}] ${item.check}: ${item.message}`);
    });
    if (warnings.length > 5) {
      console.log(`... and ${warnings.length - 5} more warnings`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  if (summary.errors === 0 && summary.warnings === 0) {
    console.log('✨ All systems healthy!');
  } else if (summary.errors === 0) {
    console.log('✅ System healthy (with warnings)');
  } else {
    console.log(`⚠️  ${summary.errors} error(s) found - action required`);
  }
  console.log('='.repeat(60) + '\n');
}

// Export API
module.exports = {
  popebotDoctorRun,
  popebotDoctorCheck,
  popebotDoctorRepair,
  popebotDoctorReport,
  diagnostics,
  report,
  repair,
  version: SKILL_VERSION
};

// CLI entry point
if (require.main === module) {
  // Parse command line args
  const args = process.argv.slice(2);
  
  const options = {
    categories: [],
    autoRepair: args.includes('--repair'),
    format: args.includes('--json') ? 'json' : 'object'
  };
  
  // Parse categories
  const catIndex = args.findIndex(a => a === '--categories' || a === '-c');
  if (catIndex !== -1 && args[catIndex + 1]) {
    options.categories = args[catIndex + 1].split(',');
  }
  
  // Run diagnostics
  popebotDoctorRun(options).then(results => {
    if (options.format === 'json') {
      console.log(results);
    }
    // Exit with error code if errors found
    const resultObj = typeof results === 'string' ? JSON.parse(results) : results;
    process.exit(resultObj.summary.errors > 0 ? 1 : 0);
  }).catch(err => {
    console.error('❌ Diagnostic failed:', err.message);
    process.exit(1);
  });
}
