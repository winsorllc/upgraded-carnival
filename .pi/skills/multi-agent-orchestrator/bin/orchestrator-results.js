#!/usr/bin/env node
/**
 * orchestrator-results: View results from orchestration sessions
 * 
 * Usage: orchestrator-results --session <session-id>
 *    or: orchestrator-results --list
 *    or: orchestrator-results --latest
 */

import { SessionManager } from '../lib/orchestrator.js';

function printUsage() {
  console.log(`Usage: orchestrator-results [options]

Options:
  --session <id>      Show details for specific session
  --list              List all sessions
  --latest            Show most recent session
  --format <format>  Output format: text (default), json, markdown
  --summary           Show brief summary of results
  --delete <id>      Delete a session

Examples:
  orchestrator-results --list
  orchestrator-results --session abc123-def456
  orchestrator-results --latest --format json
  orchestrator-results --latest --summary`);
}

function formatDuration(ms) {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function listSessions(sessions) {
  const allSessions = await sessions.listSessions();
  
  if (allSessions.length === 0) {
    console.log('No sessions found.');
    return;
  }
  
  console.log('ORCHESTRATION SESSIONS');
  console.log('=' .repeat(80));
  console.log();
  
  allSessions.forEach(session => {
    const icon = session.status === 'completed' ? '✅' : 
                 session.status === 'failed' ? '❌' : '⏳';
    const date = new Date(session.createdAt).toLocaleString();
    const taskCount = session.tasks?.length || 0;
    
    console.log(`${icon} ${session.id}`);
    console.log(`   Name: ${session.name || 'unnamed'}`);
    console.log(`   Created: ${date}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Tasks: ${taskCount}`);
    
    if (session.results?.length) {
      const successful = session.results.filter(r => r.success).length;
      console.log(`   Successful: ${successful}/${session.results.length}`);
    }
    console.log();
  });
  
  console.log(`Total: ${allSessions.length} session(s)`);
}

async function showSession(sessions, sessionId, format = 'text', summaryOnly = false) {
  const session = await sessions.getSession(sessionId);
  
  if (!session) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }
  
  if (format === 'json') {
    console.log(JSON.stringify(session, null, 2));
    return;
  }
  
  if (format === 'markdown') {
    console.log(`# Session: ${session.id}

| Field | Value |
|-------|-------|
| Name | ${session.name || 'N/A'} |
| Created | ${session.createdAt} |
| Status | ${session.status} |
| Tasks | ${session.tasks?.length || 0} |

## Results

${session.aggregated?.output || 'No aggregated output'}

## Individual Results

${(session.results || []).map(r => `
### ${r.agent} (${r.success ? '✅' : '❌'})

**Task:** ${r.task}
**Duration:** ${formatDuration(r.duration)}

${r.success ? r.output : `**Error:** ${r.error}`}
`).join('\n---\n')}
`);
    return;
  }
  
  // Text format
  console.log('='.repeat(80));
  console.log('SESSION DETAILS');
  console.log('='.repeat(80));
  console.log();
  console.log(`ID: ${session.id}`);
  console.log(`Name: ${session.name || 'N/A'}`);
  console.log(`Created: ${new Date(session.createdAt).toLocaleString()}`);
  console.log(`Status: ${session.status.toUpperCase()}`);
  console.log();
  
  if (session.metadata) {
    console.log('Metadata:');
    Object.entries(session.metadata).forEach(([key, value]) => {
      if (typeof value === 'object') {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });
    console.log();
  }
  
  console.log('-'.repeat(80));
  console.log('TASKS');
  console.log('-'.repeat(80));
  (session.tasks || []).forEach((task, i) => {
    console.log(`  ${i + 1}. ${task}`);
  });
  console.log();
  
  if (session.results?.length > 0) {
    console.log('-'.repeat(80));
    console.log('INDIVIDUAL RESULTS');
    console.log('-'.repeat(80));
    
    session.results.forEach((result, i) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`\n${icon} Agent: ${result.agent}`);
      console.log(`   Task: ${result.task}`);
      console.log(`   Duration: ${formatDuration(result.duration)}`);
      console.log(`   Agent ID: ${result.agentId || 'N/A'}`);
      
      if (!summaryOnly) {
        if (result.success) {
          console.log('\n   OUTPUT:');
          console.log('   ' + '-'.repeat(60));
          const lines = result.output?.split('\n') || [];
          lines.forEach(line => {
            if (line.trim()) {
              console.log('   ' + line);
            } else {
              console.log();
            }
          });
          console.log('   ' + '-'.repeat(60));
        } else {
          console.log(`\n   ERROR: ${result.error}`);
        }
      }
    });
    console.log();
  }
  
  if (session.aggregated && !summaryOnly) {
    console.log('='.repeat(80));
    console.log('AGGREGATED RESULT');
    console.log('='.repeat(80));
    console.log(`Mode: ${session.aggregated.mode}`);
    console.log(`Agents: ${session.aggregated.agentCount || '?'} (${session.aggregated.successfulAgents || '?'} successful)`);
    console.log();
    console.log('OUTPUT:');
    console.log('-'.repeat(60));
    console.log(session.aggregated.output);
    console.log('-'.repeat(60));
  }
  
  if (summaryOnly && session.aggregated?.output) {
    console.log();
    console.log('SUMMARY:');
    const firstLine = session.aggregated.output.split('\n')[0];
    console.log(firstLine?.substring(0, 100) + '...');
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  const sessions = new SessionManager();
  
  // Parse arguments
  let sessionId = null;
  let listMode = false;
  let latestMode = false;
  let format = 'text';
  let summaryOnly = false;
  let deleteId = null;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--session':
        sessionId = nextArg;
        i++;
        break;
      case '--list':
        listMode = true;
        break;
      case '--latest':
        latestMode = true;
        break;
      case '--format':
        format = nextArg;
        i++;
        break;
      case '--summary':
        summaryOnly = true;
        break;
      case '--delete':
        deleteId = nextArg;
        i++;
        break;
    }
  }
  
  if (listMode) {
    await listSessions(sessions);
    process.exit(0);
  }
  
  if (latestMode) {
    const allSessions = await sessions.listSessions();
    if (allSessions.length === 0) {
      console.log('No sessions found.');
      process.exit(0);
    }
    sessionId = allSessions[0].id;
  }
  
  if (deleteId) {
    const fs = await import('fs');
    const path = await import('path');
    const { SESSIONS_DIR } = await import('../lib/orchestrator.js');
    const filePath = path.join(SESSIONS_DIR, `${deleteId}.json`);
    
    try {
      fs.unlinkSync(filePath);
      console.log(`Session ${deleteId} deleted.`);
    } catch (e) {
      console.error(`Failed to delete session: ${e.message}`);
      process.exit(1);
    }
    process.exit(0);
  }
  
  if (sessionId) {
    await showSession(sessions, sessionId, format, summaryOnly);
    process.exit(0);
  }
  
  console.error('Error: Use --session, --list, --latest, or --delete');
  printUsage();
  process.exit(1);
}

main().catch(console.error);
