#!/usr/bin/env node

/**
 * nano-pdf - Edit PDFs with natural-language instructions
 * 
 * Usage: nano-pdf.js <command> <pdf-file> [page-number] [instruction]
 * 
 * Commands:
 *   edit <pdf> <page> <instruction>  - Edit a specific page
 *   extract <pdf>                    - Extract text from PDF
 *   list <pdf>                        - List all pages in PDF
 */

const { execSync } = require('child_process');
const path = require('path');

function runNanoPdf(args) {
  try {
    const cmd = ['nano-pdf', ...args].join(' ');
    console.log(`Running: ${cmd}`);
    const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    return { success: true, output: output.trim() };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage:');
    console.error('  nano-pdf.js edit <pdf-file> <page> "<instruction>"');
    console.error('  nano-pdf.js extract <pdf-file>');
    console.error('  nano-pdf.js list <pdf-file>');
    process.exit(1);
  }

  const command = args[0];
  
  switch (command) {
    case 'edit':
      if (args.length < 4) {
        console.error('Error: edit requires <pdf-file>, <page>, and <instruction>');
        process.exit(1);
      }
      const result = runNanoPdf(['edit', args[1], args[2], args.slice(3).join(' ')]);
      console.log(JSON.stringify(result, null, 2));
      break;
      
    case 'extract':
      if (args.length < 2) {
        console.error('Error: extract requires <pdf-file>');
        process.exit(1);
      }
      const extractResult = runNanoPdf(['extract', args[1]]);
      console.log(JSON.stringify(extractResult, null, 2));
      break;
      
    case 'list':
      if (args.length < 2) {
        console.error('Error: list requires <pdf-file>');
        process.exit(1);
      }
      const listResult = runNanoPdf(['list', args[1]]);
      console.log(JSON.stringify(listResult, null, 2));
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Available commands: edit, extract, list');
      process.exit(1);
  }
}

// Only run main when executed directly, not when required
if (require.main === module) {
  main();
}
