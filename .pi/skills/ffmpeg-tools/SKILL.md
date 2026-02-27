---
name: ffmpeg-tools
description: "Production-grade FFmpeg video/audio processing. Convert, compress, trim, merge, resize, and extract audio from media files with progress tracking, comprehensive error handling, and safety limits."
metadata:
  version: "2.0.0"
  author: "Pi Agent"
  requires:
    bins: ["ffmpeg", "ffprobe", "node"]
    env: []
  category: "media"
  tags: ["ffmpeg", "video", "audio", "convert", "compress", "trim", "merge"]
---

# FFmpeg-Tools Skill

Production-grade video and audio processing using FFmpeg with comprehensive error handling, progress tracking, and safety constraints.

## When to Use

✅ **USE this skill when:**

- Converting video formats (MOV to MP4, AVI to WebM, etc.)
- Compressing videos to target file sizes
- Trimming video segments
- Extracting audio from video files
- Merging multiple media files
- Resizing videos while maintaining aspect ratio
- Getting detailed media information

❌ **DON'T use this skill when:**

- Complex video editing (effects, transitions) → Use dedicated video editor
- Live streaming operations → Use streaming tools
- Video playback → Use media player
- Frame-by-frame video analysis → Use video-frames skill

## Prerequisites

```bash
# Install FFmpeg
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Verify installation
ffmpeg -version
ffprobe -version
```

## Commands

### 1. Convert Media Format

Convert between video/audio formats with quality control.

```bash
# Basic conversion
{baseDir}/ffmpeg.js convert input.mov --output output.mp4

# With quality settings
{baseDir}/ffmpeg.js convert input.mov --output output.mp4 --quality high
{baseDir}/ffmpeg.js convert input.wav --output output.mp3 --quality medium

# Force specific format (ignores extension)
{baseDir}/ffmpeg.js convert input.mkv --output output.webm --format mp4
```

**Supported Formats:**

| Format | Video Codec | Audio Codec | Notes |
|--------|-------------|-------------|-------|
| MP4 | libx264 | AAC | Best compatibility |
| MOV | libx264 | AAC | Apple formats |
| WebM | libvpx-vp9 | Opus | Web optimized |
| MKV | libx264 | AAC | Matroska container |
| AVI | libx264 | AAC | Older format support |
| MP3 | - | libmp3lame | Audio only |
| AAC | - | AAC | Apple audio |
| OGG | - | libvorbis | Open format |
| FLAC | - | FLAC | Lossless audio |
| WAV | - | pcm_s16le | Uncompressed |

**Quality Levels:**

| Level | CRF | Preset | Bitrate | Best For |
|-------|-----|--------|---------|----------|
| `low` | 28 | ultrafast | 800k | Archival/quick encode |
| `medium` | 23 | fast | 2M | Default/general use |
| `high` | 18 | slow | 5M | Quality preservation |
| `lossless` | 0 | veryslow | unlimited | Maximum quality |

### 2. Compress Video

Achieve target file sizes with intelligent bit rate calculation.

```bash
# Compress with quality preset
{baseDir}/ffmpeg.js compress video.mp4 --output compressed.mp4 --quality low
{baseDir}/ffmpeg.js compress video.mp4 --output compressed.mp4 --quality medium

# Compress to specific size
{baseDir}/ffmpeg.js compress video.mp4 --size 10MB --output small.mp4
{baseDir}/ffmpeg.js compress video.mp4 --size 100MB --output shareable.mp4

# Advanced size targets
{baseDir}/ffmpeg.js compress video.mp4 --size 500KB --output tiny.mp4
{baseDir}/ffmpeg.js compress video.mp4 --size 2.5GB --output archive.mp4
```

**Size Calculation:**

The tool automatically calculates optimal bit rates for target sizes:
- Accounts for audio track (128kbps AAC)
- Leaves 8% headroom for container overhead
- Validates minimum bit rate feasibility
- Falls back to CRF-based compression if size target is infeasible

### 3. Trim Video Segment

Extract precise video segments.

```bash
# Trim by start and duration
{baseDir}/ffmpeg.js trim video.mp4 --start 00:01:30 --duration 60 --output clip.mp4
{baseDir}/ffmpeg.js trim video.mp4 --start 90 --duration 60 --output clip.mp4

# Trim by start and end time
{baseDir}/ffmpeg.js trim video.mp4 --start 00:02:00 --end 00:03:00 --output segment.mp4
{baseDir}/ffmpeg.js trim video.mp4 --start 1:00 --end 2:30 --output segment.mp4

# Millisecond precision
{baseDir}/ffmpeg.js trim video.mp4 --start 5.5 --duration 10.25 --output precise.mp4
```

