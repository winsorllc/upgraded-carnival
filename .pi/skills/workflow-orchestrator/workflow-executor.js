#!/usr/bin/env node
/**
 * Workflow Orchestrator Executor
 *
 * Executes declarative workflow files that orchestrate multiple PopeBot agent jobs.
 * Supports sequential/parallel execution, approval gates, and error handling.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_TMP_DIR = '/job/tmp/workflows';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  showHelp();
  process.exit(1);
}

/**
 * Main command handler
 */
async function main() {
  switch (command) {
    case 'run':
      await runWorkflow(args[1], parseInputs(args.slice(2)));
      break;
    case 'compile':
      await compileWorkflow(args[1]);
      break;
    case 'list':
      listWorkflows();
      break;
    case 'help':
    default:
      showHelp();
  }
}

/**
 * Parse input arguments (--input key=value format)
 */
function parseInputs(args) {
  const inputs = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      const [key, ...valueParts] = args[i + 1].split('=');
      inputs[key.trim()] = valueParts.join('=').trim();
      i++;
    }
  }
  return inputs;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Workflow Orchestrator - Multi-agent workflow execution

Usage:
  workflow run <file> [--input key=value]   Run a workflow
  workflow compile <file>                   Validate workflow syntax
  workflow list                             List available workflows
  workflow help                             Show this help

Examples:
  workflow run my-pipeline.workflow
  workflow run pr-review.workflow --input pr_number=123
  workflow compile check-syntax.workflow
  workflow list
`);
}

/**
 * List workflows in current directory
 */
function listWorkflows() {
  const cwd = process.cwd();
  const files = readdirSync(cwd).filter(f => f.endsWith('.workflow'));
  
  if (files.length === 0) {
    console.log('No workflow files found in current directory');
    return;
  }
  
  console.log('Available workflows:');
  files.forEach(file => {
    try {
      const content = readFileSync(join(cwd, file), 'utf-8');
      const name = extractWorkflowName(content) || file;
      console.log(`  - ${file} (${name})`);
    } catch (e) {
      console.log(`  - ${file} (error reading)`);
    }
  });
}

/**
 * Extract workflow name from content
 */
function extractWorkflowName(content) {
  const match = content.match(/^name:\s*["']?([^"'\n]+)["']?/m);
  return match ? match[1].trim() : null;
}

/**
 * Compile/validate a workflow file
 */
async function compileWorkflow(filePath) {
  if (!filePath) {
    console.error('Error: No workflow file specified');
    process.exit(1);
  }
  
  const workflowPath = resolveWorkflowPath(filePath);
  let content;
  
  try {
    content = readFileSync(workflowPath, 'utf-8');
  } catch (e) {
    console.error(`Error reading workflow file: ${e.message}`);
    process.exit(1);
  }
  
  console.log(`Validating workflow: ${workflowPath}`);
  
  try {
    const workflow = parseWorkflow(content);
    const errors = validateWorkflow(workflow);
    
    if (errors.length > 0) {
      console.log('❌ Validation errors:');
      errors.forEach(err => console.log(`  - ${err}`));
      process.exit(1);
    }
    
    console.log('✅ Workflow syntax is valid');
    console.log(`   Name: ${workflow.name || 'Unnamed'}`);
    console.log(`   Steps: ${workflow.steps?.length || 0}`);
    if (workflow.inputs?.length > 0) {
      console.log(`   Inputs: ${workflow.inputs.map(i => i.name).join(', ')}`);
    }
    if (workflow.outputs?.length > 0) {
      console.log(`   Outputs: ${workflow.outputs.join(', ')}`);
    }
  } catch (e) {
    console.log(`❌ Parse error: ${e.message}`);
    process.exit(1);
  }
}

/**
 * Run a workflow
 */
async function runWorkflow(filePath, inputs = {}) {
  if (!filePath) {
    console.error('Error: No workflow file specified');
    process.exit(1);
  }
  
  const workflowPath = resolveWorkflowPath(filePath);
  let content;
  
  try {
    content = readFileSync(workflowPath, 'utf-8');
  } catch (e) {
    console.error(`Error reading workflow file: ${e.message}`);
    process.exit(1);
  }
  
  const workflowId = randomUUID().substring(0, 8);
  const workflowDir = join(WORKFLOW_TMP_DIR, workflowId);
  
  console.log(`🚀 Running workflow: ${workflowPath}`);
  console.log(`   Workflow ID: ${workflowId}`);
  console.log(`   Working directory: ${workflowDir}`);
  
  try {
    const workflow = parseWorkflow(content);
    const errors = validateWorkflow(workflow);
    
    if (errors.length > 0) {
      console.log('❌ Workflow validation failed:');
      errors.forEach(err => console.log(`  - ${err}`));
      process.exit(1);
    }
    
    // Check required inputs
    const missingInputs = checkRequiredInputs(workflow.inputs || [], inputs);
    if (missingInputs.length > 0) {
      console.log('❌ Missing required inputs:');
      missingInputs.forEach(name => console.log(`  - ${name}`));
      console.log('\nProvide inputs with: --input key=value');
      process.exit(1);
    }
    
    // Initialize workflow state
    mkdirSync(workflowDir, { recursive: true });
    const state = {
      id: workflowId,
      name: workflow.name || 'Untitled',
      status: 'running',
      startedAt: new Date().toISOString(),
      inputs,
      stepResults: {},
      outputs: {}
    };
    
    writeFileSync(join(workflowDir, 'state.json'), JSON.stringify(state, null, 2));
    
    // Execute workflow steps
    console.log('\n📋 Executing workflow steps...\n');
    await executeSteps(workflow, state, workflowDir);
    
    // Mark as complete
    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    writeFileSync(join(workflowDir, 'state.json'), JSON.stringify(state, null, 2));
    
    console.log('\n✅ Workflow completed successfully!');
    console.log(`   Results saved to: ${workflowDir}`);
    
    // Show outputs
    if (workflow.outputs?.length > 0) {
      console.log('\n📤 Outputs:');
      workflow.outputs.forEach(outputName => {
        if (state.outputs[outputName]) {
          console.log(`   ✓ ${outputName}`);
        } else {
          console.log(`   ✗ ${outputName} (not generated)`);
        }
      });
    }
    
  } catch (e) {
    console.error(`\n❌ Workflow execution failed: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
}

