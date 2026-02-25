#!/bin/bash
# Image info helper - extract metadata from images

set -e

FILE=""
DETAILED=false
DIMENSIONS_ONLY=false
FORMAT_ONLY=false
EXIF_ONLY=false
GPS_ONLY=false
COLORS=false
BATCH=false
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --detailed|-d)
            DETAILED=true
            shift
            ;;
        --dimensions|-D)
            DIMENSIONS_ONLY=true
            shift
            ;;
        --format|-f)
            FORMAT_ONLY=true
            shift
            ;;
        --exif|-e)
            EXIF_ONLY=true
            shift
            ;;
        --gps|-g)
            GPS_ONLY=true
            shift
            ;;
        --colors|-c)
            COLORS=true
            shift
            ;;
        --batch|-b)
            BATCH=true
            shift
            ;;
        --json|-j)
            JSON_OUTPUT=true
            shift
            ;;
        -*)
            echo "Unknown option: $1"
            exit 1
            ;;
        *)
            FILE="$1"
            shift
            ;;
    esac
done

if [ -z "$FILE" ]; then
    echo "Usage: $0 <image> [options]"
    echo "Options:"
    echo "  --detailed, -d    Show all metadata"
    echo "  --dimensions, -D   Show only dimensions"
    echo "  --format, -f      Show only format"
    echo "  --exif, -e        Show EXIF data"
    echo "  --gps, -g         Show GPS coordinates"
    echo "  --colors, -c      Show color histogram"
    echo "  --batch, -b       Process multiple files"
    echo "  --json, -j        Output as JSON"
    exit 1
fi

# Check for ImageMagick
if command -v identify &> /dev/null; then
    HAS_IMAGEMAGICK=true
else
    HAS_IMAGEMAGICK=false
fi

if command -v exiftool &> /dev/null; then
    HAS_EXIFTOOL=true
else
    HAS_EXIFTOOL=false
fi

# Get basic info with ImageMagick
get_basic_info() {
    local file="$1"
    
    if [ "$HAS_IMAGEMAGICK" = true ]; then
        identify -format "%f\n%m\n%w\n%h\n%s\n%[colorspace]\n" "$file" 2>/dev/null
    else
        # Fallback to file command
        file "$file"
    fi
}

# Get EXIF data
get_exif() {
    local file="$1"
    
    if [ "$HAS_EXIFTOOL" = true ]; then
        exiftool "$file" 2>/dev/null | head -30
    else
        echo "exiftool not available. Install: apt install libimage-exiftool-perl"
    fi
}

# Get dimensions only
get_dimensions() {
    local file="$1"
    
    if [ "$HAS_IMAGEMAGICK" = true ]; then
        identify -format "%wx%h" "$file" 2>/dev/null
    else
        echo "ImageMagick not available"
        exit 1
    fi
}

# Get format only
get_format() {
    local file="$1"
    
    if [ "$HAS_IMAGEMAGICK" = true ]; then
        identify -format "%m" "$file" 2>/dev/null
    else
        # Fallback
        file -b "$file" | cut -d, -f1
    fi
}

# Get color histogram
get_colors() {
    local file="$1"
    
    if [ "$HAS_IMAGEMAGICK" = true ]; then
        identify -format "%k" "$file" 2>/dev/null
    else
        echo "ImageMagick not available"
    fi
}

# Process single file
process_file() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        echo "File not found: $file"
        return 1
    fi
    
    if [ "$DIMENSIONS_ONLY" = true ]; then
        echo "$(get_dimensions "$file")"
        return
    fi
    
    if [ "$FORMAT_ONLY" = true ]; then
        echo "$(get_format "$file")"
        return
    fi
    
    if [ "$EXIF_ONLY" = true ]; then
        get_exif "$file"
        return
    fi
    
    if [ "$JSON_OUTPUT" = true ]; then
        # JSON output
        if [ "$HAS_IMAGEMAGICK" = true ]; then
            local dims=$(identify -format "%w,%h" "$file" 2>/dev/null)
            local format=$(identify -format "%m" "$file" 2>/dev/null)
            local size=$(stat -c%s "$file" 2>/dev/null || echo "0")
            local colorspace=$(identify -format "%[colorspace]" "$file" 2>/dev/null || echo "unknown")
            
            echo "{\"file\":\"$file\",\"format\":\"$format\",\"width\":${dims%,*},\"height\":${dims#*,},\"size\":$size,\"colorspace\":\"$colorspace\"}"
        else
            echo "{\"file\":\"$file\",\"error\":\"ImageMagick not available\"}"
        fi
        return
    fi
    
    # Full info
    echo "File: $file"
    
    if [ "$HAS_IMAGEMAGICK" = true ]; then
        echo "Format: $(identify -format "%m" "$file" 2>/dev/null)"
        echo "Dimensions: $(identify -format "%w x %h" "$file" 2>/dev/null)"
        echo "Size: $(stat -c%s "$file" 2>/dev/null || echo "unknown") bytes"
        echo "Colorspace: $(identify -format "%[colorspace]" "$file" 2>/dev/null || echo "unknown")"
    else
        file "$file"
    fi
    
    if [ "$DETAILED" = true ] && [ "$HAS_EXIFTOOL" = true ]; then
        echo ""
        echo "EXIF Data:"
        get_exif "$file"
    fi
    
    if [ "$COLORS" = true ]; then
        echo ""
        echo "Unique colors: $(get_colors "$file")"
    fi
}

# Process batch
process_batch() {
    local dir="$1"
    
    if [ ! -d "$dir" ]; then
        echo "Directory not found: $dir"
        exit 1
    fi
    
    echo "Processing images in: $dir"
    echo ""
    
    for file in "$dir"/*.{jpg,jpeg,png,gif,bmp,tiff,webp,heic} 2>/dev/null; do
        if [ -f "$file" ]; then
            process_file "$file"
            echo "---"
        fi
    done
}

# Main
if [ "$BATCH" = true ]; then
    process_batch "$FILE"
else
    process_file "$FILE"
fi
