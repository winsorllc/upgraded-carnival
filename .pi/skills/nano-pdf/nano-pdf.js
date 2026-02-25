#!/usr/bin/env node

/**
 * nano-pdf CLI Wrapper
 * 
 * Requires: nano-pdf (pip install nano-pdf)
 */

const { execSync } = require('child_process');

const NANOPDF_BIN = 'nano-pdf';
const args = process.argv.slice(2);
const command = args[0];

function checkNanoPdf() {
  try {
    execSync(`${NANOPDF_BIN} --version`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

async function run() {
  if (!checkNanoPdf()) {
    console.error('Error: nano-pdf not found');
    console.error('Install: pip install nano-pdf');
    process.exit(1);
  }
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  let cmd = NANOPDF_BIN;
  
  switch (command) {
    case 'edit':
      if (args.length < 3) {
        console.error('Usage: nano-pdf edit <pdf> <page> "<instruction>"');
        process.exit(1);
      }
      cmd += ` edit ${args[1]} ${args[2]} "${args.slice(3).join(' ')}"`;
      break;
    
    case 'version':
    case '--version':
    case '-v':
      cmd += ' --version';
      break;
    
    default:
      cmd += ` ${args.join(' ')}`;
  }
  
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
nano-pdf CLI

Usage:
  nano-pdf edit <pdf> <page> "<instruction>"  Edit a PDF page

Examples:
  nano-pdf edit document.pdf 0 "Change title to 'My Doc'"
  nano-pdf edit report.pdf 2 "Fix the typo"

Install:
  pip install nano-pdf
  # or
  uv install nano-pdf
`);
}

run();
