---
name: image-tools
description: "Image analysis and manipulation. Use when: user wants to analyze images, extract metadata, convert formats, resize, or get image information."
---

# Image Tools Skill

Image analysis and manipulation tools.

## When to Use

- Extract image metadata (EXIF, dimensions, format)
- Convert between image formats
- Resize or crop images
- Analyze image content
- Get image information

## Image Information

### Get Image Details
```bash
# Using file command
file image.jpg

# Using identify (ImageMagick)
identify -verbose image.jpg

# Get dimensions
identify -format "%wx%h" image.jpg

# Get EXIF data
identify -format "%[EXIF:*]" image.jpg
```

### Quick Info Script
```bash
#!/bin/bash
# Get basic image info
FILE="$1"
if [ -z "$FILE" ]; then
    echo "Usage: $0 <image-file>"
    exit 1
fi

echo "=== Image Info ==="
file "$FILE"
echo ""
echo "Dimensions:"
identify -format "%wx%h\n" "$FILE"
echo ""
echo "Format:"
identify -format "%m\n" "$FILE"
```

## Image Conversion

### Convert Formats
```bash
# PNG to JPEG
convert input.png output.jpg

# JPEG to PNG
convert input.jpg output.png

# Convert to grayscale
convert input.jpg -colorspace Gray output.jpg

# Resize
convert input.jpg -resize 800x600 output.jpg
convert input.jpg -resize 50% output.jpg
```

### WebP Conversion
```bash
# JPEG to WebP
cwebp input.jpg -o output.webp

# PNG to WebP
cwebp -lossless input.png -o output.webp
```

## Image Analysis

### Count Colors
```bash
# Unique colors in image
identify -format "%k" input.jpg
```

### Image Histogram
```bash
# Get color histogram
convert input.jpg -format %c histogram:info:-

# Simple histogram
identify -verbose input.jpg | grep -A 100 "Histogram:"
```

### OCR (Text Extraction)
```bash
# Extract text from image
tesseract image.jpg stdout

# Specific language
tesseract image.jpg stdout -l eng
```

## Screenshots

### Capture Screen
```bash
# Full screen (Linux)
import -window root screenshot.png

# Region selection
import screenshot.png

# Using scrot (if installed)
scrot -s selection.png
```

### Capture URL as Image
```bash
# Using wkhtmltoimage
wkhtmltoimage https://example.com page.png

# Using chromium headless
chromium --headless --screenshot=output.png https://example.com
```

## Useful Tools

| Tool | Purpose |
|------|---------|
| `file` | Detect file type |
| `identify` | Get image metadata |
| `convert` | Format conversion, resize |
| `composite` | Blend images |
| `montage` | Create image grids |
| `tesseract` | OCR text extraction |

## Examples

**Check if image is valid:**
```bash
file image.jpg && identify image.jpg >/dev/null 2>&1 && echo "Valid image"
```

**Batch resize:**
```bash
for f in *.jpg; do convert "$f" -resize 800x600 "thumb_$f"; done
```

**Extract thumbnail:**
```bash
convert input.jpg -thumbnail 200x200^ -gravity center -extent 200x200 thumb.jpg
```
