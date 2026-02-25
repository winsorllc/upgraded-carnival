/**
 * Canvas A2UI Skill - Main Entry Point
 * 
 * Exports all canvas functionality for integration with PopeBot
 */

import { CanvasManager } from './lib/canvas.js';
import { DiagramGenerator } from './lib/diagram-templates.js';
import { ChartRenderer } from './lib/chart-renderer.js';

const manager = new CanvasManager();

/**
 * Create a new canvas instance
 */
export async function canvas_create(options) {
  return await manager.create(options);
}

/**
 * Draw elements on canvas
 */
export async function canvas_draw(options) {
  return await manager.draw(options.canvasId, options.commands);
}

/**
 * Render a chart
 */
export async function canvas_chart(options) {
  const chartRenderer = new ChartRenderer(manager);
  return await chartRenderer.render(options);
}

/**
 * Add text to canvas
 */
export async function canvas_text(options) {
  return await manager.addText(options);
}

/**
 * Add image to canvas
 */
export async function canvas_image(options) {
  return await manager.addImage(options);
}

/**
 * Take screenshot of canvas
 */
export async function canvas_screenshot(options) {
  return await manager.screenshot(options.canvasId, options.outputPath, options);
}

/**
 * Create grid layout
 */
export async function canvas_grid(options) {
  return await manager.createGrid(options);
}

/**
 * Create flowchart
 */
export async function canvas_flowchart(options) {
  const diagram = new DiagramGenerator(manager);
  return await diagram.createFlowchart(options);
}

/**
 * Create system diagram
 */
export async function canvas_diagram(options) {
  const diagram = new DiagramGenerator(manager);
  return await diagram.createSystemDiagram(options);
}

/**
 * Query canvas state
 */
export async function canvas_query(options) {
  return await manager.query(options.canvasId, options.query);
}

/**
 * Execute JavaScript on canvas
 */
export async function canvas_eval(options) {
  return await manager.evaluate(options.canvasId, options.code);
}

/**
 * Reset canvas
 */
export async function canvas_reset(options) {
  return await manager.reset(options.canvasId, options.backgroundColor);
}

/**
 * List all canvases
 */
export async function canvas_list(options = {}) {
  return await manager.list();
}

/**
 * Close canvas
 */
export async function canvas_close(options) {
  return await manager.close(options.canvasId, options.saveScreenshot);
}

/**
 * Start canvas server (for real-time viewing)
 */
export async function canvas_server_start(options) {
  const { startServer } = await import('./server.js');
  return await startServer(manager, options);
}

// Default exports
export default {
  canvas_create,
  canvas_draw,
  canvas_chart,
  canvas_text,
  canvas_image,
  canvas_screenshot,
  canvas_grid,
  canvas_flowchart,
  canvas_diagram,
  canvas_query,
  canvas_eval,
  canvas_reset,
  canvas_list,
  canvas_close,
  canvas_server_start
};
