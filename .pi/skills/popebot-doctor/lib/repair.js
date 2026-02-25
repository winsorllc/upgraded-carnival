/**
 * Auto-Repair Module
 * Attempt automated fixes for common issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPAIR_ACTIONS = {
  'skills': repairSkills,
  'config': repairConfig,
  'filesystem': repairFilesystem,
  'environment': repairEnvironment
};

/**
 * Run repairs for detected issues
 * @param {Object} results - Diagnostic results
 * @param {Object} options - Repair options
 * @returns {Promise<Object>} Repair results
 */
async function run(results, options = {}) {
  const repairResults = {
    attempted: [],
    succeeded: [],
    failed: [],
    skipped: []
  };
  
  const { all = false, category = null, dryRun = false } = options;
  
  // Filter items that can be auto-repaired
  const repairableItems = (results.items || []).filter(item => {
    if (item.severity === 'ok') return false;
    if (!item.remediation) return false;
    if (category && item.category !== category) return false;
    return true;
  });
  
  if (dryRun) {
    return {
      mode: 'dry-run',
      wouldAttempt: repairableItems.length,
      items: repairableItems.map(i => ({
        category: i.category,
        check: i.check,
        remediation: i.remediation
      }))
    };
  }
  
  // Group by category for targeted repair
  const byCategory = {};
  for (const item of repairableItems) {
    if (!byCategory[item.category]) {
      byCategory[item.category] = [];
    }
    byCategory[item.category].push(item);
  }
  
  // Run category-specific repairs
  for (const [cat, items] of Object.entries(byCategory)) {
    const repairFn = REPAIR_ACTIONS[cat];
    if (repairFn) {
      const catResults = await repairFn(items);
      repairResults.attempted.push(...catResults.attempted);
      repairResults.succeeded.push(...catResults.succeeded);
      repairResults.failed.push(...catResults.failed);
    } else {
      // No automated repair for this category
      for (const item of items) {
        repairResults.skipped.push({
          category: cat,
          check: item.check,
          reason: 'No automated repair available'
        });
      }
    }
  }
  
  return repairResults;
}

async function repairSkills(items) {
  const results = { attempted: [], succeeded: [], failed: [] };
  
  for (const item of items) {
    if (item.check.includes('node_modules') && item.remediation?.includes('npm install')) {
      const skillMatch = item.check.match(/skill-([^-]+)-/);
      if (skillMatch) {
        const skillName = skillMatch[1];
        const skillPath = path.join('/job/.pi/skills', skillName);
        
        results.attempted.push({ check: item.check, action: 'npm install' });
        
        try {
          execSync('npm install', { cwd: skillPath, stdio: 'pipe' });
          results.succeeded.push({ check: item.check, action: 'npm install' });
        } catch (err) {
          results.failed.push({ 
            check: item.check, 
            action: 'npm install',
            error: err.message 
          });
        }
      }
    }
  }
  
  return results;
}

async function repairConfig(items) {
  const results = { attempted: [], succeeded: [], failed: [] };
  
  // We can't auto-repair missing env vars (would need values)
  // But we can create missing directories
  
  for (const item of items) {
    if (item.remediation?.includes('mkdir')) {
      results.attempted.push({ check: item.check, action: 'create directory' });
      
      try {
        const dirMatch = item.remediation.match(/mkdir -p (.+)/);
        if (dirMatch) {
          fs.mkdirSync(dirMatch[1], { recursive: true });
          results.succeeded.push({ check: item.check, action: 'created directory' });
        }
      } catch (err) {
        results.failed.push({ 
          check: item.check, 
          action: 'create directory',
          error: err.message 
        });
      }
    }
  }
  
  return results;
}

async function repairFilesystem(items) {
  const results = { attempted: [], succeeded: [], failed: [] };
  
  for (const item of items) {
    // Fix permissions
    if (item.remediation?.includes('chmod')) {
      results.attempted.push({ check: item.check, action: 'fix permissions' });
      
      try {
        const chmodMatch = item.remediation.match(/chmod (\d+) (.+)/);
        if (chmodMatch) {
          const mode = parseInt(chmodMatch[1], 8);
          const target = chmodMatch[2];
          fs.chmodSync(target, mode);
          results.succeeded.push({ check: item.check, action: 'fixed permissions' });
        }
      } catch (err) {
        results.failed.push({ 
          check: item.check, 
          action: 'fix permissions',
          error: err.message 
        });
      }
    }
  }
  
  return results;
}

async function repairEnvironment(items) {
  // Can't auto-repair environment - requires manual intervention
  return { attempted: [], succeeded: [], failed: [] };
}

module.exports = { run };
