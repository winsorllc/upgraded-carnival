#!/usr/bin/env node
/**
 * orchestrator-parallel: Run multiple agents in parallel and aggregate results
 * 
 * Usage: orchestrator-parallel --agents "type1,type2,type3" --task "task" --input "content"
 *    or: orchestrator-parallel --config workflow.json
 */

import { MultiAgentOrchestrator, AGENT_TEMPLATES } from '../lib/orchestrator.js';
import { readFileSync } from 'fs';
import path from 'path';

function printUsage() {
  console.log(`Usage: orchestrator-parallel [options]

Options:
  --agents <types>      Comma-separated agent types (required if --config not used)
  --tasks <json>       JSON array of task objects (alternative to --agents)
  --task <desc>        Task description for all agents
  --input <content>   Input content
  --file <path>       Path to input file
  --config <path>      Path to workflow JSON file
  --aggregate <mode>   Aggregation mode: synthesize (default), concatenate, vote, rank, diff
  --context <json>    JSON context object
  --output <path>     Save results to file
  --list-agents        List available agent types

Available Agent Types:`);
  
  Object.keys(AGENT_TEMPLATES).forEach(type => {
    console.log(`  - ${type}`);
  });
  
  console.log(`
Examples:
  # Parallel code review with synthesis
  orchestrator-parallel --agents "security-analyst,code-specialist" \\
    --task "Review authentication code" --file auth.js

  # Multi-perspective analysis with specific tasks
  orchestrator-parallel --tasks '[
    {"agentType":"security-analyst","task":"Check for vulnerabilities"},
    {"agentType":"code-specialist","task":"Review code quality"}
  ]' --input "function login() { ... }"

  # Run from config file
  orchestrator-parallel --config workflow.json --output results.json

Aggregation Modes:
  synthesize   - Merge results intelligently (default)
  concatenate  - Join all results
  vote         - Determine consensus
  rank         - Order by confidence
  diff         - Highlight agreements/disagreements`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  if (args.includes('--list-agents')) {
    printUsage();
    process.exit(0);
  }
  
  // Parse arguments
  const options = {};
  let configData = null;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--agents':
        options.agents = nextArg?.split(',').map(a => a.trim());
        i++;
        break;
      case '--tasks':
        try {
          options.tasks = JSON.parse(nextArg);
        } catch (e) {
          console.error('Error: --tasks must be valid JSON array');
          process.exit(1);
        }
        i++;
        break;
      case '--task':
        options.task = nextArg;
        i++;
        break;
      case '--input':
        options.input = nextArg;
        i++;
        break;
      case '--file':
        options.file = nextArg;
        i++;
        break;
      case '--config':
        try {
          configData = JSON.parse(readFileSync(path.resolve(nextArg), 'utf8'));
        } catch (e) {
          console.error(`Error reading config: ${e.message}`);
          process.exit(1);
        }
        i++;
        break;
      case '--aggregate':
        options.aggregateMode = nextArg;
        i++;
        break;
      case '--context':
        try {
          options.context = JSON.parse(nextArg || '{}');
        } catch (e) {
          options.context = {};
        }
        i++;
        break;
      case '--output':
        options.output = nextArg;
        i++;
        break;
    }
  }
  
  // Apply config file data if present
  if (configData) {
    options.tasks = configData.tasks || options.tasks;
    options.task = configData.task || options.task;
    options.aggregateMode = configData.aggregateMode || options.aggregateMode;
    options.context = { ...options.context, ...(configData.context || {}) };
  }
  
  // Build tasks array from various sources
  let tasks = [];
  
  if (options.tasks) {
    // Tasks array provided directly
    tasks = options.tasks.map(t => ({
      agentType: t.agentType || t.agent,
      task: t.task || t.taskDescription || options.task,
      context: { ...options.context, ...(t.context || {}) }
    }));
  } else if (options.agents) {
    // Agents list provided - create tasks for each
    if (!options.task) {
      console.error('Error: --task is required when using --agents');
      printUsage();
      process.exit(1);
    }
    tasks = options.agents.map(agentType => ({
      agentType,
      task: options.task,
      context: options.context || {}
    }));
  } else {
    console.error('Error: Either --agents, --tasks, or --config is required');
    printUsage();
    process.exit(1);
  }
  
  // Get input content
  if (options.file) {
    try {
      options.input = readFileSync(path.resolve(options.file), 'utf8');
    } catch (e) {
      console.error(`Error reading file: ${e.message}`);
      process.exit(1);
    }
  }
  
  if (!options.input && !options.file) {
    console.error('Error: Either --input or --file is required');
    printUsage();
    process.exit(1);
  }
  
  // Validate all agent types
  for (const task of tasks) {
    if (!AGENT_TEMPLATES[task.agentType]) {
      console.error(`Error: Unknown agent type "${task.agentType}"`);
      console.log('\nAvailable types:');
      Object.keys(AGENT_TEMPLATES).forEach(t => console.log(`  - ${t}`));
      process.exit(1);
    }
  }
  
  // Execute parallel delegation
  console.log(`🤖 Spawning ${tasks.length} agents in parallel...`);
  tasks.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.agentType}: "${t.task}"`);
  });
  console.log();
  console.log(`Input length: ${options.input.length} characters`);
  console.log(`Aggregation mode: ${options.aggregateMode || 'synthesize'}`);
  console.log();
  
  const orchestrator = new MultiAgentOrchestrator();
  
  try {
    const startTime = Date.now();
    const result = await orchestrator.parallelDelegates({
      tasks,
      input: options.input,
      aggregateMode: options.aggregateMode || 'synthesize'
    });
    
    const duration = Date.now() - startTime;
    
    console.log('='.repeat(60));
    console.log('PARALLEL EXECUTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Session ID: ${result.sessionId}`);
    console.log(`Duration: ${Math.round(duration / 1000 * 100) / 100}s`);
    console.log();
    
    // Individual results
    console.log('INDIVIDUAL RESULTS:');
    console.log('-'.repeat(60));
    result.results.forEach((r, i) => {
      const icon = r.success ? '✅' : '❌';
      const duration = r.duration ? `(${Math.round(r.duration / 1000 * 100) / 100}s)` : '';
      console.log(`${icon} Agent ${i + 1} (${r.agent}) ${duration}`);
      if (r.success) {
        console.log(`   Output preview: ${r.output?.substring(0, 100)?.replace(/\n/g, ' ')}...`);
      } else {
        console.log(`   Error: ${r.error}`);
      }
    });
    console.log();
    
    // Aggregated result
    console.log('AGGREGATED OUTPUT:');
    console.log('='.repeat(60));
    console.log(result.aggregated.output);
    console.log('='.repeat(60));
    
    // Save to file if requested
    if (options.output) {
      const outputData = {
        sessionId: result.sessionId,
        duration,
        config: {
          tasks,
          aggregateMode: options.aggregateMode || 'synthesize'
        },
        individualResults: result.results,
        aggregated: result.aggregated,
        timestamp: new Date().toISOString()
      };
      
      const fs = await import('fs');
      fs.writeFileSync(options.output, JSON.stringify(outputData, null, 2));
      console.log(`\n💾 Results saved to: ${options.output}`);
    }
    
    console.log();
    console.log(`View full session: orchestrator-results --session ${result.sessionId}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Parallel execution failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);
