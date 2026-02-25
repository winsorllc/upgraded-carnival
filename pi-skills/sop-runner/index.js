/**
 * SOP Runner Skill - Standard Operating Procedure Engine
 * Inspired by ZeroClaw's SOP implementation
 * 
 * Provides multi-step procedure management with approval workflows,
 * state tracking, and audit logging.
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const SOP_DIR = '/tmp/sops';
const SOPS_DIR = path.join(SOP_DIR, 'sops');
const RUNS_DIR = path.join(SOP_DIR, 'runs');
const AUDIT_DIR = path.join(SOP_DIR, 'audit');

// Ensure directories exist
function ensureDirs() {
  [SOP_DIR, SOPS_DIR, RUNS_DIR, AUDIT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Execution modes
const ExecutionMode = {
  AUTO: 'auto',
  SUPERVISED: 'supervised',
  STEP_BY_STEP: 'step_by_step',
  PRIORITY_BASED: 'priority_based'
};

const Priority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Create a new Standard Operating Procedure
 */
async function sop_create(args) {
  ensureDirs();
  
  const { name, description, steps, mode = 'supervised', priority = 'normal' } = args;
  
  if (!name) throw new Error('SOP name is required');
  if (!steps || !Array.isArray(steps) || steps.length === 0) throw new Error('At least one step is required');
  
  // Validate and normalize steps
  const normalizedSteps = steps.map((step, idx) => ({
    number: idx + 1,
    title: step.title || `Step ${idx + 1}`,
    body: step.body || '',
    suggested_tools: step.suggested_tools || [],
    requires_confirmation: step.requires_confirmation || false
  }));
  
  const sop = {
    name,
    description: description || '',
    version: '1.0.0',
    priority,
    execution_mode: mode,
    steps: normalizedSteps,
    created_at: new Date().toISOString()
  };
  
  const sopPath = path.join(SOPS_DIR, `${sanitizeFilename(name)}.json`);
  fs.writeFileSync(sopPath, JSON.stringify(sop, null, 2));
  
  await auditLog('SOP_CREATED', { name, step_count: steps.length, mode, priority });
  
  return {
    success: true,
    output: `SOP "${name}" created with ${steps.length} steps.\nExecution mode: ${mode}\nPriority: ${priority}`
  };
}

/**
 * Execute an SOP - starts a new run
 */
async function sop_execute(args) {
  ensureDirs();
  
  const { name, payload = {} } = args;
  
  if (!name) throw new Error('SOP name is required');
  
  // Load SOP definition
  const sopPath = path.join(SOPS_DIR, `${sanitizeFilename(name)}.json`);
  if (!fs.existsSync(sopPath)) {
    throw new Error(`SOP "${name}" not found. Create it first with sop_create.`);
  }
  
  const sop = JSON.parse(fs.readFileSync(sopPath, 'utf8'));
  
  // Determine execution mode
  let effectiveMode = sop.execution_mode;
  if (effectiveMode === ExecutionMode.PRIORITY_BASED) {
    effectiveMode = (sop.priority === Priority.CRITICAL || sop.priority === Priority.HIGH) 
      ? ExecutionMode.AUTO 
      : ExecutionMode.SUPERVISED;
  }
  
  // Create run
  const runId = `${sop.name}-${randomUUID().slice(0, 8)}`;
  const run = {
    run_id: runId,
    sop_name: sop.name,
    status: 'running',
    current_step: 1,
    total_steps: sop.steps.length,
    mode: effectiveMode,
    context: { ...payload },
    started_at: new Date().toISOString(),
    step_history: []
  };
  
  const runPath = path.join(RUNS_DIR, `${runId}.json`);
  fs.writeFileSync(runPath, JSON.stringify(run, null, 2));
  
  await auditLog('RUN_STARTED', { run_id: runId, sop_name: sop.name, payload });
  
  // Get first step instruction
  const step = sop.steps[0];
  let output = `SOP run started: ${runId}\n\n`;
  output += `Step 1 of ${sop.steps.length}: ${step.title}\n\n`;
  output += step.body;
  
  if (effectiveMode === ExecutionMode.STEP_BY_STEP || step.requires_confirmation) {
    output += `\n\n⚠️ This step requires approval before proceeding.`;
    run.status = 'waiting_approval';
    fs.writeFileSync(runPath, JSON.stringify(run, null, 2));
  }
  
  return { success: true, output, run_id: runId };
}

/**
 * Get the status of a run
 */
