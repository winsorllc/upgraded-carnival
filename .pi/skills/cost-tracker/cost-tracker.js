#!/usr/bin/env node

/**
 * Cost Tracker - Track and analyze LLM costs across PopeBot jobs
 * 
 * Usage:
 *   cost-tracker.js summary    - Get current period spending
 *   cost-tracker.js breakdown - Get detailed cost breakdown
 *   cost-tracker.js job <id>  - Get job-specific costs
 *   cost-tracker.js trend     - Get daily cost trend
 *   cost-tracker.js compare <period1> <period2> - Compare periods
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = '/job/logs';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'summary';
const arg1 = args[1];
const arg2 = args[2];

// Utility: Parse date from log filename or content
function parseDateFromLog(logPath) {
  const filename = path.basename(logPath);
  // Try to extract date from filename pattern: 20260225T123045_abc123.jsonl
  const match = filename.match(/^(\d{8}T\d{6})_/);
  if (match) {
    return match[1].slice(0, 8); // YYYYMMDD
  }
  
  // Try YYYYMMDD at start of filename
  const simpleMatch = filename.match(/^(\d{8})_/);
  if (simpleMatch) {
    return simpleMatch[1];
  }
  
  // Fallback: read first line of log
  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const firstLine = content.split('\n')[0];
    if (!firstLine.trim()) return null;
    const data = JSON.parse(firstLine);
    if (data.timestamp) {
      return data.timestamp.split('T')[0].replace(/-/g, '');
    }
    // Try from id if it looks like a date
    if (data.id && data.id.match(/^\d{8}T/)) {
      return data.id.slice(0, 8);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// Extract cost data from all session logs
function extractAllCostData() {
  const jobs = [];
  
  if (!fs.existsSync(LOGS_DIR)) {
    return { jobs: [], total: 0 };
  }
  
  const jobDirs = fs.readdirSync(LOGS_DIR).filter(f => {
    return fs.statSync(path.join(LOGS_DIR, f)).isDirectory();
  });
  
  for (const jobId of jobDirs) {
    const jobDir = path.join(LOGS_DIR, jobId);
    const files = fs.readdirSync(jobDir).filter(f => f.endsWith('.jsonl'));
    
    let jobCost = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let model = 'unknown';
    let date = null;
    let messageCount = 0;
    
    for (const file of files) {
      const logPath = path.join(jobDir, file);
      if (!date) date = parseDateFromLog(logPath);
      
      try {
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'message' && entry.message?.usage?.cost?.total) {
              jobCost += entry.message.usage.cost.total || 0;
              inputTokens += entry.message.usage.input_tokens || 0;
              outputTokens += entry.message.usage.output_tokens || 0;
              messageCount++;
              
              // Extract model from thinking content or metadata
              if (entry.message?.content) {
                for (const block of entry.message.content) {
                  if (block.type === 'text' && block.text) {
                    const modelMatch = block.text.match(/Using model[:\s]+([^\n,]+)/i);
                    if (modelMatch) model = modelMatch[1].trim();
                  }
                }
              }
            }
          } catch (e) {
            // skip invalid lines
          }
        }
      } catch (e) {
        // skip unreadable files
      }
    }
    
    if (jobCost > 0) {
      // Try to get job description from job.md
      let task = jobId;
      const jobMdPath = path.join(jobDir, 'job.md');
      if (fs.existsSync(jobMdPath)) {
        const jobContent = fs.readFileSync(jobMdPath, 'utf8');
        const taskMatch = jobContent.match(/# Job:?\s*\n(.*)/i) || jobContent.match(/^#\s+(.+)$/m);
        if (taskMatch) {
          task = taskMatch[1].trim().slice(0, 50);
        }
      }
      
      jobs.push({
        id: jobId,
        task,
        date,
        cost: jobCost,
        inputTokens,
        outputTokens,
        model,
        messageCount
      });
    }
  }
  
  const total = jobs.reduce((sum, j) => sum + j.cost, 0);
  
  return { jobs, total };
}

// Command: Summary
function cmdSummary() {
  const { jobs, total } = extractAllCostData();
  
  if (jobs.length === 0) {
    console.log('No cost data found. Jobs must have session logs with usage data.');
    return;
  }
  
  // Group by current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const monthJobs = jobs.filter(j => j.date && j.date.startsWith(currentMonth));
  const monthTotal = monthJobs.reduce((sum, j) => sum + j.cost, 0);
  
  // Get date range
  const dates = jobs.map(j => j.date).filter(Boolean).sort();
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  
  console.log('=== Cost Summary ===');
  console.log(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log(`Total Jobs: ${jobs.length}`);
  console.log(`Total Cost: $${total.toFixed(4)}`);
  console.log(`Average Cost/Job: $${(total / jobs.length).toFixed(4)}`);
  console.log('');
  console.log(`This Month (${formatDate(currentMonth)}):`);
  console.log(`  Jobs: ${monthJobs.length}`);
  console.log(`  Cost: $${monthTotal.toFixed(4)}`);
  if (monthJobs.length > 0) {
    console.log(`  Avg: $${(monthTotal / monthJobs.length).toFixed(4)}`);
  }
}

// Command: Breakdown
function cmdBreakdown() {
  const { jobs, total } = extractAllCostData();
  
  if (jobs.length === 0) {
    console.log('No cost data found.');
    return;
  }
  
  console.log('=== Cost Breakdown ===\n');
  
  // By Model
  const byModel = {};
  for (const job of jobs) {
    const model = job.model || 'unknown';
    byModel[model] = (byModel[model] || 0) + job.cost;
  }
  
  console.log('By Model:');
  const sortedModels = Object.entries(byModel).sort((a, b) => b[1] - a[1]);
  for (const [model, cost] of sortedModels) {
    const pct = ((cost / total) * 100).toFixed(0);
    console.log(`  ${model}: $${cost.toFixed(2)} (${pct}%)`);
  }
  console.log('');
  
  // By Day
  const byDay = {};
  for (const job of jobs) {
    if (job.date) {
      byDay[job.date] = (byDay[job.date] || 0) + job.cost;
    }
  }
  
  console.log('By Day (Last 10):');
  const sortedDays = Object.entries(byDay).sort((a, b) => b[0] - a[0]).slice(0, 10);
  for (const [date, cost] of sortedDays) {
    console.log(`  ${formatDate(date)}: $${cost.toFixed(2)}`);
  }
  console.log('');
  
  // Top Jobs
  console.log('Top Jobs:');
  const topJobs = [...jobs].sort((a, b) => b.cost - a.cost).slice(0, 5);
  for (const job of topJobs) {
    console.log(`  ${job.id.slice(0, 8)}: $${job.cost.toFixed(2)} (${job.task})`);
  }
}

// Command: Job
function cmdJob(jobId) {
  const { jobs } = extractAllCostData();
  
  // Find job (allow partial ID match)
  const job = jobs.find(j => j.id === jobId || j.id.startsWith(jobId));
  
  if (!job) {
    console.log(`Job not found: ${jobId}`);
    return;
  }
  
  console.log(`=== Job: ${job.id} ===`);
  console.log(`Task: ${job.task}`);
  console.log(`Date: ${formatDate(job.date)}`);
  console.log(`Cost: $${job.cost.toFixed(4)}`);
  console.log(`Input Tokens: ${job.inputTokens.toLocaleString()}`);
  console.log(`Output Tokens: ${job.outputTokens.toLocaleString()}`);
  console.log(`Model: ${job.model}`);
  console.log(`Messages: ${job.messageCount}`);
}

// Command: Trend
function cmdTrend() {
  const { jobs, total } = extractAllCostData();
  
  if (jobs.length === 0) {
    console.log('No cost data found.');
    return;
  }
  
  // Get last 7 days
  const now = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
  }
  
  console.log('=== Daily Cost Trend (Last 7 Days) ===\n');
  
  const byDay = {};
  for (const job of jobs) {
    if (job.date) {
      byDay[job.date] = (byDay[job.date] || 0) + job.cost;
    }
  }
  
  let periodTotal = 0;
  for (const day of days) {
    const cost = byDay[day] || 0;
    periodTotal += cost;
    
    // Create ASCII bar (max 20 chars)
    const maxCost = Math.max(...Object.values(byDay));
    const barLen = maxCost > 0 ? Math.round((cost / maxCost) * 20) : 0;
    const bar = '█'.repeat(barLen) + ' '.repeat(20 - barLen);
    
    console.log(`${formatDate(day)}: ${bar} $${cost.toFixed(2)}`);
  }
  
  const avg = periodTotal / days.length;
  console.log(`\nTotal: $${periodTotal.toFixed(2)} | Average: $${avg.toFixed(2)}/day`);
}

// Command: Compare
function cmdCompare(period1, period2) {
  const { jobs } = extractAllCostData();
  
  if (jobs.length === 0) {
    console.log('No cost data found.');
    return;
  }
  
  function getPeriodData(period) {
    let start, end;
    const now = new Date();
    
    if (period === 'this-month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
    } else if (period === 'last-month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period.startsWith('last-') && period.endsWith('d')) {
      const days = parseInt(period.slice(5, -1));
      start = new Date(now);
      start.setDate(start.getDate() - days);
      end = now;
    } else if (period.includes('-') && period.length === 6) {
      // YYYYMM
      const year = parseInt(period.slice(0, 4));
      const month = parseInt(period.slice(4, 6)) - 1;
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
    } else {
      // Try as YYYYMMDD
      start = new Date(period.slice(0, 4), parseInt(period.slice(4, 6)) - 1, parseInt(period.slice(6, 8)));
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    }
    
    const periodJobs = jobs.filter(j => {
      if (!j.date) return false;
      const jobDate = new Date(j.date.slice(0, 4), parseInt(j.date.slice(4, 6)) - 1, j.date.slice(6, 8));
      return jobDate >= start && jobDate <= end;
    });
    
    return {
      jobs: periodJobs,
      total: periodJobs.reduce((sum, j) => sum + j.cost, 0),
      count: periodJobs.length
    };
  }
  
  const data1 = getPeriodData(period1);
  const data2 = getPeriodData(period2);
  
  console.log('=== Period Comparison ===\n');
  console.log(`${formatPeriod(period1)}: $${data1.total.toFixed(2)} (${data1.count} jobs)`);
  console.log(`${formatPeriod(period2)}: $${data2.total.toFixed(2)} (${data2.count} jobs)`);
  console.log('');
  
  const change = data1.total > 0 ? ((data2.total - data1.total) / data1.total) * 100 : 0;
  const direction = change >= 0 ? '+' : '';
  console.log(`Change: ${direction}${change.toFixed(1)}%`);
  
  if (data2.count > 0 && data1.count > 0) {
    const avgChange = ((data2.total / data2.count) - (data1.total / data1.count)) / (data1.total / data1.count) * 100;
    console.log(`Avg Job Cost Change: ${direction}${avgChange.toFixed(1)}%`);
  }
}

// Utility: Format date
function formatDate(dateStr) {
  if (!dateStr || dateStr.length < 8) return 'unknown';
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

// Utility: Format period name
function formatPeriod(period) {
  if (period === 'this-month') return 'This Month';
  if (period === 'last-month') return 'Last Month';
  if (period.startsWith('last-')) return `Last ${period.slice(5, -1)} days`;
  if (period.length === 6) {
    return `${period.slice(0, 4)}-${period.slice(4, 6)}`;
  }
  return period;
}

// Main dispatcher
const commands = {
  summary: cmdSummary,
  breakdown: cmdBreakdown,
  job: cmdJob,
  trend: cmdTrend,
  compare: cmdCompare
};

if (commands[command]) {
  try {
    commands[command](arg1, arg2);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
} else {
  console.log(`Usage: cost-tracker.js <command> [args]`);
  console.log('');
  console.log('Commands:');
  console.log('  summary              - Get current period spending');
  console.log('  breakdown            - Get detailed cost breakdown');
  console.log('  job <job-id>         - Get job-specific costs');
  console.log('  trend                - Get daily cost trend');
  console.log('  compare <p1> <p2>    - Compare two periods');
  console.log('');
  console.log('Period formats: YYYY-MM, YYYYMMDD, this-month, last-month, last-7d, last-30d');
  process.exit(1);
}
