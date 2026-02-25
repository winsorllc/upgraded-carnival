const fs = require('fs');
const path = require('path');

async function generateImage(prompt, options = {}) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'dall-e-3',
      prompt: prompt,
      n: options.count || 1,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      style: options.style || 'vivid'
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Image generation failed');
  }

  return {
    urls: data.data.map(img => img.url),
    revisedPrompts: data.data.map(img => img.revised_prompt),
    created: data.created
  };
}

async function downloadImage(url, outputPath) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log('Usage: node index.js <command> [options]');
    console.log('Commands:');
    console.log('  generate <prompt> [--size 1024x1024] [--quality hd] [--style vivid]');
    console.log('  download <url> <output_path>');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'generate': {
        const prompt = args.slice(1).find(a => !a.startsWith('--'));
        if (!prompt) {
          console.error('Prompt required');
          process.exit(1);
        }

        const options = {};
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '--size' && args[i + 1]) {
            options.size = args[++i];
          } else if (args[i] === '--quality' && args[i + 1]) {
            options.quality = args[++i];
          } else if (args[i] === '--style' && args[i + 1]) {
            options.style = args[++i];
          }
        }

        console.log('Generating image...');
        const result = await generateImage(prompt, options);
        
        console.log('\n✅ Image Generated!');
        console.log('URL:', result.urls[0]);
        console.log('Revised Prompt:', result.revisedPrompts[0]);
        break;
      }

      case 'download': {
        const url = args[1];
        const outputPath = args[2] || '/tmp/generated.png';
        
        if (!url) {
          console.error('URL required');
          process.exit(1);
        }

        await downloadImage(url, outputPath);
        console.log('Downloaded to:', outputPath);
        break;
      }

      default:
        console.error('Unknown command:', command);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateImage,
  downloadImage
};
