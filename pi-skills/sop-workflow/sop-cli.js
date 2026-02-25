#!/usr/bin/env node

/**
 * SOP Workflow CLI - Standard Operating Procedures management
 * Based on zeroclaw's SOP architecture
 */

const fs = require('fs');
const path = require('path');

const SOP_DIR = process.env.SOP_DIR || path.join(process.cwd(), '.sops');
const ACTIVE_RUNS_FILE = path.join(SOP_DIR, 'active-runs.json');

// Ensure SOP directory exists
function ensureSopDir() {
  if (!fs.existsSync(SOP_DIR)) {
    fs.mkdirSync(SOP_DIR, { recursive: true });
  }
}

// Load SOPs from directory
function loadSops() {
  ensureSopDir();
  const sops = {};
  const files = fs.readdirSync(SOP_DIR).filter(f => f.endsWith('.json') && f !== 'active-runs.json');
  
  for (const file of files) {
    try {
      const sop = JSON.parse(fs.readFileSync(path.join(SOP_DIR, file), 'utf-8'));
      sops[sop.name] = sop;
    } catch (e) {
      // Skip invalid files
    }
  }
  return sops;
}

// Save SOP
function saveSop(sop) {
  ensureSopDir();
  const filename = sop.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.json';
  fs.writeFileSync(path.join(SOP_DIR, filename), JSON.stringify(sop, null, 2));
}

