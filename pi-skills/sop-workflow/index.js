#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { spawn } from 'child_process';

const SOP_DIR = process.env.SOP_DIR || './sops';
const SOP_STATE_DIR = process.env.SOP_STATE_DIR || './sop-state';

// Ensure directories exist
if (!existsSync(SOP_DIR)) mkdirSync(SOP_DIR, { recursive: true });
if (!existsSync(SOP_STATE_DIR)) mkdirSync(SOP_STATE_DIR, { recursive: true });

function loadYaml(content) {
  // Simple YAML parser for our needs
  const lines = content.split('\n');
  const result = {};
  let currentSection = null;
  let currentList = null;
  let currentItem = null;
  let indent = 0;

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    
    const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (match) {
      const [, ws, key, value] = match;
      const currentIndent = ws.length;
      
      if (value === '' || value.startsWith('-')) {
        // Section header or list start
        if (currentIndent === 0) {
          currentSection = key.trim();
          result[currentSection] = currentSection === 'steps' || currentSection === 'variables' || currentSection === 'approvers' ? [] : {};
          if (value.startsWith('-')) {
            currentList = currentSection;
            const itemMatch = value.match(/^-\s*(.*)$/);
            if (itemMatch) {
              const itemValue = itemMatch[1].trim();
              if (itemValue.startsWith('{')) {
                result[currentSection].push(JSON.parse(itemValue));
              } else {
                result[currentSection].push({ id: result[currentSection].length + 1, name: itemValue });
              }
            }
          }
        } else if (currentIndent > indent && currentList) {
          // List item
          const itemMatch = value.match(/^-\s*(.*)$/);
          if (itemMatch) {
            const itemValue = itemMatch[1].trim();
            if (itemValue.startsWith('{')) {
              result[currentSection].push(JSON.parse(itemValue));
            } else {
              result[currentSection].push({ id: result[currentSection].length + 1, name: itemValue });
            }
          } else if (value.trim()) {
            const lastIdx = result[currentSection].length - 1;
            if (lastIdx >= 0) {
              const [k, v] = value.split(':').map(s => s.trim());
              result[currentSection][lastIdx][k] = v.replace(/^["']|["']$/g, '');
            }
          }
        } else {
          // Key-value
          const [k, v] = [key.trim(), value.trim().replace(/^["']|["']$/g, '')];
          if (currentSection) {
            if (Array.isArray(result[currentSection])) {
              const lastIdx = result[currentSection].length - 1;
              if (lastIdx >= 0 && typeof result[currentSection][lastIdx] === 'object') {
                result[currentSection][lastIdx][k] = v;
              }
            } else {
              result[currentSection][k] = v;
            }
          } else {
            result[k] = v;
          }
        }
        indent = currentIndent;
      } else {
        const [k, v] = [key.trim(), value.trim().replace(/^["']|["']$/g, '')];
        if (currentSection && Array.isArray(result[currentSection]) && result[currentSection].length > 0) {
          const lastIdx = result[currentSection].length - 1;
          if (typeof result[currentSection][lastIdx] === 'object') {
            result[currentSection][lastIdx][k] = v;
          }
        } else if (currentSection) {
          result[currentSection] = result[currentSection] || {};
          result[currentSection][k] = v;
        } else {
          result[k] = v;
        }
      }
    }
  }
  
  return result;
}

function saveYaml(obj) {
  let result = '';
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      result += `${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object') {
          result += `  - ${JSON.stringify(item)}\n`;
        } else {
          result += `  - ${item}\n`;
        }
      }
    } else if (typeof value === 'object') {
      result += `${key}:\n`;
      for (const [k, v] of Object.entries(value)) {
        result += `  ${k}: ${v}\n`;
      }
    } else {
      result += `${key}: ${value}\n`;
    }
  }
  return result;
}

function getStatePath(name) {
  return join(SOP_STATE_DIR, `${name}.json`);
}

function getHistoryPath(name) {
  return join(SOP_STATE_DIR, `${name}.history.jsonl`);
}

function loadState(name) {
  const path = getStatePath(name);
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8'));
  }
  return null;
}

function saveState(name, state) {
  writeFileSync(getStatePath(name), JSON.stringify(state, null, 2));
}

function appendHistory(name, entry) {
  const path = getHistoryPath(name);
  writeFileSync(path, JSON.stringify(entry) + '\n', { flag: 'a' });
}

async function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    const proc = spawn(cmd, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    proc.on('error', reject);
  });
}

const commands = {
  'create': async (args) => {
    const name = args[0];
    const stepsIdx = args.indexOf('--steps');
    const approvalsIdx = args.indexOf('--approvals');
    
    if (!name) {
      console.error('Usage: sop create <name> --steps <step1,step2,...> --approvals <step1,step3,...>');
      process.exit(1);
    }
    
    const steps = stepsIdx >= 0 ? args[stepsIdx + 1].split(',') : [];
    const approvals = approvalsIdx >= 0 ? args[approvalsIdx + 1].split(',') : [];
    
    const sop = {
      name,
      description: `SOP: ${name}`,
      version: '1.0',
      steps: steps.map((step, i) => ({
        id: i + 1,
        name: step.trim(),
        command: '',
        requires_approval: approvals.includes(step.trim()),
        approvers: []
      })),
      variables: []
    };
    
    const path = join(SOP_DIR, `${name}.yaml`);
    writeFileSync(path, saveYaml(sop));
    console.log(`Created SOP: ${name} at ${path}`);
  },
  
  'list': async () => {
    const files = readdirSync(SOP_DIR).filter(f => f.endsWith('.yaml'));
    if (files.length === 0) {
      console.log('No SOPs found');
      return;
    }
    console.log('Available SOPs:');
    for (const file of files) {
      const content = readFileSync(join(SOP_DIR, file), 'utf-8');
      const sop = loadYaml(content);
      console.log(`  - ${sop.name}: ${sop.description || 'No description'}`);
    }
  },
  
  'show': async (args) => {
    const name = args[0];
    if (!name) {
      console.error('Usage: sop show <name>');
      process.exit(1);
    }
    
    const path = join(SOP_DIR, `${name}.yaml`);
    if (!existsSync(path)) {
      console.error(`SOP not found: ${name}`);
      process.exit(1);
    }
    
    const content = readFileSync(path, 'utf-8');
    const sop = loadYaml(content);
    console.log(JSON.stringify(sop, null, 2));
  },
  
  'execute': async (args) => {
    const name = args[0];
    const varsIdx = args.indexOf('--vars');
    
    if (!name) {
      console.error('Usage: sop execute <name> [--vars KEY=VALUE,...]');
      process.exit(1);
    }
    
    const path = join(SOP_DIR, `${name}.yaml`);
    if (!existsSync(path)) {
      console.error(`SOP not found: ${name}`);
      process.exit(1);
    }
    
    const content = readFileSync(path, 'utf-8');
    const sop = loadYaml(content);
    
    // Parse variables
    let variables = {};
    if (varsIdx >= 0 && varsIdx + 1 < args.length) {
      for (const pair of args[varsIdx + 1].split(',')) {
        const [k, v] = pair.split('=');
        variables[k.trim()] = v.trim();
      }
    }
    
    // Load or create state
    let state = loadState(name) || {
      name,
      currentStep: 0,
      completedSteps: [],
      pendingApproval: null,
      variables,
      startedAt: new Date().toISOString(),
      status: 'running'
    };
    
    if (state.status === 'completed') {
      console.log('SOP already completed. Use sop reset first to run again.');
      return;
    }
    
    if (state.pendingApproval) {
      console.log(`Waiting for approval on step ${state.pendingApproval}`);
      return;
    }
    
    // Execute steps
    while (state.currentStep < sop.steps.length) {
      const step = sop.steps[state.currentStep];
      console.log(`Executing step ${step.id}: ${step.name}`);
      
      if (step.requires_approval) {
        state.pendingApproval = step.id;
        state.status = 'awaiting_approval';
        saveState(name, state);
        appendHistory(name, {
          step: step.id,
          action: 'awaiting_approval',
          timestamp: new Date().toISOString()
        });
        console.log(`Step ${step.id} requires approval. Pausing...`);
        return;
      }
      
      if (step.command) {
        try {
          const result = await runCommand(step.command);
          appendHistory(name, {
            step: step.id,
            action: 'executed',
            command: step.command,
            exitCode: result.code,
            output: result.stdout.substring(0, 1000),
            timestamp: new Date().toISOString()
          });
          
          if (result.code !== 0) {
            state.status = 'failed';
            state.error = `Step ${step.id} failed: ${result.stderr}`;
            saveState(name, state);
            console.error(`Step failed: ${result.stderr}`);
            return;
          }
        } catch (err) {
          state.status = 'failed';
          state.error = `Step ${step.id} error: ${err.message}`;
          saveState(name, state);
          console.error(`Step error: ${err.message}`);
          return;
        }
      }
      
      state.completedSteps.push({
        id: step.id,
        name: step.name,
        completedAt: new Date().toISOString()
      });
      state.currentStep++;
      saveState(name, state);
    }
    
    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    saveState(name, state);
    appendHistory(name, {
      action: 'completed',
      timestamp: new Date().toISOString()
    });
    console.log('SOP completed successfully!');
  },
  
  'approve': async (args) => {
    const name = args[0];
    const stepIdx = args.indexOf('--step');
    const notesIdx = args.indexOf('--notes');
    
    if (!name || stepIdx < 0) {
      console.error('Usage: sop approve <name> --step <step_number> [--notes <notes>]');
      process.exit(1);
    }
    
    const stepNum = parseInt(args[stepIdx + 1]);
    const notes = notesIdx >= 0 ? args[notesIdx + 1] : '';
    
    let state = loadState(name);
    if (!state) {
      console.error(`No execution state found for: ${name}`);
      process.exit(1);
    }
    
    if (state.pendingApproval !== stepNum) {
      console.error(`Step ${stepNum} is not pending approval`);
      process.exit(1);
    }
    
    // Load SOP to get step details
    const sopPath = join(SOP_DIR, `${name}.yaml`);
    const sop = loadYaml(readFileSync(sopPath, 'utf-8'));
    const step = sop.steps.find(s => s.id === stepNum);
    
    if (step && step.command) {
      try {
        const result = await runCommand(step.command);
        appendHistory(name, {
          step: stepNum,
          action: 'approved',
          notes,
          command: step.command,
          exitCode: result.code,
          output: result.stdout.substring(0, 1000),
          timestamp: new Date().toISOString()
        });
        
        if (result.code !== 0) {
          console.error(`Command failed after approval: ${result.stderr}`);
          return;
        }
      } catch (err) {
        console.error(`Command error after approval: ${err.message}`);
        return;
      }
    }
    
    state.completedSteps.push({
      id: stepNum,
      name: step?.name,
      approvedAt: new Date().toISOString(),
      notes
    });
    state.pendingApproval = null;
    state.status = 'running';
    saveState(name, state);
    
    console.log(`Step ${stepNum} approved!`);
    
    // Continue execution
    await commands['execute']([name]);
  },
  
  'reject': async (args) => {
    const name = args[0];
    const stepIdx = args.indexOf('--step');
    const reasonIdx = args.indexOf('--reason');
    
    if (!name || stepIdx < 0 || reasonIdx < 0) {
      console.error('Usage: sop reject <name> --step <step_number> --reason <reason>');
      process.exit(1);
    }
    
    const stepNum = parseInt(args[stepIdx + 1]);
    const reason = args.slice(reasonIdx + 1).join(' ');
    
    let state = loadState(name);
    if (!state) {
      console.error(`No execution state found for: ${name}`);
      process.exit(1);
    }
    
    state.status = 'rejected';
    state.rejection = {
      step: stepNum,
      reason,
      rejectedAt: new Date().toISOString()
    };
    saveState(name, state);
    
    appendHistory(name, {
      step: stepNum,
      action: 'rejected',
      reason,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Step ${stepNum} rejected: ${reason}`);
  },
  
  'status': async (args) => {
    const name = args[0];
    if (!name) {
      console.error('Usage: sop status <name>');
      process.exit(1);
    }
    
    const state = loadState(name);
    if (!state) {
      console.log(`No execution state found for: ${name}`);
      return;
    }
    
    console.log(JSON.stringify(state, null, 2));
  },
  
  'pending': async () => {
    const files = readdirSync(SOP_STATE_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.history.jsonl'));
    
    let found = false;
    for (const file of files) {
      const name = file.replace('.json', '');
      const state = JSON.parse(readFileSync(join(SOP_STATE_DIR, file), 'utf-8'));
      
      if (state.pendingApproval) {
        found = true;
        console.log(`${name}: Step ${state.pendingApproval} requires approval`);
      }
    }
    
    if (!found) {
      console.log('No pending approvals');
    }
  },
  
  'reset': async (args) => {
    const name = args[0];
    if (!name) {
      console.error('Usage: sop reset <name>');
      process.exit(1);
    }
    
    const statePath = getStatePath(name);
    const historyPath = getHistoryPath(name);
    
    if (existsSync(statePath)) {
      const fs = await import('fs');
      fs.unlinkSync(statePath);
    }
    if (existsSync(historyPath)) {
      const fs = await import('fs');
      fs.unlinkSync(historyPath);
    }
    
    console.log(`Reset state for ${name}`);
  }
};

// Main entry point
const cmd = process.argv[2];
const args = process.argv.slice(3);

if (commands[cmd]) {
  commands[cmd](args).catch(err => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.log(`SOP Workflow Tool

Usage: sop <command> [args...]

Commands:
  create <name> --steps <step1,step2,...> --approvals <step1,step3,...>
    Create a new SOP
  list
    List all SOPs
  show <name>
    Show SOP details
  execute <name> [--vars KEY=VALUE,...]
    Execute an SOP
  approve <name> --step <step_number> [--notes <notes>]
    Approve a step
  reject <name> --step <step_number> --reason <reason>
    Reject a step
  status <name>
    Check SOP status
  pending
    List pending approvals
  reset <name>
    Reset SOP state
`);
  process.exit(1);
}
