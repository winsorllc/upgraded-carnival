---
name: canvas-a2ui
description: Agent-to-UI visual workspace with HTML5 Canvas manipulation. Create, draw, screenshot, and interact with visual content programmatically. Enables agents to generate diagrams, charts, visualizations, and interactive visual content with A2UI-style communication.
version: 1.0.0
author: PopeBot (inspired by OpenClaw A2UI)
tags: ["canvas", "visual", "a2ui", "drawing", "screenshot", "visualization"]
requires:
  bins: ["node"]
  env: []
---

# Canvas A2UI - Visual Workspace for Agents

A powerful visual workspace skill inspired by OpenClaw's Canvas/A2UI system. Enables PopeBot agents to create, manipulate, and capture visual content using HTML5 Canvas with a headless browser backend.

## Purpose

Use Canvas A2UI when you need to:
- **Generate diagrams** - Flowcharts, architecture diagrams, mind maps
- **Create visualizations** - Charts, graphs, data visualizations
- **Draw mockups** - UI wireframes, layout designs
- **Annotate images** - Add labels, arrows, highlights to screenshots
- **Interactive visuals** - Clickable areas, tooltips, animations
- **Visual reports** - Combine text, charts, and graphics
- **Educational content** - Step-by-step visual explanations

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Canvas A2UI System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────────┐   │
│  │   Agent  │───>│   A2UI   │───>│   Headless Browser      │   │
│  │  Request │    │ Protocol │    │   (Puppeteer/Playwright) │   │
│  └──────────┘    └──────────┘    └─────────────┬────────────┘   │
│                                                 │                │
│                                                 ▼                │
│                           ┌──────────────────────────┐           │
│                           │     HTML5 Canvas        │            │
│                           │  ┌────────────────┐     │            │
│                           │  │  Drawing API   │     │            │
│                           │  │  • Shapes      │     │            │
│                           │  │  • Text        │     │            │
│                           │  │  • Images      │     │            │
│                           │  │  • Charts      │     │            │
│                           │  │  • Annotations │     │            │
│                           │  └────────────────┘     │            │
│                           │  ┌────────────────┐     │            │
│                           │  │  Screenshot   │     │            │
│                           │  │  Export (PNG)  │     │            │
│                           │  └────────────────┘     │            │
│                           └──────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## A2UI Protocol Commands

The Agent-to-UI protocol defines how agents communicate with the canvas:

| Command | Description | Example |
|---------|-------------|---------|
| `push` | Send drawing commands to canvas | Draw shapes, text, images |
| `reset` | Clear canvas to blank state | Start fresh |
| `eval` | Execute JavaScript on canvas | Custom drawing logic |
| `snapshot` | Capture canvas as PNG | Save/export result |
| `query` | Get canvas state info | Dimensions, layers |
| `config` | Set canvas properties | Size, background |

## Setup

```bash
cd /job/.pi/skills/canvas-a2ui
npm install
```

This installs Puppeteer for headless browser automation.

## Tools Added

### `canvas_create`

Create a new canvas instance with specified dimensions and configuration.

```javascript
canvas_create({
  name: "architecture-diagram",
  width: 1200,
  height: 800,
  backgroundColor: "#ffffff",
  deviceScaleFactor: 2  // Retina quality
})
```

Returns: Canvas instance ID for subsequent operations.

### `canvas_draw`

Draw elements on the canvas using the A2UI push protocol.

```javascript
// Draw a flowchart box
canvas_draw({
  canvasId: "architecture-diagram",
  commands: [
    { type: "rect", x: 100, y: 100, width: 200, height: 80, 
      fill: "#4A90D9", stroke: "#2E5C8A", strokeWidth: 2 },
    { type: "text", x: 200, y: 140, text: "Gateway", 
      font: "16px Arial", fill: "white", align: "center" },
    { type: "arrow", fromX: 200, fromY: 180, toX: 200, toY: 250 }
  ]
})
```

### `canvas_chart`

Generate charts using Chart.js integration.

```javascript
canvas_chart({
  canvasId: "performance-chart",
  type: "bar",  // bar, line, pie, doughnut, radar
  data: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [{
      label: "API Calls",
      data: [65, 78, 90, 81, 96],
      backgroundColor: "#4A90D9"
    }]
  },
  options: {
    title: { text: "Monthly API Usage", display: true },
    responsive: false
  }
})
```

### `canvas_text`

Add styled text with markdown-like formatting.

```javascript
canvas_text({
  canvasId: "architecture-diagram",
  x: 50,
  y: 50,
  text: "# System Architecture\n\n**Gateway** → **Agent** → **Tools**",
  maxWidth: 1100,
  fontSize: 14,
  lineHeight: 1.5
})
```

### `canvas_image`

Load and display images on the canvas.

