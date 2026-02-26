---
name: image-gen
description: "Production-grade AI image generation with DALL-E 3 integration. Multiple models, style presets, batch processing, cost tracking, rate limiting, and automated gallery creation. Supports various sizes, quality levels, and custom style templates."
metadata:
  version: "2.0.0"
  author: "Pi Agent"
  requires:
    bins: ["node"]
    env: ["OPENAI_API_KEY"]
  category: "media"
  tags: ["ai", "image-generate", "dalle", "openai", "images", "art"]
---

# Image-Gen Skill

Production-grade AI image generation with DALL-E 3/2 support, cost tracking, and comprehensive style presets.

## When to Use

✅ **USE this skill when:**

- Creating AI-generated images from text prompts
- Needing custom illustrations or concept art
- Generating multiple variations of images
- Creating visual content for presentations
- Designing graphics or mockups
- Needing AI art in specific styles
- Batch generating images for testing
- Needing programmatic image generation

❌ **DON'T use this skill when:**

- Editing existing images → Use image editing tools
- Creating vector graphics → Use design software
- Needing screenshots → Use screenshot tools
- Generating animations → Use video generation
- Needing stock photos → Use stock photo services

## Prerequisites

```bash
# 1. Get OpenAI API Key
# Visit: https://platform.openai.com/api-keys
# Create and copy your API key

# 2. Set environment variable
export OPENAI_API_KEY="sk-your-api-key-here"

# 3. Verify
node --version
```

## Commands

### Basic Usage

```bash
# Generate image with default settings (DALL-E 3, 1024x1024)
{baseDir}/image-gen.js "A serene mountain landscape at sunset"

# Generate with specific model
{baseDir}/image-gen.js "Cyberpunk city" --model dall-e-3

# Generate multiple images
{baseDir}/image-gen.js "Abstract art" --n 4

# Output to specific directory
{baseDir}/image-gen.js "Ocean waves" --output-dir ./my-images
```

### Model Selection

```bash
# DALL-E 3 - Best quality, $0.04/image
{baseDir}/image-gen.js "A photo of a cat" --model dall-e-3

# DALL-E 2 - Faster, $0.02/image
{baseDir}/image-gen.js "A photo of a cat" --model dall-e-2
```

**Model Comparison:**
| Model | Quality | Cost | Sizes | Best For |
|-------|---------|------|-------|----------|
| DALL-E 3 | Excellent | $0.04 | 1024x1024, 1024x1792, 1792x1024 | Production use |
| DALL-E 2 | Good | $0.02 | 256x256, 512x512, 1024x1024 | Quick drafts |

### Size Options

```bash
# DALL-E 3 sizes
{baseDir}/image-gen.js "Portrait of a person" --size 1024x1792    # Portrait
{baseDir}/image-gen.js "Landscape scene" --size 1792x1024          # Landscape
{baseDir}/image-gen.js "Square composition" --size 1024x1024       # Square

# DALL-E 2 sizes
{baseDir}/image-gen.js "Avatar" --model dall-e-2 --size 256x256     # Small avatar
{baseDir}/image-gen.js "Icon" --model dall-e-2 --size 512x512       # Icon size
```

**Size Pricing (DALL-E 3):**
| Size | Cost | Aspect Ratio |
|------|------|--------------|
| 1024x1024 | $0.04 | 1:1 Square |
| 1024x1792 | $0.08 | 9:16 Portrait |
| 1792x1024 | $0.08 | 16:9 Landscape |

### Quality Settings

```bash
# Standard quality (default, faster)
{baseDir}/image-gen.js "A photo of a flower" --quality standard

# HD quality (slower, better detail)
{baseDir}/image-gen.js "A photo of a flower" --quality hd --size 1024x1792
```

**Quality Comparison:**
| Quality | Detail Level | Processing Time | Cost |
|---------|--------------|-----------------|------|
| `standard` | Good | ~10-15s | Standard |
| `hd` | Excellent | ~20-25s | Same price, more detail |

