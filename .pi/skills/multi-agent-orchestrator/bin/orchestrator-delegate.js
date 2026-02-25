#!/usr/bin/env node
/**
 * orchestrator-delegate: Delegate a single task to a specialized agent
 * 
 * Usage: orchestrator-delegate --agent <agent-type> --task "task description" --input "input content"
 *    or: orchestrator-delegate --agent <agent-type> --task "task description" --file <path>
 */

import { MultiAgentOrchestrator, AGENT_TEMPLATES } from '../lib/orchestrator.js';
import { readFileSync } from 'fs';
import path from 'path';

function printUsage() {
  console.log(`Usage: orchestrator-delegate [options]

Options:
  --agent <type>         Agent type (required)
  --task <description>  Task description (required)
  --input <content>    Input content (either --input or --file required)
  --file <path>        Path to input file (alternative to --input)
  --context <json>      JSON context object (optional)
  --timeout <seconds>  Timeout in seconds (default: 120)
  --list-agents         List available agent types

Available Agent Types:`);
  
  Object.keys(AGENT_TEMPLATES).forEach(type => {
    console.log(`  - ${type}`);
  });
  
  console.log(`
Examples:
  orchestrator-delegate --agent code-specialist --task "Review for bugs" --input "const x = 1;"
  orchestrator-delegate --agent security-analyst --task "Check vulnerabilities" --file src/app.js
  orchestrator-delegate --agent creative-writer --task "Improve this README" --file README.md --context '{"tone": "professional"}'`);
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
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--agent':
        options.agentType = nextArg;
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
      case '--context':
        options.context = JSON.parse(nextArg || '{}');
        i++;
        break;
      case '--timeout':
        options.timeout = parseInt(nextArg, 10);
        i++;
        break;
    }
  }
  
  // Validate required arguments
  if (!options.agentType) {
    console.error('Error: --agent is required');
    printUsage();
    process.exit(1);
  }
  
  if (!options.task) {
    console.error('Error: --task is required');
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
  } else if (!options.input) {
    console.error('Error: Either --input or --file is required');
    printUsage();
    process.exit(1);
  }
  
  // Execute delegation
  console.log(`🤖 Delegating to ${options.agentType}...`);
  console.log(`   Task: ${options.task}`);
  console.log(`   Input length: ${options.input.length} characters`);
  console.log();
  
  const orchestrator = new MultiAgentOrchestrator();
  
  try {
    const startTime = Date.now();
    const result = await orchestrator.delegateTask({
      agentType: options.agentType,
      task: options.task,
      input: options.input,
      context: options.context || {},
      timeout: options.timeout || 120
    });
    
    const duration = Date.now() - startTime;
    
    console.log('='.repeat(60));
    console.log('DELEGATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Session ID: ${result.sessionId}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Status: ${result.result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log();
    
    if (result.result.output) {
      console.log('OUTPUT:');
      console.log('-'.repeat(60));
      console.log(result.result.output);
      console.log('-'.repeat(60));
    }
    
    if (result.result.error) {
      console.log('ERROR:');
      console.log(result.result.error);
    }
    
    // Save session reference
    console.log();
    console.log(`Full session saved. View with: orchestrator-results --session ${result.sessionId}`);
    
    process.exit(result.result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Delegation failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
