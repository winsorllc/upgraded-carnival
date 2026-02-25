#!/usr/bin/env node

/**
 * SOP Runner v2 — Enhanced Standard Operating Procedures
 * 
 * Executes SOPs with conditional branching, approval gates, and audit logging.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const SOPS_DIR = path.join(process.cwd(), 'sops');
const LOGS_DIR = path.join(process.cwd(), 'logs', 'sop');

// Ensure directories exist
if (!fs.existsSync(SOPS_DIR)) fs.mkdirSync(SOPS_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

/**
 * Parse SOP.md steps from markdown content
 */
function parseSteps(md) {
  const steps = [];
  const lines = md.split('\n');
  let inStepsSection = false;
  let currentStep = null;
  let codeBlock = [];
  let inCodeBlock = false;

  for (let line of lines) {
    // Check for code block boundaries
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        if (currentStep) {
          currentStep.code = codeBlock.join('\n');
        }
        codeBlock = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlock.push(line);
      continue;
    }

    // Check for ## Steps heading
    if (line.trim() === '## Steps') {
      inStepsSection = true;
      continue;
    }

    if (!inStepsSection) continue;

    // Check for numbered step (e.g., "1. **Step Title** [conditions]")
    const stepMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*(?:\s+\[(.+?)\])?/);
    if (stepMatch) {
      if (currentStep) {
        steps.push(currentStep);
      }
      currentStep = {
        number: parseInt(stepMatch[1]),
        title: stepMatch[2],
        body: '',
        code: null,
        conditions: parseConditions(stepMatch[3] || '')
      };
    } else if (currentStep && line.trim()) {
      currentStep.body += line + '\n';
    }
  }

  if (currentStep) {
    steps.push(currentStep);
  }

  return steps;
}

/**
 * Parse condition tags like [if: var], [requires_approval: true]
 */
function parseConditions(conditionStr) {
  const conditions = {
    if: null,
    requiresApproval: false
  };

  if (!conditionStr) return conditions;

  // Parse if condition
  const ifMatch = conditionStr.match(/if:\s*([^\]]+)/);
  if (ifMatch) {
    conditions.if = ifMatch[1].trim();
  }

  // Parse requires_approval
  const approvalMatch = conditionStr.match(/requires_approval:\s*(true|false)/);
  if (approvalMatch) {
    conditions.requiresApproval = approvalMatch[1] === 'true';
  }

  return conditions;
}

/**
 * Evaluate a condition expression
 */
function evaluateCondition(condition, vars, stepResults) {
  if (!condition) return true;

  // Handle negation
  if (condition.startsWith('!')) {
    const varName = condition.slice(1).trim();
    return !vars[varName] && !stepResults[varName];
  }

  // Handle equality check
  const eqMatch = condition.match(/(.+?)\s*==\s*["']([^"']+)["']/);
  if (eqMatch) {
    const varName = eqMatch[1].trim();
    const expectedValue = eqMatch[2];
    const actualValue = vars[varName] || stepResults[varName];
    return String(actualValue) === expectedValue;
  }

  // Handle simple truthy check
  const varName = condition.trim();
  return !!(vars[varName] || stepResults[varName]);
}

/**
 * Load SOP from directory
 */
function loadSOP(sopName) {
  const sopDir = path.join(SOPS_DIR, sopName);
  const tomlPath = path.join(sopDir, 'SOP.toml');
  const mdPath = path.join(sopDir, 'SOP.md');

  if (!fs.existsSync(tomlPath)) {
    throw new Error(`SOP.toml not found for SOP: ${sopName}`);
  }

  if (!fs.existsSync(mdPath)) {
    throw new Error(`SOP.md not found for SOP: ${sopName}`);
  }

  // Parse TOML (simple parser for our use case)
  const tomlContent = fs.readFileSync(tomlPath, 'utf-8');
  const manifest = parseSimpleToml(tomlContent);

  // Parse steps
  const mdContent = fs.readFileSync(mdPath, 'utf-8');
  const steps = parseSteps(mdContent);

  return {
    ...manifest.sop,
    triggers: manifest.triggers || [],
    gates: manifest.gates || {},
    steps,
    location: sopDir
  };
}

/**
 * Simple TOML parser for SOP manifests
 */