/**
 * Execute workflow steps
 */
async function executeSteps(workflow, state, workflowDir) {
  const steps = workflow.steps || [];
  const stepResults = state.stepResults;
  
  for (const step of steps) {
    await executeStep(step, state, workflowDir);
  }
}

/**
 * Execute a single step (or parallel block)
 */
async function executeStep(step, state, workflowDir) {
  const stepName = step.name || 'unnamed_step';
  console.log(`⏩ Step: ${stepName}`);
  
  // Check conditional execution
  if (step.if) {
    const shouldRun = await evaluateCondition(step.if, state);
    if (!shouldRun) {
      console.log(`   ⏭️  Skipped (condition not met)`);
      state.stepResults[stepName] = { status: 'skipped' };
      return;
    }
  }
  
  // Handle approval gates
  if (step.type === 'approval') {
    await executeApprovalStep(step, state, workflowDir);
    return;
  }
  
  // Handle parallel execution
  if (step.parallel && Array.isArray(step.parallel)) {
    await executeParallelSteps(step.parallel, state, workflowDir);
    return;
  }
  
  // Handle regular agent step
  if (step.agent && step.prompt) {
    await executeAgentStep(step, state, workflowDir);
    return;
  }
  
  console.log(`   ⚠️  Unknown step type`);
  state.stepResults[stepName] = { status: 'unknown' };
}

/**
 * Execute a parallel block of steps
 */
