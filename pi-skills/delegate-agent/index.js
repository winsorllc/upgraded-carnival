#!/usr/bin/env node

// Delegate Agent - Spawn sub-agents for parallel task execution

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

const DELEGATE_DIR = process.env.DELEGATE_DIR || './delegate-data';
const DEFAULT_AGENT = process.env.DEFAULT_DELEGATE_AGENT || 'pi';
const MAX_PARALLEL = parseInt(process.env.MAX_PARALLEL_AGENTS || '3');
const DEFAULT_TIMEOUT = parseInt(process.env.SUB_AGENT_TIMEOUT_SECONDS || '300') * 1000;

// Ensure directory exists
if (!existsSync(DELEGATE_DIR)) mkdirSync(DELEGATE_DIR, { recursive: true });

// Active agents
const activeAgents = new Map();

// Agent configurations
const AGENT_CONFIGS = {
  pi: {
    name: 'Pi Coding Agent',
    command: 'pi',
    args: (prompt) => ['--prompt', prompt],
    env: {}
  },
  claude: {
    name: 'Claude Code',
    command: 'claude',
    args: (prompt) => ['-p', prompt],
    env: {}
  },
  custom: {
    name: 'Custom Agent',
    command: process.env.CUSTOM_AGENT_COMMAND || 'echo',
    args: (prompt) => [prompt],
    env: {}
  }
};

function generateAgentId() {
  return 'delegate-' + createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .substring(0, 12);
}

function getStatePath(agentId) {
  return join(DELEGATE_DIR, `${agentId}.json`);
}

function saveState(agentId, state) {
  writeFileSync(getStatePath(agentId), JSON.stringify(state, null, 2));
}

function loadState(agentId) {
  const path = getStatePath(agentId);
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8'));
  }
  return null;
}

function cleanupState(agentId) {
  const path = getStatePath(agentId);
  if (existsSync(path)) {
    const fs = require('fs');
    fs.unlinkSync(path);
  }
}

async function runAgent(agentId, agentType, prompt, options = {}) {
  const config = AGENT_CONFIGS[agentType] || AGENT_CONFIGS.custom;
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  
  const state = {
    id: agentId,
    type: agentType,
    prompt,
    status: 'starting',
    startedAt: new Date().toISOString(),
    timeout
  };
  
  saveState(agentId, state);
  activeAgents.set(agentId, state);
  
  return new Promise((resolve, reject) => {
    const child = spawn(config.command, config.args(prompt), {
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      // Update state with output
      state.status = 'running';
      state.output = stdout.substring(0, 100000); // Limit stored output
      saveState(agentId, state);
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      state.error = stderr.substring(0, 10000);
      saveState(agentId, state);
    });
    
    const timeoutHandle = setTimeout(() => {
      child.kill('SIGTERM');
      state.status = 'timeout';
      state.error = `Agent timed out after ${timeout}ms`;
      saveState(agentId, state);
      resolve(state);
    }, timeout);
    
    child.on('close', (code) => {
      clearTimeout(timeoutHandle);
      state.status = code === 0 ? 'completed' : 'failed';
      state.exitCode = code;
      state.output = stdout;
      state.finishedAt = new Date().toISOString();
      state.duration = state.startedAt ? Date.now() - new Date(state.startedAt).getTime() : 0;
      saveState(agentId, state);
      activeAgents.delete(agentId);
      resolve(state);
    });
    
    child.on('error', (err) => {
      clearTimeout(timeoutHandle);
      state.status = 'error';
      state.error = err.message;
      state.finishedAt = new Date().toISOString();
      saveState(agentId, state);
      activeAgents.delete(agentId);
      reject(err);
    });
    
    state.status = 'running';
    state.process = child;
    saveState(agentId, state);
  });
}

