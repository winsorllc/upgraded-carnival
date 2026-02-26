---
name: transcribe
description: "Production-grade speech-to-text transcription with Groq Whisper API support. Automatic file segmentation, multiple output formats, word-level timestamps, language auto-detection, and intelligent caching."
metadata:
  version: "2.0.0"
  author: "Pi Agent"
  requires:
    bins: ["node", "ffmpeg"]
    env: ["GROQ_API_KEY"]
  category: "media"
  tags: ["transcription", "speech-to-text", "whisper", "audio", "srt", "vtt", "subtitle"]
---

# Transcribe Skill

Production-grade speech-to-text transcription with intelligent file handling, multiple output formats, and parallel processing.

## When to Use

✅ **USE this skill when:**

- Transcribing audio recordings to text
- Creating subtitles for video content
- Converting speech to searchable text
- Needing word-level timestamps
- Processing podcasts or meeting recordings
- Transcribing interviews
- Converting audio notes to text
- Creating transcripts for video editing

❌ **DON'T use this skill when:**

- Transcribing YouTube videos → Use youtube-transcript (faster, no API cost)
- Real-time transcription → Use streaming tools
- Already have captions → Use youtube-transcript
- Need video-specific processing → Use ffmpeg-tools first

## Prerequisites

```bash
# 1. Get Groq API key
# Visit: https://console.groq.com/
# Create an API key

# 2. Set environment variable
export GROQ_API_KEY="gsk_your_api_key_here"

# 3. Install FFmpeg (for audio processing)
brew install ffmpeg        # macOS
sudo apt install ffmpeg    # Ubuntu/Debian

# 4. Verify
node --version  # Should show version
```

## Commands

### Basic Usage

```bash
# Basic transcription (outputs plain text)
{baseDir}/transcribe.js audio.m4a

# Transcribe with specific output format
{baseDir}/transcribe.js audio.mp3 --format srt --output subtitles.srt
{baseDir}/transcribe.js meeting.wav --format json --output result.json

# Specify language for better accuracy
{baseDir}/transcribe.js spanish.mp3 --language es --format text
{baseDir}/transcribe.js audio.mp3 --language de --format vtt
```

### Output Formats

```bash
# Plain text (default)
{baseDir}/transcribe.js audio.mp3 --format text
Transcriber output follows without timestamps.

# JSON with detailed data
{baseDir}/transcribe.js audio.mp3 --format json
{
  "text": "Transcription text...",
  "duration": 123.45,
  "language": "en",
  "words": [{"word": "Transcription", "start": 0.0, "end": 0.5}, ...]
}

# SRT subtitles
{baseDir}/transcribe.js audio.mp3 --format srt --output subtitles.srt
1
00:00:00,000 --> 00:00:05,500
Transcription of the audio begins here

2
00:00:05,500 --> 00:00:11,200
And continues in the next segment

# VTT subtitles
{baseDir}/transcribe.js audio.mp3 --format vtt --output captions.vtt
WEBVTT

00:00.000 --> 00:05.500
Transcription of the audio begins here

# Word timings TSV
{baseDir}/transcribe.js audio.mp3 --format tsv
start\tend\tword
0.000\t0.450\tTranscription
0.450\t0.820\tof
0.820\t1.240\tthe

# Word timings CSV
{baseDir}/transcribe.js audio.mp3 --format csv
start,end,word
0.000,0.450,"Transcription"
0.450,0.820,"of"
0.820,1.240,"the"
```

**Format Comparison:**

| Format | Use Case | Word Timestamps | File Size |
|--------|----------|-----------------|-----------|
| `text` | General use | ❌ | Small |
| `json` | API integration | ✅ | Large |
| `srt` | Subtitles | ⚠️ Phrases | Medium |
| `vtt` | Web captions | ⚠️ Phrases | Medium |
| `tsv` | Spreadsheet | ✅ | Medium |
| `csv` | Database import | ✅ | Medium |
| `word_timings` | Analysis | ✅ | Large |

### Language Selection