async function executeParallelSteps(parallelSteps, state, workflowDir) {
  console.log(`   ⫙  Running ${parallelSteps.length} parallel steps...`);
  
  const promises = parallelSteps.map(async (step) => {
    try {
      // Resolve prompt variables
      const resolvedPrompt = resolveVariables(step.prompt, state);
      
      // Create job for this step
      const jobId = await createAgentJob(step.agent, resolvedPrompt, state);
      state.stepResults[step.name || 'parallel_step'] = {
        status: 'completed',
        jobId
      };
      
      if (step.output) {
        state.outputs[step.output] = `Job ${jobId} completed`;
      }
      
      console.log(`      ✓ ${step.name || 'parallel step'}: Job ${jobId}`);
    } catch (e) {
      console.log(`      ✗ ${step.name || 'parallel step'}: ${e.message}`);
      state.stepResults[step.name || 'parallel_step'] = {
        status: 'failed',
        error: e.message
      };
    }
  });
  
  await Promise.all(promises);
}

/**
 * Execute a single agent step
 */
async function executeAgentStep(step, state, workflowDir) {
  try {
    // Resolve variables in prompt
    const resolvedPrompt = resolveVariables(step.prompt, state);
    
    // Create agent personality if defined
    const personality = step.personality || 
                       (workflow.agents?.[step.agent]?.personality) || 
                       'You are a helpful AI assistant.';
    
    // For demo purposes, we simulate job creation
    // In production, this would call thepopebot API
    const jobId = `job-${step.name}-${randomUUID().substring(0, 6)}`;
    
    console.log(`   🤖 Agent: ${step.agent}`);
    console.log(`      Job ID: ${jobId}`);
    
    // Save step details
    const stepDir = join(workflowDir, 'steps', step.name);
    mkdirSync(stepDir, { recursive: true });
    writeFileSync(join(stepDir, 'details.json'), JSON.stringify({
      agent: step.agent,
      personality,
      prompt: resolvedPrompt,
      jobId,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    state.stepResults[step.name] = {
      status: 'completed',
      jobId,
      agent: step.agent
    };
    
    if (step.output) {
      state.outputs[step.output] = `Job ${jobId} output`;
    }
    
    console.log(`      ✓ Completed`);
    
  } catch (e) {
    console.log(`   ✗ Failed: ${e.message}`);
    state.stepResults[step.name] = {
      status: 'failed',
      error: e.message
    };
    
    if (step.retry) {
      console.log(`      Retry logic would activate here`);
    }
  }
}

/**
 * Execute an approval gate step
 */
async function executeApprovalStep(step, state, workflowDir) {
  const resolvedPrompt = resolveVariables(step.prompt, state);
  const resolvedData = resolveVariables(step.data, state);
  
  console.log(`   🔒 Approval required: ${resolvedPrompt}`);
  console.log(`      Data: ${JSON.stringify(resolvedData).substring(0, 100)}...`);
  
  // In production, this would wait for user approval
  // For now, we'll simulate approval
  console.log(`      ⏳ (In production, would wait for user approval)`);
  
  state.stepResults[step.name] = {
    status: 'pending_approval',
    prompt: resolvedPrompt
  };
}

/**
 * Evaluate a condition
 */
async function evaluateCondition(condition, state) {
  // Simple condition evaluation
  // In production, this could use LLM to evaluate natural language conditions
  
  const conditionText = condition.replace(/\*\*/g, '').trim().toLowerCase();
  
  if (conditionText.includes('all previous steps succeeded')) {
    return !Object.values(state.stepResults).some(r => r.status === 'failed');
  }
  
  if (conditionText.includes('approval granted')) {
    return true; // Simplified
  }
  
  return true;
}

/**
 * Resolve variables in a string
 */
function resolveVariables(text, state) {
  if (!text) return text;
  
  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const value = state.outputs[varName.trim()] || match;
    return value;
  });
}

/**
 * Check required inputs
 */
function checkRequiredInputs(inputs, providedInputs) {
  const missing = [];
  inputs.forEach(input => {
    if (input.required && !providedInputs[input.name]) {
      missing.push(input.name);
    }
  });
  return missing;
}

/**
 * Create a PopeBot agent job
 * In production, this would call thepopebot API
 */
async function createAgentJob(agentName, prompt, state) {
  const jobId = `job-${agentName}-${randomUUID().substring(0, 6)}`;
  
  // For demo, we just return a mock job ID
  // In production:
  // const response = await fetch('/api/create-job', {
  //   method: 'POST',
  //   headers: { 'x-api-key': API_KEY },
  //   body: JSON.stringify({ job: prompt })
  // });
  
  return jobId;
}

/**
 * Resolve workflow file path
 */
function resolveWorkflowPath(filePath) {
  // Check if it's a URL
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    throw new Error('Remote workflows not yet implemented');
  }
  
  // Check if absolute path
  if (filePath.startsWith('/')) {
    return filePath;
  }
  
  // Relative path - resolve from current directory
  return join(process.cwd(), filePath);
}