### Visual Style

```bash
# Vivid style (more dramatic, default)
{baseDir}/image-gen.js "Fireworks display" --style vivid

# Natural style (more realistic)
{baseDir}/image-gen.js "Fireworks display" --style natural
```

### Custom Style Presets

```bash
# Photographic
{baseDir}/image-gen.js "Lion portrait" --custom-style photographic
# Result: "A photorealistic image of Lion portrait, professional photography, 35mm, high detail, 8k"

# Digital Art
{baseDir}/image-gen.js "Fantasy castle" --custom-style digital_art
# Result: "A digital illustration of Fantasy castle, digital art, concept art, trending on artstation"

# Cinematic
{baseDir}/image-gen.js "Warrior in battle" --custom-style cinematic
# Result: "Cinematic scene of Warrior in battle, cinematic lighting, film grain, movie still, anamorphic"

# Watercolor
{baseDir}/image-gen.js "Sunset over mountains" --custom-style watercolor
# Result: "A watercolor painting of Sunset over mountains, wet-on-wet technique, soft colors, artistic"
```

**Available Style Presets:**

| Style | Prefix | Suffix |
|-------|--------|--------|
| `photographic` | "A photorealistic image of" | "professional photography, 35mm, high detail, 8k" |
| `digital_art` | "A digital illustration of" | "digital art, concept art, trending on artstation" |
| `oil_painting` | "An oil painting of" | "oil on canvas, fine art, impressionist style" |
| `watercolor` | "A watercolor painting of" | "wet-on-wet technique, soft colors, artistic" |
| `isometric` | "Isometric illustration of" | "isometric view, clean lines, vector style" |
| `pixel_art` | "Pixel art of" | "8-bit style, pixel art, retro aesthetic" |
| `cinematic` | "Cinematic scene of" | "cinematic lighting, film grain, movie still" |
| `neon` | "Cyberpunk neon art of" | "neon lights, night scene, cyberpunk, synthwave" |
| `sketch` | "Pencil sketch of" | "hand-drawn sketch, detailed line work, artistic" |

### Batch Generation

```bash
# Generate 4 variations
{baseDir}/image-gen.js "Product photo of a wristwatch" --n 4

# Generate 10 variations (max)
{baseDir}/image-gen.js "Logo concept" --n 10
```

**Batch Output:**
```
/tmp/image-gen-2024-01-15/
├── gen_product-photo_1705312345678_1.png
├── gen_product-photo_1705312345678_2.png
├── gen_product-photo_1705312345678_3.png
├── gen_product-photo_1705312345678_4.png
└── index.html  (gallery view)
```

## Features

### Rate Limiting

Built-in protection against API limits:
- Default: 5 requests per minute
- 1 request per second minimum
- Automatic delays between requests

```bash
# First request
{baseDir}/image-gen.js "Image 1"

# Second request (automatically delayed)
{baseDir}/image-gen.js "Image 2"
```

### Cost Tracking

Automatic cost calculation and reporting:

```
Total cost: $0.16
Images: 4
Session: 45s
```

**DALL-E Pricing:**
| Model | Size | Cost per Image |
|-------|------|----------------|
| DALL-E 3 | 1024x1024 | $0.04 |
| DALL-E 3 | 1024x1792 | $0.08 |
| DALL-E 3 | 1792x1024 | $0.08 |
| DALL-E 2 | 1024x1024 | $0.02 |
| DALL-E 2 | 512x512 | $0.018 |
| DALL-E 2 | 256x256 | $0.016 |

### Gallery Generation

When generating multiple images, an HTML gallery is automatically created.

```bash
{baseDir}/image-gen.js "Abstract patterns" --n 4
```

Opens in browser with:
- Thumbnail grid
- Full-size preview on click
- Metadata for each image (prompt, size, cost)
- Dark theme styling