**Time Formats Supported:**
- Seconds: `30`, `90.5`
- Minutes:Seconds: `1:30`, `2:45.5`
- Hours:Minutes:Seconds: `01:30:00`, `00:02:15`

### 4. Extract Audio

Extract audio tracks with format options.

```bash
# Extract to MP3
{baseDir}/ffmpeg.js extract-audio video.mp4 --output audio.mp3
{baseDir}/ffmpeg.js extract-audio video.mp4 --output audio.mp3 --format mp3

# Extract to other formats
{baseDir}/ffmpeg.js extract-audio video.mp4 --output audio.aac --format aac
{baseDir}/ffmpeg.js extract-audio video.mp4 --output audio.ogg --format ogg
{baseDir}/ffmpeg.js extract-audio video.mp4 --output audio.flac --format flac
{baseDir}/ffmpeg.js extract-audio video.mp4 --output audio.wav --format wav

# With specific quality
{baseDir}/ffmpeg.js extract-audio video.mp4 --output audio.mp3 --format mp3 --quality 320k
```

### 5. Merge Media Files

Concatenate multiple files into one.

```bash
# Merge two videos
{baseDir}/ffmpeg.js merge video1.mp4 video2.mp4 --output combined.mp4

# Merge multiple videos
{baseDir}/ffmpeg.js merge intro.mp4 main.mp4 outro.mp4 --output final.mp4

# Merge all in directory
{baseDir}/ffmpeg.js merge clips/*.mp4 --output full-video.mp4
```

**Requirements:**
- All inputs must have same codec and resolution
- Audio streams must be compatible
- Files will be concatenated in order provided

### 6. Resize Video

Scale videos while maintaining aspect ratio.

```bash
# Scale by width (height auto)
{baseDir}/ffmpeg.js resize video.mp4 --width 1280 --output resized.mp4
{baseDir}/ffmpeg.js resize video.mp4 --width 640 --output mobile.mp4
{baseDir}/ffmpeg.js resize video.mp4 --width 1920 --output 1080p.mp4

# Scale by height (width auto)
{baseDir}/ffmpeg.js resize video.mp4 --height 720 --output resized.mp4

# Scale by factor
{baseDir}/ffmpeg.js resize video.mp4 --scale 0.5 --output half-size.mp4
{baseDir}/ffmpeg.js resize video.mp4 --scale 0.25 --output quarter-size.mp4
```

**Scaling Options:**
- `--width <pixels>`: Scale to width, height calculated automatically
- `--height <pixels>`: Scale to height, width calculated automatically
- `--scale <factor>`: Scale both dimensions (0.5 = half size)

### 7. Get Media Information

Display detailed file metadata.

```bash
# Human-readable output
{baseDir}/ffmpeg.js info video.mp4

# JSON output
{baseDir}/ffmpeg.js info video.mp4 --json
{baseDir}/ffmpeg.js info audio.mp3 --json > info.json
```

**Sample Output:**
```
Media Information:
==================
Format: mov,mp4,m4a,3gp,3g2,mj2
Duration: 00:12:34
Size: 1.23 GB
Bitrate: 14,372 kbps

Video Stream:
  Codec: h264
  Resolution: 1920x1080
  Frame Rate: 29.97 fps

Audio Stream:
  Codec: aac
  Sample Rate: 48000 Hz
  Channels: Stereo
```

## Progress Tracking

All operations display real-time progress when run in interactive terminals:

```
⏳ Converting: 45.2% | Frame 1247@23.5fps | Elapsed: 00:00:53 | ETA: 00:01:04
```

**Progress fields:**
- Percentage complete (when duration known)
- Current frame number
- Encoding FPS
- Elapsed time
- Estimated time remaining (ETA)

## Safety Features

### 1. Input Validation

- Files must exist before processing
- Maximum input size: 10GB
- Maximum duration: 24 hours
- Malformed files are detected before processing

### 2. Disk Space Protection

- Minimum 100MB free space required before processing
- Automatic checks before large operations
- Clear error messages if disk space is insufficient

### 3. Timeouts

- Maximum operation time: 2 hours
- Prevents runaway conversions
- Signal handling for graceful interruption

### 4. Signal Handling

- Press Ctrl+C to gracefully interrupt operations
- Partial files are cleaned up automatically
- No orphaned temporary files

