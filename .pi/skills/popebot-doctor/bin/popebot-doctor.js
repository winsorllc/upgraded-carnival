#!/usr/bin/env node
/**
 * PopeBot Doctor CLI
 * Main diagnostic command
 */

const path = require('path');
const doctor = require('../index');

async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    categories: [],
    autoRepair: false,
    format: 'object'
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
        
      case '-v':
      case '--version':
        console.log('PopeBot Doctor v' + doctor.version);
        process.exit(0);
        break;
        
      case '--repair':
      case '-r':
        options.autoRepair = true;
        break;
        
      case '--json':
      case '-j':
        options.format = 'json';
        break;
        
      case '--categories':
      case '-c':
        if (args[i + 1]) {
          options.categories = args[i + 1].split(',');
          i++;
        }
        break;
        
      case '--quick':
      case '-q':
        // Quick mode - only critical checks
        options.categories = ['environment', 'api'];
        break;
    }
  }
  
  try {
    const results = await doctor.popebotDoctorRun(options);
    
    if (options.format === 'json') {
      console.log(typeof results === 'string' ? results : JSON.stringify(results, null, 2));
    }
    
    // Exit with error code if errors found
    const resultObj = typeof results === 'string' ? JSON.parse(results) : results;
    process.exit(resultObj.summary.errors > 0 ? 1 : 0);
    
  } catch (err) {
    console.error('❌ Diagnostic failed:', err.message);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
PopeBot Doctor - Environment Diagnostics

Usage: popebot-doctor [options]

Options:
  -h, --help              Show this help message
  -v, --version           Show version
  -r, --repair            Attempt auto-repairs
  -j, --json              Output as JSON
  -c, --categories LIST   Check specific categories (comma-separated)
  -q, --quick             Quick mode (critical checks only)

Categories:
  environment             Node.js, Docker, Git, GitHub CLI
  skills                  Installed skill health
  api                     API connectivity
  config                  Configuration validation
  filesystem              File system checks

Examples:
  popebot-doctor                      # Full diagnostic
  popebot-doctor --quick              # Quick check
  popebot-doctor --repair             # Run with auto-repair
  popebot-doctor -c environment,skills # Check specific categories
  popebot-doctor --json               # JSON output
`);
}

main();