```bash
# Auto-detect (default)
{baseDir}/transcribe.js audio.mp3

# Specify language for better accuracy
{baseDir}/transcribe.js audio.mp3 --language en   # English
{baseDir}/transcribe.js audio.mp3 --language es   # Spanish
{baseDir}/transcribe.js audio.mp3 --language fr   # French
{baseDir}/transcribe.js audio.mp3 --language de   # German
{baseDir}/transcribe.js audio.mp3 --language ja   # Japanese
```

**Supported Languages:** All 99 languages supported by Whisper

### Large File Processing

```bash
# Files >25MB are automatically segmented
{baseDir}/transcribe.js long-recording.mp3

# Progress shown for segmented files
⏳ Transcribing: Segment 3/12 (25.0%) | Elapsed: 45.2s

# Output combined automatically
```

### Cache Control

```bash
# Use cache (default) - instant for previously transcribed
{baseDir}/transcribe.js audio.mp3

# Force fresh transcription
{baseDir}/transcribe.js audio.mp3 --no-cache
```

### API Provider Selection

```bash
# Use Groq (default) - faster, cheaper
{baseDir}/transcribe.js audio.mp3 --provider groq

# Use OpenAI Whisper (requires OPENAI_API_KEY)
{baseDir}/transcribe.js audio.mp3 --provider openai
```

## Supported Audio Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| MP3 | .mp3 | Best compatibility |
| MP4 | .mp4, .m4a | iOS recordings |
| WAV | .wav | Uncompressed, large files |
| OGG | .ogg, .oga, .ogv | Open format |
| FLAC | .flac | Lossless compression |
| WebM | .webm | Web audio/videos |
| AAC | .aac | Apple format |
| WMA | .wma | Windows format |

**Audio Preprocessing:**
- Unsupported formats are auto-converted to MP3
- Sample rate normalized to 16kHz (Whisper optimal)
- Mono channel for better accuracy
- Bitrate: 192kbps MP3

## Features

### Automatic Segmentation

Large audio files are automatically split for processing:

```
Audio File >25MB
    ↓ FFmpeg
Convert to MP3 (16kHz, mono)
    ↓
Split into 10-minute segments
    ↓
Transcribe segments in parallel
    ↓
Merge results with adjusted timestamps
```

**Segmentation Benefits:**
- ✓ Handles recordings up to 2 hours
- ✓ Respects API rate limits
- ✓ Parallel processing for speed
- ✓ Seamless results (timestamps adjusted)

### Word-Level Timestamps

Each word includes start and end timestamps:

```json
{
  "words": [
    {"word": "Hello", "start": 0.000, "end": 0.320},
    {"word": "and", "start": 0.320, "end": 0.560},
    {"word": "welcome", "start": 0.560, "end": 0.980},
    {"word": "everyone", "start": 0.980, "end": 1.420}
  ]
}
```

**Uses for Timestamps:**
- Jump to specific words in audio
- Create perfectly synced subtitles
- Search within transcripts
- Edit audio at transcript points
- Analyze speech patterns

### Intelligent Caching

- **Cache Location:** `/tmp/transcribe-cache/`
- **TTL:** 24 hours
- **Cache Key:** File hash + language + model

```bash
# First time: ~10-60 seconds
{baseDir}/transcribe.js audio.mp3 --format json

# Second time: ~1 second (cache hit)
{baseDir}/transcribe.js audio.mp3 --format json

# Force fresh: ~10-60 seconds
{baseDir}/transcribe.js audio.mp3 --format json --no-cache
```

### Rate Limiting

Built-in protection against API limits:
- Max 60 requests per minute
- Automatic delays between requests
- Sequential processing for safety

**Cost Optimization:**
- Groq Whisper Turbo: Free tier available
- Cached results cost nothing
- Segmented files use 1 request per segment

## Error Handling

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | SUCCESS | Transcription complete |
| 1 | INVALID_INPUT | Bad parameters |
| 2 | FILE_NOT_FOUND | Audio file missing |
| 3 | FILE_TOO_LARGE | Exceeds 2 hours |
| 4 | UNSUPPORTED_FORMAT | Can't process format |
| 5 | API_KEY_MISSING | GROQ_API_KEY not set |
| 6 | API_ERROR | Request failed |
| 7 | RATE_LIMITED | API throttling |
| 8 | NETWORK_ERROR | Connection issue |
| 9 | TIMEOUT | Request took too long |
| 10 | AUDIO_PROCESSING_ERROR | FFmpeg failed |
| 11 | SEGMENTATION_ERROR | Splitting failed |
| 12 | INTERRUPTED | User cancelled |
| 99 | UNKNOWN | Unexpected error |

