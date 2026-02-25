---
name: image-processor
description: Basic image processing utilities. Get image info, format conversion, and thumbnail generation using native tools. Inspired by OpenClaw media pipeline.
---

# Image Processor

Basic image processing utilities.

## Capabilities

- Get image info (dimensions, format, size)
- Generate thumbnails
- Format conversion
- Batch resize

## Usage

```bash
# Get image info
/job/.pi/skills/image-processor/img-info.js /path/to/image.jpg

# Create thumbnail
/job/.pi/skills/image-processor/img-thumb.js input.jpg output.jpg 200
```