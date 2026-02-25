#!/usr/bin/env node

/**
 * Cost Tracker — LLM API Cost Monitoring
 * 
 * Tracks API costs across multiple providers with budget alerts.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(process.cwd(), 'config', 'pricing.json');
const USAGE_FILE = path.join(process.cwd(), 'data', 'cost-usage.json');
const dataDir = path.dirname(USAGE_FILE);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

/**
 * Default pricing if config doesn't exist
 */
const DEFAULT_PRICING = {
  providers: {
    anthropic: {
      'claude-sonnet-4-5-20250929': { input: 0.000003, output: 0.000015 },
      'claude-opus-4-0-20250514': { input: 0.000015, output: 0.000075 },
      'claude-3-5-sonnet-20241022': { input: 0.000003, output: 0.000015 }
    },
    openai: {
      'gpt-4o': { input: 0.0000025, output: 0.00001 },
      'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
      'gpt-4-turbo': { input: 0.00001, output: 0.00003 }
    },
    google: {
      'gemini-2.0-flash': { input: 0.0000001, output: 0.0000004 },
      'gemini-2.0-pro': { input: 0.00000125, output: 0.000005 }
    }
  },
  budgets: {
    daily: 10.00,
    weekly: 50.00,
    monthly: 200.00
  },
  alerts: {
    thresholds: [0.5, 0.75, 0.9]
  }
};

/**
 * Load pricing configuration
 */
function loadPricing() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (error) {
      console.warn('Failed to load pricing config:', error.message);
    }
  }
  return DEFAULT_PRICING;
}

/**
 * Load usage data
 */
function loadUsage() {
  if (fs.existsSync(USAGE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
    } catch (error) {
      console.warn('Failed to load usage data:', error.message);
    }
  }
  return { entries: [], alerts_sent: [] };
}

/**
 * Save usage data
 */
function saveUsage(usage) {
  fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
}

/**
 * Calculate cost for a single usage entry
 */
function calculateCost(provider, model, inputTokens, outputTokens) {
  const pricing = loadPricing();
  const providerPricing = pricing.providers[provider];
  
  if (!providerPricing) {
    console.warn(`Unknown provider: ${provider}`);
    return 0;
  }
  
  const modelPricing = providerPricing[model];
  if (!modelPricing) {
    console.warn(`Unknown model: ${provider}/${model}. Using default pricing.`);
    // Default rough estimate: $0.00001 per token
    return (inputTokens + outputTokens) * 0.00001;
  }
  
  const inputCost = inputTokens * modelPricing.input;
  const outputCost = outputTokens * modelPricing.output;
  
  return inputCost + outputCost;
}

/**
 * Track a usage entry
 */
async function trackUsage(options) {
  const {
    provider,
    model,
    input_tokens,
    output_tokens,
    job_id,
    user_id,
    project
  } = options;
  
  const cost = calculateCost(provider, model, input_tokens, output_tokens);
  
  const entry = {
    timestamp: new Date().toISOString(),
    provider,
    model,
    input_tokens,
    output_tokens,
    total_tokens: input_tokens + output_tokens,
    cost: parseFloat(cost.toFixed(6)),
    currency: 'USD',
    job_id: job_id || null,
    user_id: user_id || null,
    project: project || null
  };
  
  const usage = loadUsage();
  usage.entries.push(entry);
  
  // Trim old entries (keep last 10000)
  if (usage.entries.length > 10000) {
    usage.entries = usage.entries.slice(-10000);
  }
  
  saveUsage(usage);
  
  // Check for budget alerts
  await checkBudgetAlerts();
  
  return {
    cost: entry.cost,
    currency: entry.currency,
    total_tokens: entry.total_tokens
  };
}

/**
 * Get spending for a period
 */