async function sop_status(args) {
  const { run_id } = args;
  
  if (!run_id) throw new Error('run_id is required');
  
  const runPath = path.join(RUNS_DIR, `${run_id}.json`);
  if (!fs.existsSync(runPath)) {
    throw new Error(`Run "${run_id}" not found`);
  }
  
  const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  const sopPath = path.join(SOPS_DIR, `${sanitizeFilename(run.sop_name)}.json`);
  const sop = JSON.parse(fs.readFileSync(sopPath, 'utf8'));
  
  let output = `Run ID: ${run.run_id}\n`;
  output += `SOP: ${run.sop_name}\n`;
  output += `Status: ${run.status}\n`;
  output += `Progress: Step ${run.current_step} of ${run.total_steps}\n`;
  output += `Mode: ${run.mode}\n`;
  output += `Started: ${run.started_at}\n`;
  
  // Only show current step if not completed
  if (run.status !== 'completed' && run.current_step <= run.total_steps) {
    const step = sop.steps[run.current_step - 1];
    output += `\nCurrent Step:\n`;
    output += `  Title: ${step.title}\n`;
    output += `  Body: ${step.body}\n`;
    output += `  Requires Approval: ${step.requires_confirmation ? 'Yes' : 'No'}`;
  }
  
  if (run.status === 'waiting_approval') {
    output += `\n\n⚠️ Awaiting approval to proceed`;
  }
  
  if (run.completed_at) {
    output += `\n\nCompleted: ${run.completed_at}`;
    output += `\nFinal Context: ${JSON.stringify(run.context, null, 2)}`;
  }
  
  return { success: true, output, run: run };
}

/**
 * Approve and proceed with a run
 */
async function sop_approve(args) {
  const { run_id } = args;
  
  if (!run_id) throw new Error('run_id is required');
  
  const runPath = path.join(RUNS_DIR, `${run_id}.json`);
  if (!fs.existsSync(runPath)) {
    throw new Error(`Run "${run_id}" not found`);
  }
  
  const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  
  if (run.status === 'completed') {
    return { success: true, output: `Run ${run_id} is already completed.` };
  }
  
  if (run.status === 'failed') {
    return { success: false, output: '', error: `Run ${run_id} has failed and cannot be approved.` };
  }
  
  const sopPath = path.join(SOPS_DIR, `${sanitizeFilename(run.sop_name)}.json`);
  const sop = JSON.parse(fs.readFileSync(sopPath, 'utf8'));
  
  // Record approval in history
  run.step_history.push({
    step: run.current_step,
    action: 'approved',
    timestamp: new Date().toISOString()
  });
  
  await auditLog('STEP_APPROVED', { run_id, step: run.current_step });
  
  // Move to next step
  run.current_step++;
  
  if (run.current_step > run.total_steps) {
    // Completed!
    run.status = 'completed';
    run.completed_at = new Date().toISOString();
    fs.writeFileSync(runPath, JSON.stringify(run, null, 2));
    
    await auditLog('RUN_COMPLETED', { run_id, duration: run.completed_at });
    
    return {
      success: true,
      output: `✅ Run ${run_id} completed successfully!\n\nAll ${run.total_steps} steps finished.`
    };
  }
  
  // Get next step
  const nextStep = sop.steps[run.current_step - 1];
  let output = `✅ Step ${run.current_step - 1} approved.\n\n`;
  output += `Step ${run.current_step} of ${run.total_steps}: ${nextStep.title}\n\n`;
  output += nextStep.body;
  
  // Check if next step requires approval
  if (run.mode === ExecutionMode.STEP_BY_STEP || nextStep.requires_confirmation) {
    run.status = 'waiting_approval';
    output += `\n\n⚠️ This step requires approval before proceeding.`;
  }
  
  fs.writeFileSync(runPath, JSON.stringify(run, null, 2));
  
  return { success: true, output };
}

/**
 * Reject a run (cancel it)
 */
async function sop_reject(args) {
  const { run_id, reason = 'Rejected by operator' } = args;
  
  if (!run_id) throw new Error('run_id is required');
  
  const runPath = path.join(RUNS_DIR, `${run_id}.json`);
  if (!fs.existsSync(runPath)) {
    throw new Error(`Run "${run_id}" not found`);
  }
  
  const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  
  run.status = 'rejected';
  run.rejected_at = new Date().toISOString();
  run.rejection_reason = reason;
  
  fs.writeFileSync(runPath, JSON.stringify(run, null, 2));
  
  await auditLog('RUN_REJECTED', { run_id, reason });
  
  return {
    success: true,
    output: `❌ Run ${run_id} rejected.\n\nReason: ${reason}`
  };
}

/**
 * List all SOPs
 */