// Load active runs
function loadActiveRuns() {
  ensureSopDir();
  if (fs.existsSync(ACTIVE_RUNS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(ACTIVE_RUNS_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

// Save active runs
function saveActiveRuns(runs) {
  ensureSopDir();
  fs.writeFileSync(ACTIVE_RUNS_FILE, JSON.stringify(runs, null, 2));
}

// Create a new SOP
function createSop(args) {
  const { name, description, steps, priority = 'normal', triggers = ['manual'] } = args;
  
  if (!name) {
    return { success: false, output: 'Error: SOP name is required', error: 'Missing name parameter' };
  }
  
  const sop = {
    name,
    description: description || '',
    version: '1.0.0',
    priority,
    execution_mode: 'auto',
    triggers,
    steps: steps || [],
    cooldown_secs: 0,
    max_concurrent: 1,
    created_at: new Date().toISOString()
  };
  
  saveSop(sop);
  
  return {
    success: true,
    output: `SOP "${name}" created successfully with ${steps?.length || 0} steps.\n` +
      `Triggers: ${triggers.join(', ')}\n` +
      `Priority: ${priority}`,
    error: null
  };
}

// List all SOPs
function listSops(args = {}) {
  const sops = loadSops();
  const filter = (args.filter || '').toLowerCase();
  
  let sopList = Object.values(sops);
  
  if (filter) {
    sopList = sopList.filter(s => 
      s.name.toLowerCase().includes(filter) || 
      s.priority === filter
    );
  }
  
  if (sopList.length === 0) {
    return { success: true, output: 'No SOPs found.', error: null };
  }
  
  const runs = loadActiveRuns();
  let output = `Loaded SOPs (${Object.keys(sops).length} total, ${sopList.length} shown):\n\n`;
  
  for (const sop of sopList) {
    const activeCount = Object.values(runs).filter(r => r.sop_name === sop.name).length;
    const triggers = sop.triggers.join(', ');
    
    output += `- **${sop.name}** [${sop.priority}] — ${sop.steps.length} steps, ${sop.triggers.length} trigger(s): ${triggers}`;
    if (activeCount > 0) {
      output += ` (active runs: ${activeCount})`;
    }
    output += '\n';
    if (sop.description) {
      output += `  ${sop.description}\n`;
    }
  }
  
  return { success: true, output, error: null };
}

// Execute an SOP
function executeSop(args) {
  const { name, input = {} } = args;
  
  if (!name) {
    return { success: false, output: 'Error: SOP name is required', error: 'Missing name parameter' };
  }
  
  const sops = loadSops();
  const sop = sops[name];
  
  if (!sop) {
    return { success: false, output: `SOP "${name}" not found`, error: 'SOP not found' };
  }
  
  if (sop.steps.length === 0) {
    return { success: false, output: `SOP "${name}" has no steps`, error: 'No steps defined' };
  }
  
  const runs = loadActiveRuns();
  const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  runs[runId] = {
    sop_name: sop.name,
    current_step: 0,
    status: 'pending',
    started_at: new Date().toISOString(),
    input,
    history: []
  };
  
  saveActiveRuns(runs);
  
  return {
    success: true,
    output: `Started execution of SOP "${sop.name}" (run ID: ${runId})\n` +
      `First step: ${sop.steps[0].title || 'Step 1'}\n` +
      `Total steps: ${sop.steps.length}`,
    error: null,
    run_id: runId
  };
}

// Get status of an SOP execution
function statusSop(args) {
  const { run_id } = args;
  
  if (!run_id) {
    return { success: false, output: 'Error: run_id is required', error: 'Missing run_id parameter' };
  }
  
  const runs = loadActiveRuns();
  const run = runs[run_id];
  
  if (!run) {
    return { success: false, output: `Run "${run_id}" not found`, error: 'Run not found' };
  }
  
  const sops = loadSops();
  const sop = sops[run.sop_name];
  
  if (!sop) {
    return { success: false, output: `SOP "${run.sop_name}" not found`, error: 'SOP not found' };
  }
  
  const currentStep = sop.steps[run.current_step];
  let output = `SOP Execution Status\n`;
  output += `====================\n`;
  output += `Run ID: ${run_id}\n`;
  output += `SOP: ${sop.name}\n`;
  output += `Status: ${run.status}\n`;
  output += `Current Step: ${run.current_step + 1}/${sop.steps.length}\n`;
  output += `Started: ${run.started_at}\n`;
  
  if (currentStep) {
    output += `\nCurrent Step Details:\n`;
    output += `  Title: ${currentStep.title || 'Unnamed'}\n`;
    output += `  Body: ${currentStep.body || 'No description'}\n`;
    output += `  Requires Confirmation: ${currentStep.requires_confirmation ? 'Yes' : 'No'}\n`;
  }
  
  return { success: true, output, error: null };
}

// Approve a step (for manual approval workflows)
function approveStep(args) {
  const { run_id } = args;
  
  if (!run_id) {
    return { success: false, output: 'Error: run_id is required', error: 'Missing run_id parameter' };
  }
  
  const runs = loadActiveRuns();
  const run = runs[run_id];
  
  if (!run) {
    return { success: false, output: `Run "${run_id}" not found`, error: 'Run not found' };
  }
  
  if (run.status === 'approved') {
    return { success: false, output: `Run "${run_id}" already approved`, error: 'Already approved' };
  }
  
  run.status = 'approved';
  run.approved_at = new Date().toISOString();
  saveActiveRuns(runs);
  
  return {
    success: true,
    output: `Run "${run_id}" approved. You can now advance to the next step.`,
    error: null
  };
}

// Advance to next step
function advanceStep(args) {
  const { run_id } = args;
  
  if (!run_id) {
    return { success: false, output: 'Error: run_id is required', error: 'Missing run_id parameter' };
  }
  
  const runs = loadActiveRuns();
  const run = runs[run_id];
  
  if (!run) {
    return { success: false, output: `Run "${run_id}" not found`, error: 'Run not found' };
  }
  
  const sops = loadSops();
  const sop = sops[run.sop_name];
  
  if (!sop) {
    return { success: false, output: `SOP "${run.sop_name}" not found`, error: 'SOP not found' };
  }
  
  if (run.current_step >= sop.steps.length - 1) {
    run.status = 'completed';
    run.completed_at = new Date().toISOString();
    saveActiveRuns(runs);
    
    return {
      success: true,
      output: `SOP "${sop.name}" completed successfully!`,
      error: null
    };
  }
  
  const prevStep = sop.steps[run.current_step];
  run.history.push({
    step: run.current_step,
    completed_at: new Date().toISOString()
  });
  
  run.current_step++;
  run.status = 'pending';
  saveActiveRuns(runs);
  
  const nextStep = sop.steps[run.current_step];
  
  return {
    success: true,
    output: `Advanced to step ${run.current_step + 1}/${sop.steps.length}\n` +
      `Title: ${nextStep.title || 'Unnamed'}\n` +
      `Body: ${nextStep.body || 'No description'}`,
    error: null
  };
}

// CLI routing
const command = process.argv[2];
let args = {};

// Try to get args from argv[3], stdin, or file
if (process.argv[3]) {
  try {
    args = JSON.parse(process.argv[3]);
  } catch (e) {
    // Try reading from file
    const filePath = process.argv[3];
    if (fs.existsSync(filePath)) {
      try {
        args = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e2) {
        console.error(JSON.stringify({
          success: false,
          output: 'Failed to parse args: ' + e2.message,
          error: 'Parse error'
        }));
        process.exit(1);
      }
    } else {
      // Try reading from stdin
      const stdinData = fs.readFileSync(0, 'utf-8').trim();
      if (stdinData) {
        try {
          args = JSON.parse(stdinData);
        } catch (e3) {
          console.error(JSON.stringify({
            success: false,
            output: 'Failed to parse stdin args: ' + e3.message,
            error: 'Parse error'
          }));
          process.exit(1);
        }
      }
    }
  }
}

let result;

switch (command) {
  case 'create':
    result = createSop(args);
    break;
  case 'list':
    result = listSops(args);
    break;
  case 'execute':
    result = executeSop(args);
    break;
  case 'status':
    result = statusSop(args);
    break;
  case 'approve':
    result = approveStep(args);
    break;
  case 'advance':
    result = advanceStep(args);
    break;
  default:
    result = { 
      success: false, 
      output: `Unknown command: ${command}. Available: create, list, execute, status, approve, advance`,
      error: 'Unknown command'
    };
}

console.log(JSON.stringify(result, null, 2));
