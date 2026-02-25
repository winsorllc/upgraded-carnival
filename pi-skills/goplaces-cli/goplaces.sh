#!/bin/bash
# Google Places CLI wrapper for PopeBot

set -e

API_KEY="${GOOGLE_API_KEY:-}"
BASE_URL="https://places.googleapis.com/v1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

show_help() {
    cat << EOF
Google Places CLI for PopeBot

Usage: $0 <command> [options]

Commands:
  search <query>         Search for places by text query
  nearby <lat>,<lng>     Find places near a location
  details <place-id>     Get detailed place information
  autocomplete <input>   Place autocomplete
  photo <photo-ref>      Get photo URL

Options:
  --location LAT,LNG     Location for biasing
  --radius M            Search radius in meters
  --type TYPE           Place type (restaurant, cafe, etc.)
  --fields F1,F2        Fields to return
  --limit N             Max results
  --language LANG       Language code
  --max-width N         Photo max width
  --max-height N        Photo max height

Environment:
  GOOGLE_API_KEY        Your Google API key (required)

Examples:
  $0 search "coffee shop in NYC"
  $0 nearby 40.7128,-74.0060 --type restaurant
  $0 details ChIJN1t_tDeuEmsRUsoyG69frY4
  $0 autocomplete "Starbucks near downtown"

EOF
    exit 0
}

# Check API key
check_key() {
    if [ -z "$API_KEY" ]; then
        echo -e "${RED}Error: GOOGLE_API_KEY not set${NC}"
        echo "Set it with: export GOOGLE_API_KEY='your-key'"
        exit 1
    fi
}

# Search command
cmd_search() {
    check_key
    local query=""
    local location=""
    local radius=""
    local type=""
    local limit=20
    local language="en"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --location)
                location="$2"
                shift 2
                ;;
            --radius)
                radius="$2"
                shift 2
                ;;
            --type)
                type="$2"
                shift 2
                ;;
            --limit)
                limit="$2"
                shift 2
                ;;
            --language)
                language="$2"
                shift 2
                ;;
            *)
                query="$1"
                shift
                ;;
        esac
    done

    if [ -z "$query" ]; then
        echo -e "${RED}Error: Search query required${NC}"
        exit 1
    fi

    # Build request
    local url="$BASE_URL/places:searchText"
    local json="{\"textQuery\":\"$query\",\"maxResultCount\":$limit}"

    if [ -n "$location" ]; then
        local lat="${location%,*}"
        local lng="${location#*,}"
        json="$json,\"locationBias\":{\"circle\":{\"center\":{\"latitude\":$lat,\"longitude\":$lng},\"radius\":${radius:-20000}}}"
    fi

    if [ -n "$type" ]; then
        json="$json,\"includedType\":\"$type\""
    fi

    response=$(curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "X-Goog-Api-Key: $API_KEY" \
        -H "X-Goog-FieldMask: places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.types" \
        -d "$json")

    if echo "$response" | jq -e '.places' >/dev/null 2>&1; then
        echo "$response" | jq -r '.places[] | "📍 \(.displayName.text)\n   📍 \(.formattedAddress)\n   ⭐ \(.rating // "N/A") (\(.userRatingCount // 0) reviews)\n   📋 \(.types | join(", "))\n"'
    else
        echo -e "${RED}Error: $response${NC}"
        exit 1
    fi
}

# Nearby search
cmd_nearby() {
    check_key
    local lat=""
    local lng=""
    local radius=1000
    local type=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --radius)
                radius="$2"
                shift 2
                ;;
            --type)
                type="$2"
                shift 2
                ;;
            *)
                local coord="$1"
                lat="${coord%,*}"
                lng="${coord#*,}"
                shift
                ;;
        esac
    done

    if [ -z "$lat" ] || [ -z "$lng" ]; then
        echo -e "${RED}Error: Location required (format: lat,lng)${NC}"
        exit 1
    fi

    local url="$BASE_URL/places:searchNearby"
    local json="{\"locationRestriction\":{\"circle\":{\"center\":{\"latitude\":$lat,\"longitude\":$lng},\"radius\":$radius}}"

    if [ -n "$type" ]; then
        json="{\"locationRestriction\":{\"circle\":{\"center\":{\"latitude\":$lat,\"longitude\":$lng},\"radius\":$radius}},\"includedType\":\"$type\""
    fi

    response=$(curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "X-Goog-Api-Key: $API_KEY" \
        -H "X-Goog-FieldMask: places.displayName,places.formattedAddress,places.rating,places.location,places.types" \
        -d "$json")

    if echo "$response" | jq -e '.places' >/dev/null 2>&1; then
        echo "$response" | jq -r '.places[] | "📍 \(.displayName.text)\n   📍 \(.formattedAddress // "N/A")\n   ⭐ \(.rating // "N/A")\n   📋 \(.types | join(", "))\n"'
    else
        echo -e "${RED}Error: $response${NC}"
        exit 1
    fi
}

