#!/usr/bin/env node
/**
 * PopeBot Doctor Quick Check
 * Fast health check with exit codes
 */

const path = require('path');
const doctor = require('../index');

async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    category: null
  };
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;
        
      case '--category':
        if (args[i + 1]) {
          options.category = args[i + 1];
          i++;
        }
        break;
    }
  }
  
  try {
    const healthy = await doctor.popebotDoctorCheck(options);
    
    if (healthy) {
      console.log('✅ System healthy');
      process.exit(0);
    } else {
      console.log('❌ System has issues');
      process.exit(1);
    }
    
  } catch (err) {
    console.error('❌ Check failed:', err.message);
    process.exit(2);
  }
}

function printHelp() {
  console.log(`
PopeBot Doctor Quick Check

Usage: popebot-doctor-check [options]

Options:
  -h, --help          Show this help message
  --category NAME     Check specific category only

Exit Codes:
  0                   System healthy
  1                   Issues found
  2                   Check failed

Examples:
  popebot-doctor-check              # Quick health check
  popebot-doctor-check --category skills   # Check skills only
`);
}

main();
