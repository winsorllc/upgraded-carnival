---
name: video-frames
description: "Production-grade video frame extraction with thumbnail grids, GIF creation, and batch frame processing. Includes intelligent quality presets, progress tracking, and comprehensive error handling."
metadata:
  version: "2.0.0"
  author: "Pi Agent"
  requires:
    bins: ["ffmpeg", "ffprobe", "node"]
    optional_bins: ["montage"]
    env: []
  category: "media"
  tags: ["video", "frames", "thumbnails", "gif", "screenshots", "timeline"]
---

# Video-Frames Skill

Production-grade video frame extraction with comprehensive quality control, progress tracking, and safety limits.

## When to Use

✅ **USE this skill when:**

- Extracting specific frames from videos at timestamps
- Creating thumbnail grids/contact sheets for video overview
- Generating animated GIFs from video segments
- Batch extracting frames at intervals (e.g., every N seconds)
- Creating video previews or storyboards
- Needing pixel-perfect frame access by index
- Extracting frames at specific quality levels

❌ **DON'T use this skill when:**

- Simple format conversion → Use ffmpeg-tools
- Video editing (effects) → Use video editor
- Real-time frame capture → Use streaming tools
- Video capture from camera → Use camsnap
- Image generation → Use image-gen

## Prerequisites

```bash
# Install FFmpeg
brew install ffmpeg        # macOS
sudo apt install ffmpeg    # Ubuntu/Debian

# Optional: Install ImageMagick for better grid generation
brew install imagemagick   # macOS
sudo apt install imagemagick   # Ubuntu

# Verify installation
ffmpeg -version
ffprobe -version
```

## Commands

### 1. Extract Single Frame

Extract a single frame at a specific time or by frame index.

```bash
# Extract frame at timestamp
{baseDir}/video-frames.js frame video.mp4 --time 30 --out frame.jpg
{baseDir}/video-frames.js frame video.mp4 --time 00:02:30 --out frame.jpg
{baseDir}/video-frames.js frame video.mp4 --time 150.5 --out frame.jpg

# Extract by frame index
{baseDir}/video-frames.js frame video.mp4 --index 0 --out first-frame.jpg
{baseDir}/video-frames.js frame video.mp4 --index 1000 --out frame-1000.jpg

# With quality settings
{baseDir}/video-frames.js frame video.mp4 --time 30 --format png --out high-quality.png
{baseDir}/video-frames.js frame video.mp4 --time 30 --quality 1 --out best-quality.jpg
{baseDir}/video-frames.js frame video.mp4 --time 30 --format jpg --quality 2
```

**Time Formats:**
| Format | Example | Description |
|--------|---------|-------------|
| Seconds | `30` | Simple seconds |
| MM:SS | `2:30` | Minutes:Seconds |
| HH:MM:SS | `00:02:30` | Full timecode |
| Decimal | `90.5` | Millisecond precision |

**Quality Settings (JPEG):**
| Value | Quality | File Size | Use Case |
|-------|---------|-----------|----------|
| `1` | Best | Large | Archival, quality preservation |
| `2-3` | High | Medium | Default, good balance |
| `5` | Medium | Small | Web, quick preview |
| `10+` | Low | Very small | Draft, thumbnail |

**Supported Formats:**
- `jpg/jpeg` - Web optimized, compression
- `png` - Lossless, transparency, best quality
- `bmp` - Uncompressed raw
- `tiff` - Professional formats
- `webp` - Next-gen web format

### 2. Extract Multiple Frames

Batch extract frames at regular intervals.

```bash
# Extract 1 frame per second
{baseDir}/video-frames.js frames video.mp4 --fps 1

# Extract specific segment
{baseDir}/video-frames.js frames video.mp4 --fps 1 --start 00:01:00 --duration 60
{baseDir}/video-frames.js frames video.mp4 --fps 5 --start 30 --duration 120

# Higher quality extraction
{baseDir}/video-frames.js frames video.mp4 --fps 1 --quality 1 --prefix keyframe

# Resize during extraction
{baseDir}/video-frames.js frames video.mp4 --fps 1 --width 1920 --quality 1
```

