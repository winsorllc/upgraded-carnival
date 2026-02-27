---
name: camsnap
description: "Production-grade IP camera (RTSP/ONVIF) capture system with snapshot recording, video clips, motion detection, multi-camera support, and credential management. Supports Hikvision, Dahua, Axis, Reolink, UniFi, Wyze, and generic cameras."
metadata:
  version: "2.0.0"
  author: "Pi Agent"
  requires:
    bins: ["ffmpeg", "ffprobe", "node"]
    env: []
  category: "media"
  tags: ["camera", "rtsp", "ip-camera", "snapshot", "security", "monitoring", "hikvision", "dahua"]
---

# Camsnap Skill

Production-grade IP camera capture system for RTSP/ONVIF cameras with comprehensive error handling and multi-brand support.

## When to Use

✅ **USE this skill when:**

- Capturing snapshots from IP security cameras
- Recording security camera footage
- Testing RTSP stream connectivity
- Needing automated camera monitoring
- Recording clips from security cameras
- Multi-camera snapshot capture
- Long-term camera monitoring
- Security or timelapse applications

❌ **DON'T use this skill when:**

- Needing webcam capture → Use system webcam tools
- Capturing video frames from files → Use video-frames
- Needing live streaming → Use streaming tools
- Video editing → Use video editing software

## Prerequisites

```bash
# Install FFmpeg
brew install ffmpeg        # macOS
sudo apt install ffmpeg    # Ubuntu/Debian

# Verify RTSP support
ffmpeg -formats | grep rtsp

# Camera must be:
# - Network accessible
# - RTSP enabled
# - Credentials known (if required)
```

## Camera URL Formats

### Supported Camera Types

| Type | Pattern | Default Port |
|------|---------|--------------|
| Generic | `rtsp://ip:port/path` | 554 |
| Hikvision | `rtsp://ip:554/Streaming/Channels/101` | 554 |
| Dahua | `rtsp://ip:554/cam/realmonitor?channel=1&subtype=0` | 554 |
| Axis | `rtsp://ip:554/axis-media/media.amp` | 554 |
| Reolink | `rtsp://ip:554/h264Preview_01_main` | 554 |
| UniFi | `rtsp://ip:554/livestream/ch00_0` | 554 |
| Wyze | `rtsp://ip:554/live` | 554 |

### Sample URLs

```
# Generic with authentication
rtsp://admin:password@192.168.1.100:554/stream

# Hikvision (channel 1, high quality)
rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101

# Hikvision (channel 1, low quality)
rtsp://admin:password@192.168.1.100:554/Streaming/Channels/102

# Dahua (channel 1)
rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0

# Axis
rtsp://root:password@192.168.1.100:554/axis-media/media.amp

# Reolink (main stream)
rtsp://admin:password@192.168.1.100:554/h264Preview_01_main

# Reolink (sub stream - lower quality)
rtsp://admin:password@192.168.1.100:554/h264Preview_01_sub

# UniFi Protect
rtsp://192.168.1.100:554/livestream/ch00_0

# Wyze Cam
rtsp://your_username:password@192.168.1.100:554/live
```

## Commands

### 1. Capture Snapshot

Capture a single frame from camera.

```bash
# Basic snapshot (requires credentials)
{baseDir}/camsnap.js snapshot --url rtsp://admin:pass@192.168.1.100/stream --output camera.jpg

# Using separate credentials
{baseDir}/camsnap.js snapshot --ip 192.168.1.100 --port 554 \
  --username admin --password secret --output camera.jpg

# Hikvision camera
{baseDir}/camsnap.js snapshot --type hikvision --ip 192.168.1.100 \
  --username admin --password secret --output camera.jpg

# With quality settings
{baseDir}/camsnap.js snapshot --url rtsp://cam.example.com/stream \
  --format png --quality 1 --output high-quality.png

# Resized snapshot
{baseDir}/camsnap.js snapshot --url rtsp://192.168.1.100/stream \
  --resize 1280x720 --output thumb.jpg

# No timestamp overlay
{baseDir}/camsnap.js snapshot --url rtsp://192.168.1.100/stream \
  --no-timestamp --output clean.jpg
```

