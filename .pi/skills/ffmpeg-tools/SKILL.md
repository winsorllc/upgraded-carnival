---
name: ffmpeg-tools
description: "FFmpeg video/audio processing tools. Convert, compress, trim, merge media files. No API key required."
---

# FFmpeg Tools Skill

Video and audio processing with FFmpeg.

## When to Use

✅ **USE this skill when:**

- "Convert video to MP4"
- "Compress this video"
- "Extract audio from video"
- "Trim video clip"
- "Merge video files"

## When NOT to Use

❌ **DON'T use this skill when:**

- Video editing (effects, transitions) → use video editor
- Streaming → use streaming tools
- Simple playback → use media player

## Setup

Requires FFmpeg installed:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Check installation
ffmpeg -version
```

## Commands

### Convert Media

```bash
{baseDir}/convert.sh input.mov --output output.mp4
{baseDir}/convert.sh input.wav --output output.mp3
{baseDir}/convert.sh input.mkv --output output.webm
```

### Compress Video

```bash
{baseDir}/compress.sh video.mp4 --quality medium
{baseDir}/compress.sh video.mp4 --quality low --output compressed.mp4
{baseDir}/compress.sh video.mp4 --size 10MB
```

### Trim Media

```bash
{baseDir}/trim.sh video.mp4 --start 00:01:00 --end 00:02:00
{baseDir}/trim.sh video.mp4 --start 30 --duration 60
{baseDir}/trim.sh audio.mp3 --start 1:30 --end 2:00
```

### Extract Audio

```bash
{baseDir}/extract-audio.sh video.mp4 --output audio.mp3
{baseDir}/extract-audio.sh video.mp4 --format aac
```

### Merge Videos

```bash
{baseDir}/merge.sh file1.mp4 file2.mp4 --output merged.mp4
{baseDir}/merge.sh *.mp4 --output combined.mp4
```

### Resize Video

```bash
{baseDir}/resize.sh video.mp4 --width 1280
{baseDir}/resize.sh video.mp4 --width 640 --height 480
{baseDir}/resize.sh video.mp4 --scale 0.5
```

### Get Info

```bash
{baseDir}/info.sh video.mp4
{baseDir}/info.sh video.mp4 --json
```

## Options

- `--output <file>`: Output file path
- `--quality <level>`: Quality level (low, medium, high)
- `--size <size>`: Target size (e.g., 10MB)
- `--start <time>`: Start time (HH:MM:SS or seconds)
- `--end <time>`: End time
- `--duration <seconds>`: Duration
- `--format <fmt>`: Output format
- `--width <pixels>`: Output width
- `--height <pixels>`: Output height
- `--scale <factor>`: Scale factor (0.5 = half size)
- `--json`: Output as JSON
- `--json`: JSON output for info

## Examples

**Convert MOV to MP4:**
```bash
{baseDir}/convert.sh recording.mov --output recording.mp4
```

**Compress to under 10MB:**
```bash
{baseDir}/compress.sh large.mp4 --size 10MB --output small.mp4
```

**Trim first 30 seconds:**
```bash
{baseDir}/trim.sh video.mp4 --start 0 --duration 30 --output clip.mp4
```

**Extract MP3 from video:**
```bash
{baseDir}/extract-audio.sh video.mp4 --output audio.mp3
```

## Notes

- Uses FFmpeg for all processing
- Preserves quality by default
- Supports most media formats
- Progress shown during conversion