```javascript
canvas_image({
  canvasId: "architecture-diagram",
  src: "/path/to/image.png",
  x: 100,
  y: 200,
  width: 300,
  height: 200,
  opacity: 0.9
})
```

### `canvas_screenshot`

Capture the current canvas state as a PNG file.

```javascript
canvas_screenshot({
  canvasId: "architecture-diagram",
  outputPath: "/job/tmp/diagram.png",
  format: "png",  // png, jpeg, webp
  quality: 0.95   // For JPEG/WebP
})
```

Returns: Path to saved screenshot.

### `canvas_grid`

Create grid layouts for organized diagrams.

```javascript
canvas_grid({
  canvasId: "architecture-diagram",
  rows: 3,
  cols: 4,
  cellWidth: 280,
  cellHeight: 120,
  gap: 20,
  items: [
    { row: 0, col: 0, type: "component", title: "Gateway", color: "#4A90D9" },
    { row: 0, col: 1, type: "component", title: "Router", color: "#5CB85C" },
    { row: 1, col: 0, type: "component", title: "Memory", color: "#F0AD4E" },
    { row: 1, col: 1, type: "component", title: "Cache", color: "#D9534F" }
  ]
})
```

### `canvas_flowchart`

Create flowcharts with automatic layout.

```javascript
canvas_flowchart({
  canvasId: "flow-diagram",
  nodes: [
    { id: "start", label: "Start", type: "terminator", x: 400, y: 50 },
    { id: "process1", label: "Parse Input", type: "process", x: 400, y: 150 },
    { id: "decision", label: "Valid?", type: "decision", x: 400, y: 250 },
    { id: "end", label: "End", type: "terminator", x: 400, y: 400 }
  ],
  edges: [
    { from: "start", to: "process1" },
    { from: "process1", to: "decision" },
    { from: "decision", to: "end", label: "Yes" },
    { from: "decision", to: "process1", label: "No", style: "dashed" }
  ]
})
```

### `canvas_diagram`

Create technical diagrams (UML, ERD, network).

```javascript
canvas_diagram({
  canvasId: "system-diagram",
  type: "architecture",  // architecture, uml, erd, network
  title: "Microservices Architecture",
  components: [
    { name: "Load Balancer", type: "gateway", tier: "edge" },
    { name: "API Gateway", type: "gateway", tier: "edge" },
    { name: "Auth Service", type: "service", tier: "app" },
    { name: "User Service", type: "service", tier: "app" },
    { name: "PostgreSQL", type: "database", tier: "data" },
    { name: "Redis", type: "cache", tier: "data" }
  ],
  connections: [
    { from: "Load Balancer", to: "API Gateway" },
    { from: "API Gateway", to: "Auth Service" },
    { from: "API Gateway", to: "User Service" },
    { from: "User Service", to: "PostgreSQL" },
    { from: "Auth Service", to: "Redis" }
  ]
})
```

### `canvas_query`

Get information about canvas state.

```javascript
canvas_query({
  canvasId: "architecture-diagram",
  query: "bounds"  // bounds, dimensions, layers
})
```

### `canvas_eval`

Execute arbitrary JavaScript on the canvas for custom operations.

```javascript
canvas_eval({
  canvasId: "architecture-diagram",
  code: `
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = '#FF0000';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.stroke();
    ctx.restore();
    return 'Drew diagonal line';
  `
})
```

### `canvas_reset`

Clear canvas to start fresh.

```javascript
canvas_reset({
  canvasId: "architecture-diagram",
  backgroundColor: "#fafafa"  // Optional new background
})
```

### `canvas_list`

List all active canvases.

```javascript
canvas_list({})
```

### `canvas_close`

Close and cleanup a canvas instance.

```javascript
canvas_close({
  canvasId: "architecture-diagram",
  saveScreenshot: "/job/tmp/final-diagram.png"
})
```

## Interactive Canvas Server Mode

For real-time visual updates during agent execution:

```javascript
// Start canvas server
canvas_server_start({
  port: 3456,
  autoRefresh: true
})

// All canvas operations stream to browser
// Access at http://localhost:3456/canvas/<canvasId>
```

## Usage in Agent Prompt

When this skill is active, include this context:

