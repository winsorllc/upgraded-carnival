---
name: video-frames
description: Extract frames or short clips from videos using ffmpeg. Generate thumbnails and video previews.
metadata: { "popebot": { "emoji": "🎞️", "requires": { "bins": ["ffmpeg"] } } }
---

# Video Frames (ffmpeg)

Extract frames, create thumbnails, and generate preview clips from videos.

## Setup

Install ffmpeg:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
apt-get update && apt-get install -y ffmpeg

# Or use system package manager
```

## Usage

### Extract First Frame

Extract the first frame from a video:

```bash
ffmpeg -i input.mp4 -frames:v 1 -q:v 2 frame.jpg
```

### Extract Frame at Timestamp

Extract a frame at a specific time:

```bash
ffmpeg -i input.mp4 -ss 00:00:10 -frames:v 1 frame_at_10s.jpg
```

### Generate Thumbnail Grid

Create a contact sheet with multiple frames:

```bash
ffmpeg -i input.mp4 -vf "tile=3x3" thumbnail_grid.jpg
```

### Extract MultipleFrames

Extract frames at regular intervals:

```bash
ffmpeg -i input.mp4 -vf "fps=1/60" frame_%03d.jpg
```

Extract one frame every 60 seconds.

### Create Short Clip

Extract a 5-second clip starting at 10 seconds:

```bash
ffmpeg -i input.mp4 -ss 00:00:10 -t 00:00:05 -c copy clip.mp4
```

### Generate Animated GIF

Create a GIF from a video segment:

```bash
ffmpeg -i input.mp4 -ss 00:00:10 -t 00:00:05 -vf "fps=10,scale=320:-1" output.gif
```

### Get Video Info

Get metadata about a video file:

```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

## Tips

- Use `-q:v 2` for high-quality JPEGs (1-31, lower is better)
- Use `-ss` before `-i` for faster seeking (but less accurate)
- Use `-ss` after `-i` for frame-accurate seeking
- Add `-c copy` to avoid re-encoding when cutting
- Use `tile=WxH` for creating thumbnail grids
