// Pipeline Orchestrator - Main Executor
// Inspired by OpenClaw Lobster architecture

import { writeFile, readFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import yaml from 'js-yaml';
import fetch from 'node-fetch';

const execAsync = promisify(exec);
const WORKSPACE = '/job/tmp/pipelines';

/**
 * Pipeline execution state
 */
class PipelineState {
  constructor(pipelineId, name) {
    this.id = pipelineId;
    this.name = name;
    this.status = 'running';
    this.currentStage = 0;
    this.stages = [];
    this.outputs = {};
    this.variables = {};
    this.resumeToken = null;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    const dir = join(WORKSPACE, this.id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'state.json'), JSON.stringify(this, null, 2));
  }

  static async load(pipelineId) {
    const data = await readFile(join(WORKSPACE, pipelineId, 'state.json'), 'utf8');
    return new PipelineState(data.id, data.name, data);
  }
}

/**
 * Variable substitution
 */
function substituteVariables(template, variables) {
  if (typeof template !== 'string') return template;
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const keys = key.trim().split('.');
    let value = variables;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return match; // Keep original if not found
      }
    }
    return typeof value === 'string' ? value : JSON.stringify(value);
  });
}

/**
 * Stage executors
 */
const stageExecutors = {
  fetch: async (config, state, context) => {
    const { url, source, query, max, format = 'json' } = config;
    
    if (url) {
      const response = await fetch(substituteVariables(url, state.variables));
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      return format === 'json' ? await response.json() : await response.text();
    }
    
    // Placeholder for integrations (gmail, github, etc.)
    throw new Error(`Unknown fetch source: ${source}`);
  },

  transform: async (config, state, context) => {
    const { script, input } = config;
    const inputData = substituteVariables(input, state.variables);
    
    // Load and execute transform script
    const scriptPath = substituteVariables(script, state.variables);
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`, {
      input: typeof inputData === 'string' ? inputData : JSON.stringify(inputData)
    });
    
    return JSON.parse(stdout);
  },

  analyze: async (config, state, context) => {
    const { prompt, input } = config;
    const inputData = substituteVariables(input, state.variables);
    const analysisPrompt = substituteVariables(prompt, state.variables);
    
    // Use LLM for analysis (via Pi agent context or direct API)
    // This is a simplified version - would integrate with actual LLM
    return {
      summary: `Analysis of: ${JSON.stringify(inputData).substring(0, 200)}...`,
      analysis: 'LLM analysis would go here',
      timestamp: new Date().toISOString()
    };
  },

  approve: async (config, state, context) => {
    const { prompt, show_data } = config;
    const promptText = substituteVariables(prompt, state.variables);
    const data = show_data ? substituteVariables(show_data, state.variables) : null;
    
    // Return approval request (pauses execution)
    return {
      requiresApproval: true,
      prompt: promptText,
      data: data,
      resumeToken: state.resumeToken
    };
  },

  send_email: async (config, state, context) => {
    const { to, subject, body, isImportant = false } = config;
    
    // Check for email credentials
    const emailUser = process.env.POE_BOT_EMAIL_USER;
    const emailPass = process.env.POE_BOT_EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
      throw new Error('Email credentials not configured (POPEBOT_EMAIL_USER/PASS)');
    }
    
    const emailConfig = {
      to: substituteVariables(to, state.variables),
      subject: substituteVariables(subject, state.variables),
      body: substituteVariables(body, state.variables),
      isImportant
    };
    
    // Placeholder - would integrate with actual email tool
    return { sent: true, ...emailConfig, timestamp: new Date().toISOString() };
  },

  save: async (config, state, context) => {
    const { path, data } = config;
    const filePath = substituteVariables(path, state.variables);
    const dataToSave = substituteVariables(data, state.variables);
    
    const fullPath = join(dirname(state.workspace), filePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, typeof dataToSave === 'string' ? dataToSave : JSON.stringify(dataToSave, null, 2));
    
    return { saved: true, path: fullPath };
  },

  notify: async (config, state, context) => {
    const { channel, message } = config;
    const messageText = substituteVariables(message, state.variables);
    
    // Placeholder for notification integrations
    return { notified: true, channel, message: messageText };
  },

  command: async (config, state, context) => {
    const { run, timeout = 60000 } = config;
    const command = substituteVariables(run, state.variables);
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout,
      cwd: state.workspace || '/job'
    });
    
    return { stdout, stderr, exitCode: 0 };
  }
};

/**
 * Parse pipeline file
 */
export async function parsePipeline(filePath) {
  const content = await readFile(filePath, 'utf8');
  const pipeline = yaml.load(content);
  
  if (!pipeline.name) throw new Error('Pipeline must have a name');
  if (!pipeline.stages || !Array.isArray(pipeline.stages)) {
    throw new Error('Pipeline must have stages array');
  }
  
  return pipeline;
}

/**
 * Parse inline pipeline string
 */
export function parseInlinePipeline(pipelineString) {
  const stages = pipelineString.split('|').map(s => s.trim());
  
  return {
    name: 'Inline Pipeline',
    version: '1.0',
    stages: stages.map((stageStr, index) => {
      const parts = stageStr.split(/\s+/);
      const type = parts[0];
      const config = {};
      
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].startsWith('--')) {
          const key = parts[i].slice(2);
          const value = parts[i + 1];
          if (value && !value.startsWith('--')) {
            config[key] = value;
            i++; // Skip next part
          } else {
            config[key] = true;
          }
        } else if (!parts[i].startsWith('--')) {
          config.value = parts[i];
        }
      }
      
      return {
        id: `stage_${index}`,
        type,
        config
      };
    })
  };
}

/**
 * Execute a single stage
 */
async function executeStage(stage, state, context) {
  const executor = stageExecutors[stage.type];
  if (!executor) {
    throw new Error(`Unknown stage type: ${stage.type}`);
  }
  
  const config = stage.config || {};
  stage.type === 'approve';
  const result = await executor(config, state, context);
  
  // Handle approval gate
  if (stage.type === 'approve' && result.requiresApproval) {
    return {
      status: 'needs_approval',
      stage: stage.id,
      prompt: result.prompt,
      data: result.data,
      resumeToken: state.resumeToken
    };
  }
  
  // Store output
  if (stage.output) {
    state.outputs[stage.output] = result;
    state.variables[stage.output] = result;
  }
  
  return { status: 'completed', stage: stage.id, result };
}

/**
 * Execute pipeline
 */
export async function executePipeline(pipeline, options = {}) {
  const pipelineId = `pipeline_${uuidv4().substring(0, 8)}`;
  const state = new PipelineState(pipelineId, pipeline.name);
  state.variables = { ...pipeline.variables, ...options.variables };
  state.variables.datetime = new Date().toISOString();
  state.variables.job_id = options.jobId || pipelineId;
  state.workspace = options.workspace || join(WORKSPACE, pipelineId);
  
  await mkdir(state.workspace, { recursive: true });
  
  const startTime = Date.now();
  
  try {
    for (let i = 0; i < pipeline.stages.length; i++) {
      const stage = pipeline.stages[i];
      state.currentStage = i;
      
      console.log(`Executing stage ${i + 1}/${pipeline.stages.length}: ${stage.id} (${stage.type})`);
      
      const result = await executeStage(stage, state, { pipeline });
      
      if (result.status === 'needs_approval') {
        state.resumeToken = `pipeline_${pipelineId}_${stage.id}`;
        state.status = 'awaiting_approval';
        await state.save();
        return {
          protocolVersion: 1,
          ok: true,
          status: 'needs_approval',
          pipeline: pipeline.name,
          stages_completed: i,
          total_stages: pipeline.stages.length,
          requiresApproval: {
            prompt: result.prompt,
            data: result.data,
            resumeToken: state.resumeToken
          }
        };
      }
      
      // Handle conditional stages (on_approve/on_reject branches)
      if (stage.on_approve || stage.on_reject) {
        // Skip branch stages for now - would need more complex logic
      }
    }
    
    state.status = 'completed';
    await state.save();
    
    return {
      protocolVersion: 1,
      ok: true,
      status: 'completed',
      pipeline: pipeline.name,
      stages_completed: pipeline.stages.length,
      outputs: state.outputs,
      duration_ms: Date.now() - startTime
    };
    
  } catch (error) {
    state.status = 'failed';
    state.error = error.message;
    await state.save();
    
    return {
      protocolVersion: 1,
      ok: false,
      status: 'failed',
      pipeline: pipeline.name,
      stages_completed: state.currentStage,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Resume pipeline after approval
 */
export async function resumePipeline(resumeToken, approve = true, reason = null) {
  const parts = resumeToken.split('_');
  if (parts.length < 3) throw new Error('Invalid resume token');
  
  const pipelineId = parts[1];
  const state = await PipelineState.load(pipelineId);
  
  if (state.status !== 'awaiting_approval') {
    throw new Error('Pipeline is not awaiting approval');
  }
  
  state.status = 'running';
  state.resumeToken = null;
  
  if (!approve) {
    // Execute on_reject branch
    const currentStage = state.currentStage;
    const stage = state.stages[currentStage];
    if (stage && stage.on_reject) {
      state.stages.splice(currentStage + 1, 0, ...stage.on_reject);
    }
  }
  // If approved, continue with on_approve branch or next stage
  
  await state.save();
  
  // Re-execute from current stage
  const pipeline = { name: state.name, stages: state.stages, variables: state.variables };
  return executePipeline(pipeline, { 
    jobId: pipelineId,
    workspace: state.workspace,
    variables: state.variables
  });
}

/**
 * Compile/validate pipeline
 */
export async function compilePipeline(pipeline) {
  const errors = [];
  const warnings = [];
  
  // Validate stages
  for (const [i, stage] of pipeline.stages.entries()) {
    if (!stage.id) errors.push(`Stage ${i} missing id`);
    if (!stage.type) errors.push(`Stage ${i} missing type`);
    
    if (!stageExecutors[stage.type]) {
      errors.push(`Stage ${stage.id}: unknown type '${stage.type}'`);
    }
    
    // Validate stage-specific config
    if (stage.type === 'approve' && !stage.config?.prompt) {
      errors.push(`Stage ${stage.id}: approve stage requires prompt`);
    }
    
    if (stage.type === 'send_email' && !stage.config?.to) {
      errors.push(`Stage ${stage.id}: send_email requires 'to' config`);
    }
    
    // Check variable references
    const stageStr = JSON.stringify(stage);
    const varRefs = stageStr.match(/\{\{([^}]+)\}\}/g) || [];
    for (const ref of varRefs) {
      const varName = ref.slice(2, -2).split('.')[0];
      if (!pipeline.variables?.[varName] && !['datetime', 'job_id', 'workspace'].includes(varName)) {
        // Check if it's a stage output
        const isStageOutput = pipeline.stages.slice(0, i).some(s => s.output === varName);
        if (!isStageOutput) {
          warnings.push(`Stage ${stage.id}: variable '${varName}' not defined`);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stages: pipeline.stages.length
  };
}

// CLI interface
if (process.argv[1]?.endsWith('pipeline.js')) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  async function main() {
    if (command === 'run') {
      const source = args[1];
      const pipeline = source.includes('|') 
        ? parseInlinePipeline(source)
        : await parsePipeline(source);
      
      const result = await executePipeline(pipeline);
      console.log(JSON.stringify(result, null, 2));
    } else if (command === 'compile') {
      const source = args[1];
      const pipeline = await parsePipeline(source);
      const result = await compilePipeline(pipeline);
      console.log(JSON.stringify(result, null, 2));
    } else if (command === 'resume') {
      const tokenIndex = args.indexOf('--token');
      const resumeToken = args[tokenIndex + 1];
      const approve = !args.includes('--reject');
      const reason = args[args.indexOf('--reason') + 1] || null;
      
      const result = await resumePipeline(resumeToken, approve, reason);
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('Usage: pipeline <run|compile|resume> [options]');
      process.exit(1);
    }
  }
  
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
