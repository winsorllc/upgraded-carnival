---
name: image-info
description: Extract metadata and information from images. Get dimensions, format, EXIF data, color profiles, and other image properties. Use when you need to analyze image files.
metadata:
  {
    "requires": { "bins": ["identify", "exiftool"] }
  }
---

# Image Info

Extract comprehensive metadata and information from images. Get dimensions, format, EXIF data, color profiles, and other image properties.

## Trigger

Use this skill when:
- User asks for image dimensions or format
- Need to extract EXIF metadata (camera, GPS, date)
- Want to analyze color profiles
- Need to verify image integrity
- Processing images and need metadata

## Quick Start

```bash
# Get basic image info
image-info /path/to/image.jpg

# Get detailed metadata
image-info --detailed /path/to/image.jpg

# Get only dimensions
image-info --dimensions /path/to/image.jpg

# Get EXIF data only
image-info --exif /path/to/image.jpg

# Batch process multiple images
image-info --batch /path/to/images/
```

## Options

| Option | Description |
|--------|-------------|
| `--detailed` | Include all metadata |
| `--dimensions` | Show only width x height |
| `--format` | Show only file format |
| `--exif` | Show EXIF data only |
| `--gps` | Show GPS coordinates |
| `--colors` | Show color histogram |
| `--batch` | Process multiple files |
| `--json` | Output as JSON |

## Supported Formats

- JPEG, PNG, GIF, BMP, TIFF
- WebP, AVIF, HEIC
- RAW formats (CR2, NEF, ARW, DNG)
- SVG (dimensions only)

## Output Examples

### Basic Info
```
File: photo.jpg
Format: JPEG
Dimensions: 4032 x 3024
Size: 2.4 MB
Color Space: sRGB
```

### With EXIF
```
Camera: iPhone 14 Pro
Date: 2026-02-25 10:30:45
ISO: 100
Aperture: f/1.78
Focal Length: 6.9mm
GPS: 37.7749° N, 122.4194° W
```

### JSON Output
```json
{
  "file": "photo.jpg",
  "format": "JPEG",
  "width": 4032,
  "height": 3024,
  "size": 2500000,
  "exif": {
    "camera": "iPhone 14 Pro",
    "date": "2026-02-25T10:30:45Z"
  }
}
```

## Use Cases

1. **Verify image before upload** - Check dimensions meet requirements
2. **Extract photo metadata** - Get camera settings, date taken
3. **Find GPS coordinates** - Extract location from photos
4. **Color analysis** - Get histogram for color distribution
5. **Batch processing** - Process multiple images at once
6. **Archive management** - Verify and catalog image libraries

## Tools Used

- **ImageMagick identify** - Basic metadata and dimensions
- **exiftool** - EXIF and IPTC metadata (if available)

## Fallback Behavior

If ImageMagick is not available, falls back to basic file analysis using `file` command.