function getSpending(period = 'daily') {
  const pricing = loadPricing();
  const usage = loadUsage();
  const budget = pricing.budgets[period];
  
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  let start = startOfDay;
  if (period === 'weekly') start = startOfWeek;
  if (period === 'monthly') start = startOfMonth;
  
  const periodEntries = usage.entries.filter(e => new Date(e.timestamp) >= start);
  const total = periodEntries.reduce((sum, e) => sum + e.cost, 0);
  
  return {
    period,
    amount: parseFloat(total.toFixed(2)),
    budget: budget || 0,
    remaining: parseFloat((budget - total).toFixed(2)),
    percentage: budget ? parseFloat((total / budget * 100).toFixed(1)) : 0,
    entries: periodEntries.length
  };
}

/**
 * Get cost breakdown by job
 */
function getJobCost(jobId) {
  const usage = loadUsage();
  const jobEntries = usage.entries.filter(e => e.job_id === jobId);
  
  const total = jobEntries.reduce((sum, e) => sum + e.cost, 0);
  const totalTokens = jobEntries.reduce((sum, e) => sum + e.total_tokens, 0);
  
  const breakdown = {};
  for (const entry of jobEntries) {
    const key = `${entry.provider}/${entry.model}`;
    if (!breakdown[key]) {
      breakdown[key] = { cost: 0, tokens: 0, calls: 0 };
    }
    breakdown[key].cost += entry.cost;
    breakdown[key].tokens += entry.total_tokens;
    breakdown[key].calls += 1;
  }
  
  return {
    job_id: jobId,
    total: parseFloat(total.toFixed(4)),
    total_tokens: totalTokens,
    calls: jobEntries.length,
    breakdown: Object.entries(breakdown).map(([model, data]) => ({
      model,
      ...data,
      cost: parseFloat(data.cost.toFixed(4))
    }))
  };
}

/**
 * Get cost by project
 */
function getCostByProject(project) {
  const usage = loadUsage();
  const projectEntries = usage.entries.filter(e => e.project === project);
  
  const total = projectEntries.reduce((sum, e) => sum + e.cost, 0);
  
  return {
    project,
    total: parseFloat(total.toFixed(4)),
    calls: projectEntries.length,
    first_use: projectEntries[0]?.timestamp,
    last_use: projectEntries[projectEntries.length - 1]?.timestamp
  };
}

/**
 * Get dashboard data
 */