### Common Errors

**"API key not found"**
```bash
# Solution: Set the environment variable
export GROQ_API_KEY="gsk_your_key"
echo "export GROQ_API_KEY=gsk_your_key" >> ~/.zshrc  # Persist
```

**"File too large"**
```bash
# Video duration exceeds 2 hours
# Solution: Split manually first
ffmpeg -i long.mp4 -ss 0 -t 7200 first.mp4
ffmpeg -i long.mp4 -ss 7200 -t 7200 second.mp4
```

**"Rate limited"**
```bash
# Too many requests
# Solution: Wait 1 minute, try again
# Or add delay between batch operations
```

## Technical Details

### Processing Pipeline

```
1. Validate Input
   ├── Check file exists
   ├── Check format supported
   ├── Probe audio metadata
   └── Validate size/duration

2. Check Cache
   └── Return cached if available

3. Preprocess (if needed)
   ├── Convert to MP3
   ├── Set sample rate to 16kHz
   └── Normalize to mono

4. Split (if >25MB)
   └── Create 10-minute segments

5. Transcribe
   ├── Rate-limited requests
   ├── Word-level timestamps
   └── Progress tracking

6. Merge (if segmented)
   └── Adjust timestamps

7. Format Output
   └── Apply selected format

8. Cache Result
   └── Store for 24 hours
```

### API Configuration

**Groq (Default):**
- Endpoint: `api.groq.com/v1/audio/transcriptions`
- Model: `whisper-large-v3-turbo`
- Max file size: 25MB per request
- Word-level timestamps: Yes
- Cost: Free tier: $0.0013/minute

**OpenAI (Optional):**
- Endpoint: `api.openai.com/v1/audio/transcriptions`
- Model: `whisper-1`
- Max file size: 25MB per request
- Word-level timestamps: Yes
- Cost: $0.006/minute

### Timestamp Adjustment

For segmented files, timestamps are adjusted:

```
Segment 1: [0:00 - 10:00] → [0:00 - 10:00]
Segment 2: [0:00 - 10:00] → [10:00 - 20:00]
Segment 3: [0:00 - 10:00] → [20:00 - 30:00]
```

**Example:**
```
Segment 2 word: "discussion", start: 5:30
Adjusted timestamp: 5:30 + 10:00 = 15:30
```

## Examples

### Transcribe Meeting Recording

```bash
#!/bin/bash
MEETING="meeting-$(date +%Y%m%d).mp3"

echo "Transcribing meeting..."
{baseDir}/transcribe.js "$MEETING" --format txt --output "$MEETING.txt"
{baseDir}/transcribe.js "$MEETING" --format srt --output "$MEETING.srt"
{baseDir}/transcribe.js "$MEETING" --format json --output "$MEETING.json"

echo "Done: $MEETING.{txt,srt,json}"
```

### Batch Transcribe Directory

```bash
#!/bin/bash
mkdir -p transcripts

for audio in *.mp3 *.m4a *.wav; do
  [ -f "$audio" ] || continue
  
  echo "Processing: $audio"
  base="${audio%.*}"
  
  {baseDir}/transcribe.js "$audio" --format srt --output "transcripts/${base}.srt" 2>/dev/null
  
  if [ $? -eq 0 ]; then
    echo "  ✓ Created transcripts/${base}.srt"
  else
    echo "  ✗ Failed"
  fi
  
  sleep 1  # Rate limit protection
done
```

### Create Searchable Meeting Archive

