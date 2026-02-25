#!/usr/bin/env node
/**
 * CLI: Take canvas screenshot
 */

import { canvas_screenshot, canvas_list } from '../index.js';
import { promises as fs } from 'fs';

async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === '--list') {
    const canvases = await canvas_list();
    console.log('Active canvases:');
    for (const c of canvases) {
      console.log(`  ${c.id}: ${c.width}x${c.height} (${c.elementCount} elements)`);
    }
    return;
  }
  
  const canvasId = args[0];
  const outputPath = args[1] || `/job/tmp/canvases/screenshot-${Date.now()}.png`;
  
  if (!canvasId) {
    console.error('Usage: canvas-screenshot <canvasId> [outputPath]');
    console.error('       canvas-screenshot --list');
    process.exit(1);
  }
  
  try {
    // Ensure output directory exists
    const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
    await fs.mkdir(outputDir, { recursive: true }).catch(() => {});
    
    const result = await canvas_screenshot({ canvasId, outputPath });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error taking screenshot:', err.message);
    process.exit(1);
  }
}

main();