**Output Options:**
| Option | Values | Description |
|--------|--------|-------------|
| `--format` | jpg, png, bmp, tiff | Output format |
| `--quality` | 1-31 | JPEG quality (1=best) |
| `--resize` | WxH | Resize dimensions |
| `--no-timestamp` | - | Disable overlay |

### 2. Record Video Clip

Record a short video clip from camera.

```bash
# Basic recording
{baseDir}/camsnap.js record --url rtsp://192.168.1.100/stream \
  --duration 10 --output clip.mp4

# High quality, 30 seconds
{baseDir}/camsnap.js record --url rtsp://192.168.1.100/stream \
  --duration 30 --quality high --no-audio --output recording.mp4

# With specific frame rate
{baseDir}/camsnap.js record --url rtsp://192.168.1.100/stream \
  --duration 60 --fps 15 --quality medium --output clip.mp4

# Maximum quality (large file)
{baseDir}/camsnap.js record --url rtsp://192.168.1.100/stream \
  --duration 300 --quality maximum --fps 30 --output high-quality.mp4
```

**Quality Presets:**
| Preset | FPS | Bitrate | Use Case |
|--------|-----|---------|----------|
| `low` | 10 | ~500k | Archival, long recordings |
| `medium` | 15 | ~1000k | Default balance |
| `high` | 25 | ~2000k | Detailed recording |
| `maximum` | 30 | ~4000k | Best quality |

**Recording Limits:**
- Minimum: 1 second
- Maximum: 3600 seconds (1 hour)
- Recommended: 10-300 seconds

### 3. Test Camera Connection

Verify camera connectivity and get stream information.

```bash
# Test basic connection
{baseDir}/camsnap.js test --url rtsp://192.168.1.100/stream

# Test with credentials
{baseDir}/camsnap.js test --ip 192.168.1.100 --username admin --password secret

# Test Hikvision
{baseDir}/camsnap.js test --type hikvision --ip 192.168.1.100 \
  --username admin --password secret

# Extended timeout for slow cameras
{baseDir}/camsnap.js test --url rtsp://192.168.1.100/stream \
  --timeout 30000
```

**Sample Output:**
```json
{
  "connected": true,
  "url": "rtsp://***:***@192.168.1.100...",
  "format": "rtsp",
  "video": {
    "codec": "h264",
    "resolution": "1920x1080",
    "fps": 25,
    "bitrate": "4096000"
  },
  "audio": {
    "codec": "aac",
    "sampleRate": "48000",
    "channels": 2
  }
}
```

### 4. Motion Detection

Monitor camera for motion events.

```bash
# Monitor for 60 seconds
{baseDir}/camsnap.js detect --url rtsp://192.168.1.100/stream \
  --duration 60

# With custom threshold
{baseDir}/camsnap.js detect --url rtsp://192.168.1.100/stream \
  --duration 300 --threshold 0.05 --clip-duration 10

# On motion, record clip
{baseDir}/camsnap.js detect --url rtsp://192.168.1.100/stream \
  --duration 600 --clip-duration 15 --output-dir ./motion-clips
```

**Detection Options:**
| Option | Default | Description |
|--------|---------|-------------|
| `--duration` | 10 | How long to monitor (seconds) |
| `--threshold` | 0.02 | Motion sensitivity (0.01-1.0) |
| `--clip-duration` | 5 | Clip length on detection |

### 5. Credential Management

Store camera credentials securely.

```bash
# Save credentials
{baseDir}/camsnap.js credentials --save --name front-door \
  --username admin --password secret --type hikvision

# List saved credentials
{baseDir}/camsnap.js credentials --list

# Use saved credentials
{baseDir}/camsnap.js snapshot --ip 192.168.1.100 \
  --use-credentials front-door --output camera.jpg
```

**Credentials Storage:**
- Location: `~/.camsnap_credentials`
- Permissions: `600` (owner read/write only)
- Format: JSON with base64-encoded passwords
- No encryption (OS file permissions only)

## Camera Setup Guides

### Hikvision