```
## Canvas A2UI - Visual Workspace

You have access to a visual canvas system (Canvas A2UI) for creating diagrams, charts, and visual content.

### Quick Start
1. Create canvas: canvas_create({ name: "my-diagram", width: 1200, height: 800 })
2. Draw content: canvas_draw({ canvasId: "my-diagram", commands: [...] })
3. Save result: canvas_screenshot({ canvasId: "my-diagram", outputPath: "..." })

### Drawing Commands
- **Shape**: { type: "rect|circle|line|arrow|polygon", x, y, ... }
- **Text**: { type: "text", x, y, text, font, fill }
- **Image**: { type: "image", src, x, y, width, height }
- **Style**: { fill, stroke, strokeWidth, opacity, shadow }

### High-Level Tools
- canvas_flowchart - For flowcharts and decision trees
- canvas_diagram - For architecture diagrams
- canvas_chart - For data visualizations
- canvas_grid - For organized layouts

### Color Palette (Recommended)
- Primary: #4A90D9 (blue)
- Success: #5CB85C (green)
- Warning: #F0AD4E (orange)
- Danger: #D9534F (red)
- Neutral: #777777 (gray)
- Backgrounds: #F5F5F5, #FFFFFF

### When to Use Canvas
- System architecture visualization
- Data flow diagrams
- UI mockups and wireframes
- Process documentation
- Performance charts
- Annotated screenshots
- Educational illustrations

### Best Practices
1. Use consistent colors and fonts
2. Add labels for clarity
3. Use appropriate spacing
4. Export at 2x scale for retina displays
5. Keep diagrams focused (one concept per canvas)
```

## Example Workflows

### Create Architecture Diagram

```javascript
// Step 1: Create canvas
const canvas = await canvas_create({
  name: "system-architecture",
  width: 1200, height: 900,
  backgroundColor: "#f8f9fa"
});

// Step 2: Use diagram helper
await canvas_diagram({
  canvasId: canvas.id,
  type: "architecture",
  title: "PopeBot System Architecture",
  components: [
    { name: "Event Handler", type: "service", tier: "api" },
    { name: "GitHub Actions", type: "service", tier: "ci" },
    { name: "Docker Agent", type: "service", tier: "compute" },
    { name: "Telegram", type: "channel", tier: "ui" },
    { name: "Web UI", type: "channel", tier: "ui" }
  ],
  connections: [
    { from: "Telegram", to: "Event Handler" },
    { from: "Web UI", to: "Event Handler" },
    { from: "Event Handler", to: "GitHub Actions" },
    { from: "GitHub Actions", to: "Docker Agent" }
  ]
});

// Step 3: Export
const path = await canvas_screenshot({
  canvasId: canvas.id,
  outputPath: "/job/tmp/architecture.png"
});

await canvas_close({ canvasId: canvas.id });
```

### Create Data Visualization

```javascript
const canvas = await canvas_create({ name: "metrics", width: 800, height: 600 });

await canvas_chart({
  canvasId: canvas.id,
  type: "line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [{
      label: "Job Success Rate",
      data: [98, 97, 99, 96, 98],
      borderColor: "#4A90D9",
      fill: true,
      backgroundColor: "rgba(74, 144, 217, 0.1)"
    }]
  }
});

await canvas_screenshot({ canvasId: canvas.id, outputPath: "/job/tmp/metrics.png" });
```

## File Structure

```
.pi/skills/canvas-a2ui/
├── SKILL.md                      # This documentation
├── package.json                  # Dependencies
├── index.js                      # Skill exports
├── server.js                     # Canvas server (optional)
├── lib/
│   ├── canvas.js                 # Core Canvas class
│   ├── browser-manager.js        # Puppeteer management
│   ├── drawing-api.js            # Drawing command processor
│   ├── chart-renderer.js         # Chart.js integration
│   ├── diagram-templates.js      # Pre-built diagrams
│   └── exports.js                # PNG/JPEG export
├── bin/
│   ├── canvas-create.js
│   ├── canvas-draw.js
│   ├── canvas-chart.js
│   ├── canvas-screenshot.js
│   └── canvas-server.js
├── templates/
│   └── example-diagrams/         # Sample diagrams
└── test/
    └── canvas-a2ui.test.js
```

## Performance

| Metric | Expected |
|--------|----------|
| Canvas creation | 2-4s (browser startup) |
| Simple draw | <100ms |
| Complex diagram | 500ms-1s |
| Screenshot export | 200-500ms |
| Chart rendering | 1-2s (includes Chart.js load) |
| Server mode | Real-time (<50ms updates) |

## Dependencies

- `puppeteer` - Headless Chrome control
- `chart.js` - Chart rendering
- `canvas` - Canvas API polyfill (if needed)

## Integration with Other Skills

### With browser-tools
```javascript
// Take screenshot of web, then annotate on canvas
const webShot = await browser_screenshot("https://example.com");
await canvas_image({ canvasId: "analysis", src: webShot });
await canvas_draw({ canvasId: "analysis", commands: [/* annotations */] });
```

### With multi-agent-orchestrator
```javascript
// Parallel diagram generation
await parallel_delegates({
  tasks: [
    { agent: "ux-agent", task: "Create wireframe canvas" },
    { agent: "data-agent", task: "Create chart canvas" },
    { agent: "arch-agent", task: "Create system diagram" }
  ]
});
```

## Security Considerations

- Canvas runs in isolated browser context
- No network access from canvas scripts (unless explicitly allowed)
- Eval commands sandboxed to canvas only
- Screenshots saved to configured paths only

## License

MIT - See repository LICENSE file
