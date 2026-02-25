/**
 * File System Diagnostics
 * Check workspace structure and permissions
 */

const fs = require('fs');
const path = require('path');

const JOB_ROOT = '/job';

const REQUIRED_DIRS = [
  { path: '.pi/skills', required: true },
  { path: 'logs', required: true },
  { path: 'config', required: false },
  { path: 'pi-skills', required: false }
];

const WRITEABLE_DIRS = [
  'logs',
  'tmp',
  '.pi/skills'
];

/**
 * Run file system diagnostics
 * @returns {Promise<Array>} Diagnostic items
 */
async function run() {
  const results = [];
  
  // Check required directories
  results.push(...checkRequiredDirectories());
  
  // Check write permissions
  results.push(...checkWritePermissions());
  
  // Check logs structure
  results.push(...checkLogsStructure());
  
  // Check disk space
  results.push(...checkDiskSpace());
  
  return results;
}

function checkRequiredDirectories() {
  const results = [];
  
  for (const dir of REQUIRED_DIRS) {
    const fullPath = path.join(JOB_ROOT, dir.path);
    const exists = fs.existsSync(fullPath);
    
    let readable = false;
    if (exists) {
      try {
        fs.accessSync(fullPath, fs.constants.R_OK);
        readable = true;
      } catch {
        readable = false;
      }
    }
    
    if (!exists) {
      results.push({
        category: 'filesystem',
        check: `dir-${dir.path.replace(/\//g, '-')}`,
        severity: dir.required ? 'error' : 'warning',
        message: `${dir.path} directory missing`,
        ...(dir.required ? { remediation: `Create: mkdir -p ${fullPath}` } : {})
      });
    } else if (!readable) {
      results.push({
        category: 'filesystem',
        check: `dir-${dir.path.replace(/\//g, '-')}`,
        severity: 'error',
        message: `${dir.path} not readable`,
        remediation: `Fix permissions: chmod 755 ${fullPath}`
      });
    } else {
      results.push({
        category: 'filesystem',
        check: `dir-${dir.path.replace(/\//g, '-')}`,
        severity: 'ok',
        message: `${dir.path} exists and readable`
      });
    }
  }
  
  return results;
}

function checkWritePermissions() {
  const results = [];
  
  for (const dir of WRITEABLE_DIRS) {
    const fullPath = path.join(JOB_ROOT, dir);
    
    if (!fs.existsSync(fullPath)) {
      results.push({
        category: 'filesystem',
        check: `write-${dir.replace(/\//g, '-')}`,
        severity: 'warning',
        message: `${dir} does not exist, cannot check write permissions`
      });
      continue;
    }
    
    // Try to write a test file
    const testFile = path.join(fullPath, '.write-test-' + Date.now());
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      results.push({
        category: 'filesystem',
        check: `write-${dir.replace(/\//g, '-')}`,
        severity: 'ok',
        message: `${dir} is writeable`
      });
    } catch (err) {
      results.push({
        category: 'filesystem',
        check: `write-${dir.replace(/\//g, '-')}`,
        severity: 'error',
        message: `${dir} is not writeable`,
        remediation: `Fix permissions: chmod 755 ${fullPath}`
      });
    }
  }
  
  return results;
}

function checkLogsStructure() {
  const results = [];
  const logsDir = path.join(JOB_ROOT, 'logs');
  
  if (!fs.existsSync(logsDir)) {
    results.push({
      category: 'filesystem',
      check: 'logs-structure',
      severity: 'warning',
      message: 'logs directory does not exist'
    });
    return results;
  }
  
  try {
    const entries = fs.readdirSync(logsDir, { withFileTypes: true });
    const jobDirs = entries.filter(e => e.isDirectory() && e.name.startsWith('job-'));
    
    results.push({
      category: 'filesystem',
      check: 'logs-structure',
      severity: 'ok',
      message: `logs directory structure valid (${jobDirs.length} job log directories)`,
      details: `Total entries: ${entries.length}`
    });
  } catch (err) {
    results.push({
      category: 'filesystem',
      check: 'logs-structure',
      severity: 'warning',
      message: `Could not read logs directory: ${err.message}`
    });
  }
  
  return results;
}

function checkDiskSpace() {
  const results = [];
  
  try {
    const { execSync } = require('child_process');
    
    // Try to get available space
    let output;
    try {
      output = execSync('df -h /job', { encoding: 'utf8', stdio: 'pipe' });
    } catch {
      // Try root if /job fails
      output = execSync('df -h /', { encoding: 'utf8', stdio: 'pipe' });
    }
    
    const lines = output.trim().split('\n');
    if (lines.length >= 2) {
      const header = lines[0];
      const data = lines[1];
      
      // Parse available space
      const parts = data.split(/\s+/);
      if (parts.length >= 4) {
        const available = parts[3];
        const usePercent = parts[4];
        
        // Check if over 90% full
        const percentMatch = usePercent.match(/(\d+)%/);
        const percentUsed = percentMatch ? parseInt(percentMatch[1]) : 0;
        
        results.push({
          category: 'filesystem',
          check: 'disk-space',
          severity: percentUsed > 90 ? 'error' : (percentUsed > 80 ? 'warning' : 'ok'),
          message: `Disk space: ${available} available (${usePercent} used)`,
          ...(percentUsed > 80 ? { 
            remediation: 'Consider cleaning up old job logs' 
          } : {})
        });
      }
    }
  } catch (err) {
    results.push({
      category: 'filesystem',
      check: 'disk-space',
      severity: 'warning',
      message: 'Could not check disk space',
      details: err.message
    });
  }
  
  return results;
}

module.exports = { run };
