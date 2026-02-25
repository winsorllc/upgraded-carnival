---
name: image-info
description: Extract metadata from images including format detection, dimensions, and base64 encoding for multimodal AI.
metadata:
  {
    "zeroclaw":
      {
        "emoji": "🖼️",
      },
  }
---

# Image Info

Extract metadata from images including format detection, dimensions, and base64 encoding.

## When to Use

✅ **USE this skill when:**

- Getting image dimensions and format
- Converting images to base64 for AI processing
- Verifying image file integrity
- Batch processing image metadata

## Supported Formats

| Format | Extension | Magic Bytes |
|--------|-----------|-------------|
| PNG | `.png` | `\x89PNG` |
| JPEG | `.jpg`, `.jpeg` | `\xFF\xD8\xFF` |
| GIF | `.gif` | `GIF8` |
| WebP | `.webp` | `RIFF....WEBP` |
| BMP | `.bmp` | `BM` |

## Usage

### Get Image Info

```bash
# Using file command
file image.png
file -b --mime-type image.jpg

# Using identify (ImageMagick)
identify image.png
identify -verbose image.png

# Using Python
python3 -c "from PIL import Image; img = Image.open('image.png'); print(img.size, img.format)"
```

### Extract Dimensions

```bash
# Quick dimensions
identify -format "%wx%h" image.png

# All metadata
exiftool image.jpg
```

### Convert to Base64

```bash
# For inline embedding
base64 -w0 image.png | pbcopy

# With data URL
echo "data:image/png;base64,$(base64 -w0 image.png)"
```

### Image Formats

```bash
# Convert format
convert input.jpg output.png

# Resize
convert input.png -resize 50% output.png

# Compress
convert input.jpg -quality 80 output.jpg
```

## Python Library Example

```python
from PIL import Image

def get_image_info(path):
    with Image.open(path) as img:
        return {
            "format": img.format,
            "mode": img.mode,
            "size": img.size,  # (width, height)
            "width": img.width,
            "height": img.height,
        }

# For raw bytes
def detect_format(bytes):
    if bytes.startswith(b"\x89PNG"):
        return "PNG"
    elif bytes.startswith(b"\xFF\xD8\xFF"):
        return "JPEG"
    elif bytes.startswith(b"GIF8"):
        return "GIF"
    elif bytes.startswith(b"RIFF") and bytes[8:12] == b"WEBP":
        return "WebP"
    elif bytes.startswith(b"BM"):
        return "BMP"
    return "unknown"
```

## Notes

- Max file size for base64: 5 MB
- PNG is best for screenshots (lossless)
- JPEG is best for photos (smaller size)
- WebP offers best compression