/**
 * Parse workflow YAML-like syntax
 * Simplified parser for demonstration
 */
function parseWorkflow(content) {
  const workflow = {
    name: null,
    description: null,
    inputs: [],
    agents: {},
    steps: [],
    outputs: []
  };
  
  // Extract name
  const nameMatch = content.match(/name:\s*["']?([^"'\n]+)["']?/m);
  if (nameMatch) workflow.name = nameMatch[1].trim();
  
  // Extract description
  const descMatch = content.match(/description:\s*["']?([^"'\n]+)["']?/m);
  if (descMatch) workflow.description = descMatch[1].trim();
  
  // Extract inputs (look for the block between inputs: and next top-level key)
  const inputsMatch = content.match(/inputs:\s*\n((?:\s+[^\n]*\n)*?)(?=\n\w+:|\n$|$)/m);
  if (inputsMatch) {
    workflow.inputs = parseInputsBlock(inputsMatch[1]);
  }
  
  // Extract agents
  const agentsMatch = content.match(/agents:\s*\n((?:[^\n]*\n)*?)(?=\nsteps:|\n$|$)/m);
  if (agentsMatch) {
    workflow.agents = parseAgentsBlock(agentsMatch[1]);
  }
  
  // Extract steps (everything from "steps:" to "outputs:" or end)
  const stepsRegex = /steps:\s*\n([\s\S]*?)(?=\n\w+:|$)/m;
  let stepsMatch = stepsRegex.exec(content);
  if (!stepsMatch) {
    // Fallback: find steps: and outputs: manually
    const stepsIdx = content.indexOf('steps:');
    const outputsIdx = content.indexOf('outputs:');
    if (stepsIdx >= 0) {
      const stepsContent = outputsIdx >= 0 
        ? content.substring(stepsIdx + 6, outputsIdx) 
        : content.substring(stepsIdx + 6);
      workflow.steps = parseStepsBlock(stepsContent);
    }
  } else {
    workflow.steps = parseStepsBlock(stepsMatch[1]);
  }
  
  // Extract outputs
  const outputsMatch = content.match(/outputs:\s*\n([\s\S]*?)(?=\n\w+:|\n$|$)/m);
  if (outputsMatch) {
    workflow.outputs = parseOutputsBlock(outputsMatch[1]);
  }
  
  return workflow;
}

/**
 * Parse inputs block
 */
function parseInputsBlock(block) {
  const inputs = [];
  const lines = block.split('\n');
  let currentInput = null;
  
  lines.forEach(line => {
    if (line.trim().startsWith('- name:')) {
      if (currentInput) inputs.push(currentInput);
      currentInput = { name: line.split(':')[1].trim() };
    } else if (currentInput && line.includes('required:')) {
      currentInput.required = line.includes('true');
    } else if (currentInput && line.includes('description:')) {
      currentInput.description = line.split(':')[1].trim();
    }
  });
  
  if (currentInput) inputs.push(currentInput);
  return inputs;
}

/**
 * Parse agents block
 */
