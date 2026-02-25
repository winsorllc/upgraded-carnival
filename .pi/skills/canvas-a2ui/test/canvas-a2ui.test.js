/**
 * Canvas A2UI Skill - Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDir = join(dirname(__dirname), 'test');
const outputDir = join('/job/tmp', 'canvas-tests');

// Import the skill
import { 
  canvas_create,
  canvas_draw,
  canvas_screenshot,
  canvas_reset,
  canvas_list,
  canvas_close
} from '../index.js';

// Ensure output directory exists
await fs.mkdir(outputDir, { recursive: true }).catch(() => {});
console.log('Running Canvas A2UI tests...');
console.log('Output directory:', outputDir);

describe('Canvas A2UI Skill', () => {

  describe('canvas_create', () => {
    it('should create a canvas with default dimensions', async () => {
      const result = await canvas_create({ name: 'test-default' });
      assert.ok(result.id, 'Should return canvas id');
      assert.equal(result.width, 800, 'Default width should be 800');
      assert.equal(result.height, 600, 'Default height should be 600');
      
      // Cleanup
      await canvas_close({ canvasId: result.id });
    });

    it('should create a canvas with custom dimensions', async () => {
      const result = await canvas_create({
        name: 'test-custom',
        width: 1200,
        height: 900,
        backgroundColor: '#f0f0f0'
      });
      
      assert.equal(result.width, 1200);
      assert.equal(result.height, 900);
      
      // Cleanup
      await canvas_close({ canvasId: result.id });
    });
  });

  describe('canvas_draw', () => {
    it('should draw shapes on canvas', async () => {
      const canvas = await canvas_create({ name: 'test-draw', width: 400, height: 300 });
      
      const commands = [
        { type: 'rect', x: 50, y: 50, width: 100, height: 80, fill: '#4A90D9' },
        { type: 'circle', x: 200, y: 100, radius: 40, fill: '#5CB85C' },
        { type: 'text', x: 100, y: 200, text: 'Hello Canvas', font: '16px Arial', fill: '#333333' }
      ];
      
      const result = await canvas_draw({ canvasId: canvas.id, commands });
      
      assert.equal(result.executed, 3);
      assert.equal(result.canvasId, canvas.id);
      
      // Cleanup
      await canvas_close({ canvasId: canvas.id });
    });
  });

  describe('canvas_screenshot', () => {
    it('should capture canvas as PNG', async () => {
      const canvas = await canvas_create({ name: 'test-screenshot' });
      
      // Draw something
      await canvas_draw({
        canvasId: canvas.id,
        commands: [
          { type: 'rect', x: 100, y: 100, width: 200, height: 150, fill: '#4A90D9' }
        ]
      });
      
      const outputPath = join(outputDir, 'test-screenshot.png');
      const result = await canvas_screenshot({
        canvasId: canvas.id,
        outputPath
      });
      
      assert.equal(result.saved, true);
      assert.equal(result.path, outputPath);
      
      // Verify file was created
      const stats = await fs.stat(outputPath);
      assert.ok(stats.size > 0, 'Screenshot file should not be empty');
      
      // Cleanup
      await canvas_close({ canvasId: canvas.id });
    });
  });

  describe('canvas_reset', () => {
    it('should clear and reset canvas', async () => {
      const canvas = await canvas_create({ name: 'test-reset' });
      
      // Draw something
      await canvas_draw({
        canvasId: canvas.id,
        commands: [
          { type: 'rect', x: 50, y: 50, width: 100, height: 100, fill: '#FF0000' }
        ]
      });
      
      // Reset
      const result = await canvas_reset({ canvasId: canvas.id, backgroundColor: '#ffffff' });
      assert.equal(result.reset, true);
      
      // Cleanup
      await canvas_close({ canvasId: canvas.id });
    });
  });

  describe('canvas_list', () => {
    it('should list all canvases', async () => {
      const canvas1 = await canvas_create({ name: 'test-list-1' });
      const canvas2 = await canvas_create({ name: 'test-list-2' });
      
      const list = await canvas_list();
      
      assert.ok(Array.isArray(list), 'Should return array');
      assert.ok(list.length >= 2, 'Should have at least 2 canvases');
      
      const ids = list.map(c => c.id);
      assert.ok(ids.includes(canvas1.id), 'Should include canvas1');
      assert.ok(ids.includes(canvas2.id), 'Should include canvas2');
      
      // Cleanup
      await canvas_close({ canvasId: canvas1.id });
      await canvas_close({ canvasId: canvas2.id });
    });
  });

  describe('Integration Test', () => {
    it('should create, draw, screenshot, and close a complete workflow', async () => {
      const canvas = await canvas_create({
        name: 'test-integration',
        width: 600,
        height: 400,
        backgroundColor: '#f8f9fa'
      });

      // Draw a simple diagram
      await canvas_draw({
        canvasId: canvas.id,
        commands: [
          // Header box
          { type: 'rect', x: 50, y: 30, width: 500, height: 40, fill: '#4A90D9' },
          { type: 'text', x: 300, y: 55, text: 'Canvas A2UI Test', font: 'bold 18px Arial', fill: '#ffffff', align: 'center' },
          
          // Main content boxes
          { type: 'rect', x: 50, y: 100, width: 150, height: 100, fill: '#5CB85C' },
          { type: 'text', x: 125, y: 155, text: 'Box 1', font: '14px Arial', fill: '#ffffff', align: 'center' },
          
          { type: 'rect', x: 225, y: 100, width: 150, height: 100, fill: '#F0AD4E' },
          { type: 'text', x: 300, y: 155, text: 'Box 2', font: '14px Arial', fill: '#ffffff', align: 'center' },
          
          { type: 'rect', x: 400, y: 100, width: 150, height: 100, fill: '#D9534F' },
          { type: 'text', x: 475, y: 155, text: 'Box 3', font: '14px Arial', fill: '#ffffff', align: 'center' },
          
          // Connector arrows
          { type: 'arrow', fromX: 200, fromY: 150, toX: 225, toY: 150, stroke: '#777', fill: '#777' },
          { type: 'arrow', fromX: 375, fromY: 150, toX: 400, toY: 150, stroke: '#777', fill: '#777' },
          
          // Footer text
          { type: 'text', x: 300, y: 250, text: 'Integration test complete!', font: '14px Arial', fill: '#333333', align: 'center' }
        ]
      });

      // Take screenshot
      const outputPath = join(outputDir, 'test-integration.png');
      const screenshot = await canvas_screenshot({
        canvasId: canvas.id,
        outputPath
      });

      assert.equal(screenshot.saved, true);
      assert.equal(screenshot.path, outputPath);

      // Verify file
      const stats = await fs.stat(outputPath);
      assert.ok(stats.size > 1000, 'Screenshot should be substantial size');

      // Close
      await canvas_close({ canvasId: canvas.id });
    });
  });
});

// Run tests
console.log('Running Canvas A2UI tests...');
console.log('Output directory:', outputDir);
