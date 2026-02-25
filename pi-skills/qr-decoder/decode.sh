#!/bin/bash
# QR Decoder - Decode QR codes from images
set -euo pipefail

# Default values
FORMAT="text"
DIRECTORY=""
PATTERN="*.{png,jpg,jpeg,gif,bmp}"
BATCH_FILE=""
URL=""
SAVE_FILE=""
CAMERA=false
DEVICE="/dev/video0"
OUTPUT=""
MULTI=false
QUIET=false
FILES=()

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") <image_file> [options]
       $(basename "$0") --dir <directory> [options]
       $(basename "$0") --url <url> [options]

Decode QR codes from image files.

Input Options:
  <image_file>            Image file to decode
  --dir DIR              Process all images in directory
  --pattern GLOB         File pattern for --dir (default: *.{png,jpg,jpeg,gif})
  --batch FILE           Read image paths from file
  --url URL              Decode from URL
  --save FILE            Save downloaded image from URL

Decode Options:
  --format FORMAT        Output format: text, json, raw, qr-type (default: text)
  --multi                Return all QR codes found (not just first)
  --camera               Use camera for live decode
  --device DEVICE        Camera device path (default: /dev/video0)

Output Options:
  --output FILE          Output to file
  --quiet                Suppress error messages
  --help                 Show this help message

Examples:
  $(basename "$0") qrcode.png
  $(basename "$0") qrcode.png --format json
  $(basename "$0") --dir ./images --pattern "*.png"
  $(basename "$0") --url "https://example.com/qr.png"
  $(basename "$0") qrcode.png --multi
EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --dir)
            DIRECTORY="$2"
            shift 2
            ;;
        --pattern)
            PATTERN="$2"
            shift 2
            ;;
        --batch)
            BATCH_FILE="$2"
            shift 2
            ;;
        --url)
            URL="$2"
            shift 2
            ;;
        --save)
            SAVE_FILE="$2"
            shift 2
            ;;
        --camera)
            CAMERA=true
            shift
            ;;
        --device)
            DEVICE="$2"
            shift 2
            ;;
        --output)
            OUTPUT="$2"
            shift 2
            ;;
        --multi)
            MULTI=true
            shift
            ;;
        --quiet)
            QUIET=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            FILES+=("$1")
            shift
            ;;
    esac
done

# Detect decoder
detect_decoder() {
    if command -v zbarimg &>/dev/null; then
        echo "zbar"
    elif command -v libdecodeqr &>/dev/null; then
        echo "libdecodeqr"
    else
        echo "none"
    fi
}

DECODER=$(detect_decoder)

if [[ "$DECODER" == "none" ]]; then
    echo "Error: No QR decoder found. Install zbar-tools." >&2
    echo "  Debian/Ubuntu: sudo apt install zbar-tools" >&2
    echo "  macOS: brew install zbar" >&2
    exit 3
fi

# Collect files from directory
if [[ -n "$DIRECTORY" ]]; then
    if [[ ! -d "$DIRECTORY" ]]; then
        echo "Error: Directory not found: $DIRECTORY" >&2
        exit 2
    fi
    
    shopt -s nullglob
    for f in "$DIRECTORY"/*; do
        if [[ -f "$f" ]]; then
            case "$f" in
                *.png|*.jpg|*.jpeg|*.gif|*.bmp|*.PNG|*.JPG|*.JPEG|*.GIF|*.BMP)
                    FILES+=("$f")
                    ;;
            esac
        fi
    done
    shopt -u nullglob
fi

# Collect files from batch file
if [[ -n "$BATCH_FILE" ]]; then
    if [[ ! -f "$BATCH_FILE" ]]; then
        echo "Error: Batch file not found: $BATCH_FILE" >&2
        exit 2
    fi
    
    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ -n "$line" ]] && FILES+=("$line")
    done < "$BATCH_FILE"
fi

# Download from URL
if [[ -n "$URL" ]]; then
    TEMP_FILE=$(mktemp --suffix=.png)
    
    if ! curl -sL -o "$TEMP_FILE" "$URL"; then
        rm -f "$TEMP_FILE"
        echo "Error: Failed to download from URL" >&2
        exit 4
    fi
    
    if [[ -n "$SAVE_FILE" ]]; then
        mv "$TEMP_FILE" "$SAVE_FILE"
        TEMP_FILE="$SAVE_FILE"
    fi
    
    FILES+=("$TEMP_FILE")
fi

# Validate inputs
if [[ ${#FILES[@]} -eq 0 ]] && [[ "$CAMERA" != "true" ]]; then
    echo "Error: No input file specified" >&2
    usage
fi

# Parse QR type from data
parse_qr_type() {
    local data="$1"
    
    if [[ "$data" =~ ^https?:// ]]; then
        echo "URL"
    elif [[ "$data" =~ ^WIFI: ]]; then
        echo "WIFI"
    elif [[ "$data" =~ ^BEGIN:VCARD ]]; then
        echo "VCARD"
    elif [[ "$data" =~ ^BEGIN:VEVENT ]]; then
        echo "VEVENT"
    elif [[ "$data" =~ ^mailto: ]]; then
        echo "EMAIL"
    elif [[ "$data" =~ ^tel: ]]; then
        echo "TEL"
    elif [[ "$data" =~ ^sms: ]]; then
        echo "SMS"
    elif [[ "$data" =~ ^geo: ]]; then
        echo "GEO"
    else
        echo "TEXT"
    fi
}

# Parse WiFi data
parse_wifi() {
    local data="$1"
    local ssid=""
    local security=""
    local password=""
    local hidden="false"
    
    # Extract fields
    ssid=$(echo "$data" | sed -n 's/.*S:\([^;]*\).*/\1/p')
    security=$(echo "$data" | sed -n 's/.*T:\([^;]*\).*/\1/p')
    password=$(echo "$data" | sed -n 's/.*P:\([^;]*\).*/\1/p')
    hidden=$(echo "$data" | sed -n 's/.*H:\([^;]*\).*/\1/p')
    
    echo "SSID: $ssid"
    echo "Security: $security"
    echo "Password: $password"
    [[ -n "$hidden" ]] && echo "Hidden: $hidden"
}

