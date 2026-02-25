/**
 * Heartbeat Runners
 * 
 * Built-in implementations for different heartbeat types.
 * Each runner performs a specific monitoring or maintenance task.
 */

import { execSync } from 'child_process';
import { readFile, readdir, stat, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const STATUS_DIR = '/job/logs/.heartbeat';

/**
 * Run a health check
 * - Disk space
 * - Memory usage
 * - Process status
 * - Recent errors
 */
export async function runHealthCheck(options = {}) {
  const results = {
    timestamp: new Date().toISOString(),
    type: 'health',
    status: 'ok',
    checks: {}
  };
  
  try {
    // Check disk space
    try {
      const df = execSync('df -h /job 2>/dev/null || df -h .', { encoding: 'utf-8' });
      const lines = df.trim().split('\n');
      const dataLine = lines[lines.length - 1];
      const parts = dataLine.split(/\s+/);
      results.checks.disk = {
        status: 'ok',
        usage: parts[4] || 'unknown',
        available: parts[3] || 'unknown',
        detail: dataLine
      };
      
      // Warn if disk usage > 90%
      const usagePercent = parseInt(parts[4]?.replace('%', '') || '0');
      if (usagePercent > 90) {
        results.checks.disk.status = 'warning';
        results.status = results.status === 'ok' ? 'warning' : results.status;
      }
    } catch (e) {
      results.checks.disk = { status: 'error', detail: e.message };
      results.status = 'error';
    }
    
    // Check memory (if available)
    try {
      const mem = execSync('free -m 2>/dev/null || echo "Memory check not available"', { encoding: 'utf-8' });
      if (mem.includes('Memory')) {
        const lines = mem.trim().split('\n');
        const memLine = lines.find(l => l.startsWith('Mem:'));
        if (memLine) {
          const parts = memLine.split(/\s+/);
          const total = parseInt(parts[1]);
          const used = parseInt(parts[2]);
          const percent = Math.round((used / total) * 100);
          
          results.checks.memory = {
            status: percent > 90 ? 'warning' : 'ok',
            used: `${used}MB`,
            total: `${total}MB`,
            percent: `${percent}%`
          };
          
          if (percent > 90) {
            results.status = results.status === 'ok' ? 'warning' : results.status;
          }
        }
      } else {
        results.checks.memory = { status: 'skipped', detail: 'Not available in container' };
      }
    } catch (e) {
      results.checks.memory = { status: 'error', detail: e.message };
    }
    
    // Check for recent job failures
    try {
      const logsDir = '/job/logs';
      const entries = await readdir(logsDir).catch(() => []);
      let failedJobs = 0;
      let recentJobs = 0;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      for (const entry of entries) {
        if (entry === '.heartbeat') continue;
        const statInfo = await stat(join(logsDir, entry)).catch(() => null);
        if (statInfo && statInfo.mtime.getTime() > oneDayAgo) {
          recentJobs++;
          // Check for failure markers
          try {
            const jobFile = join(logsDir, entry, 'job.md');
            const content = await readFile(jobFile, 'utf-8').catch(() => '');
            if (content.includes('FAILED') || content.includes('ERROR') || content.includes('❌')) {
              failedJobs++;
            }
          } catch (e) {}
        }
      }
      
      results.checks.jobs = {
        status: failedJobs > 0 ? 'warning' : 'ok',
        recentCount: recentJobs,
        failedCount: failedJobs,
        successCount: recentJobs - failedJobs
      };
      
      if (failedJobs > 0) {
        results.status = results.status === 'ok' ? 'warning' : results.status;
      }
    } catch (e) {
      results.checks.jobs = { status: 'error', detail: e.message };
    }
    
    // Check git status
    try {
      const gitStatus = execSync('git status --porcelain 2>/dev/null || echo "Not a git repo"', { 
        encoding: 'utf-8',
        cwd: '/job'
      });
      const hasUncommitted = gitStatus.trim() !== '' && gitStatus !== 'Not a git repo';
      results.checks.git = {
        status: hasUncommitted ? 'warning' : 'ok',
        uncommittedChanges: hasUncommitted,
        detail: hasUncommitted ? 'Uncommitted changes detected' : 'Clean'
      };
      
      if (hasUncommitted) {
        results.status = results.status === 'ok' ? 'warning' : results.status;
      }
    } catch (e) {
      results.checks.git = { status: 'error', detail: e.message };
    }
    
  } catch (error) {
    results.status = 'error';
    results.error = error.message;
  }
  
  return results;
}

/**
 * Generate a status report
 * - Summary of recent activity
 * - System statistics
 * - Notable events
 */
export async function runStatusReport(options = {}) {
  const report = {
    timestamp: new Date().toISOString(),
    type: 'report',
    summary: {},
    details: []
  };
  
  try {
    // Get job statistics
    const logsDir = '/job/logs';
    const entries = await readdir(logsDir).catch(() => []);
    const jobStats = {
      total: entries.filter(e => e !== '.heartbeat').length,
      last24h: 0,
      last7d: 0,
      completed: 0
    };
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    for (const entry of entries) {
      if (entry === '.heartbeat') continue;
      const statInfo = await stat(join(logsDir, entry)).catch(() => null);
      if (statInfo) {
        if (statInfo.mtime.getTime() > oneDayAgo) jobStats.last24h++;
        if (statInfo.mtime.getTime() > oneWeekAgo) jobStats.last7d++;
        
        try {
          const jobFile = join(logsDir, entry, 'job.md');
          const content = await readFile(jobFile, 'utf-8').catch(() => '');
          if (content.includes('✅') || content.includes('Complete') || content.includes('completed')) {
            jobStats.completed++;
          }
        } catch (e) {}
      }
    }
    
    report.summary.jobs = jobStats;
    
    // Get skill count
    const skillsDir = '/job/.pi/skills';
    const skills = await readdir(skillsDir).catch(() => []);
    report.summary.skills = skills.filter(s => !s.startsWith('.')).length;
    
    // Get cron count
    try {
      const cronsFile = await readFile('/job/config/CRONS.json', 'utf-8');
      const crons = JSON.parse(cronsFile);
      report.summary.scheduledTasks = crons.filter(c => c.enabled !== false).length;
    } catch (e) {
      report.summary.scheduledTasks = 0;
    }
    
    // Heartbeat status
    const heartbeats = await readdir(STATUS_DIR).catch(() => []);
    report.summary.activeHeartbeats = heartbeats.filter(f => f.endsWith('.json')).length;
    
    // System info
    report.summary.system = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };
    
  } catch (error) {
    report.error = error.message;
  }
  
  return report;
}

