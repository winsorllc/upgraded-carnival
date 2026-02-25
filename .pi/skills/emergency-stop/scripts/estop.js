#!/usr/bin/env node
/**
 * Emergency Stop - Emergency stop system
 */
const fs = require('fs');
const path = require('path');

const ESTOP_FILE = path.join(process.cwd(), '.estop.state');

function writeState(state) {
  fs.writeFileSync(ESTOP_FILE, JSON.stringify(state, null, 2));
}

function readState() {
  if (fs.existsSync(ESTOP_FILE)) {
    return JSON.parse(fs.readFileSync(ESTOP_FILE, 'utf8'));
  }
  return { active: false, level: null, targets: [], since: null };
}

function parseArgs(args) {
  const result = { command: null, level: null, domain: null, tool: null };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--level': result.level = args[++i]; break;
      case '--domain': result.domain = args[++i]; break;
      case '--tool': result.tool = args[++i]; break;
      case '--resume': result.command = 'resume'; break;
      case '--status': result.command = 'status'; break;
    }
  }
  
  if (result.level) result.command = 'stop';
  
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.command) {
    console.log('Emergency Stop');
    console.log('Usage: estop.js --level <kill-all|network-kill|domain-block|tool-freeze> [--domain <d>] [--tool <t>]');
    console.log('       estop.js --resume');
    console.log('       estop.js --status');
    process.exit(1);
  }
  
  switch (args.command) {
    case 'stop': {
      const state = {
        active: true,
        level: args.level,
        targets: args.domain ? [args.domain] : args.tool ? [args.tool] : [],
        since: new Date().toISOString()
      };
      
      writeState(state);
      
      console.log('╔═══════════════════════════════════╗');
      console.log('║     🚨 EMERGENCY STOP ENGAGED 🚨  ║');
      console.log('╚═══════════════════════════════════╝');
      console.log('');
      console.log(`Level: ${args.level.toUpperCase()}`);
      if (args.domain) console.log(`Domain: ${args.domain}`);
      if (args.tool) console.log(`Tool: ${args.tool}`);
      console.log('');
      console.log('All operations have been stopped.');
      console.log('Run with --resume to resume operations.');
      break;
    }
    
    case 'resume': {
      const state = readState();
      
      if (!state.active) {
        console.log('No emergency stop is currently active.');
        process.exit(0);
      }
      
      fs.unlinkSync(ESTOP_FILE);
      
      console.log('╔═══════════════════════════════════╗');
      console.log('║     ✅ EMERGENCY STOP RELEASED    ║');
      console.log('╚═══════════════════════════════════╝');
      console.log('');
      console.log('Operations have resumed.');
      console.log(`Was stopped since: ${state.since}`);
      break;
    }
    
    case 'status': {
      const state = readState();
      
      if (state.active) {
        console.log('╔═══════════════════════════════════╗');
        console.log('║  ⚠️  EMERGENCY STOP IS ACTIVE     ║');
        console.log('╚═══════════════════════════════════╝');
        console.log('');
        console.log(`Level: ${state.level}`);
        console.log(`Targets: ${state.targets.join(', ') || 'All'}`);
        console.log(`Since: ${state.since}`);
      } else {
        console.log('Emergency Stop Status');
        console.log('═════════════════════');
        console.log('State: INACTIVE');
        console.log('All systems operational.');
      }
      break;
    }
  }
}

main();