#!/usr/bin/env node

/**
 * SOP Workflow Manager
 * Define and execute Standard Operating Procedures
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SOPS_DIR = process.env.SOPS_DIR || 'config';
const STATE_DIR = process.env.SOPS_STATE_DIR || 'data/sops';

class SopEngine {
  constructor(config = {}) {
    this.sopsDir = config.sopsDir || SOPS_DIR;
    this.stateDir = config.stateDir || STATE_DIR;
    this.sops = [];
    this.activeRuns = new Map();
    
    // Ensure directories exist
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Load SOPs from configuration
   */
  loadSops() {
    const sopsPath = path.join(this.sopsDir, 'SOPS.json');
    
    if (!fs.existsSync(sopsPath)) {
      // Try alternate path
      const altPath = path.join(this.sopsDir, 'sops.json');
      if (fs.existsSync(altPath)) {
        return this.loadFromFile(altPath);
      }
      return [];
    }
    
    return this.loadFromFile(sopsPath);
  }

  loadFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.sops = JSON.parse(content);
      return this.sops;
    } catch (e) {
      console.error('Failed to load SOPs:', e.message);
      return [];
    }
  }

  /**
   * List all SOPs
   */
  listSops() {
    this.loadSops();
    return this.sops.map(sop => ({
      name: sop.name,
      description: sop.description,
      steps: sop.steps ? sop.steps.length : 0,
      triggers: sop.triggers || ['manual']
    }));
  }

  /**
   * Get SOP by name
   */
  getSop(name) {
    this.loadSops();
    return this.sops.find(s => s.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Start an SOP run
   */
  async startRun(sopName, params = {}) {
    const sop = this.getSop(sopName);
    if (!sop) {
      throw new Error(`SOP not found: ${sopName}`);
    }

    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const run = {
      runId,
      sopName: sop.name,
      status: 'running',
      currentStep: 0,
      steps: sop.steps.map(step => ({
        id: step.id,
        name: step.name,
        status: 'pending',
        startedAt: null,
        completedAt: null,
        result: null,
        error: null
      })),
      params,
      startedAt: new Date().toISOString(),
      completedAt: null
    };

    this.activeRuns.set(runId, run);
    this.saveRun(run);

    // Start executing steps asynchronously
    this.executeSteps(runId);

    return run;
  }

  /**
   * Execute SOP steps
   */
  async executeSteps(runId) {
    const run = this.activeRuns.get(runId);
    if (!run) return;

    while (run.currentStep < run.steps.length) {
      const step = run.steps[run.currentStep];
      step.status = 'running';
      step.startedAt = new Date().toISOString();
      
      this.saveRun(run);

      try {
        const result = await this.executeStep(step, run.params);
        step.status = 'completed';
        step.completedAt = new Date().toISOString();
        step.result = result;
      } catch (e) {
        step.status = 'failed';
        step.error = e.message;
        run.status = 'failed';
        run.completedAt = new Date().toISOString();
        
        // Handle on_failure
        const sop = this.getSop(run.sopName);
        if (sop.on_failure === 'rollback') {
          await this.executeRollback(run);
        }
        
        this.saveRun(run);
        return;
      }

      run.currentStep++;
      this.saveRun(run);
    }

    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    this.saveRun(run);
  }

  /**
   * Execute a single step
   */
  async executeStep(step, params) {
    if (step.type === 'approval') {
      return { requiresApproval: true, approvers: step.approvers };
    }

    if (step.type === 'delay') {
      const delayMs = step.duration * 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return { delayed: step.duration };
    }

    if (step.type === 'condition') {
      return this.evaluateCondition(step.condition, params);
    }

    // Action step
    if (step.action) {
      return this.executeAction(step.action, params);
    }

    return { skipped: true };
  }

  /**
   * Execute an action (command, agent, webhook)
   */
  async executeAction(action, params) {
    switch (action.type) {
      case 'command':
        return this.executeCommand(action.command, params);
      
      case 'agent':
        // Would trigger agent job - simplified for now
        return { agentJob: action.job, params };
      
      case 'webhook':
        return this.executeWebhook(action, params);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute a shell command
   */
  executeCommand(command, params) {
    // Simple param substitution
    let cmd = command;
    for (const [key, value] of Object.entries(params || {})) {
      cmd = cmd.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return new Promise((resolve, reject) => {
      const proc = spawn('sh', ['-c', cmd], {
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', d => stdout += d.toString());
      proc.stderr.on('data', d => stderr += d.toString());

      proc.on('close', code => {
        if (code === 0) {
          resolve({ stdout, exitCode: code });
        } else {
          reject(new Error(stderr || `Command failed with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  /**
   * Execute a webhook
   */
  async executeWebhook(action, params) {
    // Simplified webhook execution
    const url = action.url;
    const method = action.method || 'POST';
    const body = { ...action.vars, ...params };
    
    return { url, method, body, status: 'would_execute' };
  }

  /**
   * Evaluate a condition
   */
  evaluateCondition(condition, params) {
    // Simple condition evaluation
    // In production, use a proper expression evaluator
    if (condition.when) {
      // Check if condition is met
      return { satisfied: true, condition: condition.when };
    }
    return { satisfied: true };
  }

  /**
   * Execute rollback
   */
  async executeRollback(run) {
    // Execute rollback steps in reverse
    console.log(`Executing rollback for run ${run.runId}`);
    // Implementation depends on SOP definition
  }

  /**
   * Approve a step
   */
  approveStep(runId, stepId, comment = '') {
    const run = this.activeRuns.get(runId) || this.loadRun(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    const step = run.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    step.approval = { approved: true, comment, at: new Date().toISOString() };
    step.status = 'completed';
    step.completedAt = new Date().toISOString();
    
    this.saveRun(run);
    
    // Resume execution
    this.executeSteps(runId);
    
    return step;
  }

  /**
   * Reject a step
   */
  rejectStep(runId, stepId, comment = '') {
    const run = this.activeRuns.get(runId) || this.loadRun(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    const step = run.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    step.approval = { approved: false, comment, at: new Date().toISOString() };
    step.status = 'rejected';
    run.status = 'rejected';
    run.completedAt = new Date().toISOString();
    
    this.saveRun(run);
    return step;
  }

  /**
   * Get run status
   */
  getRunStatus(runId) {
    const run = this.activeRuns.get(runId) || this.loadRun(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }
    return run;
  }

  /**
   * Save run to disk
   */
  saveRun(run) {
    const filePath = path.join(this.stateDir, `${run.runId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(run, null, 2));
  }

  /**
   * Load run from disk
   */
  loadRun(runId) {
    const filePath = path.join(this.stateDir, `${runId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
  }

  /**
   * Cancel a run
   */
  cancelRun(runId) {
    const run = this.activeRuns.get(runId) || this.loadRun(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    run.status = 'cancelled';
    run.completedAt = new Date().toISOString();
    this.saveRun(run);
    
    return run;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const engine = new SopEngine();

  (async () => {
    try {
      switch (command) {
        case 'list':
          const sops = engine.listSops();
          console.log('Available SOPs:');
          sops.forEach(s => {
            console.log(`  - ${s.name}: ${s.description} (${s.steps} steps)`);
          });
          break;

        case 'show':
          if (!args[1]) {
            console.error('Usage: sop show <sop-name>');
            process.exit(1);
          }
          const sop = engine.getSop(args[1]);
          if (!sop) {
            console.error(`SOP not found: ${args[1]}`);
            process.exit(1);
          }
          console.log(JSON.stringify(sop, null, 2));
          break;

        case 'start':
          if (!args[1]) {
            console.error('Usage: sop start <sop-name>');
            process.exit(1);
          }
          const run = await engine.startRun(args[1]);
          console.log(`Started SOP run: ${run.runId}`);
          break;

        case 'status':
          if (!args[1]) {
            console.error('Usage: sop status <run-id>');
            process.exit(1);
          }
          const status = engine.getRunStatus(args[1]);
          console.log(JSON.stringify(status, null, 2));
          break;

        case 'approve':
          if (!args[1] || !args[2]) {
            console.error('Usage: sop approve <run-id> <step-id>');
            process.exit(1);
          }
          const approved = engine.approveStep(args[1], args[2], args[3] || '');
          console.log('Step approved:', approved.id);
          break;

        case 'reject':
          if (!args[1] || !args[2]) {
            console.error('Usage: sop reject <run-id> <step-id>');
            process.exit(1);
          }
          const rejected = engine.rejectStep(args[1], args[2], args[3] || '');
          console.log('Step rejected:', rejected.id);
          break;

        case 'cancel':
          if (!args[1]) {
            console.error('Usage: sop cancel <run-id>');
            process.exit(1);
          }
          const cancelled = engine.cancelRun(args[1]);
          console.log('Run cancelled:', cancelled.runId);
          break;

        default:
          console.log('SOP Workflow Manager Commands:');
          console.log('  list                      - List all SOPs');
          console.log('  show <name>               - Show SOP definition');
          console.log('  start <name>              - Start an SOP');
          console.log('  status <run-id>           - Check run status');
          console.log('  approve <run-id> <step>   - Approve a step');
          console.log('  reject <run-id> <step>    - Reject a step');
          console.log('  cancel <run-id>           - Cancel a run');
      }
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  })();
}

module.exports = { SopEngine };
