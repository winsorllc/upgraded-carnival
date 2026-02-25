#!/usr/bin/env node
/**
 * Camera Vision Capture - Capture and analyze images
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const CAPTURES_DIR = path.join(process.env.HOME || '/tmp', '.popebot', 'captures');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function captureImage(device = '/dev/video0', width = 640, height = 480) {
  ensureDir(CAPTURES_DIR);
  
  const filename = path.join(CAPTURES_DIR, `capture_${getTimestamp()}.jpg`);
  
  // Try ffmpeg first
  try {
    execSync('which ffmpeg', { stdio: 'ignore' });
    execSync(`ffmpeg -f v4l2 -video_size ${width}x${height} -i ${device} -frames:v 1 -y "${filename}"`, {
      stdio: ['ignore', 'ignore', 'pipe']
    });
    return filename;
  } catch (err) {
    // Try fswebcam
    try {
      execSync('which fswebcam', { stdio: 'ignore' });
      execSync(`fswebcam -r ${width}x${height} --no-banner -d ${device} "${filename}"`, {
        stdio: ['ignore', 'ignore', 'pipe']
      });
      return filename;
    } catch {
      throw new Error('No camera capture tool found (ffmpeg or fswebcam required)');
    }
  }
}

class VisionAnalyzer {
  constructor(config = {}) {
    this.config = {
      ollamaUrl: config.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434',
      openaiKey: config.openaiKey || process.env.OPENAI_API_KEY,
      model: config.model || process.env.VISION_MODEL || 'llava',
      ...config
    };
  }

  async analyzeWithOllama(imagePath, prompt = 'Describe this image in detail') {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    
    const requestData = JSON.stringify({
      model: this.config.model,
      prompt: prompt,
      images: [base64Image],
      stream: false
    });

    return new Promise((resolve, reject) => {
      const url = new URL(`${this.config.ollamaUrl}/api/generate`);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData)
        },
        timeout: 60000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({
              description: result.response || 'No description generated',
              model: this.config.model,
              done: result.done
            });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.write(requestData);
      req.end();
    });
  }

  async analyzeWithOpenAI(imagePath, prompt = 'Describe this image in detail') {
    if (!this.config.openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    return new Promise((resolve, reject) => {
      const requestData = JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }],
        max_tokens: 4096
      });

      const options = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.openaiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData)
        },
        timeout: 60000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({
              description: result.choices?.[0]?.message?.content || 'No description',
              model: 'gpt-4-vision-preview',
              usage: result.usage
            });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.write(requestData);
      req.end();
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const device = args.find(a => a.startsWith('--device='))?.split('=')[1] || '/dev/video0';
  const output = args.find(a => a.startsWith('--output='))?.split('=')[1];
  const describe = args.find(a => a.startsWith('--describe='))?.split('=')[1];
  const ollamaUrl = args.find(a => a.startsWith('--ollama='))?.split('=')[1];
  const model = args.find(a => a.startsWith('--model='))?.split('=')[1];
  const useOpenAI = args.includes('--openai');
  const outputJson = args.includes('--json');
  
  try {
    const imageFile = output || path.join(CAPTURES_DIR, `capture_${getTimestamp()}.jpg`);
    
    if (!args.includes('--no-capture')) {
      console.log('Capturing image...');
      const capturedFile = captureImage(device);
      if (output) {
        fs.renameSync(capturedFile, output);
      }
      console.log(`Image saved to: ${imageFile}`);
    }
    
    const result = { imageFile, timestamp: new Date().toISOString() };
    
    if (describe || args.includes('--analyze')) {
      console.log('Analyzing image...');
      const analyzer = new VisionAnalyzer({ ollamaUrl, model });
      
      let analysis;
      if (useOpenAI) {
        analysis = await analyzer.analyzeWithOpenAI(imageFile, describe);
      } else {
        analysis = await analyzer.analyzeWithOllama(imageFile, describe);
      }
      
      result.analysis = analysis;
    }
    
    if (outputJson) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.analysis) {
      console.log('\nAnalysis:', result.analysis.description);
    }
    
    return result;
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { captureImage, VisionAnalyzer };