## Error Handling

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | SUCCESS | Operation completed successfully |
| 1 | INVALID_INPUT | Missing or invalid parameters |
| 2 | FILE_NOT_FOUND | Input file does not exist |
| 3 | PERMISSION_DENIED | Cannot read/write files |
| 4 | DISK_FULL | Insufficient disk space |
| 5 | INVALID_FORMAT | Unsupported format specified |
| 6 | FFMPEG_ERROR | FFmpeg execution failed |
| 7 | TIMEOUT | Operation exceeded time limit |
| 8 | INTERRUPTED | Interrupted by user signal |
| 9 | VALIDATION_FAILED | Pre-operation validation check failed |
| 99 | UNKNOWN | Unexpected error occurred |

### Common Errors and Solutions

**"File too large"**
- File exceeds 10GB size limit
- Solution: Split into smaller segments

**"Duration too long"**
- Video exceeds 24 hour limit
- Solution: Process in segments

**"Insufficient disk space"**
- Less than 100MB available
- Solution: Free up disk space

**"Target size too small"**
- Requested size would require impossibly low bit rate
- Solution: Use larger target size or CRF-based compression

**"Invalid trim range"**
- Start/end times exceed video duration
- Solution: Check video duration with `info` command

## Technical Architecture

### Quality Settings System

Uses Constant Rate Factor (CRF) encoding:
- **CRF 0-17**: Visually lossless
- **CRF 18-23**: High quality (default range)
- **CRF 23-28**: Good quality, smaller files
- **CRF 28+**: Lower quality, archival use

### Encoding Presets

Balance between encoding speed and efficiency:
- **ultrafast**: Fastest, larger files
- **superfast**: Fast encoder
- **veryfast**: Standard fast mode
- **faster**: Good balance
- **fast**: Standard quality mode
- **medium**: Default balance
- **slow**: Better compression
- **slower**: High efficiency
- **veryslow**: Maximum compression

### Audio Codecs

| Format | Codec | Notes |
|--------|-------|-------|
| MP3 | LAME | -q:a 2 for 320kbps VBR |
| AAC | Apple/AAC | Excellent compatibility |
| Opus | libopus | Best compression quality |
| Vorbis | libvorbis | Open format alternative |
| FLAC | FLAC | Lossless archival |

## Performance Tips

### 1. Fast Conversions

Use lower quality presets for faster encoding:
```bash
{baseDir}/ffmpeg.js convert video.mov --output out.mp4 --quality low
```

### 2. Batch Processing

Process multiple files with shell loops:
```bash
for f in *.mov; do
  {baseDir}/ffmpeg.js convert "$f" --output "${f%.mov}.mp4" --quality medium
done
```

### 3. Parallel Operations

⚠️ Warning: Be mindful of CPU/disk I/O limits
```bash
# Run 2 conversions in parallel
{baseDir}/ffmpeg.js convert video1.mov --output out1.mp4 &
{baseDir}/ffmpeg.js convert video2.mov --output out2.mp4 &
wait
```

### 4. Output Naming

The tool supports flexible output naming:
```bash
# Auto-extension handling
{baseDir}/ffmpeg.js convert video.mov --output video.mp4

# Full path support
{baseDir}/ffmpeg.js convert /data/in.mov --output /data/out.mp4
```

## Examples

### Complete Workflow: Video for Web

```bash
# Step 1: Compress for sharing
{baseDir}/ffmpeg.js compress conference.mp4 --size 50MB --output for-share.mp4

# Step 2: Create thumbnail
{baseDir}/ffmpeg.js extract-audio for-share.mp4 --output audio.mp3

# Step 3: Get info for documentation
{baseDir}/ffmpeg.js info for-share.mp4 --json > specs.json
```

### Extract Highlights

```bash
# Extract first minute
{baseDir}/ffmpeg.js trim video.mp4 --start 0 --duration 60 --output intro.mp4

# Extract last 30 seconds
{baseDir}/ffmpeg.js info video.mp4 --json > info.json
DURATION=$(cat info.json | jq -r '.format.duration')
{baseDir}/ffmpeg.js trim video.mp4 --start $(($DURATION - 30)) --duration 30 --output outro.mp4

# Merge highlights
{baseDir}/ffmpeg.js merge intro.mp4 outro.mp4 --output highlights.mp4
```

### Batch Convert to Web-Optimized Format

```bash
#!/bin/bash
for video in *.mov *.avi; do
  [ -f "$video" ] || continue
  base="${video%.*}"
  echo "Converting: $video"
  {baseDir}/ffmpeg.js convert "$video" --output "${base}.webm" --quality low
done
```

## Notes

- Progress indicators require interactive terminal (TTY)
- Non-interactive usage shows final results only
- Temporary files are automatically cleaned up
- All output files are verified after creation
- JSON output enables programmatic integration
- Cross-platform: Works on macOS, Linux, Windows (with WSL)