function parseSimpleToml(content) {
  const result = {};
  let currentSection = null;
  let currentArray = null;

  for (let line of content.split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    // Section header [section]
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      result[currentSection] = {};
      currentArray = null;
      continue;
    }

    // Array of tables [[section]]
    const arrayMatch = line.match(/^\[\[([^\]]+)\]\]$/);
    if (arrayMatch) {
      currentArray = arrayMatch[1];
      if (!result[currentArray]) result[currentArray] = [];
      result[currentArray].push({});
      currentSection = null;
      continue;
    }

    // Key-value pair
    const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let value = kvMatch[2];

      // Remove quotes from strings
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (/^\d+$/.test(value)) {
        value = parseInt(value);
      }

      if (currentArray) {
        const arr = result[currentArray];
        arr[arr.length - 1][key] = value;
      } else if (currentSection) {
        result[currentSection][key] = value;
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Execute a single step
 */
async function executeStep(step, vars, stepResults) {
  console.log(`  ▶ Step ${step.number}: ${step.title}`);

  // Check conditions
  if (step.conditions.if) {
    const shouldRun = evaluateCondition(step.conditions.if, vars, stepResults);
    if (!shouldRun) {
      console.log(`    ⏭ Skipped (condition not met: ${step.conditions.if})`);
      return {
        number: step.number,
        title: step.title,
        status: 'skipped',
        reason: `Condition not met: ${step.conditions.if}`
      };
    }
  }

  // Check approval requirement
  if (step.conditions.requiresApproval) {
    console.log(`    ⏸ Awaiting approval...`);
    const approvalFile = path.join(LOGS_DIR, 'pending-approvals.json');
    let approvals = [];
    if (fs.existsSync(approvalFile)) {
      approvals = JSON.parse(fs.readFileSync(approvalFile, 'utf-8'));
    }
    
    // For testing, we'll auto-approve if AUTO_APPROVE_SOPS is set
    if (process.env.AUTO_APPROVE_SOPS !== 'true') {
      // In real usage, this would wait for external approval
      // For now, just log that approval is needed
      console.log(`    ⚠ Approval required - set AUTO_APPROVE_SOPS=true to bypass`);
      return {
        number: step.number,
        title: step.title,
        status: 'pending_approval',
        message: 'Awaiting manual approval'
      };
    }
  }

  // Execute step code
  if (step.code) {
    try {
      const { stdout, stderr } = await execAsync(step.code, {
        cwd: process.cwd(),
        env: { ...process.env, ...vars }
      });
      
      console.log(`    ✓ Success`);
      if (stdout) console.log(`    ${stdout.trim()}`);
      
      return {
        number: step.number,
        title: step.title,
        status: 'success',
        output: stdout,
        error: stderr || null
      };
    } catch (error) {
      console.log(`    ✗ Failed: ${error.message}`);
      return {
        number: step.number,
        title: step.title,
        status: 'failed',
        error: error.message,
        output: error.stdout || ''
      };
    }
  } else {
    console.log(`    ✓ Success (no code)`);
    return {
      number: step.number,
      title: step.title,
      status: 'success',
      output: step.body
    };
  }
}

/**
 * Execute an SOP
 */
async function executeSOP(sopName, vars = {}) {
  console.log(`\n📋 Executing SOP: ${sopName}`);
  console.log(`   Starting at: ${new Date().toISOString()}\n`);

  const sop = loadSOP(sopName);
  const stepResults = {};
  const startTime = Date.now();
  
  let approvalPending = false;

  for (const step of sop.steps) {
    const result = await executeStep(step, vars, stepResults);
    stepResults[`step_${step.number}`] = result.status;
    stepResults[step.title.replace(/\s+/g, '_').toLowerCase()] = result.status;

    if (result.status === 'pending_approval') {
      approvalPending = true;
      break;
    }

    if (result.status === 'failed' && sop.execution_mode === 'supervised') {
      console.log(`\n⚠ SOP paused due to step failure in supervised mode`);
      break;
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Create audit log
  const auditLog = {
    sop: sopName,
    version: sop.version,
    started_at: new Date(startTime).toISOString(),
    completed_at: new Date(endTime).toISOString(),
    duration_ms: duration,
    status: approvalPending ? 'pending_approval' : 'completed',
    vars,
    steps: sop.steps.map(step => ({
      number: step.number,
      title: step.title,
      result: stepResults[`step_${step.number}`]
    })),
    metrics: {
      total_steps: sop.steps.length,
      completed: Object.values(stepResults).filter(s => s === 'success').length,
      skipped: Object.values(stepResults).filter(s => s === 'skipped').length,
      failed: Object.values(stepResults).filter(s => s === 'failed').length
    }
  };

  // Write audit log
  const logFile = path.join(LOGS_DIR, sopName, `${Date.now()}.json`);
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, JSON.stringify(auditLog, null, 2));

  console.log(`\n✅ SOP ${approvalPending ? 'paused for approval' : 'completed'}`);
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Log: ${logFile}\n`);

  return auditLog;
}

/**
 * List all available SOPs
 */
function listSOPs() {
  if (!fs.existsSync(SOPS_DIR)) {
    return [];
  }

  const sops = [];
  const entries = fs.readdirSync(SOPS_DIR);

  for (const entry of entries) {
    const sopDir = path.join(SOPS_DIR, entry);
    if (!fs.statSync(sopDir).isDirectory()) continue;
    
    const tomlPath = path.join(sopDir, 'SOP.toml');
    if (!fs.existsSync(tomlPath)) continue;

    try {
      const content = fs.readFileSync(tomlPath, 'utf-8');
      const manifest = parseSimpleToml(content);
      sops.push({
        name: entry,
        ...manifest.sop
      });
    } catch (error) {
      console.warn(`Failed to load SOP ${entry}: ${error.message}`);
    }
  }

  return sops.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * CLI interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'list':
      const sops = listSOPs();
      console.log('\nAvailable SOPs:\n');
      for (const sop of sops) {
        console.log(`  ${sop.name.padEnd(20)} ${sop.description || ''}`);
        console.log(`                       Priority: ${sop.priority || 'normal'}, Mode: ${sop.execution_mode || 'automatic'}`);
      }
      console.log();
      break;

    case 'run':
      const sopName = args[1];
      if (!sopName) {
        console.error('Usage: sop-runner.js run <sop-name> [vars...]');
        process.exit(1);
      }
      
      // Parse variables from command line
      const vars = {};
      for (let i = 2; i < args.length; i++) {
        const [key, value] = args[i].split('=');
        if (key && value) {
          vars[key] = value;
        }
      }

      executeSOP(sopName, vars)
        .then(result => {
          console.log('Final status:', result.status);
        })
        .catch(error => {
          console.error('SOP execution failed:', error.message);
          process.exit(1);
        });
      break;

    default:
      console.log(`
SOP Runner v2

Usage:
  sop-runner.js list              List all available SOPs
  sop-runner.js run <name> [vars] Execute an SOP

Examples:
  sop-runner.js list
  sop-runner.js run db-backup
  sop-runner.js run deploy version=1.2.3 env=production
`);
  }
}

module.exports = {
  executeSOP,
  listSOPs,
  loadSOP,
  parseSteps,
  evaluateCondition
};
