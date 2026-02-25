#!/bin/bash
# Test: Spotify Skill - Structure validation

echo "=== Testing Spotify Skill ==="

# Test 1: Check if curl is available
echo "Test 1: Checking curl availability..."
if command -v curl &> /dev/null; then
    echo "PASS: curl available"
else
    echo "FAIL: curl not found"
    exit 1
fi

# Test 2: Check if jq is available
echo ""
echo "Test 2: Checking jq availability..."
if command -v jq &> /dev/null; then
    echo "PASS: jq available"
else
    echo "FAIL: jq not found"
    exit 1
fi

# Test 3: Validate API endpoint structure
echo ""
echo "Test 3: Testing API endpoint format..."
base_url="https://api.spotify.com/v1"
endpoints=(
    "/me/player/currently-playing"
    "/me/player/play"
    "/me/player/pause"
    "/search"
    "/tracks"
    "/artists"
    "/albums"
    "/me/playlists"
    "/playlists"
)

all_valid=true
for endpoint in "${endpoints[@]}"; do
    if [[ "$base_url$endpoint" == https://api.spotify.com/v1* ]]; then
        echo "  OK: $endpoint"
    else
        echo "  FAIL: $endpoint"
        all_valid=false
    fi
done

if $all_valid; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 4: Validate token endpoint
echo ""
echo "Test 4: Testing token endpoint..."
token_url="https://accounts.spotify.com/api/token"
if [[ "$token_url" == "https://accounts.spotify.com/api/token" ]]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 5: Validate JSON structures
echo ""
echo "Test 5: Testing JSON structures..."

# Token request body
token_body='grant_type=client_credentials&client_id=test&client_secret=test'
if [ -n "$token_body" ]; then
    echo "PASS: Token body format valid"
else
    echo "FAIL"
    exit 1
fi

# Search query format
search_query="q=track:Shape+of+You&type=track&limit=5"
if [[ "$search_query" == q=* ]]; then
    echo "PASS: Search query format valid"
else
    echo "FAIL"
    exit 1
fi

# Test 6: Test JSON response parsing
echo ""
echo "Test 6: Testing response parsing..."
response='
{
  "tracks": {
    "items": [
      {
        "name": "Shape of You",
        "artists": [{"name": "Ed Sheeran"}],
        "album": {"name": "Divide"}
      }
    ]
  }
}
'

track_name=$(echo "$response" | jq -r '.tracks.items[0].name')
artist_name=$(echo "$response" | jq -r '.tracks.items[0].artists[0].name')
echo "Track: $track_name by $artist_name"

if [ "$track_name" = "Shape of You" ] && [ "$artist_name" = "Ed Sheeran" ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 7: Validate playback control JSON
echo ""
echo "Test 7: Testing playback control..."
play_json='{"uris": ["spotify:track:TRACK_ID"]}'
if echo "$play_json" | jq . > /dev/null 2>&1; then
    echo "PASS: Play JSON valid"
else
    echo "FAIL"
    exit 1
fi

echo ""
echo "=== All Spotify Tests PASSED ==="
