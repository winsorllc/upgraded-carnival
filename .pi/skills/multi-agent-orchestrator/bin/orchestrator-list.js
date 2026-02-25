#!/usr/bin/env node
/**
 * orchestrator-list: List active agents and available agent templates
 */

import { AGENT_TEMPLATES } from '../lib/orchestrator.js';

function printUsage() {
  console.log(`Usage: orchestrator-list [options]

Options:
  --templates          Show available agent templates (default)
  --details            Show full template details
  --json               Output as JSON

Examples:
  orchestrator-list
  orchestrator-list --details
  orchestrator-list --json`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  const showDetails = args.includes('--details');
  const outputJson = args.includes('--json');
  
  if (outputJson) {
    const data = Object.entries(AGENT_TEMPLATES).map(([name, template]) => ({
      name,
      model: template.model,
      temperature: template.temperature,
      maxTokens: template.maxTokens,
      description: template.systemPrompt.split('\n')[0].replace('You are ', '').replace('.', '')
    }));
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }
  
  console.log('AVAILABLE AGENT TEMPLATES');
  console.log('=' .repeat(70));
  console.log();
  
  Object.entries(AGENT_TEMPLATES).forEach(([name, template]) => {
    const shortName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
    const shortDesc = template.systemPrompt.split('\n')[0].replace('You are ', '');
    
    console.log(`${shortName} (${name})`);
    console.log(`  Model: ${template.model}`);
    console.log(`  Temperature: ${template.temperature}`);
    console.log(`  Description: ${shortDesc}`);
    
    if (showDetails) {
      console.log();
      console.log('  System Prompt:');
      console.log('  ' + '-'.repeat(60));
      template.systemPrompt.split('\n').forEach(line => {
        console.log('  ' + line);
      });
      console.log('  ' + '-'.repeat(60));
    }
    
    console.log();
  });
  
  console.log(`\nTotal: ${Object.keys(AGENT_TEMPLATES).length} agent templates`);
  console.log();
  console.log('To use a template:');
  console.log('  orchestrator-delegate --agent <name> --task "..." --input "..."');
  console.log('  orchestrator-parallel --agents "type1,type2" --task "..." --input "..."');
}

main().catch(console.error);
