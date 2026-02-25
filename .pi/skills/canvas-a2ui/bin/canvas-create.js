#!/usr/bin/env node
/**
 * CLI: Create a new canvas
 */

import { canvas_create } from '../index.js';

async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    name: args[0] || `canvas-${Date.now()}`,
    width: parseInt(args.find(a => a.startsWith('--width='))?.split('=')[1]) || 1200,
    height: parseInt(args.find(a => a.startsWith('--height='))?.split('=')[1]) || 800,
    backgroundColor: args.find(a => a.startsWith('--bg='))?.split('=')[1] || '#ffffff'
  };
  
  try {
    const result = await canvas_create(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error creating canvas:', err.message);
    process.exit(1);
  }
}

main();