function parseAgentsBlock(block) {
  const agents = {};
  const lines = block.split('\n');
  let currentAgent = null;
  let personalityLines = [];
  
  lines.forEach(line => {
    if (line.match(/^\s+\w+:$/)) {
      if (currentAgent) {
        agents[currentAgent] = { personality: personalityLines.join('\n').trim() };
      }
      currentAgent = line.trim().replace(':', '');
      personalityLines = [];
    } else if (currentAgent && line.trim().startsWith('personality:')) {
      // Single line personality
      const personality = line.split('personality:')[1].trim();
      if (personality) personalityLines.push(personality);
    } else if (currentAgent && line.trim().startsWith('|')) {
      // Multi-line personality - would need more complex parsing
    } else if (currentAgent && line.startsWith('  ') && !line.trim().startsWith('|')) {
      personalityLines.push(line.trim());
    }
  });
  
  if (currentAgent) {
    agents[currentAgent] = { personality: personalityLines.join('\n').trim() };
  }
  
  return agents;
}

/**
 * Parse steps block (simplified)
 */
function parseStepsBlock(block) {
  const steps = [];
  const lines = block.split('\n');
  let currentStep = null;
  let inParallel = false;
  let parallelSteps = [];
  
  lines.forEach(line => {
    // Check for new step
    if (line.trim().startsWith('- name:')) {
      if (currentStep && !inParallel) steps.push(currentStep);
      if (inParallel && parallelSteps.length > 0) {
        if (currentStep) currentStep.parallel = parallelSteps;
        steps.push(currentStep);
        parallelSteps = [];
        inParallel = false;
      }
      currentStep = { name: line.split(':')[1].trim() };
    } else if (currentStep) {
      if (line.trim().startsWith('agent:')) {
        currentStep.agent = line.split(':')[1].trim();
      } else if (line.trim().startsWith('prompt:')) {
        currentStep.prompt = line.split('prompt:')[1].trim();
      } else if (line.trim().startsWith('output:')) {
        currentStep.output = line.split(':')[1].trim();
      } else if (line.trim().startsWith('type:')) {
        currentStep.type = line.split(':')[1].trim();
      } else if (line.trim().startsWith('if:')) {
        currentStep.if = line.split('if:')[1].trim();
      } else if (line.trim().startsWith('parallel:')) {
        inParallel = true;
      } else if (inParallel && line.trim().startsWith('- name:')) {
        parallelSteps.push({ name: line.split(':')[1].trim() });
      } else if (inParallel && parallelSteps.length > 0) {
        const lastParallel = parallelSteps[parallelSteps.length - 1];
        if (line.trim().startsWith('agent:')) {
          lastParallel.agent = line.split(':')[1].trim();
        } else if (line.trim().startsWith('prompt:')) {
          lastParallel.prompt = line.split('prompt:')[1].trim();
        } else if (line.trim().startsWith('output:')) {
          lastParallel.output = line.split(':')[1].trim();
        }
      }
    }
  });
  
  if (inParallel && parallelSteps.length > 0 && currentStep) {
    currentStep.parallel = parallelSteps;
  }
  
  if (currentStep && !inParallel) steps.push(currentStep);
  
  return steps;
}

/**
 * Parse outputs block
 */
function parseOutputsBlock(block) {
  const outputs = [];
  const lines = block.split('\n');
  
  lines.forEach(line => {
    if (line.trim().startsWith('- ')) {
      outputs.push(line.trim().substring(2));
    }
  });
  
  return outputs;
}

/**
 * Validate workflow structure
 */
function validateWorkflow(workflow) {
  const errors = [];
  
  // Check required fields
  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('Workflow must have at least one step');
  }
  
  // Validate steps
  workflow.steps?.forEach((step, index) => {
    if (!step.name) {
      errors.push(`Step ${index} is missing a name`);
    }
    
    if (step.type !== 'approval' && !step.parallel) {
      if (!step.agent) {
        errors.push(`Step "${step.name}" is missing an agent`);
      }
      if (!step.prompt) {
        errors.push(`Step "${step.name}" is missing a prompt`);
      }
    }
  });
  
  return errors;
}

// Run main
main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
