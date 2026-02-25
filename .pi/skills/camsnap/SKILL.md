---
name: camsnap
description: Capture frames or clips from RTSP/ONVIF cameras. Monitor security cameras and capture motion events.
metadata: { "popebot": { "emoji": "📸", "requires": { "bins": ["ffmpeg"], "env": ["CAMERA_URL", "CAMERA_USER", "CAMERA_PASS"] } } }
---

# camsnap

Capture snapshots and clips from IP cameras (RTSP/ONVIF).

## Prerequisites

Requires ffmpeg and camera credentials. Configure via environment:

- `CAMERA_URL` - RTSP URL (e.g., `rtsp://192.168.1.100:554/stream`)
- `CAMERA_USER` - Camera username (optional)
- `CAMERA_PASS` - Camera password (optional)

## Common RTSP URL Formats

```
# Generic RTSP
rtsp://username:password@ip_address:port/stream

# Hikvision
rtsp://username:password@ip_address:554/streaming/channels/101

# Dahua
rtsp://username:password@ip_address:554/cam/realmonitor?channel=1&subtype=1

# Axis
rtsp://username:password@ip_address/axis-media/media.amp

# Reolink
rtsp://username:password@ip_address:554/h264Preview_01_main
```

## Usage

### Capture Snapshot

Take a snapshot from a camera:

```bash
ffmpeg -rtsp_transport tcp -i "rtsp://camera-url" -frames:v 1 snapshot.jpg
```

### Capture with Authentication

```bash
ffmpeg -rtsp_transport tcp -i "rtsp://user:pass@camera-ip/stream" -frames:v 1 snapshot.jpg
```

### Extract Short Clip

Capture a 5-second clip:

```bash
ffmpeg -rtsp_transport tcp -i "rtsp://camera-url" -t 5 -c copy clip.mp4
```

### Continuous Monitoring

Monitor camera and capture on motion (requires motion detection setup):

```bash
ffmpeg -i "rtsp://camera-url" -vf "motion=bbox=1" -f null -
```

### Multi-Camera Snapshot

Capture from multiple cameras:

```bash
# Camera 1
ffmpeg -i "rtsp://cam1-url" -frames:v 1 cam1.jpg

# Camera 2
ffmpeg -i "rtsp://cam2-url" -frames:v 1 cam2.jpg
```

## Tips

- Use `-rtsp_transport tcp` for more reliable connections
- Add `-stimeout 5000000` for connection timeout (5 seconds)
- Use `-c copy` to avoid re-encoding when recording clips
- For low bandwidth, use lower resolution streams (sub-streams)
