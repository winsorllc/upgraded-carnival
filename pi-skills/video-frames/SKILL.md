---
name: video-frames
description: Extract frames, thumbnails, and video metadata. Use when: user wants to extract screenshots from video, create thumbnails, get video duration, or analyze video content frame by frame.
---

# Video Frames Skill

Extract frames and thumbnails from video files.

## When to Use

✅ **USE this skill when:**

- "Extract frames from this video"
- "Get a thumbnail from this video"
- "Create a sprite sheet of video frames"
- "Get video metadata"
- "Extract every Nth frame"

## When NOT to Use

❌ **DON'T use this skill when:**

- Video conversion → use ffmpeg directly
- Video editing → use video editing software
- Streaming video → use yt-dlp for downloads

## Requirements

- `ffmpeg` installed
- `ffprobe` (usually comes with ffmpeg)

## Installation

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg
```

## Usage

### Extract Single Frame

```bash
# Extract frame at specific timestamp
video-frame.sh /path/to/video.mp4 --time 00:01:30

# Extract frame at 10 seconds
video-frame.sh /path/to/video.mp4 --time 10
```

### Extract Multiple Frames

```bash
# Extract 10 evenly spaced frames
video-frames.sh /path/to/video.mp4 --count 10 --output /tmp/frames/

# Extract every 1 second
video-frames.sh /path/to/video.mp4 --interval 1 --output /tmp/frames/
```

### Get Thumbnail

```bash
# Generate thumbnail (middle of video)
video-thumb.sh /path/to/video.mp4

# Custom timestamp
video-thumb.sh /path/to/video.mp4 --time 00:00:30 --output thumb.jpg
```

### Video Metadata

```bash
# Get video info
video-info.sh /path/to/video.mp4

# JSON output
video-info.sh /path/to/video.mp4 --json
```

## Commands

### video-frame.sh

Extract a single frame.

```bash
./video-frame.sh <video> [options]

Options:
  --time TIMESTAMP   Time position (seconds or HH:MM:SS)
  --output FILE     Output file (default: frame.jpg)
  --quality N       JPEG quality 1-31 (default: 2)
```

### video-frames.sh

Extract multiple frames.

```bash
./video-frames.sh <video> [options]

Options:
  --count N         Number of frames to extract
  --interval N      Extract every N seconds
  --start TIME      Start time
  --end TIME        End time
  --output DIR      Output directory
```

### video-thumb.sh

Generate thumbnail.

```bash
./video-thumb.sh <video> [options]

Options:
  --time TIME       Timestamp (default: middle of video)
  --size WxH       Output size (default: 320x240)
  --output FILE    Output file
```

### video-info.sh

Get video metadata.

```bash
./video-info.sh <video> [options]

Options:
  --json    Output as JSON
  --probe   Show ffprobe output only
```

## Examples

### Extract Frames for Analysis

```bash
video-frames.sh video.mp4 --count 30 --output ./frames/
```

### Create Thumbnail Gallery

```bash
for vid in *.mp4; do
    video-thumb.sh "$vid" --output "thumb_${vid%.mp4}.jpg"
done
```

### Get Video Duration

```bash
video-info.sh video.mp4 | grep Duration
```

### Extract Key Frames Only

```bash
video-frames.sh video.mp4 --count 10 --output frames/ -vf "select=eq(pict_type\,I)"
```

## FFmpeg Tips

- Use `-ss` before `-i` for faster seeking
- Use `-q:v` for quality (lower = better, 2-5 is good)
- Use `-vf scale` to resize
- Use `-update 1` for single frame output

## Notes

- Video processing can be CPU intensive
- Large videos take longer to process
- Use `--count` for batch extraction
- Output format auto-detected from extension
