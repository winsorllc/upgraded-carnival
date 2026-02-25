#!/usr/bin/env node

/**
 * Image Generation Tool
 * Generate images using OpenAI's DALL-E API
 */

const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations';

const MODELS = ['dall-e-3', 'dall-e-2'];
const SIZES = {
  'dall-e-3': ['1024x1024', '1024x1792', '1792x1024'],
  'dall-e-2': ['256x256', '512x512', '1024x1024']
};
const QUALITIES = ['standard', 'hd'];
const STYLES = ['vivid', 'natural'];

// Default options
const DEFAULTS = {
  model: 'dall-e-3',
  size: '1024x1024',
  quality: 'standard',
  style: 'vivid',
  n: 1
};

async function generateImage(options) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY must be set');
  }
  
  const { 
    prompt,
    model = DEFAULTS.model,
    size = DEFAULTS.size,
    quality = DEFAULTS.quality,
    style = DEFAULTS.style,
    n = DEFAULTS.n
  } = options;
  
  if (!prompt) {
    throw new Error('prompt is required');
  }
  
  if (!MODELS.includes(model)) {
    throw new Error(`Invalid model. Choose from: ${MODELS.join(', ')}`);
  }
  
  const validSizes = SIZES[model];
  if (!validSizes.includes(size)) {
    throw new Error(`Invalid size for ${model}. Choose from: ${validSizes.join(', ')}`);
  }
  
  if (model === 'dall-e-3') {
    if (!QUALITIES.includes(quality)) {
      throw new Error(`Invalid quality. Choose from: ${QUALITIES.join(', ')}`);
    }
    if (!STYLES.includes(style)) {
      throw new Error(`Invalid style. Choose from: ${STYLES.join(', ')}`);
    }
    if (n > 1) {
      throw new Error('DALL-E 3 only supports n=1');
    }
  }
  
  if (model === 'dall-e-2' && n > 10) {
    throw new Error('DALL-E 2 supports maximum n=10');
  }
  
  const requestBody = {
    model,
    prompt,
    n: model === 'dall-e-3' ? 1 : n,
    size,
    ...(model === 'dall-e-3' && { quality, style })
  };
  
  const response = await fetch(OPENAI_IMAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  
  // Extract image data
  const images = data.data.map(img => ({
    url: img.url,
    revisedPrompt: img.revised_prompt
  }));
  
  return {
    success: true,
    model: data.model || model,
    images,
    created: data.created
  };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Image Generation Tool (OpenAI DALL-E)

Usage: node image-gen.js [options]

Options:
  --prompt <text>     Prompt for image generation (required)
  --model <name>      Model: dall-e-3 (default) or dall-e-2
  --size <WxH>        Image size
                       DALL-E 3: 1024x1024, 1024x1792, 1792x1024
                       DALL-E 2: 256x256, 512x512, 1024x1024
  --quality <name>    Quality: standard, hd (DALL-E 3 only)
  --style <name>      Style: vivid, natural (DALL-E 3 only)
  --n <num>           Number of images (DALL-E 2: 1-10, DALL-E 3: 1)
  --help, -h          Show this help

Environment Variables:
  OPENAI_API_KEY      Your OpenAI API key

Example:
  OPENAI_API_KEY=sk-... node image-gen.js --prompt "A futuristic city"
`);
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
  }
  
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) options.prompt = args[++i];
    else if (args[i] === '--model' && args[i + 1]) options.model = args[++i];
    else if (args[i] === '--size' && args[i + 1]) options.size = args[++i];
    else if (args[i] === '--quality' && args[i + 1]) options.quality = args[++i];
    else if (args[i] === '--style' && args[i + 1]) options.style = args[++i];
    else if (args[i] === '--n' && args[i + 1]) options.n = parseInt(args[++i]);
  }
  
  try {
    const result = await generateImage(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  }
}

// Export for use as a module
module.exports = { generateImage };

// Run if executed directly
if (require.main === module) {
  main();
}
