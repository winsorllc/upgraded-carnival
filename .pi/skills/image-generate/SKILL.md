---
name: image-generate
description: "Generate images from text prompts using OpenAI DALL-E 3 or other compatible APIs. Use when: user requests image creation, visual content generation, or illustrations. NOT for: editing existing images, image analysis, or text-to-speech."
metadata: { "openclaw": { "emoji": "🎨", "requires": { "env": ["OPENAI_API_KEY"] }, "primaryEnv": "OPENAI_API_KEY" } }
---

# Image Generation Skill

Generate images from text descriptions using AI.

## When to Use

✅ **USE this skill when:**

- User asks to "create an image of..."
- "Generate a picture showing..."
- Need illustrations for content
- Visual brainstorming or concept art

## When NOT to Use

❌ **DON'T use this skill when:**

- Editing existing images → use image editing tools
- Analyzing image content → use vision/OCR tools
- Creating diagrams/charts → use charting libraries
- Text-to-speech → use TTS services

## Setup

Requires `OPENAI_API_KEY` environment variable.

```bash
export OPENAI_API_KEY="sk-..."
```

## API Usage

### Basic Image Generation

```bash
curl -X POST "https://api.openai.com/v1/images/generations" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "prompt": "A sunset over mountains",
    "n": 1,
    "size": "1024x1024"
  }'
```

### Response Format

```json
{
  "created": 1234567890,
  "data": [
    {
      "url": "https://...",
      "revised_prompt": "..."
    }
  ]
}
```

### Size Options

- `1024x1024` (default)
- `1024x1792` (portrait)
- `1792x1024` (landscape)

### Quality Options

- `standard` (default, faster)
- `hd` (higher quality, slower)

### Style Options

- `vivid` (default, dramatic)
- `natural` (photorealistic)

## Advanced Options

### With Custom Parameters

```bash
curl -X POST "https://api.openai.com/v1/images/generations" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "prompt": "A cyberpunk city at night",
    "n": 1,
    "size": "1792x1024",
    "quality": "hd",
    "style": "vivid"
  }'
```

### Multiple Variations (DALL-E 2)

```bash
# First generate the base image
BASE_RESPONSE=$(curl -X POST "https://api.openai.com/v1/images/generations" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-2",
    "prompt": "A cat",
    "n": 1,
    "size": "1024x1024"
  }')

# Then create variations (requires image URL from first response)
curl -X POST "https://api.openai.com/v1/images/variations" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F "image=@image.png" \
  -F "n=4" \
  -F "size=1024x1024"
```

## Node.js Implementation

```javascript
const fetch = require('node-fetch');

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

// Download image helper
async function downloadImage(url, outputPath) {
  const fs = require('fs');
  const response = await fetch(url);
  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

// Usage
const result = await generateImage('A futuristic city with flying cars', {
  size: '1792x1024',
  quality: 'hd',
  style: 'vivid'
});

console.log('Generated:', result.urls[0]);
await downloadImage(result.urls[0], '/tmp/generated.png');
```

## Prompt Tips

### Good Prompts

- **Be specific:** "A red apple on a wooden table" vs "apple"
- **Include style:** "photorealistic", "oil painting", "digital art"
- **Set the mood:** "sunset lighting", "dramatic shadows"
- **Define composition:** "close-up", "wide angle", "portrait"

### Prompt Template

```
[subject] + [action/state] + [environment] + [lighting] + [style]

Example: "A wise owl (subject) perched on a branch (action) 
in an enchanted forest (environment) with moonlight filtering 
through leaves (lighting), digital painting style (style)"
```

### Avoid

- Too many subjects (keep it focused)
- Contradictory descriptions
- Overly complex scenes
- Text within images (DALL-E struggles with text)

## Error Handling

```javascript
async function safeGenerateImage(prompt) {
  try {
    const result = await generateImage(prompt);
    return { success: true, ...result };
  } catch (error) {
    if (error.message.includes('content_policy')) {
      return { success: false, error: 'Content violated policy' };
    }
    if (error.message.includes('rate_limit')) {
      return { success: false, error: 'Rate limit exceeded' };
    }
    return { success: false, error: error.message };
  }
}
```

## Cost Reference

- **DALL-E 3 Standard:** ~$0.040/image (1024x1024)
- **DALL-E 3 HD:** ~$0.080/image (1024x1024)
- **DALL-E 2:** ~$0.020/image (1024x1024)

## Quick Response Template

**"Generate an image of [X]"**

```javascript
const result = await generateImage(prompt, { size: '1024x1024' });
return `🎨 **Image Generated**

**Prompt:** ${prompt}
**Revised:** ${result.revisedPrompts[0]}

![Generated Image](${result.urls[0]})

[Download](${result.urls[0]})
`;
```

## Notes

- DALL-E 3 takes ~10-30 seconds per image
- Images expire after ~1 hour — download immediately
- Content policy restrictions apply (no violence, celebrities, etc.)
- 4096 characters max prompt length
