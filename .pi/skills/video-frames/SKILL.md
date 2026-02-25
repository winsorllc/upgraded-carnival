---
name: video-frames
description: Extract frames from video files at specified timestamps. Use when you need to extract screenshots/stills from videos for analysis, documentation, or thumbnails.
---

# Video Frames

Extract frames from video files at specific timestamps.

## Setup

Requires FFmpeg. Install on macOS: `brew install ffmpeg`. On Linux: `apt install ffmpeg`.

## Usage

### Extract Single Frame

```bash
{baseDir}/extract-frame.sh /path/to/video.mp4 --timestamp 00:01:30 --output frame.jpg
```

### Extract Multiple Frames

```bash
{baseDir}/extract-frame.sh /path/to/video.mp4 --timestamps 00:01:30,00:05:00,00:10:00 --output-dir ./frames
```

### Extract Frame Range

```bash
{baseDir}/extract-frame.sh /path/to/video.mp4 --start 00:01:00 --end 00:02:00 --interval 5 --output-dir ./frames
```

## Options

| Option | Description |
|--------|-------------|
| `--timestamp` | Specific timestamp (HH:MM:SS or seconds) |
| `--timestamps` | Comma-separated list of timestamps |
| `--start` | Start time for range extraction |
| `--end` | End time for range extraction |
| `--interval` | Extract every N seconds from range |
| `--output` | Output file path (single frame) |
| `--output-dir` | Output directory (multiple frames) |
| `--format` | Output format: jpg, png (default: jpg) |
| `--quality` | JPEG quality 1-100 (default: 95) |

## Examples

```bash
# Extract frame at 1 minute 30 seconds
{baseDir}/extract-frame.sh movie.mp4 --timestamp 90 --output screenshot.jpg

# Extract thumbnail every 10 seconds for first minute
{baseDir}/extract-frame.sh video.mp4 --start 0 --end 60 --interval 10 --output-dir thumbs/

# Extract multiple specific frames
{baseDir}/extract-frame.sh video.mp4 --timestamps 0:30,1:00,1:30 --output-dir frames/
```

## Output

Returns JSON with extracted frame paths:

```json
{
  "success": true,
  "frames": [
    "/path/to/frame_001.jpg",
    "/path/to/frame_002.jpg"
  ],
  "count": 2
}
```