**Frame Rate Options:**
| Rate | Description | Use Case |
|------|-------------|----------|
| `--fps 1` | 1 frame/second | Timeline extraction |
| `--fps 5` | 5 frames/second | Detailed analysis |
| `--fps 0.1` | Every 10 seconds | Overview, storyboard |
| `--fps 0.5` | Every 2 seconds | Moderate detail |

**Output:**
```
/tmp/frames_1234567890/
  ├── frame_00001.jpg
  ├── frame_00002.jpg
  ├── frame_00003.jpg
  └── ...
```

### 3. Generate Thumbnail Grid (Contact Sheet)

Create a grid of thumbnails for video overview.

```bash
# Basic grid
{baseDir}/video-frames.js grid video.mp4 --output grid.jpg

# Custom size and layout
{baseDir}/video-frames.js grid video.mp4 --count 16 --columns 4 --width 480 --out grid.jpg

# Compact preview
{baseDir}/video-frames.js grid video.mp4 --count 20 --columns 5 --width 320 --out overview.jpg

# High resolution grid
{baseDir}/video-frames.js grid video.mp4 --count 9 --columns 3 --width 640 --format png --out detailed.png
```

**Grid Layout Examples:**

| Count | Columns | Rows | Best For |
|-------|---------|------|----------|
| 4 | 2 | 2 | Quick preview |
| 9 | 3 | 3 | Standard overview |
| 12 | 4 | 3 | Detailed timeline |
| 16 | 4 | 4 | Comprehensive storyboard |
| 20 | 5 | 4 | Long videos |

**Output Format:**
```
+---+---+---+---+
| 1 | 2 | 3 | 4 |    <- 5 seconds into video
+---+---+---+---+
| 5 | 6 | 7 | 8 |    <- 25 seconds into video
+---+---+---+---+
| 9 |10 |11 |12 |    <- 45 seconds into video
+---+---+---+---+
```

### 4. Create Animated GIF

Extract video segment as animated GIF.

```bash
# Basic GIF (5 seconds from start)
{baseDir}/video-frames.js gif video.mp4 --output clip.gif

# Specific time and duration
{baseDir}/video-frames.js gif video.mp4 --start 00:01:30 --duration 5 --out highlight.gif
{baseDir}/video-frames.js gif video.mp4 --start 30 --duration 10 --out segment.gif

# Quality presets
{baseDir}/video-frames.js gif video.mp4 --start 60 --duration 3 --preset fast --out quick.gif
{baseDir}/video-frames.js gif video.mp4 --start 60 --duration 3 --preset quality --out smooth.gif
{baseDir}/video-frames.js gif video.mp4 --start 60 --duration 3 --preset cinematic --out cinema.gif

# Custom parameters
{baseDir}/video-frames.js gif video.mp4 --start 30 --duration 5 --fps 30 --width 720 --out preview.gif
```

**GIF Presets:**
| Preset | FPS | Width | Colors | Size | Best For |
|--------|-----|-------|--------|------|----------|
| `fast` | 15 | 480px | 128 | Small | Quick generation |
| `balanced` | 20 | 640px | 256 | Medium | Default |
| `quality` | 24 | 720px | 512 | Large | Smooth motion |
| `cinematic` | 30 | 1080px | 1024 | Very large | Maximum quality |

**Max Duration:** 300 frames (~10 seconds at 30fps)

### 5. Get Video Information

Display detailed video metadata.

```bash
{baseDir}/video-frames.js info video.mp4
```

**Output:**
```json
{
  "stats": { "size": 1234567890, "mtime": "..." },
  "duration": 3665,
  "width": 1920,
  "height": 1080,
  "fps": 29.97,
  "totalFrames": 109785,
  "info": { ... }  // Full ffprobe output
}
```