```bash
# 1. Enable RTSP in camera settings:
#    Configuration > Network > Advanced > RTSP
#    (Port 554 by default)

# 2. Main stream (high quality)
{baseDir}/camsnap.js snapshot --type hikvision --ip 192.168.1.100 \
  --username admin --password password --output camera.jpg

# 3. Sub stream (lower quality, less bandwidth)
{baseDir}/camsnap.js snapshot --url "rtsp://admin:password@192.168.1.100:554/Streaming/Channels/102" \
  --output camera-low.jpg
```

**Channel Numbers:**
- Channel 1: `101` (main), `102` (sub)
- Channel 2: `201` (main), `202` (sub)
- Channel N: `N01` (main), `N02` (sub)

### Dahua

```bash
# 1. Enable RTSP in camera:
#    Settings > Network > Connection > RTSP

# 2. Capture snapshot
{baseDir}/camsnap.js snapshot --type dahua --ip 192.168.1.100 \
  --username admin --password password --channel 1 --output camera.jpg

# 3. Higher quality (subtype=0)
{baseDir}/camsnap.js snapshot --url "rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0" \
  --output camera.jpg

# 4. Lower quality (subtype=1)
{baseDir}/camsnap.js snapshot --url "rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=1" \
  --output camera-low.jpg
```

### Axis

```bash
# 1. Enable RTSP in camera:
#    Plain Config > Network > Network > VAPIX

# 2. Test connection
{baseDir}/camsnap.js snapshot --type axis --ip 192.168.1.100 \
  --username root --password pass --output camera.jpg
```

### Reolink

```bash
# 1. Enable RTSP in Reolink app:
#    Settings > Device > Stream Protocol > RTSP

# 2. Main stream (1080p)
{baseDir}/camsnap.js snapshot --type reolink --ip 192.168.1.100 \
  --username admin --password password --stream 01 --output camera.jpg

# 3. Sub stream (480p)
{baseDir}/camsnap.js snapshot --url "rtsp://admin:password@192.168.1.100:554/h264Preview_01_sub" \
  --output camera-low.jpg
```

### UniFi Protect

```bash
# 1. In UniFi Protect, enable RTSP for camera
#    Settings > System > RTSP Service

# 2. Get stream URL from UniFi dashboard

# 3. Capture snapshot
{baseDir}/camsnap.js snapshot --type unifi --ip 192.168.1.100 \
  --output camera.jpg
```

### Wyze Cam

```bash
# 1. Enable RTSP firmware on Wyze
#    (Requires custom firmware)

# 2. Capture snapshot
{baseDir}/camsnap.js snapshot --type wyze --ip 192.168.1.100 \
  --username username --password password --output camera.jpg
```

## Connection Troubleshooting

### Common Errors

**"Connection timed out"**

```bash
# Causes:
# 1. Camera not responding
# 2. Network issue
# 3. RTSP not enabled

# Solutions:
ping 192.168.1.100                    # Test connectivity
telnet 192.168.1.100 554              # Test RTSP port
{baseDir}/camsnap.js test --url rtsp://192.168.1.100 --timeout 30000
```

**"Authentication failed"**

```bash
# Causes:
# 1. Wrong username/password
# 2. Camera requires digest auth
# 3. Credentials have special characters

# Solutions:
# - Verify credentials in camera web UI
# - URL-encode special characters
{baseDir}/camsnap.js snapshot --url "rtsp://admin:p%40ssword@192.168.1.100/stream" \
  --output camera.jpg
```

**"Stream not found"**

```bash
# Causes:
# 1. Wrong stream path
# 2. Camera type mismatch

# Solutions:
# Check camera documentation for correct RTSP URL
{baseDir}/camsnap.js snapshot --type hikvision --ip 192.168.1.100 \
  --username admin --password secret --output camera.jpg
```

**"FFmpeg error"**

```bash
# Causes:
# 1. FFmpeg not installed
# 2. RTSP support missing
# 3. Codec not supported

# Solutions:
ffmpeg -protocols | grep rtsp        # Check RTSP support
brew reinstall ffmpeg --with-librtsp # Reinstall with RTSP (macOS)
```

