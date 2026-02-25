#!/usr/bin/env node
// Pipeline CLI - Command-line interface

import { parsePipeline, executePipeline, resumePipeline, compilePipeline, parseInlinePipeline } from './pipeline.js';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
Pipeline Orchestrator - Deterministic workflows with approval gates

Usage:
  pipeline run <source> [options]    Run a pipeline
  pipeline compile <file>            Validate pipeline syntax
  pipeline resume --token <token>    Resume after approval
  pipeline plan <file>               Show execution plan
  pipeline list                      List recent pipelines

Options for 'run':
  --var key=value                    Set pipeline variable (repeatable)
  --workspace <path>                 Set workspace directory
  --test                             Run in test mode (no side effects)

Options for 'resume':
  --token <token>                    Resume token from approval gate
  --approve                          Approve and continue (default)
  --reject                           Reject and execute on_reject branch
  --reason <text>                    Reason for rejection

Examples:
  pipeline run ./email-triage.pln
  pipeline run "fetch --url https://api.com | analyze --prompt 'Summarize'"
  pipeline run ./publish.pln --var topic=AI --var recipient=user@example.com
  pipeline resume --token pipeline_abc123 --approve
`);
}

async function main() {
  if (!command || command === 'help' || command === '--help') {
    printHelp();
    return;
  }

  if (command === 'run') {
    const source = args[1];
    if (!source) {
      console.error('Error: Missing pipeline source');
      printHelp();
      process.exit(1);
    }

    // Parse variables
    const variables = {};
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--var' && args[i + 1]) {
        const [key, value] = args[i + 1].split('=');
        variables[key] = value;
        i++;
      }
    }

    try {
      const pipeline = source.includes('|')
        ? parseInlinePipeline(source)
        : await parsePipeline(source);

      const result = await executePipeline(pipeline, { variables });
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Pipeline error:', error.message);
      process.exit(1);
    }
  } else if (command === 'compile') {
    const file = args[1];
    if (!file) {
      console.error('Error: Missing pipeline file');
      process.exit(1);
    }

    try {
      const pipeline = await parsePipeline(file);
      const result = await compilePipeline(pipeline);
      
      if (result.valid) {
        console.log('✓ Pipeline is valid');
        console.log(`  Stages: ${result.stages}`);
        if (result.warnings.length > 0) {
          console.log('\nWarnings:');
          result.warnings.forEach(w => console.log(`  ⚠ ${w}`));
        }
      } else {
        console.log('✗ Pipeline has errors:');
        result.errors.forEach(e => console.log(`  ✗ ${e}`));
        if (result.warnings.length > 0) {
          console.log('\nWarnings:');
          result.warnings.forEach(w => console.log(`  ⚠ ${w}`));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error('Compilation error:', error.message);
      process.exit(1);
    }
  } else if (command === 'resume') {
    const tokenIndex = args.indexOf('--token');
    const resumeToken = tokenIndex > 0 ? args[tokenIndex + 1] : null;
    
    if (!resumeToken) {
      console.error('Error: Missing --token <resume_token>');
      process.exit(1);
    }

    const approve = !args.includes('--reject');
    const reasonIndex = args.indexOf('--reason');
    const reason = reasonIndex > 0 ? args[reasonIndex + 1] : null;

    try {
      const result = await resumePipeline(resumeToken, approve, reason);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Resume error:', error.message);
      process.exit(1);
    }
  } else if (command === 'plan') {
    const file = args[1];
    try {
      const pipeline = await parsePipeline(file);
      console.log(`Pipeline: ${pipeline.name}`);
      console.log(`Version: ${pipeline.version || '1.0'}`);
      console.log(`\nExecution Plan (${pipeline.stages.length} stages):\n`);
      
      pipeline.stages.forEach((stage, i) => {
        console.log(`  ${i + 1}. ${stage.id} (${stage.type})`);
        if (stage.output) console.log(`     → output: ${stage.output}`);
        if (stage.on_approve) console.log(`     → on_approve: ${stage.on_approve.length} stages`);
        if (stage.on_reject) console.log(`     → on_reject: ${stage.on_reject.length} stages`);
      });
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