async function sop_list() {
  ensureDirs();
  
  const files = fs.readdirSync(SOPS_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    return { success: true, output: 'No SOPs defined yet.' };
  }
  
  let output = 'Available SOPs:\n\n';
  
  for (const file of files) {
    const sop = JSON.parse(fs.readFileSync(path.join(SOPS_DIR, file), 'utf8'));
    output += `• ${sop.name}\n`;
    output += `  Description: ${sop.description || 'N/A'}\n`;
    output += `  Steps: ${sop.steps.length}\n`;
    output += `  Mode: ${sop.execution_mode}\n`;
    output += `  Priority: ${sop.priority}\n\n`;
  }
  
  return { success: true, output };
}

/**
 * List all runs (active and completed)
 */
async function sop_runs(args) {
  const { status } = args || {};
  
  ensureDirs();
  
  const files = fs.readdirSync(RUNS_DIR).filter(f => f.endsWith('.json'));
  
  let runs = files.map(file => {
    const run = JSON.parse(fs.readFileSync(path.join(RUNS_DIR, file), 'utf8'));
    return run;
  });
  
  if (status) {
    runs = runs.filter(r => r.status === status);
  }
  
  if (runs.length === 0) {
    return { success: true, output: 'No runs found.' };
  }
  
  let output = 'Runs' + (status ? ` (${status})` : '') + ':\n\n';
  
  for (const run of runs) {
    output += `• ${run.run_id}\n`;
    output += `  SOP: ${run.sop_name}\n`;
    output += `  Status: ${run.status}\n`;
    output += `  Progress: Step ${run.current_step} of ${run.total_steps}\n`;
    output += `  Started: ${run.started_at}\n`;
    if (run.completed_at) output += `  Completed: ${run.completed_at}\n`;
    output += '\n';
  }
  
  return { success: true, output, runs };
}

/**
 * List runs waiting for approval
 */
async function sop_pending() {
  const { status: _status, ..._args } = args || {};
  // This would need to be called with args
  return sop_runs({ status: 'waiting_approval' });
}

// Audit logging
async function auditLog(event, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...data
  };
  
  const auditFile = path.join(AUDIT_DIR, `audit-${new Date().toISOString().slice(0, 10)}.jsonl`);
  fs.appendFileSync(auditFile, JSON.stringify(entry) + '\n');
}

// Helper: sanitize filename
function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
}

// Export tools for the agent
module.exports = {
  metadata: {
    name: 'sop-runner',
    description: 'Define and execute multi-step Standard Operating Procedures with approval workflows',
    tools: ['sop_create', 'sop_execute', 'sop_status', 'sop_approve', 'sop_reject', 'sop_list', 'sop_runs']
  },
  
  tools: {
    sop_create: {
      description: 'Create a new Standard Operating Procedure',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the SOP' },
          description: { type: 'string', description: 'Description of what this SOP does' },
          steps: { 
            type: 'array', 
            description: 'Array of steps',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                body: { type: 'string' },
                requires_confirmation: { type: 'boolean' }
              }
            }
          },
          mode: { 
            type: 'string', 
            enum: ['auto', 'supervised', 'step_by_step', 'priority_based'],
            description: 'Execution mode'
          },
          priority: { 
            type: 'string', 
            enum: ['low', 'normal', 'high', 'critical'],
            description: 'Priority level'
          }
        },
        required: ['name', 'steps']
      },
      fn: sop_create
    },
    
    sop_execute: {
      description: 'Execute a Standard Operating Procedure',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the SOP to execute' },
          payload: { type: 'object', description: 'Optional context/data for the run' }
        },
        required: ['name']
      },
      fn: sop_execute
    },
    
    sop_status: {
      description: 'Get the status of an SOP run',
      parameters: {
        type: 'object',
        properties: {
          run_id: { type: 'string', description: 'The run ID to check' }
        },
        required: ['run_id']
      },
      fn: sop_status
    },
    
    sop_approve: {
      description: 'Approve and proceed with the next step of an SOP run',
      parameters: {
        type: 'object',
        properties: {
          run_id: { type: 'string', description: 'The run ID to approve' }
        },
        required: ['run_id']
      },
      fn: sop_approve
    },
    
    sop_reject: {
      description: 'Reject and cancel an SOP run',
      parameters: {
        type: 'object',
        properties: {
          run_id: { type: 'string', description: 'The run ID to reject' },
          reason: { type: 'string', description: 'Reason for rejection' }
        },
        required: ['run_id']
      },
      fn: sop_reject
    },
    
    sop_list: {
      description: 'List all available SOPs',
      parameters: {
        type: 'object',
        properties: {}
      },
      fn: sop_list
    },
    
    sop_runs: {
      description: 'List all SOP runs, optionally filtered by status',
      parameters: {
        type: 'object',
        properties: {
          status: { 
            type: 'string', 
            enum: ['running', 'waiting_approval', 'completed', 'rejected', 'failed'],
            description: 'Filter by status'
          }
        }
      },
      fn: sop_runs
    }
  }
};
