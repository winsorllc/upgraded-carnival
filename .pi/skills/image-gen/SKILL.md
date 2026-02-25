---
name: image-gen
description: "Generate images via OpenAI Images API (DALL-E 3, GPT-image models). Requires OPENAI_API_KEY secret. Use when you need to create AI-generated images from text prompts."
---

# Image Generation Skill

Generate images using OpenAI's image generation API (DALL-E 3, GPT-image models).

## When to Use

✅ **USE this skill when:**

- "Generate an image of..."
- "Create a picture of..."
- "Make an AI image of..."
- "Design a logo/concept art/etc."
- Generating visual content from text descriptions

## When NOT to Use

❌ **DON'T use this skill when:**

- Editing existing images → use image editing tools
- Creating vector graphics → use design software
- Screenshots → use screenshot tools

## Setup

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Add it to your secrets as `OPENAI_API_KEY`

## Commands

### Basic Generation

```bash
{baseDir}/generate.py --prompt "a serene mountain landscape at sunset"
{baseDir}/generate.py --prompt "ultra-detailed studio photo of a lobster astronaut"
```

### Specify Model

```bash
{baseDir}/generate.py --model dall-e-3 --prompt "digital art of a cyberpunk city"
{baseDir}/generate.py --model gpt-image-1 --prompt "product photo of a smart watch"
```

### Multiple Images

```bash
{baseDir}/generate.py --count 4 --prompt "abstract geometric patterns"
{baseDir}/generate.py --count 16 --model gpt-image-1 --prompt "minimalist icons"
```

### Size and Quality

```bash
{baseDir}/generate.py --size 1792x1024 --prompt "panoramic landscape"
{baseDir}/generate.py --quality hd --model dall-e-3 --prompt "photorealistic portrait"
{baseDir}/generate.py --size 1536x1024 --model gpt-image-1 --quality high
```

### Output Directory

```bash
{baseDir}/generate.py --out-dir /tmp/images --prompt "sunset over ocean"
```

## Model Options

### DALL-E 3
- Sizes: `1024x1024`, `1792x1024`, `1024x1792`
- Quality: `standard`, `hd`
- Styles: `vivid` (dramatic), `natural` (realistic)
- Max images: 1 per request

### DALL-E 2
- Sizes: `256x256`, `512x512`, `1024x1024`
- Quality: `standard`
- Max images: multiple

### GPT-image models
- Sizes: `1024x1024`, `1536x1024`, `1024x1536`, `auto`
- Quality: `low`, `medium`, `high`, `auto`
- Background: `transparent`, `opaque`, `auto`
- Format: `png`, `jpeg`, `webp`

## Style Prompts

**Photography:**
- "35mm film still of..."
- "studio lighting, professional photography"
- "golden hour, cinematic"

**Illustration:**
- "isometric illustration of..."
- "vector art, flat design"
- "watercolor painting of..."

**Abstract:**
- "abstract geometric composition"
- "minimalist design"
- "digital art, vibrant colors"

## Notes

- Images are saved locally with auto-generated names
- HTML gallery `index.html` is created for easy viewing
- Prompts are logged to `prompts.json`
- Rate limits apply based on your OpenAI plan