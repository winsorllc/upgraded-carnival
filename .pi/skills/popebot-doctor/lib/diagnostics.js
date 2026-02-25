/**
 * Core Diagnostics Runner
 * Orchestrates all diagnostic checks
 */

const environment = require('./environment');
const skills = require('./skills');
const api = require('./api');
const config = require('./config');
const filesystem = require('./filesystem');

const CHECKERS = {
  environment,
  skills,
  api,
  config,
  filesystem
};

/**
 * Run all requested diagnostic checks
 * @param {string[]} categories - Categories to check
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Diagnostic results
 */
async function run(categories, options = {}) {
  const results = {
    items: [],
    summary: { ok: 0, warning: 0, error: 0, total: 0 }
  };
  
  for (const category of categories) {
    const checker = CHECKERS[category];
    if (!checker) {
      results.items.push({
        category: 'meta',
        check: 'category-exists',
        severity: 'error',
        message: `Unknown diagnostic category: ${category}`
      });
      continue;
    }
    
    try {
      const categoryResults = await checker.run(options);
      results.items.push(...categoryResults);
    } catch (err) {
      results.items.push({
        category,
        check: 'category-run',
        severity: 'error',
        message: `Failed to run ${category} checks: ${err.message}`
      });
    }
  }
  
  // Calculate summary
  results.summary = results.items.reduce((acc, item) => {
    acc.total++;
    acc[item.severity]++;
    return acc;
  }, { ok: 0, warning: 0, error: 0, total: 0 });
  
  return results;
}

module.exports = { run };
