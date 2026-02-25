/**
 * Canvas A2UI - Diagram Templates
 * Pre-built diagram generators for flowcharts, system diagrams, etc.
 */

import { promises as fs } from 'fs';

/**
 * Diagram Generator for creating common diagram types
 */
export class DiagramGenerator {
  constructor(manager) {
    this.manager = manager;
    this.colors = {
      primary: '#4A90D9',
      success: '#5CB85C',
      warning: '#F0AD4E',
      danger: '#D9534F',
      info: '#5BC0DE',
      neutral: '#777777',
      light: '#F5F5F5',
      dark: '#333333',
      white: '#FFFFFF',
      // Tier colors
      edge: '#4A90D9',
      api: '#5BC0DE',
      app: '#5CB85C',
      data: '#F0AD4E',
      cache: '#D9534F'
    };
  }

  /**
   * Create a flowchart
   */
  async createFlowchart(options) {
    const { canvasId, nodes, edges, nodeSize = { width: 120, height: 60 } } = options;
    
    const commands = [];
    
    // Draw nodes
    for (const node of nodes) {
      const nodeCommands = this.getNodeCommands(node, nodeSize);
      commands.push(...nodeCommands);
    }
    
    // Draw edges
    for (const edge of edges) {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (fromNode && toNode) {
        const edgeCommands = this.getEdgeCommands(fromNode, toNode, edge, nodeSize);
        commands.push(...edgeCommands);
      }
    }
    
    return await this.manager.draw(canvasId, commands);
  }

  /**
   * Generate drawing commands for a node
   */
  getNodeCommands(node, size) {
    const commands = [];
    const { x, y, label, type = 'process' } = node;
    
    const width = node.width || size.width;
    const height = node.height || size.height;
    
    switch (type) {
      case 'terminator':
        // Rounded rectangle (pill shape)
        commands.push({
          type: 'rect',
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
          fill: this.colors.primary,
          stroke: this.colors.dark,
          strokeWidth: 2,
          radius: height / 2
        });
        break;
        
      case 'decision':
        // Diamond shape
        commands.push({
          type: 'polygon',
          points: [
            { x, y: y - height / 2 },
            { x: x + width / 2, y },
            { x, y: y + height / 2 },
            { x: x - width / 2, y }
          ],
          fill: this.colors.warning,
          stroke: this.colors.dark,
          strokeWidth: 2
        });
        break;
        
      case 'process':
      default:
        // Rectangle
        commands.push({
          type: 'rect',
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
          fill: this.colors.light,
          stroke: this.colors.dark,
          strokeWidth: 2
        });
        break;
    }
    
    // Add label
    commands.push({
      type: 'text',
      x,
      y,
      text: label,
      font: '12px Arial',
      fill: type === 'process' ? this.colors.dark : this.colors.white,
      align: 'center'
    });
    
    return commands;
  }

  /**
   * Generate drawing commands for an edge/connection
   */
  getEdgeCommands(fromNode, toNode, edge, size) {
    const commands = [];
    const { label, style = 'solid' } = edge;
    
    // Calculate edge points
    const fromX = fromNode.x;
    const fromY = fromNode.y + (fromNode.height || size.height) / 2;
    const toX = toNode.x;
    const toY = toNode.y - (toNode.height || size.height) / 2;
    
    // Draw line
    commands.push({
      type: 'line',
      x1: fromX,
      y1: fromY,
      x2: toX,
      y2: toY,
      stroke: this.colors.dark,
      strokeWidth: style === 'dashed' ? 1 : 2,
      dash: style === 'dashed' ? [5, 5] : undefined
    });
    
    // Draw arrow
    commands.push({
      type: 'arrow',
      fromX,
      fromY,
      toX,
      toY,
      stroke: this.colors.dark,
      fill: this.colors.dark
    });
    
    // Draw label if present
    if (label) {
      commands.push({
        type: 'text',
        x: (fromX + toX) / 2 + 10,
        y: (fromY + toY) / 2 - 5,
        text: label,
        font: '10px Arial',
        fill: this.colors.neutral
      });
    }
    
    return commands;
  }

  /**
   * Create a system architecture diagram
   */
  async createSystemDiagram(options) {
    const { canvasId, type, title, components, connections } = options;
    
    const commands = [];
    
    // Title
    commands.push({
      type: 'text',
      x: 50,
      y: 30,
      text: title,
      font: 'bold 18px Arial',
      fill: this.colors.dark
    });
    
    // Group components by tier
    const tiers = {};
    for (const comp of components) {
      const tier = comp.tier || 'default';
      if (!tiers[tier]) tiers[tier] = [];
      tiers[tier].push(comp);
    }
    
    const tierOrder = ['edge', 'api', 'app', 'service', 'data', 'cache', 'default'];
    let currentY = 80;
    const tierHeight = 100;
    const startX = 100;
    const spacing = 200;
    
    // Position components
    const componentPositions = {};
    
    for (const tier of tierOrder) {
      if (!tiers[tier]) continue;
      
      const tierComponents = tiers[tier];
      let currentX = startX;
      
      for (const comp of tierComponents) {
        componentPositions[comp.name] = { x: currentX, y: currentY };
        
        // Draw component box
        commands.push({
          type: 'rect',
          x: currentX - 60,
          y: currentY - 30,
          width: 120,
          height: 60,
          fill: this.colors[tier] || this.colors.neutral,
          stroke: this.colors.dark,
          strokeWidth: 2
        });
        
        // Component name
        commands.push({
          type: 'text',
          x: currentX,
          y: currentY,
          text: comp.name,
          font: 'bold 12px Arial',
          fill: this.colors.white,
          align: 'center'
        });
        
        // Component type
        commands.push({
          type: 'text',
          x: currentX,
          y: currentY + 15,
          text: comp.type,
          font: '10px Arial',
          fill: 'rgba(255,255,255,0.8)',
          align: 'center'
        });
        
        currentX += spacing;
      }
      
      // Draw tier label
      commands.push({
        type: 'text',
        x: 30,
        y: currentY,
        text: tier.toUpperCase(),
        font: '10px Arial',
        fill: this.colors.neutral,
        align: 'right'
      });
      
      currentY += tierHeight;
    }
    
    // Draw connections
    for (const conn of connections) {
      const from = componentPositions[conn.from];
      const to = componentPositions[conn.to];
      
      if (from && to) {
        commands.push({
          type: 'arrow',
          fromX: from.x + 60,
          fromY: from.y,
          toX: to.x - 60,
          toY: to.y,
          stroke: this.colors.neutral,
          fill: this.colors.neutral
        });
      }
    }
    
    return await this.manager.draw(canvasId, commands);
  }

