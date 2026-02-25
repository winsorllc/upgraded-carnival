---
name: image-gen
description: Generate images via OpenAI's DALL-E API. Use when user wants to create images from text descriptions. Requires OPENAI_API_KEY environment variable.
version: 1.0.0
tags:
  - openai
  - dall-e
  - image
  - generation
  - ai
---

# Image Generation Skill

Generate images using OpenAI's DALL-E models.

## Setup

Requires environment variable:
- `OPENAI_API_KEY` - Your OpenAI API key

## Capabilities

- Generate images using DALL-E 3 (default) or DALL-E 2
- Custom prompt, size, quality, and style options
- Save images to local files or return base64
- Support for multiple images per prompt

## Usage

```javascript
// Generate a single image
const result = await imageGen({
  prompt: "A cute cat sitting on a windowsill"
});

// Generate multiple images with custom settings
const result = await imageGen({
  prompt: "Futuristic city with flying cars",
  model: "dall-e-3",
  size: "1024x1024",
  quality: "hd",
  style: "vivid",
  n: 1
});
```
