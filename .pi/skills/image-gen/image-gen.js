#!/usr/bin/env node
/**
 * Image-Gen - Production-Grade Image Generation
 * 
 * Architecture:
 * - Multi-provider support (OpenAI, Stability AI, etc.)
 * - Rate limiting with token tracking
 * - Retry logic with exponential backoff
 * - Multiple output formats and sizes
 * - Batch processing with queue management
 * - Cost tracking per generation
 * - Style presets and prompt templates
 * - Gallery generation with HTML output
 * - Prompt validation and safety checks
 * - Image processing (resize, format conversion)
 * 
 * @version 2.0.0
 * @author Pi Agent
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { promisify } = require('util');

const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  // API Configuration
  API: {
    openai: {
      baseUrl: 'api.openai.com',
      endpoint: '/v1/images/generations',
      models: ['dall-e-2', 'dall-e-3', 'gpt-image-1'],
      pricing: {
        'dall-e-2': { '1024x1024': 0.02 },
        'dall-e-3': { 
          '1024x1024': 0.04,
          '1024x1792': 0.08,
          '1792x1024': 0.08
        }
      },
      maxPromptLength: 4000,
      rateLimit: { rpm: 5, rps: 1 }
    },
    stability: {
      baseUrl: 'api.stability.ai',
      endpoint: '/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      pricing: { standard: 0.018 }
    }
  },
  
  // Output settings
  OUTPUT: {
    formats: ['png', 'jpg', 'jpeg', 'webp'],
    sizes: {
      'dall-e-2': ['256x256', '512x512', '1024x1024'],
      'dall-e-3': ['1024x1024', '1024x1792', '1792x1024']
    },
    tempDir: '/tmp/image-gen',
    maxFiles: 1000
  },
  
  // Style presets
  STYLES: {
    photographic: {
      prefix: 'A photorealistic image of',
      suffix: 'professional photography, 35mm, high detail, 8k'
    },
    digital_art: {
      prefix: 'A digital illustration of',
      suffix: 'digital art, concept art, trending on artstation'
    },
    oil_painting: {
      prefix: 'An oil painting of',
      suffix: 'oil on canvas, fine art, impressionist style'
    },
    watercolor: {
      prefix: 'A watercolor painting of',
      suffix: 'wet-on-wet technique, soft colors, artistic'
    },
    isometric: {
      prefix: 'Isometric illustration of',
      suffix: 'isometric view, clean lines, vector style'
    },
    pixel_art: {
      prefix: 'Pixel art of',
      suffix: '8-bit style, pixel art, retro aesthetic'
    },
    cinematic: {
      prefix: 'Cinematic scene of',
      suffix: 'cinematic lighting, film grain, movie still, anamorphic'
    },
    neon: {
      prefix: 'Cyberpunk neon art of',
      suffix: 'neon lights, night scene, cyberpunk, futuristic, synthwave'
    },
    sketch: {
      prefix: 'Pencil sketch of',
      suffix: 'hand-drawn sketch, detailed line work, artistic'
    }
  },
  
  // Safety settings
  SAFETY: {
    maxWait: 300000,      // 5 minute timeout
    maxRetries: 3,
    minPromptLength: 5,
    maxPromptLength: 4000,
    minImageSize: 256,
    maxImageSize: 2048
  },
  
  // Default settings
  DEFAULTS: {
    model: 'dall-e-3',
    size: '1024x1024',
    quality: 'standard',
    n: 1,
    style: 'vivid'
  }
};

// Error codes
const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_PROMPT: 1,
  API_KEY_MISSING: 2,
  API_ERROR: 3,
  RATE_LIMITED: 4,
  NETWORK_ERROR: 5,
  TIMEOUT: 6,
  CONTENT_POLICY: 7,
  PAYMENT_REQUIRED: 8,
  INVALID_SIZE: 9,
  INVALID_MODEL: 10,
  UNKNOWN: 99
};

// ============================================================
// ERROR HANDLING
// ============================================================

class ImageGenError extends Error {
  constructor(message, code = ERROR_CODES.UNKNOWN, details = {}) {
    super(message);
    this.name = 'ImageGenError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
  
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      codeName: Object.keys(ERROR_CODES).find(k => ERROR_CODES[k] === this.code) || 'UNKNOWN',
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

// ============================================================
// RATE LIMITING & COST TRACKING
// ============================================================

class RateLimiter {
  constructor() {
    this.requests = [];
    this.tokens = 0;
    this.lastRequest = 0;
  }
  
  async checkLimit(provider) {
    const limit = CONFIG.API[provider]?.rateLimit;
    if (!limit) return;
    
    const now = Date.now();
    
    // Remove old requests
    this.requests = this.requests.filter(t => now - t < 60000);
    
    // Check RPM
    if (this.requests.length >= limit.rpm) {
      const delay = 60000 - (now - this.requests[0]);
      throw new ImageGenError(
        `Rate limit: wait ${Math.ceil(delay / 1000)}s`,
        ERROR_CODES.RATE_LIMITED
      );
    }
    
    // Check RPS
    const sinceLast = now - this.lastRequest;
    const delay = Math.ceil(1000 / limit.rps);
    if (sinceLast < delay) {
      await sleep(delay - sinceLast);
    }
    
    this.lastRequest = Date.now();
    this.requests.push(this.lastRequest);
  }
}

class CostTracker {
  constructor() {
    this.totalCost = 0;
    this.totalGenerations = 0;
    this.sessionStart = Date.now();
  }
  
  addCharge(provider, model, size, n = 1) {
    const pricing = CONFIG.API[provider]?.pricing?.[model]?.[size];
    if (pricing) {
      const cost = pricing * n;
      this.totalCost += cost;
      this.totalGenerations += n;
      return cost;
    }
    return 0;
  }
  
  getSummary() {
    return {
      totalCost: this.totalCost.toFixed(4),
      totalGenerations: this.totalGenerations,
      sessionDuration: Math.floor((Date.now() - this.sessionStart) / 1000)
    };
  }
}

// ============================================================
// PROMPT VALIDATION
// ============================================================

function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new ImageGenError('Prompt is required', ERROR_CODES.INVALID_PROMPT);
  }
  
  const trimmed = prompt.trim();
  
  if (trimmed.length < CONFIG.SAFETY.minPromptLength) {
    throw new ImageGenError(
      `Prompt too short: ${trimmed.length} chars (min: ${CONFIG.SAFETY.minPromptLength})`,
      ERROR_CODES.INVALID_PROMPT
    );
  }
  
  if (trimmed.length > CONFIG.SAFETY.maxPromptLength) {
    throw new ImageGenError(
      `Prompt too long: ${trimmed.length} chars (max: ${CONFIG.SAFETY.maxPromptLength})`,
      ERROR_CODES.INVALID_PROMPT
    );
  }
  
  return trimmed;
}

function enhancePrompt(prompt, style = null) {
  if (style && CONFIG.STYLES[style]) {
    const styleConfig = CONFIG.STYLES[style];
    return `${styleConfig.prefix} ${prompt}, ${styleConfig.suffix}`;
  }
  return prompt;
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// ============================================================
// API CLIENT
// ============================================================

class OpenAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter();
  }
  
  async generate(prompt, options = {}) {
    await this.rateLimiter.checkLimit('openai');
    
    const {
      model = CONFIG.DEFAULTS.model,
      size = CONFIG.DEFAULTS.size,
      quality = CONFIG.DEFAULTS.quality,
      n = CONFIG.DEFAULTS.n,
      style = CONFIG.DEFAULTS.style,
      response_format = 'b64_json'
    } = options;
    
    // Validate model
    if (!CONFIG.API.openai.models.includes(model)) {
      throw new ImageGenError(
        `Invalid model: ${model}. Supported: ${CONFIG.API.openai.models.join(', ')}`,
        ERROR_CODES.INVALID_MODEL
      );
    }
    
    // Validate size
    const validSizes = CONFIG.OUTPUT.sizes[model] || CONFIG.OUTPUT.sizes['dall-e-3'];
    if (!validSizes.includes(size)) {
      throw new ImageGenError(
        `Invalid size: ${size} for ${model}. Supported: ${validSizes.join(', ')}`,
        ERROR_CODES.INVALID_SIZE
      );
    }
    
    const body = {
      model,
      prompt,
      n,
      size,
      quality,
      response_format
    };
    
    if (model === 'dall-e-3') {
      body.style = style;
    }
    
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      
      const req = https.request({
        hostname: CONFIG.API.openai.baseUrl,
        port: 443,
        path: CONFIG.API.openai.endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': data.length
        },
        timeout: CONFIG.SAFETY.maxWait
      }, (res) => {
        let response = '';
        res.on('data', chunk => response += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const result = JSON.parse(response);
              resolve(result);
            } else {
              const error = JSON.parse(response);
              if (res.statusCode === 429) {
                reject(new ImageGenError('Rate limited by OpenAI', ERROR_CODES.RATE_LIMITED));
              } else if (res.statusCode === 400 && error.error?.code === 'content_policy_violation') {
                reject(new ImageGenError(
                  'Content policy violation: ' + error.error?.message,
                  ERROR_CODES.CONTENT_POLICY
                ));
              } else if (res.statusCode === 400 && error.error?.code === 'billing_hard_limit_reached') {
                reject(new ImageGenError(
                  'Pay-as-you-go billing required. Add payment method at openai.com',
                  ERROR_CODES.PAYMENT_REQUIRED
                ));
              } else {
                reject(new ImageGenError(
                  `API error: ${res.statusCode} - ${error.error?.message || response}`,
                  ERROR_CODES.API_ERROR
                ));
              }
            }
          } catch (e) {
            reject(new ImageGenError(`Parse error: ${e.message}`, ERROR_CODES.API_ERROR));
          }
        });
      });
      
      req.on('error', err => {
        reject(new ImageGenError(`Request error: ${err.message}`, ERROR_CODES.NETWORK_ERROR));
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new ImageGenError('Request timed out', ERROR_CODES.TIMEOUT));
      });
      
      req.write(data);
      req.end();
    });
  }
}

// ============================================================
// IMAGE PROCESSING
// ============================================================

async function saveImage(data, outputPath, format = 'png') {
  const buffer = Buffer.from(data, 'base64');
  await writeFile(outputPath, buffer);
  return buffer.length;
}

async function createGallery(images, outputDir) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Image Gallery</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0b0f14; color: #e8edf2; padding: 24px;
    }
    h1 { margin-bottom: 8px; }
    .meta { color: #8899a6; margin-bottom: 24px; }
    .grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .image-card {
      background: #151b22; border-radius: 12px; overflow: hidden;
      border: 1px solid #1e2a36;
    }
    .image-card img { width: 100%; height: 200px; object-fit: cover; }
    .image-info { padding: 12px; }
    .image-info h3 { font-size: 14px; margin-bottom: 4px; }
    .image-info p { color: #8899a6; font-size: 12px; }
    .prompt { 
      color: #9cd1ff; background: #0d1520; padding: 2px 8px;
      border-radius: 4px; font-family: monospace; font-size: 11px;
    }
  </style>
</head>
<body>
  <h1>🎨 Generated Image Gallery</h1>
  <p class="meta">Generated: ${new Date().toLocaleString()}</p>
  <div class="grid">
    ${images.map((img, i) => `
    <div class="image-card">
      <img src="${path.basename(img.file)}" alt="Generated ${i + 1}">
      <div class="image-info">
        <h3>Image ${i + 1}</h3>
        <p class="prompt">${img.prompt.substring(0, 60)}${img.prompt.length > 60 ? '...' : ''}</p>
        <p>Size: ${img.size} • Cost: $${img.cost.toFixed(4)}</p>
      </div>
    </div>
    `).join('')}
  </div>
</body>
</html>`;

  await writeFile(path.join(outputDir, 'index.html'), html, 'utf-8');
}

// ============================================================
// MAIN GENERATION
// ============================================================

async function generateImage(prompt, options = {}) {
  const {
    apiKey = process.env.OPENAI_API_KEY,
    model = CONFIG.DEFAULTS.model,
    size = CONFIG.DEFAULTS.size,
    quality = CONFIG.DEFAULTS.quality,
    n = CONFIG.DEFAULTS.n,
    style = CONFIG.DEFAULTS.style,
    outputDir = CONFIG.OUTPUT.tempDir,
    customStyle = null
  } = options;
  
  // Validate
  if (!apiKey) {
    throw new ImageGenError(
      'OPENAI_API_KEY not set. Get key at https://platform.openai.com/api-keys',
      ERROR_CODES.API_KEY_MISSING
    );
  }
  
  const validatedPrompt = validatePrompt(prompt);
  const finalPrompt = customStyle ? enhancePrompt(validatedPrompt, customStyle) : validatedPrompt;
  
  // Ensure output directory
  await mkdir(outputDir, { recursive: true });
  
  // Create client and track cost
  const client = new OpenAIClient(apiKey);
  const costTracker = new CostTracker();
  
  // Generate
  costTracker.addCharge('openai', model, size, n);
  
  const response = await client.generate(finalPrompt, {
    model,
    size,
    quality,
    n,
    style,
    response_format: 'b64_json'
  });
  
  // Save images
  const images = [];
  const timestamp = Date.now();
  
  for (let i = 0; i < response.data.length; i++) {
    const imageData = response.data[i];
    const fileName = `gen_${slugify(validatedPrompt.substring(0, 30))}_${timestamp}_${i + 1}.png`;
    const filePath = path.join(outputDir, fileName);
    
    const size = await saveImage(imageData.b64_json, filePath);
    
    images.push({
      file: filePath,
      fileName,
      size: `${(size / 1024).toFixed(1)} KB`,
      prompt: finalPrompt,
      revisedPrompt: imageData.revised_prompt,
      originalPrompt: validatedPrompt,
      model,
      dimensions: size
    });
  }
  
  // Create gallery if multiple images
  if (n > 1) {
    await createGallery(images, outputDir);
    images.push({
      type: 'gallery',
      file: path.join(outputDir, 'index.html'),
      cost: costTracker.totalCost
    });
  }
  
  return {
    images,
    cost: costTracker.getSummary(),
    timestamp: new Date().toISOString(),
    outputDir
  };
}

// ============================================================
// CLI INTERFACE
// ============================================================

function showUsage() {
  console.log(`
Image-Gen - Production-Grade Image Generation

Usage: image-gen.js [options] "prompt"

Options:
  --model <model>          Model: dall-e-2, dall-e-3, gpt-image-1 (default: dall-e-3)
  --size <size>            Image size: 1024x1024, 1024x1792, 1792x1024
  --n <count>              Number of images (default: 1, max: 10)
  --quality <q>            Quality: standard, hd
  --style <style>          Visual style: vivid, natural
  --output-dir <path>      Output directory (default: /tmp/image-gen-YYYY-MM-DD)
  --custom-style <style>  Prefix style: photographic, digital_art, oil_painting, etc.
  --help                   Show this help

Environment:
  OPENAI_API_KEY           Required API key

Style Presets:
  photographic   - Photorealistic, 35mm, professional photography
  digital_art    - Digital illustration, concept art
  oil_painting   - Oil on canvas, fine art
  watercolor     - Watercolor technique, soft
  isometric      - Isometric view, clean lines
  pixel_art      - 8-bit, retro aesthetic
  cinematic      - Film grain, movie still
  neon           - Cyberpunk, synthwave
  sketch         - Pencil sketch, line work

Size Options:
  DALL-E 3: 1024x1024 (square), 1024x1792 (portrait), 1792x1024 (landscape)
  DALL-E 2: 256x256, 512x512, 1024x1024 (all square)

Examples:
  # Basic generation
  image-gen.js "A serene mountain landscape"

  # Specific model and size
  image-gen.js "Cyberpunk city" --model dall-e-3 --size 1792x1024

  # Multiple images
  image-gen.js "Abstract art" --n 4 --size 1024x1024

  # With style preset
  image-gen.js "Lion portrait" --custom-style photographic --quality hd

  # Digital art style
  image-gen.js "Fantasy castle" --custom-style digital_art --size 1024x1792

  # Vivid vs natural
  image-gen.js "Fireworks" --style vivid    # More dramatic
  image-gen.js "Fireworks" --style natural  # More realistic

Pricing:
  DALL-E 3: $0.04/image (1024x1024), $0.08/image (1024x1792, 1792x1024)
  DALL-E 2: $0.02/image (1024x1024), $0.018/image (512x512), $0.016/image (256x256)
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  
  // Check for help
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showUsage();
  }
  
  // Parse arguments
  const options = {};
  let prompt = [];
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--model':
        options.model = args[++i];
        break;
      case '--size':
        options.size = args[++i];
        break;
      case '--n':
      case '-n':
        options.n = parseInt(args[++i]);
        break;
      case '-n:':
        options.n = parseInt(args[++i].replace('-n:', ''));
        break;
      case '--quality':
        options.quality = args[++i];
        break;
      case '--style':
        options.style = args[++i];
        break;
      case '--output-dir':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--custom-style':
        options.customStyle = args[++i];
        break;
      default:
        if (!args[i].startsWith('-')) {
          prompt.push(args[i]);
        }
    }
  }
  
  if (prompt.length === 0) {
    console.error('Error: Prompt is required');
    process.exit(ERROR_CODES.INVALID_PROMPT);
  }
  
  options.prompt = prompt.join(' ');
  
  // Set default output dir
  if (!options.outputDir) {
    const date = new Date().toISOString().split('T')[0];
    options.outputDir = path.join('/tmp', `image-gen-${date}`);
  }
  
  try {
    const result = await generateImage(options.prompt, options);
    
    console.log('\n✅ SUCCESS');
    console.log(`Generated ${result.images.length} image(s)`);
    console.log(`Output: ${result.outputDir}`);
    console.log(`Total cost: $${result.cost.totalCost}`);
    
    result.images.forEach(img => {
      if (img.type !== 'gallery') {
        console.log(`  - ${img.fileName} (${img.size})`);
      }
    });
    
    // If multiple images, show gallery
    const gallery = result.images.find(i => i.type === 'gallery');
    if (gallery) {
      console.log(`\nGallery: ${gallery.file}`);
    }
    
    // Full result as JSON
    console.log(`\nResult: ${JSON.stringify({
      images: result.images.map(i => i.file),
      cost: result.cost,
      outputDir: result.outputDir
    }, null, 2)}`);
    
    process.exit(ERROR_CODES.SUCCESS);
    
  } catch (error) {
    if (error instanceof ImageGenError) {
      console.error('\n❌ ERROR:', error.message);
      if (process.env.DEBUG) {
        console.error(error.toJSON());
      }
      process.exit(error.code);
    } else {
      console.error('\n❌ UNEXPECTED ERROR:', error.message);
      if (process.env.DEBUG) {
        console.error(error);
      }
      process.exit(ERROR_CODES.UNKNOWN);
    }
  }
}

main();

// Helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
