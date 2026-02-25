/**
 * Canvas A2UI - Core Canvas Manager
 * Manages headless browser instances and canvas operations
 */

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Canvas class representing a single canvas instance
 */
class CanvasInstance {
  constructor(id, page, width, height, backgroundColor = '#ffffff') {
    this.id = id;
    this.page = page;
    this.width = width;
    this.height = height;
    this.backgroundColor = backgroundColor;
    this.createdAt = new Date().toISOString();
    this.elements = [];
  }

  async initialize() {
    await this.page.setViewport({ width: this.width, height: this.height });
    await this.page.setContent(this.getHTML());
    await this.waitForCanvas();
  }

  getHTML() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; overflow: hidden; }
          canvas { display: block; }
        </style>
      </head>
      <body>
        <canvas id="main-canvas" width="${this.width}" height="${this.height}"></canvas>
        <script>
          window.canvasReady = true;
          window.canvas = document.getElementById('main-canvas');
          window.ctx = window.canvas.getContext('2d');
          window.ctx.fillStyle = '${this.backgroundColor}';
          window.ctx.fillRect(0, 0, ${this.width}, ${this.height});
        </script>
      </body>
      </html>
    `;
  }

  async waitForCanvas() {
    await this.page.waitForFunction(() => window.canvasReady === true, { timeout: 5000 });
  }

  async execute(commands) {
    return await this.page.evaluate((cmds) => {
      const ctx = window.ctx;
      const canvas = window.canvas;
      const results = [];

      for (const cmd of cmds) {
        try {
          // Save context state
          ctx.save();

          // Apply styles
          if (cmd.fill) ctx.fillStyle = cmd.fill;
          if (cmd.stroke) ctx.strokeStyle = cmd.stroke;
          if (cmd.strokeWidth) ctx.lineWidth = cmd.strokeWidth;
          if (cmd.opacity) ctx.globalAlpha = cmd.opacity;
          if (cmd.shadow) {
            ctx.shadowColor = cmd.shadow.color || '#000';
            ctx.shadowBlur = cmd.shadow.blur || 0;
            ctx.shadowOffsetX = cmd.shadow.offsetX || 0;
            ctx.shadowOffsetY = cmd.shadow.offsetY || 0;
          }

          // Font settings
          if (cmd.font) ctx.font = cmd.font;
          if (cmd.align) ctx.textAlign = cmd.align;
          if (cmd.baseline) ctx.textBaseline = cmd.baseline;

          // Execute command
          switch (cmd.type) {
            case 'rect':
              if (cmd.fill) {
                ctx.fillRect(cmd.x, cmd.y, cmd.width, cmd.height);
              }
              if (cmd.stroke) {
                ctx.strokeRect(cmd.x, cmd.y, cmd.width, cmd.height);
              }
              break;

            case 'circle':
              ctx.beginPath();
              ctx.arc(cmd.x, cmd.y, cmd.radius, 0, Math.PI * 2);
              if (cmd.fill) ctx.fill();
              if (cmd.stroke) ctx.stroke();
              break;

            case 'line':
              ctx.beginPath();
              ctx.moveTo(cmd.x1, cmd.y1);
              ctx.lineTo(cmd.x2, cmd.y2);
              if (cmd.stroke) ctx.stroke();
              break;

            case 'arrow':
              // Draw line
              ctx.beginPath();
              ctx.moveTo(cmd.fromX, cmd.fromY);
              ctx.lineTo(cmd.toX, cmd.toY);
              if (cmd.stroke) ctx.stroke();
              
              // Draw arrowhead
              const angle = Math.atan2(cmd.toY - cmd.fromY, cmd.toX - cmd.fromX);
              const headLen = cmd.headLength || 10;
              ctx.beginPath();
              ctx.moveTo(cmd.toX, cmd.toY);
              ctx.lineTo(cmd.toX - headLen * Math.cos(angle - Math.PI / 6), cmd.toY - headLen * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(cmd.toX - headLen * Math.cos(angle + Math.PI / 6), cmd.toY - headLen * Math.sin(angle + Math.PI / 6));
              ctx.closePath();
              if (cmd.fill) ctx.fill();
              if (cmd.stroke) ctx.stroke();
              break;

            case 'text':
              if (cmd.fill) ctx.fillText(cmd.text, cmd.x, cmd.y, cmd.maxWidth);
              if (cmd.stroke) ctx.strokeText(cmd.text, cmd.x, cmd.y, cmd.maxWidth);
              break;

            case 'polygon':
              ctx.beginPath();
              ctx.moveTo(cmd.points[0].x, cmd.points[0].y);
              for (let i = 1; i < cmd.points.length; i++) {
                ctx.lineTo(cmd.points[i].x, cmd.points[i].y);
              }
              ctx.closePath();
              if (cmd.fill) ctx.fill();
              if (cmd.stroke) ctx.stroke();
              break;

            case 'image':
              // Images are handled via canvas_draw with image data
              if (cmd.imgData) {
                const img = new Image();
                img.onload = () => {
                  if (cmd.width && cmd.height) {
                    ctx.drawImage(img, cmd.x, cmd.y, cmd.width, cmd.height);
                  } else {
                    ctx.drawImage(img, cmd.x, cmd.y);
                  }
                };
                img.src = cmd.imgData;
              }
              break;

            case 'path':
              ctx.beginPath();
              const path = new Path2D(cmd.d);
              if (cmd.fill) ctx.fill(path);
              if (cmd.stroke) ctx.stroke(path);
              break;

            default:
              results.push({ ok: false, error: `Unknown command type: ${cmd.type}` });
              continue;
          }

          // Restore context
          ctx.restore();
          results.push({ ok: true });

        } catch (err) {
          results.push({ ok: false, error: err.message });
        }
      }

      return results;
    }, commands);
  }

  async screenshot(format = 'png', quality = 0.95) {
    const screenshotBuffer = await this.page.screenshot({
      type: format,
      quality: format === 'png' ? undefined : quality,
      encoding: 'binary',
      clip: { x: 0, y: 0, width: this.width, height: this.height }
    });
    return screenshotBuffer;
  }

  async evaluate(code) {
    return await this.page.evaluate((codeStr) => {
      try {
        // eslint-disable-next-line no-eval
        const result = eval(codeStr);
        return { success: true, result: String(result) };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }, code);
  }

  async reset(backgroundColor) {
    if (backgroundColor) {
      this.backgroundColor = backgroundColor;
    }
    await this.page.evaluate((bg) => {
      const ctx = window.ctx;
      const canvas = window.canvas;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, this.backgroundColor);
    this.elements = [];
  }

  async getInfo() {
    return {
      id: this.id,
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      createdAt: this.createdAt,
      elementCount: this.elements.length
    };
  }
}

/**
 * Canvas Manager - Manages all canvas instances
 */
export class CanvasManager {
  constructor() {
    this.canvases = new Map();
    this.browser = null;
    this.browserPromise = null;
  }

  async getBrowser() {
    if (this.browser) {
      return this.browser;
    }

    if (this.browserPromise) {
      return await this.browserPromise;
    }

    this.browserPromise = puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    this.browser = await this.browserPromise;
    return this.browser;
  }

  async create(options = {}) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    const canvas = new CanvasInstance(
      options.name || `canvas-${Date.now()}`,
      page,
      options.width || 800,
      options.height || 600,
      options.backgroundColor || '#ffffff'
    );

    await canvas.initialize();
    this.canvases.set(canvas.id, canvas);

    return {
      id: canvas.id,
      width: canvas.width,
      height: canvas.height,
      message: `Canvas created: ${canvas.width}x${canvas.height}`
    };
  }

  async draw(canvasId, commands) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    const results = await canvas.execute(commands);
    canvas.elements.push(...commands);

    return {
      executed: commands.length,
      results,
      canvasId
    };
  }

  async addText(options) {
    const { canvasId, x, y, text, fontSize = 14, font = 'Arial', fill = '#000000', align = 'left', maxWidth } = options;
    
    const lines = text.split('\n');
    const commands = lines.map((line, index) => ({
      type: 'text',
      x,
      y: y + (index * fontSize * 1.2),
      text: line,
      font: `${fontSize}px ${font}`,
      fill,
      align,
      maxWidth
    }));

    return await this.draw(canvasId, commands);
  }

  async addImage(options) {
    const { canvasId, src, x, y, width, height, opacity = 1.0 } = options;
    
    // Read image as base64
    const imageData = await fs.readFile(src, { encoding: 'base64' });
    const ext = src.split('.').pop().toLowerCase();
    const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = `data:${mimeType};base64,${imageData}`;

    const command = {
      type: 'image',
      x, y, width, height, opacity,
      imgData: dataUrl
    };

    return await this.draw(canvasId, [command]);
  }

  async screenshot(canvasId, outputPath, options = {}) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    const buffer = await canvas.screenshot(options.format || 'png', options.quality);
    
    if (outputPath) {
      await fs.writeFile(outputPath, buffer);
      return { saved: true, path: outputPath, size: buffer.length };
    }

    return { buffer, size: buffer.length };
  }

  async createGrid(options) {
    const { canvasId, rows, cols, cellWidth, cellHeight, gap = 0, items = [] } = options;
    
    const commands = [];
    
    for (const item of items) {
      if (item.row >= rows || item.col >= cols) continue;
      
      const x = item.col * (cellWidth + gap);
      const y = item.row * (cellHeight + gap);
      
      // Cell background
      commands.push({
        type: 'rect',
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        fill: item.color || '#f0f0f0',
        stroke: '#ccc',
        strokeWidth: 1
      });
      
      // Title text
      commands.push({
        type: 'text',
        x: x + cellWidth / 2,
        y: y + cellHeight / 2,
        text: item.title || '',
        font: 'bold 14px Arial',
        fill: '#333',
        align: 'center'
      });
    }
    
    return await this.draw(canvasId, commands);
  }

  async query(canvasId, queryType) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    switch (queryType) {
      case 'bounds':
      case 'dimensions':
        return { width: canvas.width, height: canvas.height };
      case 'info':
        return await canvas.getInfo();
      default:
        return await canvas.getInfo();
    }
  }

  async evaluate(canvasId, code) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }
    return await canvas.evaluate(code);
  }

  async reset(canvasId, backgroundColor) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }
    await canvas.reset(backgroundColor);
    return { reset: true, canvasId };
  }

  async list() {
    const canvasList = [];
    for (const [id, canvas] of this.canvases) {
      canvasList.push(await canvas.getInfo());
    }
    return canvasList;
  }

  async close(canvasId, saveScreenshot) {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    let screenshotPath = null;
    if (saveScreenshot) {
      await this.screenshot(canvasId, saveScreenshot);
      screenshotPath = saveScreenshot;
    }

    await canvas.page.close();
    this.canvases.delete(canvasId);

    return { closed: true, canvasId, screenshotPath };
  }

  async closeAll() {
    for (const [id] of this.canvases) {
      await this.close(id);
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Handle cleanup on process exit
process.on('exit', () => {
  // Cleanup will happen automatically
});

process.on('SIGINT', async () => {
  process.exit(0);
});