# Details command
cmd_details() {
    check_key
    local place_id="$1"
    local fields="displayName,formattedAddress,rating,userRatingCount,openingHours,website,formattedPhoneNumber,geometry,types,businessStatus"

    shift

    while [[ $# -gt 0 ]]; do
        case $1 in
            --fields)
                fields="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    if [ -z "$place_id" ]; then
        echo -e "${RED}Error: Place ID required${NC}"
        exit 1
    fi

    local url="$BASE_URL/places/$place_id"

    response=$(curl -s "$url" \
        -H "X-Goog-Api-Key: $API_KEY" \
        -H "X-Goog-FieldMask: $fields")

    if echo "$response" | jq -e '.name' >/dev/null 2>&1; then
        echo "$response" | jq -r '
            "📍 \(.displayName.text // .name)
📍 \(.formattedAddress // "N/A")
⭐ Rating: \(.rating // "N/A") (\(.userRatingCount // 0) reviews)
📞 \(.formattedPhoneNumber // "N/A")
🌐 \(.website // "N/A")
📋 Types: \(.types | join(", "))
🟢 Status: \(.businessStatus // "N/A")
"
        '
    else
        echo -e "${RED}Error: $response${NC}"
        exit 1
    fi
}

# Autocomplete command
cmd_autocomplete() {
    check_key
    local input="$1"
    shift

    if [ -z "$input" ]; then
        echo -e "${RED}Error: Input required${NC}"
        exit 1
    fi

    local url="$BASE_URL/places:autocomplete"
    local json="{\"input\":\"$input\""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --location)
                local lat="${2%,*}"
                local lng="${2#*,}"
                json="$json,\"locationBias\":{\"circle\":{\"center\":{\"latitude\":$lat,\"longitude\":$lng},\"radius\":50000}}"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    json="$json}"

    response=$(curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "X-Goog-Api-Key: $API_KEY" \
        -H "X-Goog-FieldMask: suggestions.placePrediction,suggestions.description" \
        -d "$json")

    if echo "$response" | jq -e '.suggestions' >/dev/null 2>&1; then
        echo "$response" | jq -r '.suggestions[] | "📍 \(.placePrediction.text.text)\n   ID: \(.placePrediction.placeId)\n"'
    else
        echo -e "${RED}Error: $response${NC}"
        exit 1
    fi
}

# Photo command
cmd_photo() {
    check_key
    local photo_ref="$1"
    local max_width=400
    local max_height=""

    shift

    while [[ $# -gt 0 ]]; do
        case $1 in
            --max-width)
                max_width="$2"
                shift 2
                ;;
            --max-height)
                max_height="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    if [ -z "$photo_ref" ]; then
        echo -e "${RED}Error: Photo reference required${NC}"
        exit 1
    fi

    echo "Photo URL:"
    echo "https://places.googleapis.com/v1/$photo_ref/photos:getMedia?maxWidthWidth=$max_width&key=$API_KEY"
}

# Main
COMMAND="${1:-}"
shift || true

case "$COMMAND" in
    -h|--help|help)
        show_help
        ;;
    search)
        cmd_search "$@"
        ;;
    nearby)
        cmd_nearby "$@"
        ;;
    details)
        cmd_details "$@"
        ;;
    autocomplete)
        cmd_autocomplete "$@"
        ;;
    photo)
        cmd_photo "$@"
        ;;
    *)
        echo "Google Places CLI"
        show_help
        ;;
esac