/**
 * Run maintenance tasks
 * - Clean up old logs
 * - Archive completed jobs
 * - Optimize storage
 */
export async function runMaintenance(options = {}) {
  const results = {
    timestamp: new Date().toISOString(),
    type: 'maintenance',
    tasks: []
  };
  
  const { daysToKeep = 30 } = options;
  const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  
  // Clean up old log entries
  try {
    const logsDir = '/job/logs';
    const entries = await readdir(logsDir).catch(() => []);
    let cleaned = 0;
    let errors = 0;
    
    for (const entry of entries) {
      if (entry === '.heartbeat') continue;
      
      const entryPath = join(logsDir, entry);
      const statInfo = await stat(entryPath).catch(() => null);
      
      if (statInfo && statInfo.mtime.getTime() < cutoff) {
        // Mark as archived rather than delete (safety)
        try {
          const markerFile = join(entryPath, '.archived');
          await writeFile(markerFile, `Archived: ${new Date().toISOString()}\n`);
          cleaned++;
        } catch (e) {
          errors++;
        }
      }
    }
    
    results.tasks.push({
      name: 'archive-old-logs',
      status: errors === 0 ? 'success' : 'partial',
      cleaned,
      errors,
      daysToKeep
    });
    
  } catch (error) {
    results.tasks.push({
      name: 'archive-old-logs',
      status: 'error',
      error: error.message
    });
  }
  
  // Clean up old heartbeat status files
  try {
    const hbDir = STATUS_DIR;
    const files = await readdir(hbDir).catch(() => []);
    let cleaned = 0;
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = join(hbDir, file);
      const statInfo = await stat(filePath).catch(() => null);
      
      if (statInfo && statInfo.mtime.getTime() < cutoff) {
        // Keep for history but mark
        try {
          const content = await readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          data.archived = true;
          await writeFile(filePath, JSON.stringify(data, null, 2));
          cleaned++;
        } catch (e) {}
      }
    }
    
    results.tasks.push({
      name: 'archive-heartbeat-history',
      status: 'success',
      archived: cleaned
    });
    
  } catch (error) {
    results.tasks.push({
      name: 'archive-heartbeat-history',
      status: 'error',
      error: error.message
    });
  }
  
  return results;
}

/**
 * Run a custom heartbeat
 */
export async function runCustom(action, options = {}) {
  return {
    timestamp: new Date().toISOString(),
    type: 'custom',
    action,
    status: 'executed',
    options
  };
}

/**
 * Execute a heartbeat by type
 */
export async function executeHeartbeat(type, options = {}) {
  switch (type.toLowerCase()) {
    case 'health':
      return runHealthCheck(options);
    case 'report':
      return runStatusReport(options);
    case 'maintenance':
      return runMaintenance(options);
    default:
      return runCustom(type, options);
  }
}

export default {
  runHealthCheck,
  runStatusReport,
  runMaintenance,
  runCustom,
  executeHeartbeat
};