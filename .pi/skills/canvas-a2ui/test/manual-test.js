#!/usr/bin/env node
/**
 * Manual Test - Canvas A2UI Skill Demo
 * 
 * This test creates a comprehensive diagram demonstrating all Canvas A2UI features:
 * - Shapes (rectangles, circles, arrows)
 * - Text with different fonts
 * - System architecture diagram
 * - Screenshot export
 */

import { 
  canvas_create, 
  canvas_draw, 
  canvas_text,
  canvas_screenshot, 
  canvas_close 
} from '../index.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = '/job/tmp/canvases';

async function ensureDirectory(path) {
  await fs.mkdir(path, { recursive: true }).catch(() => {});
}

async function runDemo() {
  console.log('═'.repeat(70));
  console.log('Canvas A2UI Skill - Manual Test Demo');
  console.log('═'.repeat(70));
  
  await ensureDirectory(outputDir);
  
  // Create canvas for architecture diagram
  console.log('\n📋 Step 1: Creating canvas...');
  const canvas = await canvas_create({
    name: 'demo-architecture',
    width: 1400,
    height: 900,
    backgroundColor: '#f8f9fa'
  });
  console.log(`   ✓ Canvas created: ${canvas.id} (${canvas.width}x${canvas.height})`);
  
  // Draw title
  console.log('\n📋 Step 2: Drawing title...');
  await canvas_draw({
    canvasId: canvas.id,
    commands: [
      { type: 'rect', x: 50, y: 30, width: 1300, height: 60, fill: '#2c3e50' },
      { type: 'text', x: 700, y: 70, text: 'Canvas A2UI Demo - PopeBot Visual Workspace', font: 'bold 24px Arial', fill: '#ffffff', align: 'center' }
    ]
  });
  console.log('   ✓ Title drawn');
  
  // Draw architecture diagram
  console.log('\n📋 Step 3: Drawing system architecture...');
  
  const components = [
    // Edge/Gateway Tier
    { x: 200, y: 200, color: '#4A90D9', label: 'Event Handler', sublabel: 'Gateway Layer' },
    { x: 700, y: 200, color: '#4A90D9', label: 'Web UI', sublabel: 'Frontend' },
    
    // Processing Tier  
    { x: 200, y: 400, color: '#5CB85C', label: 'GitHub Actions', sublabel: 'CI/CD' },
    { x: 700, y: 400, color: '#5CB85C', label: 'Docker Agent', sublabel: 'Job Runner' },
    
    // Data Tier
    { x: 450, y: 600, color: '#F0AD4E', label: 'Hybrid Memory', sublabel: 'Vector + FTS5' },
    { x: 200, y: 600, color: '#D9534F', label: 'Skills', sublabel: '.pi/skills/' },
    { x: 700, y: 600, color: '#D9534F', label: 'Canvas A2UI', sublabel: 'Visual Workspace' }
  ];
  
  const commands = [];
  
  for (const comp of components) {
    // Component box
    commands.push({
      type: 'rect',
      x: comp.x,
      y: comp.y,
      width: 200,
      height: 100,
      fill: comp.color,
      stroke: '#2c3e50',
      strokeWidth: 2
    });
    
    // Main label
    commands.push({
      type: 'text',
      x: comp.x + 100,
      y: comp.y + 40,
      text: comp.label,
      font: 'bold 14px Arial',
      fill: '#ffffff',
      align: 'center'
    });
    
    // Sub-label
    commands.push({
      type: 'text',
      x: comp.x + 100,
      y: comp.y + 65,
      text: comp.sublabel,
      font: '11px Arial',
      fill: 'rgba(255,255,255,0.9)',
      align: 'center'
    });
  }
  
  // Add connection arrows
  const connections = [
    { from: { x: 300, y: 300 }, to: { x: 300, y: 400 }, label: 'create job' },
    { from: { x: 700, y: 300 }, to: { x: 800, y: 400 }, label: 'monitor' },
    { from: { x: 300, y: 500 }, to: { x: 450, y: 600 }, label: 'store' },
    { from: { x: 800, y: 500 }, to: { x: 700, y: 600 }, label: 'render' },
    { from: { x: 300, y: 500 }, to: { x: 200, y: 600 }, label: 'load' },
    { from: { x: 450, y: 300 }, to: { x: 700, y: 300 }, label: 'API' }
  ];
  
  for (const conn of connections) {
    commands.push({
      type: 'arrow',
      fromX: conn.from.x,
      fromY: conn.from.y,
      toX: conn.to.x,
      toY: conn.to.y,
      stroke: '#777',
      fill: '#777',
      strokeWidth: 2
    });
    
    // Connection label
    const midX = (conn.from.x + conn.to.x) / 2;
    const midY = (conn.from.y + conn.to.y) / 2 - 10;
    commands.push({
      type: 'text',
      x: midX,
      y: midY,
      text: conn.label,
      font: '10px Arial',
      fill: '#666',
      align: 'center'
    });
  }
  
  // Add tier labels
  commands.push(
    { type: 'text', x: 20, y: 155, text: 'GATEWAY', font: 'bold 12px Arial', fill: '#777' },
    { type: 'text', x: 20, y: 355, text: 'COMPUTE', font: 'bold 12px Arial', fill: '#777' },
    { type: 'text', x: 20, y: 555, text: 'DATA', font: 'bold 12px Arial', fill: '#777' }
  );
  
  // Add divider lines
  commands.push(
    { type: 'line', x1: 50, y1: 330, x2: 1350, y2: 330, stroke: '#ddd', strokeWidth: 1, dash: [5, 5] },
    { type: 'line', x1: 50, y1: 530, x2: 1350, y2: 530, stroke: '#ddd', strokeWidth: 1, dash: [5, 5] }
  );
  
  await canvas_draw({ canvasId: canvas.id, commands });
  console.log(`   ✓ Drew ${components.length} components with ${connections.length} connections`);
  
  // Add feature highlight box
  console.log('\n📋 Step 4: Adding feature highlights...');
  await canvas_draw({
    canvasId: canvas.id,
    commands: [
      { type: 'rect', x: 950, y: 150, width: 400, height: 400, fill: '#ffffff', stroke: '#ddd', strokeWidth: 1 },
      { type: 'text', x: 960, y: 175, text: 'Canvas A2UI Features', font: 'bold 16px Arial', fill: '#2c3e50', align: 'left' },
      { type: 'text', x: 960, y: 205, text: '• Shapes: rect, circle, arrow', font: '13px Arial', fill: '#555', align: 'left' },
      { type: 'text', x: 960, y: 230, text: '• Text with fonts & alignment', font: '13px Arial', fill: '#555', align: 'left' },
      { type: 'text', x: 960, y: 255, text: '• Image rendering support', font: '13px Arial', fill: '#555', align: 'left' },
      { type: 'text', x: 960, y: 280, text: '• Chart.js integration', font: '13px Arial', fill: '#555', align: 'left' },
      { type: 'text', x: 960, y: 305, text: '• Flowchart generation', font: '13px Arial', fill: '#555', align: 'left' },
      { type: 'text', x: 960, y: 330, text: '• System diagrams', font: '13px Arial', fill: '#555', align: 'left' },
      { type: 'text', x: 960, y: 355, text: '• PNG/PNG export', font: '13px Arial', fill: '#555', align: 'left' },
      { type: 'text', x: 960, y: 380, text: '• A2UI Protocol', font: '13px Arial', fill: '#555', align: 'left' },
      { type: 'text', x: 960, y: 505, text: 'OpenClaw inspired', font: 'bold 14px Arial', fill: '#4A90D9', align: 'left' },
      { type: 'text', x: 960, y: 530, text: 'Agent-to-UI visual workspace', font: '13px Arial', fill: '#777', align: 'left' }
    ]
  });
  console.log('   ✓ Feature highlights added');
  
  // Draw legend
  console.log('\n📋 Step 5: Adding color legend...');
  await canvas_draw({
    canvasId: canvas.id,
    commands: [
      { type: 'rect', x: 950, y: 700, width: 400, height: 150, fill: '#ffffff', stroke: '#ddd', strokeWidth: 1 },
      { type: 'text', x: 960, y: 730, text: 'Color Legend', font: 'bold 14px Arial', fill: '#2c3e50', align: 'left' },
      
      { type: 'rect', x: 970, y: 750, width: 30, height: 20, fill: '#4A90D9' },
      { type: 'text', x: 1010, y: 765, text: 'Gateway / Edge', font: '12px Arial', fill: '#333', align: 'left' },
      
      { type: 'rect', x: 970, y: 780, width: 30, height: 20, fill: '#5CB85C' },
      { type: 'text', x: 1010, y: 795, text: 'Compute / App', font: '12px Arial', fill: '#333', align: 'left' },
      
      { type: 'rect', x: 970, y: 810, width: 30, height: 20, fill: '#F0AD4E' },
      { type: 'text', x: 1010, y: 825, text: 'Memory / Data', font: '12px Arial', fill: '#333', align: 'left' }
    ]
  });
  console.log('   ✓ Legend added');
  
  // Take screenshot
  console.log('\n📋 Step 6: Taking screenshot...');
  const outputPath = join(outputDir, 'canvas-a2ui-demo.png');
  const screenshot = await canvas_screenshot({
    canvasId: canvas.id,
    outputPath
  });
  console.log(`   ✓ Screenshot saved: ${screenshot.path}`);
  console.log(`   📊 File size: ${(screenshot.size / 1024).toFixed(1)} KB`);
  
  // Close canvas
  console.log('\n📋 Step 7: Cleanup...');
  await canvas_close({ canvasId: canvas.id });
  console.log('   ✓ Canvas closed');
  
  console.log('\n' + '═'.repeat(70));
  console.log('✅ Demo complete!');
  console.log('═'.repeat(70));
  console.log(`\n📁 Output: ${outputPath}`);
  console.log('\nTo view the result, the output is at:');
  console.log(`   ${outputPath}`);
}

runDemo().catch(err => {
  console.error('❌ Demo failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
