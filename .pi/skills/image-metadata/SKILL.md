---
name: image-metadata
description: Extract metadata, dimensions, and properties from image files. Supports JPEG, PNG, GIF, BMP, WebP.
---

# Image Metadata Extractor

Extract dimensions, color info, and metadata from image files.

## Features

- **dimensions**: Width and height
- **format**: Image format type
- **colors**: Color depth and mode
- **size**: File size
- **exif**: EXIF data (JPEG only)
- **basic**: Quick basic info

## Usage

```bash
# Full metadata
./scripts/image-meta.js --file ./image.png

# Basic info only
./scripts/image-meta.js --file ./image.jpg --basic

# JSON output
./scripts/image-meta.js --file ./image.png --json

# Multiple files
./scripts/image-meta.js --file ./img1.jpg --file ./img2.png
```

## Examples

| Task | Command |
|------|---------|
| Full metadata | `image-meta.js --file photo.jpg` |
| Dimensions only | `image-meta.js --file photo.jpg --basic` |
| JSON format | `image-meta.js --file photo.png --json` |
| Batch process | `image-meta.js --file *.jpg` |

## Supported Formats

- JPEG/JPG
- PNG
- GIF
- BMP
- WebP (basic info)
- AVIF (basic info)

## Notes

- EXIF extraction requires JPEG
- Does not modify source files
- Handles corrupted files gracefully