/**
 * Canvas A2UI - Chart Renderer
 * Integrates Chart.js for data visualization
 */

/**
 * Chart Renderer using Chart.js
 */
export class ChartRenderer {
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * Render a chart on canvas
   */
  async render(options) {
    const { canvasId, type, data, options: chartOptions } = options;
    
    // Build Chart.js configuration
    const config = {
      type,
      data,
      options: {
        ...chartOptions,
        responsive: false,
        animation: false
      }
    };

    // Generate HTML with Chart.js
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
        <style>
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: ${chartOptions.backgroundColor || '#ffffff'}; }
          canvas { max-width: 100% !important; max-height: 100% !important; }
        </style>
      </head>
      <body>
        <canvas id="chart-canvas"></canvas>
        <script>
          const ctx = document.getElementById('chart-canvas').getContext('2d');
          new Chart(ctx, ${JSON.stringify(config)});
          window.chartReady = true;
        </script>
      </body>
      </html>
    `;

    // Get canvas and update page
    const canvas = this.manager.canvases.get(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    await canvas.page.setContent(html);
    await canvas.page.waitForFunction(() => window.chartReady === true, { timeout: 10000 });
    
    // Give Chart.js time to render
    await new Promise(resolve => setTimeout(resolve, 500));

    return { rendered: true, type, canvasId };
  }

  /**
   * Simplified bar chart
   */
  async barChart(canvasId, labels, data, title = '') {
    return await this.render({
      canvasId,
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: title,
          data,
          backgroundColor: [
            '#4A90D9', '#5CB85C', '#F0AD4E', '#D9534F', '#5BC0DE', '#777777'
          ]
        }]
      },
      options: {
        title: { display: !!title, text: title },
        backgroundColor: '#ffffff'
      }
    });
  }

  /**
   * Simplified line chart
   */
  async lineChart(canvasId, labels, data, title = '') {
    return await this.render({
      canvasId,
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: title,
          data,
          borderColor: '#4A90D9',
          backgroundColor: 'rgba(74, 144, 217, 0.1)',
          fill: true,
          tension: 0.1
        }]
      },
      options: {
        title: { display: !!title, text: title },
        backgroundColor: '#ffffff'
      }
    });
  }

  /**
   * Pie chart
   */
  async pieChart(canvasId, labels, data, title = '') {
    return await this.render({
      canvasId,
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            '#4A90D9', '#5CB85C', '#F0AD4E', '#D9534F', '#5BC0DE', '#777777',
            '#337AB7', '#449D44', '#EC971F', '#C9302C', '#31B0D5', '#555555'
          ]
        }]
      },
      options: {
        title: { display: !!title, text: title },
        backgroundColor: '#ffffff'
      }
    });
  }

  /**
   * Doughnut chart
   */
  async doughnutChart(canvasId, labels, data, title = '') {
    return await this.render({
      canvasId,
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            '#4A90D9', '#5CB85C', '#F0AD4E', '#D9534F', '#5BC0DE', '#777777'
          ]
        }]
      },
      options: {
        title: { display: !!title, text: title },
        backgroundColor: '#ffffff'
      }
    });
  }

  /**
   * Radar chart
   */
  async radarChart(canvasId, labels, data, title = '') {
    return await this.render({
      canvasId,
      type: 'radar',
      data: {
        labels,
        datasets: data.map((dataset, i) => ({
          label: dataset.label || `Dataset ${i + 1}`,
          data: dataset.values,
          borderColor: dataset.borderColor || '#4A90D9',
          backgroundColor: dataset.backgroundColor || 'rgba(74, 144, 217, 0.2)'
        }))
      },
      options: {
        title: { display: !!title, text: title },
        backgroundColor: '#ffffff'
      }
    });
  }
}
