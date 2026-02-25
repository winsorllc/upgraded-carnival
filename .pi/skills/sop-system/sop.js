/**
 * SOP System - Standard Operating Procedure Engine for PopeBot
 * 
 * Based on ZeroClaw's SOP architecture
 * https://github.com/zeroclaw-labs/zeroclaw/tree/main/src/sop
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SOPS_DIR = path.join(__dirname, '../../sops');
const RUNS_DIR = path.join(SOPS_DIR, 'runs');
const INDEX_FILE = path.join(SOPS_DIR, 'index.json');

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(SOPS_DIR)) {
    fs.mkdirSync(SOPS_DIR, { recursive: true });
  }
  if (!fs.existsSync(RUNS_DIR)) {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
  }
}

// ── Types ────────────────────────────────────────────────────────

/**
 * @typedef {Object} SopStep
 * @property {number} number - Step number (1-indexed)
 * @property {string} title - Step title
 * @property {boolean} requiresApproval - Whether this step needs approval
 * @property {number} [approvalTimeoutMins] - Auto-approve after N minutes
 * @property {string[]} [suggestedTools] - Tools that might be useful
 */

/**
 * @typedef {Object} SopManifest
 * @property {string} name - SOP name (directory name)
 * @property {string} description - SOP description
 * @property {string} version - Semantic version
 * @property {'low'|'normal'|'high'|'critical'} priority - Priority level
 * @property {'auto'|'supervised'|'step_by_step'|'priority_based'} executionMode - Execution mode
 * @property {number} cooldownSecs - Minimum seconds between runs
 * @property {number} maxConcurrent - Max concurrent runs
 * @property {SopStep[]} steps - Steps to execute
 */

/**
 * @typedef {Object} SopRun
 * @property {string} runId - Unique run identifier
 * @property {string} sopName - SOP name
 * @property {'pending'|'waiting_approval'|'running'|'awaiting_approval'|'paused'|'completed'|'failed'|'cancelled'} status
 * @property {number} currentStep - Current step number (0 = not started)
 * @property {number} totalSteps - Total number of steps
 * @property {string} startedAt - ISO timestamp
 * @property {string|null} completedAt - ISO timestamp or null
 * @property {StepResult[]} stepResults - Results for each step
 * @property {string|null} waitingSince - ISO timestamp if waiting for approval
 */

/**
 * @typedef {Object} StepResult
 * @property {number} stepNumber - Step number
 * @property {'pending'|'running'|'completed'|'failed'|'skipped'|'awaiting_approval'} status
 * @property {string} [output] - Step output
 * @property {string} [error] - Error message if failed
 * @property {string} startedAt - ISO timestamp
 * @property {string|null} completedAt - ISO timestamp or null
 */

/**
 * @typedef {Object} AuditEvent
 * @property {string} timestamp - ISO timestamp
 * @property {string} eventType - Event type
 * @property {string} runId - Run ID
 * @property {number} [stepNumber] - Step number if applicable
 * @property {object} details - Event details
 */

// ── Index Management ─────────────────────────────────────────────

function loadIndex() {
  ensureDirs();
  if (fs.existsSync(INDEX_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    } catch (e) {
      return { sops: {}, updatedAt: new Date().toISOString() };
    }
  }
  return { sops: {}, updatedAt: new Date().toISOString() };
}