# Format output
format_output() {
    local file="$1"
    local data="$2"
    local type="$3"
    
    case "$FORMAT" in
        raw)
            echo "$data"
            ;;
        qr-type)
            echo "$type"
            ;;
        text)
            echo "File: $file"
            echo "Type: $type"
            echo "Data: $data"
            
            if [[ "$type" == "WIFI" ]]; then
                echo ""
                echo "Parsed:"
                parse_wifi "$data"
            fi
            ;;
        json)
            local escaped_data
            escaped_data=$(echo "$data" | jq -Rs .)
            
            cat << EOF
{
  "file": $(echo "$file" | jq -Rs .),
  "type": "$type",
  "data": $escaped_data
}
EOF
            ;;
        *)
            echo "$data"
            ;;
    esac
}

# Decode a single file
decode_file() {
    local file="$1"
    local results=()
    
    if [[ ! -f "$file" ]]; then
        [[ "$QUIET" != "true" ]] && echo "Error: File not found: $file" >&2
        return 2
    fi
    
    # Use zbarimg
    if [[ "$DECODER" == "zbar" ]]; then
        local zbar_output
        set +e
        zbar_output=$(zbarimg --quiet --raw "$file" 2>/dev/null)
        local exit_code=$?
        set -e
        
        if [[ $exit_code -ne 0 ]]; then
            [[ "$QUIET" != "true" ]] && echo "Error: No QR code found in $file" >&2
            return 1
        fi
        
        # Handle multiple QR codes
        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            results+=("$line")
        done <<< "$zbar_output"
    fi
    
    # Process results
    local first=true
    for data in "${results[@]}"; do
        local type
        type=$(parse_qr_type "$data")
        
        if [[ "$MULTI" == "true" ]]; then
            [[ "$first" != "true" && "$FORMAT" == "json" ]] && echo ","
            format_output "$file" "$data" "$type"
        else
            # Just first result
            format_output "$file" "$data" "$type"
            return 0
        fi
        
        first=false
    done
    
    return 0
}

# Camera decode
decode_camera() {
    local temp_img
    temp_img=$(mktemp --suffix=.png)
    
    if ! command -v fswebcam &>/dev/null; then
        echo "Error: fswebcam not installed for camera capture" >&2
        rm -f "$temp_img"
        exit 3
    fi
    
    echo "Capturing from camera..." >&2
    fswebcam -d "$DEVICE" --no-banner "$temp_img" 2>/dev/null
    
    if [[ ! -s "$temp_img" ]]; then
        echo "Error: Failed to capture from camera" >&2
        rm -f "$temp_img"
        exit 4
    fi
    
    decode_file "$temp_img"
    rm -f "$temp_img"
}

# Main
process_files() {
    local exit_code=0
    
    if [[ "$FORMAT" == "json" ]] && [[ ${#FILES[@]} -gt 1 ]]; then
        echo "["
    fi
    
    local first=true
    for file in "${FILES[@]}"; do
        if [[ "$FORMAT" == "json" ]] && [[ ${#FILES[@]} -gt 1 ]]; then
            [[ "$first" != "true" ]] && echo ","
        fi
        
        if ! decode_file "$file"; then
            exit_code=1
        fi
        
        first=false
    done
    
    if [[ "$FORMAT" == "json" ]] && [[ ${#FILES[@]} -gt 1 ]]; then
        echo "]"
    fi
    
    return $exit_code
}

# Output redirect
if [[ -n "$OUTPUT" ]]; then
    exec > "$OUTPUT"
fi

# Run
if [[ "$CAMERA" == "true" ]]; then
    decode_camera
else
    process_files
fi