function getDashboard() {
  const daily = getSpending('daily');
  const weekly = getSpending('weekly');
  const monthly = getSpending('monthly');
  
  const usage = loadUsage();
  
  // Top models today
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = usage.entries.filter(e => e.timestamp.startsWith(today));
  
  const modelCosts = {};
  for (const entry of todayEntries) {
    const key = `${entry.provider}/${entry.model}`;
    modelCosts[key] = (modelCosts[key] || 0) + entry.cost;
  }
  
  const topModels = Object.entries(modelCosts)
    .map(([model, cost]) => ({ model, cost: parseFloat(cost.toFixed(4)) }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
  
  // Top jobs today
  const jobCosts = {};
  for (const entry of todayEntries) {
    if (entry.job_id) {
      jobCosts[entry.job_id] = (jobCosts[entry.job_id] || 0) + entry.cost;
    }
  }
  
  const topJobs = Object.entries(jobCosts)
    .map(([job_id, cost]) => ({ job_id, cost: parseFloat(cost.toFixed(4)) }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
  
  return {
    today: daily,
    this_week: weekly,
    this_month: monthly,
    top_models: topModels,
    top_jobs: topJobs
  };
}

/**
 * Check budget alerts
 */
async function checkBudgetAlerts() {
  const pricing = loadPricing();
  const usage = loadUsage();
  const thresholds = pricing.alerts?.thresholds || [0.5, 0.75, 0.9];
  
  for (const period of ['daily', 'weekly', 'monthly']) {
    const spending = getSpending(period);
    const percentage = spending.percentage / 100;
    
    for (const threshold of thresholds) {
      const alertKey = `${period}_${threshold}`;
      
      if (percentage >= threshold && !usage.alerts_sent.includes(alertKey)) {
        console.log(`\n⚠️  BUDGET ALERT: ${period} spending at ${(percentage * 100).toFixed(0)}%`);
        console.log(`   Spent: $${spending.amount} / $${spending.budget}`);
        console.log(`   Remaining: $${spending.remaining}\n`);
        
        usage.alerts_sent.push(alertKey);
        saveUsage(usage);
        
        // In production, send notification here
        // await sendNotification({ period, threshold, spending });
      }
    }
  }
}

/**
 * Estimate cost before making a call
 */
function estimateCost(options) {
  const { provider, model, estimated_input, estimated_output } = options;
  
  const cost = calculateCost(provider, model, estimated_input, estimated_output);
  
  return {
    provider,
    model,
    estimated_input,
    estimated_output,
    estimated_total_tokens: estimated_input + estimated_output,
    cost: parseFloat(cost.toFixed(6)),
    currency: 'USD'
  };
}

/**
 * Check if we should throttle requests
 */
function shouldThrottle() {
  const daily = getSpending('daily');
  return daily.percentage >= 100;
}

/**
 * Generate report
 */
function generateReport(options = {}) {
  const { period = 'weekly', group_by = 'provider' } = options;
  const spending = getSpending(period);
  const usage = loadUsage();
  
  const now = new Date();
  const start = new Date();
  if (period === 'daily') start.setDate(now.getDate() - 1);
  if (period === 'weekly') start.setDate(now.getDate() - 7);
  if (period === 'monthly') start.setMonth(now.getMonth() - 1);
  
  const periodEntries = usage.entries.filter(e => new Date(e.timestamp) >= start);
  
  // Group by specified field
  const groups = {};
  for (const entry of periodEntries) {
    const key = group_by === 'provider' ? entry.provider :
                group_by === 'model' ? `${entry.provider}/${entry.model}` :
                group_by === 'job' ? (entry.job_id || 'unknown') :
                entry[group_by] || 'unknown';
    
    if (!groups[key]) {
      groups[key] = { cost: 0, tokens: 0, calls: 0 };
    }
    groups[key].cost += entry.cost;
    groups[key].tokens += entry.total_tokens;
    groups[key].calls += 1;
  }
  
  return {
    period,
    generated_at: new Date().toISOString(),
    summary: spending,
    groups: Object.entries(groups).map(([name, data]) => ({
      name,
      cost: parseFloat(data.cost.toFixed(4)),
      tokens: data.tokens,
      calls: data.calls
    })).sort((a, b) => b.cost - a.cost)
  };
}

/**
 * Reset usage data
 */
function resetUsage(options = {}) {
  const { period = 'daily', keep_job_id } = options;
  const usage = loadUsage();
  
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  let start = startOfDay;
  if (period === 'weekly') start = startOfWeek;
  if (period === 'monthly') start = startOfMonth;
  
  // Keep entries before the period start or matching job_id
  usage.entries = usage.entries.filter(e => {
    if (keep_job_id && e.job_id === keep_job_id) return true;
    return new Date(e.timestamp) < start;
  });
  
  // Clear alerts for this period
  usage.alerts_sent = usage.alerts_sent.filter(a => !a.startsWith(period));
  
  saveUsage(usage);
  
  console.log(`✓ Reset ${period} usage data`);
}

/**
 * CLI interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'status':
      const dashboard = getDashboard();
      console.log('\n💰 Cost Tracker Status\n');
      
      console.log('Today');
      console.log(`  Spent:     $${dashboard.today.amount.toFixed(2)} / $${dashboard.today.budget.toFixed(2)} (${dashboard.today.percentage}%)`);
      console.log(`  Remaining: $${dashboard.today.remaining.toFixed(2)}\n`);
      
      console.log('This Week');
      console.log(`  Spent:     $${dashboard.this_week.amount.toFixed(2)} / $${dashboard.this_week.budget.toFixed(2)} (${dashboard.this_week.percentage}%)`);
      console.log(`  Remaining: $${dashboard.this_week.remaining.toFixed(2)}\n`);
      
      console.log('This Month');
      console.log(`  Spent:     $${dashboard.this_month.amount.toFixed(2)} / $${dashboard.this_month.budget.toFixed(2)} (${dashboard.this_month.percentage}%)`);
      console.log(`  Remaining: $${dashboard.this_month.remaining.toFixed(2)}\n`);
      
      if (dashboard.top_models.length > 0) {
        console.log('Top Models (today):');
        dashboard.top_models.forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.model}: $${m.cost.toFixed(4)}`);
        });
        console.log();
      }
      break;

    case 'dashboard':
      console.log(JSON.stringify(getDashboard(), null, 2));
      break;

    case 'job':
      const jobId = args[args.indexOf('--id') + 1] || args[args.indexOf('--job') + 1];
      if (jobId) {
        const jobCost = getJobCost(jobId);
        console.log(`\nJob Cost: ${jobId}\n`);
        console.log(`Total: $${jobCost.total.toFixed(4)}`);
        console.log(`Calls: ${jobCost.calls}`);
        console.log(`Tokens: ${jobCost.total_tokens}\n`);
        
        if (jobCost.breakdown.length > 0) {
          console.log('Breakdown:');
          jobCost.breakdown.forEach(b => {
            console.log(`  ${b.model}: $${b.cost.toFixed(4)} (${b.calls} calls)`);
          });
        }
        console.log();
      } else {
        console.error('Usage: cost-tracker job --id <job-id>');
      }
      break;

    case 'report':
      const period = args[args.indexOf('--period') + 1] || 'weekly';
      const report = generateReport({ period });
      console.log(`\nCost Report: ${period}\n`);
      console.log(`Generated: ${report.generated_at}\n`);
      console.log(`Total: $${report.summary.amount.toFixed(2)} / $${report.summary.budget.toFixed(2)}\n`);
      console.log('By ' + (args.includes('--by') ? args[args.indexOf('--by') + 1] : 'provider') + ':');
      report.groups.forEach(g => {
        console.log(`  ${g.name}: $${g.cost.toFixed(4)} (${g.calls} calls)`);
      });
      console.log();
      break;

    case 'track':
      // Demo tracking
      const demoUsage = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        input_tokens: 1500,
        output_tokens: 800,
        job_id: 'demo-job-001'
      };
      
      trackUsage(demoUsage)
        .then(result => {
          console.log('\n✓ Tracked usage');
          console.log(`  Cost: $${result.cost.toFixed(6)}`);
          console.log(`  Tokens: ${result.total_tokens}\n`);
        })
        .catch(console.error);
      break;

    case 'reset':
      const resetPeriod = args[args.indexOf('--period') + 1] || 'daily';
      resetUsage({ period: resetPeriod });
      break;

    default:
      console.log(`
Cost Tracker — LLM API Cost Monitoring

Usage:
  cost-tracker status              Show current spending status
  cost-tracker dashboard           Show full dashboard (JSON)
  cost-tracker job --id <job-id>   Show costs for a specific job
  cost-tracker report --period <period>  Generate spending report
  cost-tracker track               Track demo usage
  cost-tracker reset --period <period>   Reset usage counters

Periods: daily (default), weekly, monthly

Examples:
  cost-tracker status
  cost-tracker dashboard
  cost-tracker job --id job-12345
  cost-tracker report --period monthly
  cost-tracker reset --period daily
`);
  }
}

module.exports = {
  trackUsage,
  getSpending,
  getJobCost,
  getCostByProject,
  getDashboard,
  estimateCost,
  shouldThrottle,
  generateReport,
  resetUsage,
  calculateCost
};