// CLI Commands
const cmd = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (cmd) {
    case 'run': {
      const agentType = args[0] || DEFAULT_AGENT;
      const promptStartIdx = args.findIndex(a => a.startsWith('"'));
      const promptEndIdx = args.findLastIndex(a => a.endsWith('"'));
      
      let prompt = args.slice(1).join(' ');
      // Clean up quotes
      if (prompt.startsWith('"') && prompt.endsWith('"')) {
        prompt = prompt.slice(1, -1);
      }
      
      const timeoutIdx = args.indexOf('--timeout');
      const timeout = timeoutIdx >= 0 && timeoutIdx + 1 < args.length 
        ? parseInt(args[timeoutIdx + 1]) * 1000 
        : DEFAULT_TIMEOUT;
      
      if (!prompt) {
        console.error('Usage: delegate run <agent> "<prompt>" [--timeout <seconds>]');
        process.exit(1);
      }
      
      const agentId = generateAgentId();
      console.log(`Starting agent: ${agentId} (${agentType})`);
      
      try {
        const result = await runAgent(agentId, agentType, prompt, { timeout });
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
      break;
    }
      
    case 'spawn': {
      const count = parseInt(args[0]);
      const agentType = args[1] || DEFAULT_AGENT;
      const promptIdx = args.indexOf('"');
      
      let prompt = args.slice(2).join(' ');
      if (prompt.startsWith('"') && prompt.endsWith('"')) {
        prompt = prompt.slice(1, -1);
      }
      
      if (!count || !prompt) {
        console.error('Usage: delegate spawn <count> <agent> "<prompt>" [--timeout <seconds>]');
        process.exit(1);
      }
      
      if (count > MAX_PARALLEL) {
        console.error(`Max parallel agents is ${MAX_PARALLEL}`);
        process.exit(1);
      }
      
      console.log(`Spawning ${count} agents...`);
      
      const agents = [];
      for (let i = 0; i < count; i++) {
        const agentId = generateAgentId();
        agents.push(agentId);
        runAgent(agentId, agentType, prompt).catch(console.error);
      }
      
      console.log('Spawned agents:', agents.join(', '));
      break;
    }
      
    case 'list': {
      if (activeAgents.size === 0) {
        console.log('No active agents');
        break;
      }
      
      console.log('Active agents:');
      for (const [id, agent] of activeAgents) {
        console.log(`  [${id}] ${agent.type} - ${agent.status}`);
      }
      break;
    }
      
    case 'kill': {
      const agentId = args[0];
      if (!agentId) {
        console.error('Usage: delegate kill <agent_id>');
        process.exit(1);
      }
      
      const agent = activeAgents.get(agentId);
      if (!agent) {
        console.error('Agent not found:', agentId);
        process.exit(1);
      }
      
      if (agent.process) {
        agent.process.kill('SIGTERM');
      }
      
      agent.status = 'killed';
      saveState(agentId, agent);
      activeAgents.delete(agentId);
      
      console.log('Agent killed:', agentId);
      break;
    }
      
    case 'wait': {
      const agentIds = args;
      if (agentIds.length === 0) {
        console.error('Usage: delegate wait <agent_ids...>');
        process.exit(1);
      }
      
      console.log('Waiting for agents:', agentIds.join(', '));
      
      const results = [];
      for (const id of agentIds) {
        // Poll until complete
        while (true) {
          const state = loadState(id);
          if (!state) {
            results.push({ id, status: 'not_found' });
            break;
          }
          if (state.status === 'completed' || state.status === 'failed' || state.status === 'timeout' || state.status === 'killed') {
            results.push(state);
            break;
          }
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      console.log('Results:');
      console.log(JSON.stringify(results, null, 2));
      break;
    }
      
    case 'status': {
      const agentId = args[0];
      if (!agentId) {
        console.error('Usage: delegate status <agent_id>');
        process.exit(1);
      }
      
      const state = loadState(agentId);
      if (!state) {
        console.error('Agent not found:', agentId);
        process.exit(1);
      }
      
      console.log(JSON.stringify(state, null, 2));
      break;
    }
      
    default:
      console.log(`Delegate Agent

Usage: delegate <command> [args...]

Commands:
  run <agent> "<prompt>" [--timeout <seconds>]
    Delegate a task to a sub-agent
  spawn <count> <agent> "<prompt>" [--timeout <seconds>]
    Spawn multiple agents for parallel work
  list
    List all running sub-agents
  kill <agent_id>
    Terminate a running sub-agent
  wait <agent_ids...>
    Wait for specific agents to complete
  status <agent_id>
    Get status of a specific agent

Agents:
  pi         - Pi coding agent
  claude     - Claude Code
  custom     - Custom agent (set CUSTOM_AGENT_COMMAND)

Environment Variables:
  DEFAULT_DELEGATE_AGENT: Default agent type (default: pi)
  MAX_PARALLEL_AGENTS: Max parallel agents (default: 3)
  SUB_AGENT_TIMEOUT_SECONDS: Default timeout (default: 300)
`);
      process.exit(1);
  }
}

main().catch(console.error);
