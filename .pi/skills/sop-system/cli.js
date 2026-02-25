#!/usr/bin/env node

/**
 * SOP System CLI - Command-line interface for managing SOPs
 */

const fs = require('fs');
const path = require('path');
const sop = require('./sop.js');

const SOPS_DIR = sop.getSopsDir();

// ── Helper Functions ─────────────────────────────────────────────

function log(...args) {
  console.log(...args);
}

function error(...args) {
  console.error('❌', ...args);
}

function success(...args) {
  console.log('✅', ...args);
}

function warn(...args) {
  console.warn('⚠️', ...args);
}

function parseArgs(args) {
  const parsed = { _: [], params: {} };
  let currentParam = null;
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      parsed.params[key] = true;
      currentParam = key;
    } else if (currentParam && !arg.startsWith('-')) {
      parsed.params[currentParam] = arg;
      currentParam = null;
    } else {
      parsed._.push(arg);
    }
  }
  
  return parsed;
}

function showHelp() {
  log(`
📋 SOP System CLI

Usage:
  node cli.js <command> [options]

Commands:
  create <name>           Create a new SOP from template
  list                    List all registered SOPs
  run <name> [options]    Execute an SOP
  status <runId>          Get run status
  approve <runId> [step]  Approve a step
  reject <runId> <step>   Reject a step
  cancel <runId>          Cancel a running SOP
  pause <runId>           Pause a running SOP
  resume <runId>          Resume a paused SOP
  retry <runId>           Retry a failed SOP
  history [name]          List recent runs
  audit <runId>           Show audit log for a run
  init                    Initialize SOP system

Options:
  --dry-run              Show what would be executed without running
  --param <key name="value">    Pass parameter to SOP
  --step <number>        Specify step number
  --limit <number>       Limit results (default: 10)
  --help, -h             Show this help

Examples:
  node cli.js create deploy-production
  node cli.js list
  node cli.js run deploy-production --param environment=production
  node cli.js status sop_run_abc123
  node cli.js approve sop_run_abc123 --step 2 --comment "Looks good"
  node cli.js history deploy-production --limit 5
`);
}

// ── Commands ─────────────────────────────────────────────────────

function cmdCreate(args) {
  const [name] = args._;
  
  if (!name) {
    error('SOP name required');
    log('Usage: node cli.js create <sop-name>');
    process.exit(1);
  }
  
  const sopDir = path.join(SOPS_DIR, name);
  
  if (fs.existsSync(sopDir)) {
    error(`SOP "${name}" already exists at ${sopDir}`);
    process.exit(1);
  }
  
  // Create directory
  fs.mkdirSync(sopDir, { recursive: true });
  
  // Create SOP.md template
  const sopTemplate = `# ${formatTitle(name)}

**Version**: 1.0.0  
**Priority**: normal  
**Execution Mode**: supervised

## Overview

${formatTitle(name)} - Describe what this SOP does and when to use it.

## Prerequisites

- List any prerequisites here
- Ensure required credentials are available

## Steps

### Step 1: First Step

Describe what this step does.

\`\`\`bash
# Example command
echo "Step 1"
\`\`\`

**Approval Required**: Yes  
**Approval Timeout**: 5 minutes

---

### Step 2: Second Step

Describe what this step does.

\`\`\`bash
# Example command
echo "Step 2"
\`\`\`

**Approval Required**: No

---

## Rollback

If something goes wrong:

1. Step to rollback
2. Another step

## References

- Link to relevant documentation
`;
  
  fs.writeFileSync(path.join(sopDir, 'SOP.md'), sopTemplate);
  
  // Create manifest.json template
  const manifestTemplate = {
    name,
    description: `${formatTitle(name)} SOP`,
    version: '1.0.0',
    priority: 'normal',
    executionMode: 'supervised',
    cooldownSecs: 0,
    maxConcurrent: 1,
    triggers: [
      { type: 'manual' }
    ],
    steps: [
      {
        number: 1,
        title: 'First Step',
        requiresApproval: true,
        approvalTimeoutMins: 5,
        suggestedTools: ['shell']
      },
      {
        number: 2,
        title: 'Second Step',
        requiresApproval: false,
        suggestedTools: ['shell']
      }
    ]
  };
  
  fs.writeFileSync(
    path.join(sopDir, 'manifest.json'),
    JSON.stringify(manifestTemplate, null, 2)
  );
  
  // Register SOP
  sop.registerSop(name, path.join(sopDir, 'manifest.json'));
  
  success(`Created SOP "${name}"`);
  log(`  SOP file: ${path.join(sopDir, 'SOP.md')}`);
  log(`  Manifest: ${path.join(sopDir, 'manifest.json')}`);
  log('\nEdit these files to customize your SOP, then run:');
  log(`  node cli.js run ${name}`);
}