## Progress Tracking

Operations display real-time progress:

```
⏳ Extracting frames: 15/30 (50.0%) | Elapsed: 12.3s
⏳ Generating thumbnails: 8/12 (66.7%) | Elapsed: 5.2s
```

## Safety Features

### Limits

| Limit | Value | Description |
|-------|-------|-------------|
| Max Video Size | 50 GB | Input file size limit |
| Max Duration | 4 hours | Video length limit |
| Max Frames | 1,000 | Batch frame extraction |
| Max Grid Size | 60 thumbnails | Contact sheet limit |
| Max GIF Frames | 300 | Animated GIF limit |
| Timeout | 30 minutes | Default operation timeout |

### Video Validation

Before processing, the skill validates:
- File exists and is readable
- File size within limits
- Valid video format
- Duration within limits
- Contains video stream
- Not corrupted

## Error Handling

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | SUCCESS | Operation completed |
| 1 | INVALID_INPUT | Missing/invalid parameters |
| 2 | FILE_NOT_FOUND | Video not found |
| 3 | INVALID_FORMAT | Unsupported format |
| 4 | INVALID_TIME_RANGE | Invalid timestamp |
| 5 | FFMPEG_ERROR | FFmpeg execution failed |
| 6 | OUT_OF_MEMORY | Memory limit exceeded |
| 7 | TIMEOUT | Operation timed out |
| 8 | INTERRUPTED | User interrupted |
| 9 | PERMISSION_DENIED | Cannot read/write |
| 10 | VALIDATION_FAILED | Video validation failed |
| 99 | UNKNOWN | Unexpected error |

### Common Scenarios

**Frame Index Out of Range:**
```bash
{baseDir}/video-frames.js frame video.mp4 --index 999999
# ❌ ERROR: Frame index 999999 out of range (0-109784)
```

**Timestamp Beyond Video:**
```bash
{baseDir}/video-frames.js frame video.mp4 --time 10000
# ❌ ERROR: Timestamp 02:46:40 out of range (0-01:01:05)
```

**Too Many Frames:**
```bash
{baseDir}/video-frames.js frames video.mp4 --fps 100
# ❌ ERROR: Too many frames requested: 366500 (max: 1000)
```

**Large GIF Request:**
```bash
{baseDir}/video-frames.js gif video.mp4 --duration 60 --fps 60
# ❌ ERROR: GIF too long: 3600 frames (max: 300)
```

## Technical Details

### Frame Extraction Methods

1. **Segment Seek** (`-ss` before `-i`)
   - Fast frame access
   - Use for `--time` option
   - Slight accuracy trade-off at start

2. **Frame Selection** (`-vf select`)
   - Precise frame index extraction
   - Slower but frame-accurate
   - Use for `--index` option

3. **Extract at Interval** (`fps` filter)
   - Efficient batch extraction
   - Frame-rate conversion
   - Use for batch operations

### Quality Settings

**JPEG Quality (CRF - Constant Rate Factor):**
```
-q:v 1  -> 100% quality (best, largest)
-q:v 2  -> ~95% quality (default)
-q:v 5  -> ~85% quality (web)
-q:v 10 -> ~70% quality (low)
-q:v 31 -> ~10% quality (minimum)
```

**PNG Output:**
- Always lossless
- Larger file sizes
- Best for archival
- Transparent backgrounds supported

**Scaling (Lanczos):**
```
-vf scale=320:-2:flags=lanczos
```
- Lanczos resampling for best quality
- `-2` ensures even dimensions (encoding requirement)
- Maintains aspect ratio

### GIF Optimization

**Palette Generation:**
1. Parse video segment
2. Generate optimal 256-color palette
3. Apply palette to all frames
4. Dithering for smooth gradients

**File Size Optimization:**
- Fixed frame rate
- Limited color palette
- Resizing before encoding
- Optimized encoding settings

## Examples

### Video Storyboard Creation