  /**
   * Create UML class diagram
   */
  async createClassDiagram(canvasId, classes) {
    const commands = [];
    let x = 100;
    let y = 100;
    
    for (const cls of classes) {
      const width = 200;
      const lineHeight = 20;
      const headerHeight = 30;
      const totalHeight = headerHeight + (cls.fields?.length || 0) * lineHeight + (cls.methods?.length || 0) * lineHeight + 10;
      
      // Class box
      commands.push({
        type: 'rect',
        x,
        y,
        width,
        height: totalHeight,
        fill: this.colors.light,
        stroke: this.colors.dark,
        strokeWidth: 2
      });
      
      // Header
      commands.push({
        type: 'rect',
        x,
        y,
        width,
        height: headerHeight,
        fill: this.colors.primary,
        stroke: this.colors.dark,
        strokeWidth: 1
      });
      
      // Class name
      commands.push({
        type: 'text',
        x: x + width / 2,
        y: y + 20,
        text: cls.name,
        font: 'bold 14px Arial',
        fill: this.colors.white,
        align: 'center'
      });
      
      // Fields
      let fieldY = y + headerHeight + lineHeight;
      for (const field of cls.fields || []) {
        commands.push({
          type: 'text',
          x: x + 10,
          y: fieldY,
          text: `• ${field}`,
          font: '12px Arial',
          fill: this.colors.dark,
          align: 'left'
        });
        fieldY += lineHeight;
      }
      
      // Separator
      if (cls.methods?.length > 0) {
        commands.push({
          type: 'line',
          x1: x,
          y1: fieldY,
          x2: x + width,
          y2: fieldY,
          stroke: this.colors.neutral,
          strokeWidth: 1
        });
        fieldY += 5;
        
        // Methods
        for (const method of cls.methods) {
          commands.push({
            type: 'text',
            x: x + 10,
            y: fieldY + lineHeight,
            text: `➤ ${method}`,
            font: '12px Arial',
            fill: this.colors.dark,
            align: 'left'
          });
          fieldY += lineHeight;
        }
      }
      
      x += 250;
      if (x > 800) {
        x = 100;
        y += 250;
      }
    }
    
    return await this.manager.draw(canvasId, commands);
  }

  /**
   * Create sequence diagram
   */
  async createSequenceDiagram(canvasId, actors, sequences) {
    const commands = [];
    const actorWidth = 100;
    const actorHeight = 40;
    const startY = 80;
    const lineHeight = 60;
    
    // Draw actors
    let x = 100;
    const actorPositions = {};
    
    for (const actor of actors) {
      actorPositions[actor] = x;
      
      // Actor box
      commands.push({
        type: 'rect',
        x: x - actorWidth / 2,
        y: 40,
        width: actorWidth,
        height: actorHeight,
        fill: this.colors.primary,
        stroke: this.colors.dark,
        strokeWidth: 2
      });
      
      // Actor name
      commands.push({
        type: 'text',
        x,
        y: 65,
        text: actor,
        font: 'bold 12px Arial',
        fill: this.colors.white,
        align: 'center'
      });
      
      // Lifeline
      commands.push({
        type: 'line',
        x1: x,
        y1: startY,
        x2: x,
        y2: startY + sequences.length * lineHeight + 50,
        stroke: this.colors.neutral,
        strokeWidth: 1,
        dash: [5, 5]
      });
      
      x += 150;
    }
    
    // Draw sequences
    let currentY = startY + 20;
    
    for (const seq of sequences) {
      const fromX = actorPositions[seq.from];
      const toX = actorPositions[seq.to];
      
      // Message line
      commands.push({
        type: 'arrow',
        fromX: fromX,
        fromY: currentY,
        toX: toX - (fromX < toX ? 50 : -50),
        toY: currentY,
        stroke: this.colors.dark,
        fill: this.colors.dark
      });
      
      // Message label
      commands.push({
        type: 'text',
        x: (fromX + toX) / 2,
        y: currentY - 5,
        text: seq.message,
        font: '11px Arial',
        fill: this.colors.dark,
        align: 'center'
      });
      
      currentY += lineHeight;
    }
    
    return await this.manager.draw(canvasId, commands);
  }
}
