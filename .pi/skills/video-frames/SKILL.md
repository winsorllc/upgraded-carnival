---
name: video-frames
description: "Extract frames or create thumbnails from videos using ffmpeg. Use when you need to capture specific video frames, create preview thumbnails, or extract images from video files."
---

# Video Frames Skill

Extract frames or short clips from videos using ffmpeg.

## When to Use

✅ **USE this skill when:**

- "Extract frame at 10 seconds from video"
- "Create thumbnail from video"
- "Get all frames from video at 1fps"
- "Capture screenshot from video at timestamp"
- "Make GIF from video"

## When NOT to Use

❌ **DON'T use this skill when:**

- Converting video formats → use ffmpeg directly
- Editing video → use video editing tools
- Streaming video → use streaming tools

## Setup

Requires ffmpeg installed:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Check installation
ffmpeg -version
```

## Commands

### Extract Single Frame

```bash
{baseDir}/frame.sh /path/to/video.mp4 --out /tmp/frame.jpg
```

### Extract Frame at Timestamp

```bash
{baseDir}/frame.sh /path/to/video.mp4 --time 00:00:10 --out /tmp/frame-10s.jpg
{baseDir}/frame.sh /path/to/video.mp4 --time 5.5 --out /tmp/frame.jpg
```

### Extract by Frame Index

```bash
{baseDir}/frame.sh /path/to/video.mp4 --index 100 --out /tmp/frame.jpg
```

### Create Thumbnails Grid

```bash
{baseDir}/thumbnails.sh /path/to/video.mp4 --count 12 --out /tmp/thumbnails.jpg
```

### Extract Multiple Frames

```bash
{baseDir}/frames.sh /path/to/video.mp4 --fps 1 --out /tmp/frames/
```

### Create GIF from Video

```bash
{baseDir}/gif.sh /path/to/video.mp4 --start 00:00:10 --duration 5 --out /tmp/clip.gif
```

## Options

- `--time`: Timestamp (HH:MM:SS or seconds)
- `--index`: Frame number (0-based)
- `--out`: Output path
- `--fps`: Frames per second to extract
- `--count`: Number of thumbnails
- `--start`: Start time for GIF
- `--duration`: Duration for GIF
- `--width`: Output width (maintains aspect ratio)

## Output Formats

- `.jpg`: Quick sharing, smaller file size
- `.png`: Crisp UI frames, transparency support
- `.gif`: Animated output for clips

## Notes

- Supports MP4, MOV, AVI, MKV, WebM, and more
- Use `--time` for "what is happening around here?"
- Use `.png` for crisp UI frames
- Use `.jpg` for quick sharing