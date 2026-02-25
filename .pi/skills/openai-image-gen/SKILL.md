---
name: openai-image-gen
description: Generate images via OpenAI Images API (DALL-E, GPT Image). Use when you need to create images from text prompts.
---

# OpenAI Image Gen

Generate images using OpenAI's DALL-E or GPT Image models.

## Setup

```bash
export OPENAI_API_KEY="your-api-key"
```

## Quick Start

```bash
# Generate images with DALL-E 3
openai images generate --model dall-e-3 --prompt "a cute cat"

# DALL-E 2
openai images generate --model dall-e-2 --prompt "sunset over ocean" --n 3

# GPT Image (latest)
openai images generate --model gpt-image-1 --prompt "product photo of a sneaker"
```

## CLI Options

| Flag | Description |
|------|-------------|
| `--model` | Model: dall-e-2, dall-e-3, gpt-image-1 |
| `--prompt` | Text description of desired image |
| `--n` | Number of images (1-10 for DALL-E 2) |
| `--size` | 1024x1024, 1792x1024, 1024x1792 |
| `--quality` | standard, hd (DALL-E 3), auto (GPT Image) |
| `--style` | vivid, natural (DALL-E 3) |
| `--response-format` | url or b64_json |
| `--output` | Save to file |

## Examples

```bash
# Single image, save to file
openai images generate --model dall-e-3 --prompt "a cozy coffee shop" --output image.png

# Multiple images
openai images generate --model dall-e-2 --prompt "abstract art" --n 4

# HD quality with specific size
openai images generate --model dall-e-3 --prompt "landscape" --quality hd --size 1792x1024
```

## Using Node.js

```javascript
import OpenAI from 'openai';

const openai = new OpenAI();

const response = await openai.images.generate({
  model: "dall-e-3",
  prompt: "a serene mountain landscape at sunset",
  n: 1,
  size: "1024x1024",
  quality: "standard",
  style: "vivid"
});

console.log(response.data[0].url);
```

## Using Python

```python
from openai import OpenAI
client = OpenAI()

response = client.images.generate(
  model="dall-e-3",
  prompt="a cozy cabin in the woods",
  n=1,
  size="1024x1024",
  quality="standard",
  style="vivid"
)

print(response.data[0].url)
```

## Notes

- DALL-E 3 automatically generates 1 image per request
- DALL-E 2 can generate up to 10 images
- Images are available for 1 hour after generation
- Always review generated images before sharing