function cmdList() {
  const sops = sop.listSops();
  
  if (sops.length === 0) {
    log('No SOPs registered yet.');
    log('\nCreate your first SOP:');
    log('  node cli.js create my-sop');
    return;
  }
  
  log(`📋 Registered SOPs (${sops.length}):\n`);
  
  for (const sop_ of sops) {
    if (sop_.error) {
      warn(`${sop_.name} - Error: ${sop_.error}`);
    } else {
      const icon = getPriorityIcon(sop_.priority);
      const modeIcon = getModeIcon(sop_.executionMode);
      log(`${icon} ${sop_.name} v${sop_.version}`);
      log(`   ${sop_.description}`);
      log(`   Priority: ${sop_.priority} | Mode: ${sop_.executionMode} ${modeIcon} | Steps: ${sop_.steps?.length || 0}`);
    }
  }
}

function cmdRun(args) {
  const [name] = args._;
  
  if (!name) {
    error('SOP name required');
    log('Usage: node cli.js run <sop-name> [--dry-run] [--param key=value]');
    process.exit(1);
  }
  
  // Parse parameters
  const params = {};
  for (const [key, value] of Object.entries(args.params)) {
    if (key !== 'dry-run' && key !== 'help' && typeof value === 'string') {
      const [k, v] = key.includes('=') ? key.split('=') : [key, value];
      if (v !== true) {
        params[k] = v;
      }
    }
  }
  
  // Handle --param key=value format
  const paramArgs = process.argv.filter(a => a.startsWith('--param'));
  for (const paramArg of paramArgs) {
    const idx = process.argv.indexOf(paramArg);
    if (idx + 1 < process.argv.length) {
      const [key, value] = process.argv[idx + 1].split('=');
      params[key] = value;
    }
  }
  
  try {
    const executionMode = args.params['mode'] || null;
    const run = sop.createRun(name, params, executionMode);
    
    log(`\n🚀 SOP Run Created`);
    log(`   Run ID: ${run.runId}`);
    log(`   SOP: ${run.sopName}`);
    log(`   Status: ${run.status}`);
    log(`   Total Steps: ${run.totalSteps}`);
    
    if (run.status === 'waiting_approval') {
      log(`\n⏳ Waiting for approval to start...`);
      log(`   Approve with: node cli.js approve ${run.runId}`);
    } else if (args.params['dry-run']) {
      log(`\n🔍 DRY RUN - No execution will occur`);
      log('\nSteps to execute:');
      const manifest = sop.loadManifest(name);
      manifest.steps.forEach((step, i) => {
        const approval = step.requiresApproval ? '⏳ requires approval' : '✅ auto';
        log(`   ${i + 1}. ${step.title} ${approval}`);
      });
    } else {
      log(`\n📝 View status with: node cli.js status ${run.runId}`);
    }
    
    log('');
    return run;
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

function cmdStatus(args) {
  const [runId] = args._;
  
  if (!runId) {
    error('Run ID required');
    log('Usage: node cli.js status <run-id>');
    process.exit(1);
  }
  
  try {
    const status = sop.getRunStatus(runId);
    const manifest = sop.loadManifest(status.sopName);
    
    log(`\n📊 SOP Run Status`);
    log(`   Run ID: ${status.runId}`);
    log(`   SOP: ${status.sopName} v${manifest.version}`);
    log(`   Status: ${getStatusIcon(status.status)} ${status.status}`);
    log(`   Progress: ${status.currentStep}/${status.totalSteps}`);
    log(`   Started: ${status.startedAt}`);
    if (status.completedAt) {
      log(`   Completed: ${status.completedAt}`);
    }
    if (status.waitingSince) {
      log(`   Waiting Since: ${status.waitingSince}`);
    }
    
    log(`\n   Steps:`);
    status.stepResults.forEach((step, i) => {
      const stepDef = manifest.steps[i];
      const icon = getStepStatusIcon(step.status);
      log(`   ${icon} Step ${step.stepNumber}: ${stepDef.title} - ${step.status}`);
      if (step.output) {
        log(`      Output: ${truncate(step.output, 80)}`);
      }
      if (step.error) {
        log(`      Error: ${step.error}`);
      }
    });
    
    log('');
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

function cmdApprove(args) {
  const [runId] = args._;
  
  if (!runId) {
    error('Run ID required');
    log('Usage: node cli.js approve <run-id> [--step <number>] [--comment "text"]');
    process.exit(1);
  }
  
  try {
    const run = sop.loadRun(runId);
    let stepNumber = args.params.step ? parseInt(args.params.step) : null;
    
    // If no step specified, approve the first awaiting step
    if (!stepNumber) {
      const awaitingStep = run.stepResults.find(sr => sr.status === 'awaiting_approval');
      if (!awaitingStep) {
        // If run is waiting_approval (before start), approve the run
        if (run.status === 'waiting_approval') {
          sop.startRun(runId);
          success(`SOP ${runId} started`);
          const result = sop.executeNextStep(runId);
          if (result.awaitingApproval) {
            log(`\nNow awaiting approval for step ${result.step.number}: ${result.step.title}`);
            log(`Approve with: node cli.js approve ${runId} --step ${result.step.number}`);
          } else if (result.readyToExecute) {
            log(`\nStep ${result.step.number} is ready to execute: ${result.step.title}`);
          }
          return;
        }
        error('No steps awaiting approval');
        process.exit(1);
      }
      stepNumber = awaitingStep.stepNumber;
    }
    
    const comment = args.params.comment || null;
    const result = sop.approveStep(runId, stepNumber, comment);
    
    success(`Step ${stepNumber} approved for ${runId}`);
    if (comment) {
      log(`   Comment: ${comment}`);
    }
    
    // Auto-execute next step
    const nextResult = sop.executeNextStep(runId);
    if (nextResult.awaitingApproval) {
      log(`\nNow awaiting approval for step ${nextResult.step.number}: ${nextResult.step.title}`);
    } else if (nextResult.readyToExecute) {
      log(`\nStep ${nextResult.step.number} ready to execute: ${nextResult.step.title}`);
    } else if (nextResult.status === 'completed') {
      success(`All steps completed!`);
    }
    
    log('');
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

function cmdReject(args) {
  const [runId, stepStr] = args._;
  
  if (!runId || !stepStr) {
    error('Run ID and step number required');
    log('Usage: node cli.js reject <run-id> <step-number> --reason "text"');
    process.exit(1);
  }
  
  const stepNumber = parseInt(stepStr);
  const reason = args.params.reason || 'No reason provided';
  
  try {
    const result = sop.rejectStep(runId, stepNumber, reason);
    
    warn(`Step ${stepNumber} rejected for ${runId}`);
    log(`   Reason: ${reason}`);
    log(`   Run status: ${result.action}`);
    log(`\nTo retry after fixing the issue:`);
    log(`   node cli.js retry ${runId}`);
    log('');
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

function cmdCancel(args) {
  const [runId] = args._;
  
  if (!runId) {
    error('Run ID required');
    log('Usage: node cli.js cancel <run-id>');
    process.exit(1);
  }
  
  try {
    const reason = args.params.reason || 'Cancelled by user';
    const run = sop.cancelRun(runId, reason);
    
    warn(`Run ${runId} cancelled`);
    log(`   Reason: ${reason}`);
    log('');
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

function cmdPause(args) {
  const [runId] = args._;
  
  if (!runId) {
    error('Run ID required');
    log('Usage: node cli.js pause <run-id>');
    process.exit(1);
  }
  
  try {
    const run = sop.pauseRun(runId);
    success(`Run ${runId} paused`);
    log('\nTo resume:');
    log(`  node cli.js resume ${runId}`);
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

function cmdResume(args) {
  const [runId] = args._;
  
  if (!runId) {
    error('Run ID required');
    log('Usage: node cli.js resume <run-id>');
    process.exit(1);
  }
  
  try {
    const run = sop.resumeRun(runId);
    success(`Run ${runId} resumed`);
    log('\nTo execute next step:');
    log(`  node cli.js approve ${runId}`);
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

function cmdRetry(args) {
  const [runId] = args._;
  
  if (!runId) {
    error('Run ID required');
    log('Usage: node cli.js retry <run-id>');
    process.exit(1);
  }
  
  try {
    const run = sop.retryRun(runId);
    success(`Run ${runId} retrying from failed step`);
    log(`\nCurrent step: ${run.currentStep}`);
    log('To approve and continue:');
    log(`  node cli.js approve ${runId}`);
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

function cmdHistory(args) {
  const [sopName] = args._;
  const limit = parseInt(args.params.limit) || 10;
  const status = args.params.status || null;
  
  try {
    const runs = sop.listRuns(sopName || null, status, limit);
    
    if (runs.length === 0) {
      log('No runs found.');
      return;
    }
    
    log(`\n📜 Recent Runs${sopName ? ` for ${sopName}` : ''} (${runs.length}):\n`);
    
    for (const run of runs) {
      const icon = getStatusIcon(run.status);
      const progress = `${run.currentStep}/${run.totalSteps}`;
      log(`${icon} ${run.runId} | ${run.sopName} | ${run.status} | ${progress}`);
      log(`   Started: ${run.startedAt}${run.completedAt ? ` | Completed: ${run.completedAt}` : ''}`);
    }
    
    log('');
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

function cmdAudit(args) {
  const [runId] = args._;
  
  if (!runId) {
    error('Run ID required');
    log('Usage: node cli.js audit <run-id>');
    process.exit(1);
  }
  
  try {
    const audit = sop.getAuditLog(runId);
    
    log(`\n🔍 Audit Log for ${runId} (${audit.events.length} events):\n`);
    
    for (const event of audit.events) {
      const time = event.timestamp.split('T')[1].split('.')[0];
      log(`${time} | ${event.eventType.padEnd(25)} | ${formatEventDetails(event)}`);
    }
    
    log('');
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

function cmdInit() {
  fs.mkdirSync(SOPS_DIR, { recursive: true });
  
  const indexPath = path.join(SOPS_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, JSON.stringify({ sops: {}, updatedAt: new Date().toISOString() }, null, 2));
  }
  
  const runsDir = sop.getRunsDir();
  fs.mkdirSync(runsDir, { recursive: true });
  
  const configPath = path.join(SOPS_DIR, 'config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
      defaultExecutionMode: 'supervised',
      approvalTimeoutMins: 30,
      maxConcurrentRuns: 3,
      auditRetentionDays: 90
    }, null, 2));
  }
  
  success('SOP system initialized');
  log(`  SOPs directory: ${SOPS_DIR}`);
  log(`  Runs directory: ${runsDir}`);
  log('\nCreate your first SOP:');
  log('  node cli.js create my-first-sop');
}

// ── Utility Functions ────────────────────────────────────────────

function formatTitle(name) {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getPriorityIcon(priority) {
  const icons = {
    critical: '🔴',
    high: '🟠',
    normal: '🟡',
    low: '🟢'
  };
  return icons[priority] || '⚪';
}

function getModeIcon(mode) {
  const icons = {
    auto: '🤖',
    supervised: '👁️',
    step_by_step: '🪜',
    priority_based: '⚖️'
  };
  return icons[mode] || '❓';
}

function getStatusIcon(status) {
  const icons = {
    pending: '⏳',
    waiting_approval: '🔒',
    running: '🚀',
    awaiting_approval: '⏸️',
    paused: '⏯️',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫'
  };
  return icons[status] || '❓';
}

function getStepStatusIcon(status) {
  const icons = {
    pending: '⏳',
    running: '➡️',
    completed: '✅',
    failed: '❌',
    skipped: '⏭️',
    awaiting_approval: '⏸️'
  };
  return icons[status] || '❓';
}

function truncate(str, len) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len - 3) + '...';
}

function formatEventDetails(event) {
  const d = event.details;
  if (!d) return '';
  
  if (d.stepNumber) {
    return `Step ${d.stepNumber}${d.title ? `: ${d.title}` : ''}`;
  }
  if (d.reason) return d.reason;
  if (d.comment) return `"${d.comment}"`;
  if (d.error) return d.error;
  if (d.output) return truncate(d.output, 50);
  
  return JSON.stringify(d);
}

// ── Main ──────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.params.help || args.params.h || args._.length === 0) {
    showHelp();
    return;
  }
  
  const command = args._[0];
  const commandArgs = { ...args, _: args._.slice(1) };
  
  const commands = {
    create: cmdCreate,
    list: cmdList,
    run: cmdRun,
    status: cmdStatus,
    approve: cmdApprove,
    reject: cmdReject,
    cancel: cmdCancel,
    pause: cmdPause,
    resume: cmdResume,
    retry: cmdRetry,
    history: cmdHistory,
    audit: cmdAudit,
    init: cmdInit
  };
  
  const cmd = commands[command];
  if (!cmd) {
    error(`Unknown command: ${command}`);
    log('Run "node cli.js --help" for usage.');
    process.exit(1);
  }
  
  cmd(commandArgs);
}

main();