### Error Handling

**Content Policy Violations:**
```bash
{baseDir}/image-gen.js "Inappropriate content"
# ❌ ERROR: Content policy violation: This prompt may violate OpenAI's content policy
```

**Rate Limiting:**
```bash
# After many requests:
{baseDir}/image-gen.js "Another image"
# ... waits and retries automatically
```

**Payment Required:**
```bash
{baseDir}/image-gen.js "Test image"
# ❌ ERROR: Pay-as-you-go billing required. Add payment method at openai.com
```

## Error Handling

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | SUCCESS | Generation complete |
| 1 | INVALID_PROMPT | Bad prompt format |
| 2 | API_KEY_MISSING | OPENAI_API_KEY not set |
| 3 | API_ERROR | OpenAI returned error |
| 4 | RATE_LIMITED | Too many requests |
| 5 | NETWORK_ERROR | Connection issue |
| 6 | TIMEOUT | Request took too long |
| 7 | CONTENT_POLICY | Prompt violates content policy |
| 8 | PAYMENT_REQUIRED | Billing setup needed |
| 9 | INVALID_SIZE | Unsupported size |
| 10 | INVALID_MODEL | Unsupported model |
| 99 | UNKNOWN | Unexpected error |

### Prompt Validation

```bash
# Too short
{baseDir}/image-gen.js "Hi"
# ❌ ERROR: Prompt too short: 2 chars (min: 5)

# Too long (truncated here)
{baseDir}/image-gen.js "A" * 5000
# ❌ ERROR: Prompt too long: 5000 chars (max: 4000)

# Empty
{baseDir}/image-gen.js ""
# ❌ ERROR: Prompt is required
```

## Examples by Use Case

### 1. Product Photography

```bash
# Basic product shot
{baseDir}/image-gen.js "Professional product photo of a black leather wallet on marble surface, soft lighting, commercial photography"

# Styled product
{baseDir}/image-gen.js "Premium coffee bag on wooden table, morning light, cafe ambiance, commercial photography, 35mm lens" --quality hd --size 1024x1792

# Multiple angles
{baseDir}/image-gen.js "Luxury watch floating on black background, studio lighting, product photography" --n 4
```

### 2. Concept Art

```bash
# Character design
{baseDir}/image-gen.js "Fantasy warrior in magical armor, digital art, concept art, trending on artstation" --custom-style digital_art

# Environment
{baseDir}/image-gen.js "Floating islands with waterfalls and glowing crystals, epic scale, concept art" --model dall-e-3 --size 1792x1024

# Mood board
{baseDir}/image-gen.js "Post-apocalyptic city ruins at golden hour, atmospheric, cinematic" --custom-style cinematic --n 4
```

### 3. Marketing Assets

```bash
# Social media images
{baseDir}/image-gen.js "Summer sale banner with beach scene, bright colors, text overlay ready" --size 1024x1024 --n 3

# App icons
{baseDir}/image-gen.js "Minimal app icon design, abstract geometric pattern, pastel colors" --model dall-e-2 --size 256x256

# Hero images
{baseDir}/image-gen.js "Diverse team collaborating in modern office, natural light, inclusive" --size 1792x1024 --quality hd
```

### 4. Creative Projects

```bash
# Book cover
{baseDir}/image-gen.js "Sci-fi book cover: astronaut discovering alien artifact, dramatic lighting, space opera" --size 1024x1792

# Album art
{baseDir}/image-gen.js "Surreal dreamscape with melting clocks and floating pianos, Dali style" --custom-style oil_painting

# Poster
{baseDir}/image-gen.js "Neon-lit Tokyo street at night, rain on pavement, cyberpunk" --custom-style neon --size 1024x1792
```

### 5. Architectural Visualization

