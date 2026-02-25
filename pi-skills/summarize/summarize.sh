#!/bin/bash
# Summarize tool - Summarize URLs, YouTube videos, and local files
# Usage: summarize.sh <url|file> [options]

set -e

INPUT="$1"
shift || true
EXTRACT_ONLY="${EXTRACT_ONLY:-false}"
LENGTH="${LENGTH:-medium}"

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --extract-only)
            EXTRACT_ONLY="true"
            shift
            ;;
        --length)
            LENGTH="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

if [ -z "$INPUT" ]; then
    echo "Usage: summarize.sh <url|file> [options]"
    echo "  --extract-only    Extract content without summarizing"
    echo "  --length short|medium|long  Summary length"
    exit 1
fi

# Check if input is a URL
if [[ "$INPUT" =~ ^https?:// ]]; then
    # URL handling
    if [[ "$INPUT" =~ youtube\.com|youtu\.be ]]; then
        # YouTube - use yt-dlp for transcript
        echo "=== YouTube Video ==="
        if command -v yt-dlp &> /dev/null; then
            if [ "$EXTRACT_ONLY" = "true" ]; then
                yt-dlp --write-subs --sub-lang en --skip-download "$INPUT" -o "/tmp/youtube_subtitles" 2>/dev/null || true
                cat /tmp/youtube_subtitles*.vtt 2>/dev/null || echo "No subtitles available"
            else
                # Get video info + attempt transcript
                echo "Video: $INPUT"
                yt-dlp --skip-download --write-info-json -o "/tmp/youtube_info" "$INPUT" 2>/dev/null || true
                VIDEO_TITLE=$(cat /tmp/youtube_info.info_json 2>/dev/null | grep -o '"title":"[^"]*"' | head -1 || echo "YouTube Video")
                echo "Title: $VIDEO_TITLE"
                echo ""
                echo "Transcript excerpt (first 2000 chars):"
                yt-dlp --write-subs --sub-lang en --skip-download --convert-subs=vtt "$INPUT" -o "/tmp/youtube_transcript" 2>/dev/null || true
                head -c 2000 /tmp/youtube_transcript*.vtt 2>/dev/null || echo "Transcript not available"
            fi
        else
            echo "YouTube URL detected: $INPUT"
            echo "yt-dlp not installed. Install with: brew install yt-dlp"
            echo ""
            echo "Video ID: $(echo "$INPUT" | grep -oE 'v=[a-zA-Z0-9_-]+' | cut -d= -f2)"
        fi
    else
        # Regular URL - fetch and extract content
        echo "=== Webpage Summary ==="
        echo "URL: $INPUT"
        echo ""
        
        # Try to get the page content
        CONTENT=$(curl -s "$INPUT" | head -c 10000)
        
        if [ -n "$CONTENT" ]; then
            # Extract title
            TITLE=$(echo "$CONTENT" | grep -o '<title>[^<]*</title>' | head -1 | sed 's/<title>//;s/<\/title>//')
            echo "Title: $TITLE"
            echo ""
            
            # Extract text content (simple approach)
            TEXT=$(echo "$CONTENT" | sed 's/<[^>]*>//g' | sed 's/&nbsp;/ /g' | tr -s ' \n' | head -c 3000)
            
            if [ "$EXTRACT_ONLY" = "true" ]; then
                echo "=== Extracted Content ==="
                echo "$TEXT"
            else
                echo "=== Content Preview (first 2000 chars) ==="
                echo "$TEXT"
                echo ""
                echo "[Full summarization requires LLM API - configure OPENAI_API_KEY or ANTHROPIC_API_KEY]"
            fi
        else
            echo "Could not fetch content from $INPUT"
            exit 1
        fi
    fi
elif [ -f "$INPUT" ]; then
    # Local file handling
    echo "=== File Summary ==="
    echo "File: $INPUT"
    echo ""
    
    FILE_EXT="${INPUT##*.}"
    
    case "$FILE_EXT" in
        pdf)
            if command -v pdftotext &> /dev/null; then
                pdftotext "$INPUT" - | head -c 3000
            else
                echo "PDF detected. Install pdftotext: brew install poppler"
                echo "Raw file content (first 3000 chars):"
                head -c 3000 "$INPUT"
            fi
            ;;
        txt|md|json|js|ts|py|sh|html|css)
            echo "=== File Content ==="
            if [ "$EXTRACT_ONLY" = "true" ]; then
                cat "$INPUT"
            else
                head -c 3000 "$INPUT"
                if [ $(wc -c < "$INPUT") -gt 3000 ]; then
                    echo ""
                    echo "... [truncated]"
                fi
            fi
            ;;
        *)
            echo "=== File Content (first 3000 chars) ==="
            head -c 3000 "$INPUT"
            ;;
    esac
else
    echo "Error: Input is neither a valid URL nor an existing file: $INPUT"
    exit 1
fi
