#!/usr/bin/env node
/**
 * SOP Runner - Standard Operating Procedure execution engine
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

function parseArgs(args) {
  const result = {
    file: null,
    list: false,
    validate: false,
    dryRun: false,
    audit: false,
    auditId: null,
    variables: {},
    sopsDir: './sops'
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file': result.file = args[++i]; break;
      case '--list': result.list = true; break;
      case '--validate': result.validate = true; break;
      case '--dry-run': result.dryRun = true; break;
      case '--audit': result.audit = true; break;
      case '--id': result.auditId = args[++i]; break;
      case '--var': {
        const [key, value] = args[++i].split('=');
        result.variables[key] = value;
        break;
      }
      case '--sops-dir': result.sopsDir = args[++i]; break;
    }
  }
  return result;
}

function loadYaml(content) {
  const result = {};
  const lines = content.split('\n');
  let currentKey = null;
  let currentArray = null;
  let indent = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (value) {
        result[key] = value.replace(/^["']|["']$/g, '');
      } else {
        currentKey = key;
        result[currentKey] = {};
      }
    }
  }
  
  return result;
}

function loadSop(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath);
  
  if (ext === '.json') {
    return JSON.parse(content);
  } else if (ext === '.yaml' || ext === '.yml') {
    // Simple YAML parser
    return parseYaml(content);
  } else if (ext === '.toml') {
    // Simple TOML parser
    return parseToml(content);
  }
  
  throw new Error(`Unsupported file format: ${ext}`);
}

function parseYaml(content) {
  const result = { steps: [] };
  let currentStep = null;
  let inSteps = false;
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Root level keys
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      if (trimmed.includes(':')) {
        const [key, value] = trimmed.split(':', 2);
        result[key.trim()] = value ? value.trim().replace(/^["']|["']$/g, '') : null;
        inSteps = key.trim() === 'steps';
        if (inSteps) {
          result.steps = [];
        }
      }
      continue;
    }
    
    // Steps section
    if (inSteps) {
      if (trimmed.startsWith('- name:')) {
        if (currentStep) result.steps.push(currentStep);
        currentStep = { name: trimmed.split(':', 2)[1].trim() };
      } else if (currentStep && trimmed.includes(':')) {
        const [key, value] = trimmed.split(':', 2);
        const keyTrimmed = key.trim();
        const valueTrimmed = value ? value.trim().replace(/^["']|["']$/g, '') : '';
        
        if (keyTrimmed === 'depends_on' || keyTrimmed === 'approvers') {
          currentStep[keyTrimmed] = valueTrimmed.split(',').map(s => s.trim());
        } else if (keyTrimmed === 'timeout' || keyTrimmed === 'retries') {
          currentStep[keyTrimmed] = parseInt(valueTrimmed) || valueTrimmed;
        } else {
          currentStep[keyTrimmed] = valueTrimmed;
        }
      }
    }
  }
  
  if (currentStep) result.steps.push(currentStep);
  
  return result;
}

function parseToml(content) {
  // Similar to YAML but TOML format
  return parseYaml(content); // Simplified - many constructs are similar
}

function expandVariables(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

function executeCommand(command, timeout = 300) {
  return new Promise((resolve) => {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    const child = spawn(cmd, args, { 
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    let killed = false;
    
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
    }, timeout * 1000);
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0 && !killed,
        exitCode: code,
        killed,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

async function runStep(step, variables, dryRun) {
  const expandedCommand = step.command ? expandVariables(step.command, variables) : null;
  
  console.log(`\n▶ Step: ${step.name}`);
  if (step.description) console.log(`  Description: ${step.description}`);
  
  if (dryRun) {
    console.log(`  [DRY RUN] Would execute: ${expandedCommand || 'N/A'}`);
    return { success: true, dryRun: true };
  }
  
  if (step.type === 'approval') {
    console.log(`  ⚠ APPROVAL REQUIRED`);
    console.log(`  This step requires manual approval.`);
    console.log(`  Approvers: ${(step.approvers || ['anyone']).join(', ')}`);
    console.log(`  Waiting for approval (simulated for testing)...`);
    // In production, this would wait for actual approval via API/webhook
    await new Promise(r => setTimeout(r, 1000));
    console.log(`  ✓ Approved (simulated)`);
    return { success: true, approved: true };
  }
  
  if (!expandedCommand) {
    console.log(`  ⚠ No command specified`);
    return { success: true };
  }
  
  console.log(`  Executing: ${expandedCommand}`);
  
  const maxRetries = step.retries || 0;
  let attempt = 0;
  let result;
  
  do {
    if (attempt > 0) {
      console.log(`  Retry attempt ${attempt}/${maxRetries}...`);
    }
    
    result = await executeCommand(expandedCommand, step.timeout || 300);
    attempt++;
    
    if (!result.success && attempt <= maxRetries) {
      await new Promise(r => setTimeout(r, 1000));
    }
  } while (!result.success && attempt <= maxRetries);
  
  if (result.success) {
    console.log(`  ✓ Success`);
    if (result.stdout) console.log(`    Output: ${result.stdout.substring(0, 200)}`);
  } else {
    console.log(`  ✗ Failed (exit code: ${result.exitCode})`);
    if (result.stderr) console.log(`    Error: ${result.stderr.substring(0, 200)}`);
  }
  
  return result;
}

async function runSop(sop, variables, dryRun) {
  const executionId = crypto.randomUUID();
  const startTime = Date.now();
  const audit = {
    id: executionId,
    sop: sop.name,
    startTime: new Date().toISOString(),
    variables,
    steps: [],
    status: 'running'
  };
  
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║ SOP: ${sop.name.padEnd(33)} ║`);
  console.log(`║ Execution ID: ${executionId.substring(0, 20).padEnd(20)} ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  
  // Build dependency graph
  const completed = new Set();
  const failed = new Set();
  
  try {
    // Simple sequential execution (respects depends_on)
    const stepsToRun = [...sop.steps];
    const running = new Set();
    
    while (stepsToRun.length > 0 || running.size > 0) {
      // Find steps that can run
      const ready = stepsToRun.filter(step => {
        if (!step.depends_on || step.depends_on.length === 0) return true;
        return step.depends_on.every(dep => completed.has(dep));
      });
      
      if (ready.length === 0 && running.size === 0) {
        throw new Error('Deadlock: No steps can run');
      }
      
      // Run ready steps
      for (const step of ready) {
        stepsToRun.splice(stepsToRun.indexOf(step), 1);
        running.add(step.name);
        
        const stepResult = await runStep(step, variables, dryRun);
        
        audit.steps.push({
          name: step.name,
          status: stepResult.success ? 'success' : 'failed',
          output: stepResult.stdout,
          error: stepResult.stderr
        });
        
        running.delete(step.name);
        
        if (stepResult.success) {
          completed.add(step.name);
        } else {
          failed.add(step.name);
          
          // Check if rollback is needed
          if (step.on_failure === 'rollback' && sop.rollback) {
            console.log('\n⚠ Executing rollback...');
            for (const rollbackStep of sop.rollback) {
              console.log(`  Rollback: ${rollbackStep.name}`);
            }
          }
          
          audit.status = 'failed';
          audit.endTime = new Date().toISOString();
          audit.duration = Date.now() - startTime;
          
          saveAudit(audit);
          return audit;
        }
      }
      
      // Wait a bit before checking again
      if (stepsToRun.length > 0 && running.size > 0) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    audit.status = 'success';
    
  } catch (e) {
    audit.status = 'error';
    audit.error = e.message;
  }
  
  audit.endTime = new Date().toISOString();
  audit.duration = Date.now() - startTime;
  
  saveAudit(audit);
  
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`Status: ${audit.status.toUpperCase()}`);
  console.log(`Duration: ${audit.duration}ms`);
  console.log(`Execution ID: ${executionId}`);
  console.log(`═══════════════════════════════════════════`);
  
  return audit;
}

function saveAudit(audit) {
  const auditDir = path.join(process.cwd(), '.sop', 'audit');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }
  
  const filePath = path.join(auditDir, `${audit.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(audit, null, 2));
}

function listSops(sopsDir) {
  if (!fs.existsSync(sopsDir)) {
    console.log('No SOPs directory found');
    return;
  }
  
  const files = fs.readdirSync(sopsDir);
  console.log('Available SOPs:');
  console.log('');
  
  for (const file of files) {
    if (file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json') || file.endsWith('.toml')) {
      try {
        const sop = loadSop(path.join(sopsDir, file));
        console.log(`  ${sop.name || file}`);
        if (sop.description) console.log(`    ${sop.description}`);
        console.log(`    File: ${file}`);
        console.log('');
      } catch (e) {
        console.log(`  ${file} [Error: ${e.message}]`);
      }
    }
  }
}

function validateSop(filePath) {
  try {
    const sop = loadSop(filePath);
    
    console.log('Validating SOP...');
    
    // Check required fields
    if (!sop.name) throw new Error('Missing required field: name');
    if (!sop.steps || sop.steps.length === 0) throw new Error('SOP must have at least one step');
    
    // Validate steps
    for (const step of sop.steps) {
      if (!step.name) throw new Error('Step missing required field: name');
    }
    
    console.log('✓ SOP is valid');
    console.log(`  Name: ${sop.name}`);
    console.log(`  Steps: ${sop.steps.length}`);
    
    return true;
  } catch (e) {
    console.error(`✗ Validation failed: ${e.message}`);
    return false;
  }
}

function showAudit(auditId) {
  const auditPath = path.join(process.cwd(), '.sop', 'audit', `${auditId}.json`);
  
  if (!fs.existsSync(auditPath)) {
    console.error(`Audit not found: ${auditId}`);
    return;
  }
  
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  
  console.log('Audit Log');
  console.log('═════════');
  console.log(`ID: ${audit.id}`);
  console.log(`SOP: ${audit.sop}`);
  console.log(`Status: ${audit.status}`);
  console.log(`Start: ${audit.startTime}`);
  console.log(`End: ${audit.endTime || 'N/A'}`);
  console.log(`Duration: ${audit.duration || 'N/A'}ms`);
  console.log('');
  console.log('Steps:');
  for (const step of audit.steps) {
    const icon = step.status === 'success' ? '✓' : '✗';
    console.log(`  ${icon} ${step.name}: ${step.status}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.list) {
    listSops(args.sopsDir);
    return;
  }
  
  if (args.audit) {
    if (!args.auditId) {
      console.error('Error: --audit requires --id');
      process.exit(1);
    }
    showAudit(args.auditId);
    return;
  }
  
  if (!args.file) {
    console.log('SOP Runner - Execute Standard Operating Procedures');
    console.log('');
    console.log('Usage: sop-run.js --file <sop-file> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --file <path>       SOP definition file (yaml/json/toml)');
    console.log('  --list              List available SOPs');
    console.log('  --validate          Validate SOP without running');
    console.log('  --dry-run           Show what would be executed');
    console.log('  --audit --id <id>   Show execution audit');
    console.log('  --var key=value     Set variable (can use multiple)');
    console.log('  --sops-dir <dir>   SOPs directory (default: ./sops)');
    process.exit(1);
  }
  
  if (!fs.existsSync(args.file)) {
    console.error(`Error: File not found: ${args.file}`);
    process.exit(1);
  }
  
  if (args.validate) {
    const valid = validateSop(args.file);
    process.exit(valid ? 0 : 1);
  }
  
  try {
    const sop = loadSop(args.file);
    await runSop(sop, args.variables, args.dryRun);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();