```bash
#!/bin/bash
VIDEO="movie.mp4"
OUTDIR="storyboard"

mkdir -p $OUTDIR

# Create overview grid
echo "Creating overview grid..."
{baseDir}/video-frames.js grid "$VIDEO" --count 20 --columns 5 --width 480 --out "$OUTDIR/overview.jpg"

# Extract key frames every minute
echo "Extracting key frames..."
{baseDir}/video-frames.js frames "$VIDEO" --fps 0.0167 --prefix key --out "$OUTDIR/"

# Create chapter thumbnails
echo "Creating chapter thumbnails..."
for time in 0:00 10:00 20:00 30:00; do
  {baseDir}/video-frames.js frame "$VIDEO" --time $time --quality 1 --out "$OUTDIR/chapter_${time//:/}.png"
done

echo "Storyboard complete in $OUTDIR/"
```

### Video Preview Gallery

```bash
#!/bin/bash
for video in *.mp4; do
  echo "Processing: $video"
  
  # Create 3x3 grid
  {baseDir}/video-frames.js grid "$video" --count 9 --columns 3 --width 640 --out "${video%.*}-grid.jpg"
  
  # Create 5-second preview GIF
  {baseDir}/video-frames.js gif "$video" --start 30 --duration 5 --preset balanced --out "${video%.*}-preview.gif"
  
done
```

### Extract Frames Every N Seconds

```bash
# Extract frame at beginning of every minute
for i in {0..60}; do
  {baseDir}/video-frames.js frame video.mp4 --time $((i*60)) --out "frames/minute_${i}.jpg"
done

# Shell script for batch extraction
extract_frames() {
  local video="$1"
  local interval="${2:-10}"  # default 10 seconds
  local duration
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$video")
  
  for ((t=0; t<duration; t+=interval)); do
    {baseDir}/video-frames.js frame "$video" --time $t --out "frames/frame_${t}.jpg"
  done
}
```

### High-Quality Thumbnail Generation

```bash
# Best quality single frame
{baseDir}/video-frames.js frame video.mp4 \
  --time 10 \
  --format png \
  --width 1920 \
  --out thumbnail.png

# Best quality grid
{baseDir}/video-frames.js grid video.mp4 \
  --count 9 \
  --columns 3 \
  --width 640 \
  --format png \
  --out grid.png
```

## Performance Tips

### 1. Use JPEG for Speed

JPEG encoding is faster than PNG:
```bash
{baseDir}/video-frames.js frame video.mp4 --format jpg  # Faster
{baseDir}/video-frames.js frame video.mp4 --format png  # Better quality, slower
```

### 2. Lower Quality for Drafts

```bash
# Quick preview
{baseDir}/video-frames.js grid video.mp4 --count 9 --width 320  # Small, fast

# Final quality
{baseDir}/video-frames.js grid video.mp4 --count 16 --width 640  # Higher detail
```

### 3. Parallel Processing

```bash
# Process multiple videos in parallel
{baseDir}/video-frames.js grid video1.mp4 --out g1.jpg &
{baseDir}/video-frames.js grid video2.mp4 --out g2.jpg &
{baseDir}/video-frames.js grid video3.mp4 --out g3.jpg &
wait
```

### 4. Resize During Extraction

Better than extracting full size then scaling:
```bash
# Good
{baseDir}/video-frames.js frame video.mp4 --width 320 --out thumb.jpg

# Less efficient
{baseDir}/video-frames.js frame video.mp4 --out full.jpg
# Then resize externally
```

## Notes

- Grid generation uses ImageMagick when available (better quality), FFmpeg tile filter otherwise
- Frame index 0 is always the first frame of the video
- Timestamps are rounded to nearest frame based on video FPS
- GIFs are optimized with 256-color palette for balance of quality and size
- PNG transparency is preserved (useful for overlays)
- All operations clean up temporary files automatically
- JSON output enables programmatic integration
- Grid thumbnails include timestamps at video intervals