```bash
# Exterior shot
{baseDir}/image-gen.js "Modern glass house in forest at dusk, warm interior lights, architectural photography" --custom-style photographic --size 1792x1024

# Interior design
{baseDir}/image-gen.js "Minimalist living room with natural wood furniture, large windows, interior design shot" --quality hd
```

### 6. Batch Processing Script

```bash
#!/bin/bash
# Generate images from prompts in file

while IFS= read -r prompt; do
  [ -z "$prompt" ] && continue
  [ "${prompt:0:1}" == "#" ] && continue  # Skip comments
  
  echo "Generating: $prompt"
  {baseDir}/image-gen.js "$prompt" --output-dir ./batch-output --n 2
  sleep 2  # Rate limit protection
done < prompts.txt
```

## Technical Details

### Architecture

```
1. Validate Prompt
   ├── Check length (5-4000 chars)
   ├── Apply style preset if specified
   └── Final prompt assembly

2. Check Limits
   ├── Rate limit (5/min, 1/sec)
   └── Skip if rate limit exceeded

3. API Request
   ├── HTTPS POST to OpenAI
   ├── Include model, size, quality, n
   └── Wait for base64 response

4. Process Response
   ├── Validate data received
   └── Track cost

5. Save Images
   ├── Decode base64
   ├── Generate filename
   ├── Write PNG
   └── Report size

6. Create Gallery (if n > 1)
   ├── Generate HTML
   └── Include metadata
```

### API Request Structure

```json
{
  "model": "dall-e-3",
  "prompt": "A serene mountain landscape at sunset",
  "n": 1,
  "size": "1024x1024",
  "quality": "standard",
  "response_format": "b64_json",
  "style": "vivid"
}
```

### Response Handling

**Error Responses:**
- 429: Rate limited
- 400: Content policy violation
- 401: Invalid API key
- 500: OpenAI server error

**Success Response:**
```json
{
  "created": 1705312345,
  "data": [
    {
      "b64_json": "base64_encoded_image_data...",
      "revised_prompt": "A serene mountain landscape at sunset..."
    }
  ]
}
```

## Advanced Usage

### Retry Logic

```bash
# If generation fails, retry with slight modification
for attempt in {1..3}; do
  {baseDir}/image-gen.js "A cat" --output-dir ./retry-test
  if [ $? -eq 0 ]; then break; fi
  echo "Retry $attempt..."
  sleep 5
done
```

### Custom Style Templates

Create your own style by concatenating templates:

```bash
# Combine multiple style elements
STYLE="A photorealistic image of"
PROMPT="Lion resting in savanna at sunrise"
SUFFIX="golden hour lighting, wildlife photography, National Geographic style, detailed fur texture"
{baseDir}/image-gen.js "$STYLE $PROMPT, $SUFFIX"
```

### Integration with Other Tools

```bash
# Generate and convert to JPEG
{baseDir}/image-gen.js "Abstract pattern" --output ./generated.png
mogrify -format jpg generated.png

# Generate and resize
{baseDir}/image-gen.js "Landscape" --size 1024x1024
sips -Z 512 generated.png

# Generate and optimize
{baseDir}/image-gen.js "Icon design"
pngquant --quality=65-80 generated.png -o optimized.png
```

## Notes

- **File Format:** All images saved as PNG (lossless)
- **Filenames:** Generated based on prompt slug + timestamp
- **Gallery:** Auto-generated for batch generations
- **Prompt Enhancement:** OpenAI may revise your prompt for safety/quality
- **Cost Tracking:** Estimated based on OpenAI pricing (may vary)
- **Timeout:** 5 minute maximum wait
- **Concurrent:** Limited by rate limiting (sequential processing)
- **Storage:** Images saved to /tmp by default (may be cleaned up)
- **Reproducibility:** Same prompt may yield different results
- **API Key:** Must have access to DALL-E models
- **Usage Limits:** Based on OpenAI tier and budget
- **Content Policy:** Follows OpenAI's use policy strictly