function saveIndex(index) {
  ensureDirs();
  index.updatedAt = new Date().toISOString();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

function registerSop(sopName, manifestPath) {
  const index = loadIndex();
  index.sops[sopName] = {
    manifestPath,
    registeredAt: new Date().toISOString()
  };
  saveIndex(index);
}

// ── SOP Management ───────────────────────────────────────────────

function loadManifest(sopName) {
  const manifestPath = path.join(SOPS_DIR, sopName, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`SOP "${sopName}" not found. Manifest missing at ${manifestPath}`);
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

function loadSopMd(sopName) {
  const sopPath = path.join(SOPS_DIR, sopName, 'SOP.md');
  if (!fs.existsSync(sopPath)) {
    return null;
  }
  return fs.readFileSync(sopPath, 'utf-8');
}

function listSops() {
  const index = loadIndex();
  const sops = [];
  
  for (const [name, info] of Object.entries(index.sops)) {
    try {
      const manifest = loadManifest(name);
      sops.push({
        name,
        ...manifest,
        registeredAt: info.registeredAt
      });
    } catch (e) {
      sops.push({
        name,
        error: e.message,
        registeredAt: info.registeredAt
      });
    }
  }
  
  return sops.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Run Management ───────────────────────────────────────────────

function createRun(sopName, params = {}, executionMode = null) {
  ensureDirs();
  
  const manifest = loadManifest(sopName);
  const runId = `sop_run_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  
  /** @type {SopRun} */
  const run = {
    runId,
    sopName,
    status: 'pending',
    currentStep: 0,
    totalSteps: manifest.steps.length,
    startedAt: now,
    completedAt: null,
    stepResults: manifest.steps.map(step => ({
      stepNumber: step.number,
      status: 'pending',
      startedAt: null,
      completedAt: null
    })),
    waitingSince: null,
    params,
    executionMode: executionMode || manifest.executionMode
  };
  
  // Determine if we need approval before starting
  if (run.executionMode === 'supervised' || run.executionMode === 'step_by_step') {
    run.status = 'waiting_approval';
    run.waitingSince = now;
  }
  
  // Save run
  const runPath = path.join(RUNS_DIR, `${runId}.json`);
  fs.writeFileSync(runPath, JSON.stringify(run, null, 2));
  
  // Create audit log
  const auditPath = path.join(RUNS_DIR, `${runId}.audit.jsonl`);
  logAuditEvent(runId, 'run_created', {
    sopName,
    params,
    executionMode: run.executionMode
  }, auditPath);
  
  if (run.status === 'waiting_approval') {
    logAuditEvent(runId, 'approval_requested', {
      reason: `${run.executionMode} mode requires approval to start`
    }, auditPath);
  }
  
  return run;
}

function loadRun(runId) {
  const runPath = path.join(RUNS_DIR, `${runId}.json`);
  if (!fs.existsSync(runPath)) {
    throw new Error(`Run "${runId}" not found`);
  }
  return JSON.parse(fs.readFileSync(runPath, 'utf-8'));
}

function saveRun(run) {
  const runPath = path.join(RUNS_DIR, `${run.runId}.json`);
  fs.writeFileSync(runPath, JSON.stringify(run, null, 2));
}

function getRunStatus(runId) {
  const run = loadRun(runId);
  return {
    runId: run.runId,
    sopName: run.sopName,
    status: run.status,
    currentStep: run.currentStep,
    totalSteps: run.totalSteps,
    stepResults: run.stepResults,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    waitingSince: run.waitingSince
  };
}

function listRuns(sopName = null, status = null, limit = 20) {
  ensureDirs();
  
  const files = fs.readdirSync(RUNS_DIR)
    .filter(f => f.endsWith('.json') && !f.includes('.audit'))
    .sort()
    .reverse();
  
  const runs = [];
  for (const file of files) {
    try {
      const run = JSON.parse(fs.readFileSync(path.join(RUNS_DIR, file), 'utf-8'));
      
      if (sopName && run.sopName !== sopName) continue;
      if (status && run.status !== status) continue;
      
      runs.push({
        runId: run.runId,
        sopName: run.sopName,
        status: run.status,
        currentStep: run.currentStep,
        totalSteps: run.totalSteps,
        startedAt: run.startedAt,
        completedAt: run.completedAt
      });
      
      if (runs.length >= limit) break;
    } catch (e) {
      // Skip corrupted files
    }
  }
  
  return runs;
}

// ── Execution ────────────────────────────────────────────────────

function startRun(runId) {
  const run = loadRun(runId);
  
  if (run.status === 'waiting_approval') {
    run.status = 'running';
    run.waitingSince = null;
    saveRun(run);
    logAuditEvent(runId, 'run_started', {}, getAuditPath(runId));
  } else if (run.status !== 'running' && run.status !== 'paused') {
    throw new Error(`Cannot start run with status: ${run.status}`);
  }
  
  return executeNextStep(runId);
}

function executeNextStep(runId) {
  const run = loadRun(runId);
  const manifest = loadManifest(run.sopName);
  
  if (run.status !== 'running') {
    throw new Error(`Run is not in running state: ${run.status}`);
  }
  
  // Find next pending step
  const nextStepIndex = run.stepResults.findIndex(sr => sr.status === 'pending');
  
  if (nextStepIndex === -1) {
    // All steps complete
    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    saveRun(run);
    logAuditEvent(runId, 'run_completed', {}, getAuditPath(runId));
    return run;
  }
  
  const stepResult = run.stepResults[nextStepIndex];
  const stepDef = manifest.steps[nextStepIndex];
  
  // Start the step
  stepResult.status = 'running';
  stepResult.startedAt = new Date().toISOString();
  run.currentStep = stepDef.number;
  saveRun(run);
  
  logAuditEvent(runId, 'step_started', {
    stepNumber: stepDef.number,
    title: stepDef.title
  }, getAuditPath(runId));
  
  // Check if approval is required
  if (stepDef.requiresApproval || run.executionMode === 'step_by_step') {
    stepResult.status = 'awaiting_approval';
    run.status = 'awaiting_approval';
    run.waitingSince = new Date().toISOString();
    saveRun(run);
    
    logAuditEvent(runId, 'approval_requested', {
      stepNumber: stepDef.number,
      title: stepDef.title,
      timeoutMins: stepDef.approvalTimeoutMins
    }, getAuditPath(runId));
    
    return { ...run, awaitingApproval: true, step: stepDef };
  }
  
  // Step can execute automatically
  return { ...run, awaitingApproval: false, step: stepDef, readyToExecute: true };
}

function approveStep(runId, stepNumber, comment = null) {
  const run = loadRun(runId);
  const auditPath = getAuditPath(runId);
  
  if (run.status !== 'awaiting_approval') {
    throw new Error(`Run is not awaiting approval: ${run.status}`);
  }
  
  const stepResult = run.stepResults.find(sr => sr.stepNumber === stepNumber);
  if (!stepResult || stepResult.status !== 'awaiting_approval') {
    throw new Error(`Step ${stepNumber} is not awaiting approval`);
  }
  
  stepResult.status = 'pending';  // Ready to execute
  run.status = 'running';
  run.waitingSince = null;
  saveRun(run);
  
  logAuditEvent(runId, 'approval_granted', {
    stepNumber,
    comment
  }, auditPath);
  
  return { success: true, runId, stepNumber, status: 'approved' };
}

function rejectStep(runId, stepNumber, reason) {
  const run = loadRun(runId);
  const auditPath = getAuditPath(runId);
  
  const stepResult = run.stepResults.find(sr => sr.stepNumber === stepNumber);
  if (!stepResult || !['awaiting_approval', 'running'].includes(stepResult.status)) {
    throw new Error(`Step ${stepNumber} cannot be rejected`);
  }
  
  stepResult.status = 'failed';
  stepResult.error = `Rejected: ${reason}`;
  stepResult.completedAt = new Date().toISOString();
  run.status = 'paused';
  run.waitingSince = null;
  saveRun(run);
  
  logAuditEvent(runId, 'approval_rejected', {
    stepNumber,
    reason
  }, auditPath);
  
  return { success: true, runId, stepNumber, status: 'rejected', action: 'paused' };
}

function completeStep(runId, stepNumber, output) {
  const run = loadRun(runId);
  const stepResult = run.stepResults.find(sr => sr.stepNumber === stepNumber);
  
  if (!stepResult || stepResult.status !== 'running') {
    throw new Error(`Step ${stepNumber} is not running`);
  }
  
  stepResult.status = 'completed';
  stepResult.output = output;
  stepResult.completedAt = new Date().toISOString();
  saveRun(run);
  
  logAuditEvent(runId, 'step_completed', {
    stepNumber,
    output
  }, getAuditPath(runId));
  
  return run;
}

function failStep(runId, stepNumber, error) {
  const run = loadRun(runId);
  const stepResult = run.stepResults.find(sr => sr.stepNumber === stepNumber);
  
  if (!stepResult || !['running', 'awaiting_approval'].includes(stepResult.status)) {
    throw new Error(`Step ${stepNumber} cannot be failed`);
  }
  
  stepResult.status = 'failed';
  stepResult.error = error;
  stepResult.completedAt = new Date().toISOString();
  run.status = 'failed';
  saveRun(run);
  
  logAuditEvent(runId, 'step_failed', {
    stepNumber,
    error
  }, getAuditPath(runId));
  
  return run;
}

function cancelRun(runId, reason = 'Cancelled by user') {
  const run = loadRun(runId);
  
  if (['completed', 'cancelled'].includes(run.status)) {
    throw new Error(`Run already in terminal state: ${run.status}`);
  }
  
  run.status = 'cancelled';
  run.completedAt = new Date().toISOString();
  saveRun(run);
  
  logAuditEvent(runId, 'run_cancelled', { reason }, getAuditPath(runId));
  
  return run;
}

function pauseRun(runId) {
  const run = loadRun(runId);
  
  if (run.status !== 'running') {
    throw new Error(`Run is not running: ${run.status}`);
  }
  
  run.status = 'paused';
  saveRun(run);
  
  logAuditEvent(runId, 'run_paused', {}, getAuditPath(runId));
  
  return run;
}

function resumeRun(runId) {
  const run = loadRun(runId);
  
  if (run.status !== 'paused') {
    throw new Error(`Run is not paused: ${run.status}`);
  }
  
  run.status = 'running';
  saveRun(run);
  
  logAuditEvent(runId, 'run_resumed', {}, getAuditPath(runId));
  
  return run;
}

function retryRun(runId) {
  const run = loadRun(runId);
  
  if (run.status !== 'failed' && run.status !== 'paused') {
    throw new Error(`Can only retry failed/paused runs, not ${run.status}`);
  }
  
  // Find failed step
  const failedStep = run.stepResults.find(sr => sr.status === 'failed');
  if (!failedStep) {
    throw new Error('No failed step found to retry');
  }
  
  // Reset failed step to pending
  failedStep.status = 'pending';
  failedStep.error = null;
  failedStep.completedAt = null;
  run.status = 'running';
  run.currentStep = failedStep.stepNumber;
  saveRun(run);
  
  logAuditEvent(runId, 'run_retried', {
    fromStep: failedStep.stepNumber
  }, getAuditPath(runId));
  
  return run;
}

// ── Audit Logging ────────────────────────────────────────────────

function getAuditPath(runId) {
  return path.join(RUNS_DIR, `${runId}.audit.jsonl`);
}

function logAuditEvent(runId, eventType, details = {}, auditPath = null) {
  auditPath = auditPath || getAuditPath(runId);
  
  const event = {
    timestamp: new Date().toISOString(),
    eventType,
    runId,
    details
  };
  
  fs.appendFileSync(auditPath, JSON.stringify(event) + '\n');
}

function getAuditLog(runId) {
  const auditPath = getAuditPath(runId);
  
  if (!fs.existsSync(auditPath)) {
    return { runId, events: [] };
  }
  
  const lines = fs.readFileSync(auditPath, 'utf-8').trim().split('\n');
  const events = lines.filter(l => l.trim()).map(l => JSON.parse(l));
  
  return { runId, events };
}

// ── Utility Functions ────────────────────────────────────────────

function checkTimeoutApproval(runId) {
  const run = loadRun(runId);
  const manifest = loadManifest(run.sopName);
  
  if (run.status !== 'awaiting_approval' || !run.waitingSince) {
    return null;
  }
  
  const currentStep = run.stepResults.find(sr => sr.status === 'awaiting_approval');
  if (!currentStep) {
    return null;
  }
  
  const stepDef = manifest.steps.find(s => s.number === currentStep.stepNumber);
  if (!stepDef || !stepDef.approvalTimeoutMins) {
    return null;
  }
  
  const waitingSince = new Date(run.waitingSince);
  const now = new Date();
  const elapsedMinutes = (now - waitingSince) / (1000 * 60);
  
  if (elapsedMinutes >= stepDef.approvalTimeoutMins) {
    // Auto-approve
    approveStep(runId, currentStep.stepNumber, 'Auto-approved after timeout');
    
    logAuditEvent(runId, 'approval_timeout', {
      stepNumber: currentStep.stepNumber,
      elapsedMinutes,
      timeoutMins: stepDef.approvalTimeoutMins
    }, getAuditPath(runId));
    
    return { timedOut: true, stepNumber: currentStep.stepNumber };
  }
  
  return { timedOut: false, elapsedMinutes };
}

// ── Exports ──────────────────────────────────────────────────────

module.exports = {
  // SOP management
  listSops,
  loadManifest,
  loadSopMd,
  registerSop,
  
  // Run management
  createRun,
  loadRun,
  getRunStatus,
  listRuns,
  
  // Execution
  startRun,
  executeNextStep,
  approveStep,
  rejectStep,
  completeStep,
  failStep,
  cancelRun,
  pauseRun,
  resumeRun,
  retryRun,
  
  // Timeout handling
  checkTimeoutApproval,
  
  // Audit
  getAuditLog,
  
  // Paths
  getSopsDir: () => SOPS_DIR,
  getRunsDir: () => RUNS_DIR
};