## Error Handling

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | SUCCESS | Operation completed |
| 1 | INVALID_INPUT | Bad parameter |
| 2 | CAMERA_UNREACHABLE | Can't connect |
| 3 | AUTHENTICATION_FAILED | Wrong credentials |
| 4 | STREAM_ERROR | Stream issue |
| 5 | FFMPEG_ERROR | FFmpeg failed |
| 6 | TIMEOUT | Operation timed out |
| 7 | STORAGE_ERROR | Can't write file |
| 8 | MOTION_DETECTION_ERROR | Detection failed |
| 99 | UNKNOWN | Unexpected error |

### Exit Status

```bash
{baseDir}/camsnap.js test --url rtsp://192.168.1.100/stream
echo $?  # 0 = success

{baseDir}/camsnap.js snapshot --url invalid
echo $?  # 1 = error (see above codes)
```

## Examples

### Security Snapshot Script

```bash
#!/bin/bash
# Capture hourly snapshots from security cameras

CAMERAS=(
  "rtsp://admin:pass@192.168.1.100/Streaming/Channels/101"
  "rtsp://admin:pass@192.168.1.101/cam/realmonitor?channel=1"
)

OUTPUT_DIR="/var/security/snapshots/$(date +%Y/%m/%d)"
mkdir -p "$OUTPUT_DIR"

for url in "${CAMERAS[@]}"; do
  name=$(echo "$url" | grep -o '[0-9]\+\.\|[0-9]\+$' | head -1)
  timestamp=$(date +%H%M%S)
  
  {baseDir}/camsnap.js snapshot --url "$url" \
    --output "$OUTPUT_DIR/camera_${name}_${timestamp}.jpg" 2>/dev/null
  
  if [ $? -eq 0 ]; then
    echo "[$timestamp] Captured: Camera $name"
  else
    echo "[$timestamp] Failed: Camera $name"
  fi
done

# Keep only last 30 days of snapshots
find /var/security/snapshots -name "*.jpg" -mtime +30 -delete
```

### Timelapse Recording

```bash
#!/bin/bash
# Capture snapshot every minute for timelapse

URL="rtsp://admin:password@192.168.1.100/stream"
OUTPUT="/var/timelapse/$(date +%Y%m%d)"
mkdir -p "$OUTPUT"

duration=3600  # Record for 1 hour
interval=60    # Every 60 seconds

# Note: This is simplified - use cron for production
cd "$OUTPUT"
for ((i=0; i<duration; i+=interval)); do
  {baseDir}/camsnap.js snapshot --url "$URL" \
    --output "frame_$(printf %05d $i).jpg" 2>/dev/null
  sleep $interval
done

# Create timelapse video from frames
ffmpeg -framerate 30 -i frame_%05d.jpg -c:v libx264 -crf 18 timelapse.mp4
```

### Motion Detection with Alert

```bash
#!/bin/bash
# Monitor camera and send alert on motion

URL="rtsp://admin:password@192.168.1.100/stream"

{baseDir}/camsnap.js detect --url "$URL" --duration 3600 --threshold 0.05

if [ $? -eq 0 ]; then
  # Motion detected - send notification
  echo "Motion detected at $(date)" | mail -s "Security Alert" admin@example.com
  
  # Capture evidence
  {baseDir}/camsnap.js snapshot --url "$URL" --output "/alerts/motion_$(date +%s).jpg"
fi
```

### Multi-Camera Capture

```bash
#!/bin/bash
# Capture from multiple cameras simultaneously

CAMERA1="rtsp://admin:pass@192.168.1.100/stream"
CAMERA2="rtsp://admin:pass@192.168.1.101/stream"
CAMERA3="rtsp://admin:pass@192.168.1.102/stream"

{baseDir}/camsnap.js snapshot --url "$CAMERA1" --output /tmp/cam1.jpg &
c1=$!
{baseDir}/camsnap.js snapshot --url "$CAMERA2" --output /tmp/cam2.jpg &
c2=$!
{baseDir}/camsnap.js snapshot --url "$CAMERA3" --output /tmp/cam3.jpg &
c3=$!

# Wait for all
wait $c1 $c2 $c3

# Create contact sheet
montage /tmp/cam1.jpg /tmp/cam2.jpg /tmp/cam3.jpg \
  -tile 3x1 -geometry +4+4 +label "Cam 1" "Cam 2" "Cam 3" \
  -output multisource.jpg
```