```bash
#!/bin/bash
INPUT="meeting.mp3"

# Transcribe with word timings
{baseDir}/transcribe.js "$INPUT" --format json --output meeting.json

# Extract all utterances with timestamps
jq -r '
  .words[] | 
  "\(.start | tostring | split(".") | .[0] + "." + .[1][:2])\t\(.word)"
' meeting.json > meeting-by-words.txt

# Create time-indexed file
echo "Meeting transcript indexed by time" > index.txt
while IFS=$'\t' read -r time word; do
  echo "$time: $word" >> index.txt
done < meeting-by-words.txt

echo "Archive created: index.txt"
```

### Subtitle Synchronization

```bash
#!/bin/bash
VIDEO="video.mp4"
AUDIO="video.m4a"  # Extracted audio

# Get word-level transcription
{baseDir}/transcribe.js "$AUDIO" --format json --output transcription.json

# Create SRT with optimized line breaks
jq -r '
  def format_srt_time(seconds):
    [ (seconds / 3600 | floor),
      (seconds % 3600 / 60 | floor),
      (seconds % 60 | floor),
      (seconds % 1 * 1000 | floor)
    ] | 
    [.[]] as [$h, $m, $s, $ms] |
    "\($h | tostring | split("") | (. | length | if . < 2 then ["0"] + $h else $h end) | add):\($m | tostring | split("") | (. | length | if . < 2 then ["0"] + $m else $m end) | add):\($s | tostring | split("") | (. | length | if . < 2 then ["0"] + $s else $s end) | add),\($ms | tostring | split("") | (. | length | if . < 3 then ["0"] + $ms else $ms end) | add)";
  
  "WEBVTT",
  "",
  (.words | map(.word) | join(" ") | split("\\. ") | .[] | select(length > 0) | 
    { text: ., start: ., end: . })
  | 
  "\(format_srt_time(.start)) --> \(format_srt_time(.end))",
  "\(.text)"
' transcription.json > subtitles.srt

echo "SRT subtitles created: subtitles.srt"
```

### Extract Keywords with Timestamps

```bash
#!/bin/bash
AUDIO="recording.mp3"
KEYWORDS=("budget" "timeline" "decision")

# Transcribe
{baseDir}/transcribe.js "$AUDIO" --format json --output data.json

# Find keywords with timestamps
echo "Keyword timestamps:"
for kw in "${KEYWORDS[@]}"; do
  jq -r --arg kw "${kw,,}" '.words[] | select(.word | ascii_downcase | contains($kw)) | "\(.word) at \(.start)s"' data.json
done
```

## Performance Tips

### 1. Use Cache

```bash
# First time (slow)
{baseDir}/transcribe.js audio.mp3

# Second time (fast)
{baseDir}/transcribe.js audio.mp3

# Same file, different format - different cache
{baseDir}/transcribe.js audio.mp3 --format srt  # New cache entry
```

### 2. Specify Language

```bash
# Auto-detect (slower first pass)
{baseDir}/transcribe.js spanish.mp3

# Specify language (faster, more accurate)
{baseDir}/transcribe.js spanish.mp3 --language es
```

### 3. Pre-extract Audio

```bash
# Slower: video with embedded audio
{baseDir}/transcribe.js video.mp4

# Faster: pre-extracted audio
ffmpeg -i video.mp4 -vn -c:a libmp3lame -b:a 192k audio.mp3
{baseDir}/transcribe.js audio.mp3
```

### 4. Batch Processing

```bash
# Process multiple files
for f in *.mp3; do
  {baseDir}/transcribe.js "$f" &
done
wait
```

### 5. Parallel Segments

```bash
# Large files process segments in parallel
# 30-minute file with 3 segments
# Elapsed time: ~60 seconds (3x faster than sequential)
```

## Notes

- Maximum file duration: 2 hours
- Maximum file size for direct upload: 25MB
- Caching includes format in key (different formats = different caches)
- API rate limits: 60 requests/minute
- Segment size: 10 minutes (configurable in code)
- Output format affects cache (srt and json cached separately)
- Word timestamps provide ~50ms precision
- SRT/VTT formats group words into phrases (~5 words)
- TSV/CSV provide per-word timestamps
- JSON includes all metadata and word-level data
- Audio preprocessing preserves quality while optimizing for Whisper
- FFmpeg required for format conversion and segmentation
- Network errors retry up to 3 times with exponential backoff
