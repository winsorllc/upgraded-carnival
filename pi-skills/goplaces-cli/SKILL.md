---
name: goplaces-cli
description: Query Google Places API (New) via CLI for text search, place details, and reviews. Use for finding businesses, restaurants, points of interest with location data.
metadata:
  {
    "openclaw": {
      "emoji": "📍",
      "requires": { "env": ["GOOGLE_API_KEY"] },
      "primaryEnv": "GOOGLE_API_KEY"
    }
  }
---

# Google Places CLI

Query Google Places API (New) for local business and POI information.

## When to Use

✅ **USE this skill when:**

- Find restaurants, businesses, points of interest
- Get place details (hours, phone, website)
- Get reviews and ratings
- Search by location or query

## When NOT to Use

❌ **DON'T use this skill when:**

- Need directions/routing → use Google Maps API
- Need street addresses only → use Geocoding API

## Setup

Get a Google API key with Places API enabled:
1. Go to https://console.cloud.google.com/apis/credentials
2. Create API key
3. Enable "Places API (New)"

```bash
export GOOGLE_API_KEY="your-api-key"
```

## Usage

### Search Places

```bash
# Text search for places
goplaces search "coffee shop in downtown"

# Search with location bias
goplaces search "pizza near 37.7749,-122.4194"

# Search with radius (meters)
goplaces search "museum" --radius 5000
```

### Place Details

```bash
# Get place details by ID
goplaces details "ChIJN1t_tDeuEmsRUsoyG69frY4"

# Get details with specific fields
goplaces details "PlaceID" --fields name,rating,reviews
```

### Nearby Search

```bash
# Find places near a location
goplaces nearby 37.7749,-122.4194 --type restaurant --radius 1000
```

### Autocomplete

```bash
# Place autocomplete
goplaces autocomplete "Starbucks"
```

### Photos

```bash
# Get photo reference
goplaces photo "ChIJ..." --max-width 400
```

## Commands

### search

Text search for places.

```bash
goplaces search <query> [options]

Options:
  --location LAT,LNG    Location bias
  --radius M           Search radius in meters (max 50000)
  --type TYPE          Place type (restaurant, cafe, etc.)
  --region REGION      Region code (e.g., us, jp)
  --language LANG      Language code (e.g., en, ja)
  --limit N            Max results (default: 20)
```

### details

Get detailed place information.

```bash
goplaces details <place-id> [options]

Options:
  --fields F1,F2,...   Fields to return (comma-separated)
```

**Available fields:**
- `name`, `formatted_address`, `rating`, `reviews`
- `opening_hours`, `website`, `formatted_phone_number`
- `geometry`, `photos`, `price_level`, `types`
- `business_status`, `current_opening_hours`

### nearby

Find places near a location.

```bash
goplaces nearby <lat>,<lng> [options]

Options:
  --type TYPE      Place type
  --radius M       Radius in meters (max 50000)
  --keyword TEXT  Keyword search
```

### autocomplete

Place autocomplete.

```bash
goplaces autocomplete <input> [options]

Options:
  --location LAT,LNG    Location bias
  --types TYPE1,TYPE2  Place types
```

### photo

Get photo URL.

```bash
goplaces photo <photo-reference> [options]

Options:
  --max-width N    Max width (1-4000)
  --max-height N   Max height (1-4000)
```

## Examples

### Find restaurants nearby

```bash
goplaces search "Italian restaurant" --location 40.7128,-74.0060 --radius 2000
```

### Get restaurant details

```bash
goplaces details "ChIJqZ..." --fields name,rating,opening_hours,website
```

### Find coffee shops

```bash
goplaces nearby 37.7749,-122.4194 --type cafe --radius 1000
```

## Notes

- Uses Google Places API (New), not the older Places API
- Requires API key with Places API enabled
- Rate limits apply based on your quota
- Some fields require additional API permissions