### Periodic Recording Scheduler

```bash
#!/bin/bash
# Record 10-minute clips every hour

URL="rtsp://admin:password@192.168.1.100/stream"
OUTPUT_DIR="/var/recordings/$(date +%Y%m)"
mkdir -p "$OUTPUT_DIR"

# Add to crontab:
# 0 * * * * /path/to/record-hourly.sh

{baseDir}/camsnap.js record --url "$URL" \
  --duration 600 \
  --quality high \
  --output "$OUTPUT_DIR/recording_$(date +%Y%m%d_%H%M).mp4"
```

## Performance Tips

### 1. Use TCP Transport (Default)

```bash
# TCP is more reliable
{baseDir}/camsnap.js snapshot --url rtsp://192.168.1.100/stream

# For UDP (may drop packets)
{baseDir}/camsnap.js snapshot --url rtsp://192.168.1.100/stream --transport udp
```

### 2. Optimize Quality

```bash
# Quick preview
{baseDir}/camsnap.js snapshot --url "..." --resize 640x480 --quality 5

# Quality capture
{baseDir}/camsnap.js snapshot --url "..." --format png --resize 1
```

### 3. Use Lower Stream

```bash
# For Hikvision: use channel 102 (sub-stream) instead of 101
{baseDir}/camsnap.js snapshot --url "rtsp://admin:pass@192.168.1.100/Streaming/Channels/102"
```

### 4. Parallel Operations

```bash
# Start multiple captures in parallel
{baseDir}/camsnap.js snapshot --url rtsp://cam1/stream --out /tmp/c1.jpg &
cam1_id=$!
{baseDir}/camsnap.js snapshot --url rtsp://cam2/stream --out /tmp/c2.jpg &
cam2_id=$!

# Wait for completion
wait $cam1_id $cam2_id
```

## Technical Details

### Connection Flow

```
1. Parse camera configuration
   ├── URL or constructed from params
   ├── Credentials embedded
   └── Type-specific formatting

2. Test connection
   ├── ffprobe RTSP stream
   ├── Verify authentication
   └── Get stream info

3. Capture
   ├── FFmpeg connects
   ├── Extract frame/record
   └── Save with timestamp

4. Return result
   └── File path, size, metadata
```

### RTSP Parameters

Default FFmpeg settings:
```
-rtsp_transport tcp          # Use TCP (reliable)
-stimeout 5000000           # 5 second read timeout
-frames:v 1                  # Capture single frame
-q:v 2                       # JPEG quality
```

### Recording Settings

Quality presets use H.264 with AAC audio:
```
-low:     -crf 28 -preset ultrafast -b:v 500k -r 10
-medium:  -crf 23 -preset fast      -b:v 1000k -r 15
-high:    -crf 20 -preset medium    -b:v 2000k -r 25
-maximum: -crf 18 -preset slow      -b:v 4000k -r 30
```

## Security Notes

- **Credential Storage:** Stored in `~/.camsnap_credentials` with 600 permissions
- **URL Handling:** Passwords are hidden in output
- **No Encryption:** Use system file permissions on credential file
- **Network Security:** Camera should be on local network or VPN
- **HTTPS:** Not used (RTSP protocol limitation)
- **Rotate Credentials:** Periodically update camera passwords

## Notes

- Snapshots include timestamp overlay by default
- Recording shows progress in terminal
- Maximum clip duration: 1 hour
- Supports both TCP and UDP RTSP transport
- FFmpeg required for all operations
- Credential names can be any string
- Camera types automate URL building
- All output files are verified for non-zero size
- Special characters in passwords must be URL-encoded
- Timelapse creation requires separate ffmpeg command
- Motion detection is basic (sampling only)
- For production monitoring, use dedicated NVR software
