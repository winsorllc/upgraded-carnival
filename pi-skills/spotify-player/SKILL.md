---
name: spotify-player
description: "Control Spotify playback, manage playlists, search tracks, and get currently playing info via the Spotify Web API. Requires: Spotify API credentials (client ID and secret)."
metadata:
  openclaw:
    emoji: "🎵"
    requires:
      bins:
        - curl
        - jq
    env:
      - SPOTIFY_CLIENT_ID
      - SPOTIFY_CLIENT_SECRET
---

# Spotify Player Skill

Control Spotify playback and manage your music library via the Spotify Web API.

## When to Use

✅ **USE this skill when:**

- Play/pause/skip music
- Get currently playing track info
- Search for songs, albums, artists
- Manage playlists
- Control volume
- Get recently played tracks

❌ **DON'T use this skill when:**

- Need real-time playback sync
- Need device selection (basic API limitations)
- Need lyrics display (not available in API)

## Prerequisites

1. Create app at https://developer.spotify.com/dashboard
2. Get Client ID and Client Secret
3. Set redirect URI in app settings
4. Get access token (see below)

```bash
export SPOTIFY_CLIENT_ID="your_client_id"
export SPOTIFY_CLIENT_SECRET="your_client_secret"
```

### Getting Access Token

```bash
# Get access token (valid 1 hour)
TOKEN=$(curl -s -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=$SPOTIFY_CLIENT_ID&client_secret=$SPOTIFY_CLIENT_SECRET" \
  | jq -r '.access_token')

# Or use user authentication for full access
# (requires user login - more complex setup)
```

## Commands

### Currently Playing

```bash
# Get current track (requires user token)
curl -s "https://api.spotify.com/v1/me/player/currently-playing" \
  -H "Authorization: Bearer $TOKEN"

# Get recently played
curl -s "https://api.spotify.com/v1/me/player/recently-played?limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Get user devices
curl -s "https://api.spotify.com/v1/me/player/devices" \
  -H "Authorization: Bearer $TOKEN"
```

### Playback Control

```bash
# Play/pause (requires user token)
curl -s -X PUT "https://api.spotify.com/v1/me/player/pause" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X PUT "https://api.spotify.com/v1/me/player/play" \
  -H "Authorization: Bearer $TOKEN"

# Next track
curl -s -X POST "https://api.spotify.com/v1/me/player/next" \
  -H "Authorization: Bearer $TOKEN"

# Previous track
curl -s -X POST "https://api.spotify.com/v1/me/player/previous" \
  -H "Authorization: Bearer $TOKEN"

# Seek to position (milliseconds)
curl -s -X PUT "https://api.spotify.com/v1/me/player/seek?position_ms=30000" \
  -H "Authorization: Bearer $TOKEN"

# Set volume (0-100)
curl -s -X PUT "https://api.spotify.com/v1/me/player/volume?volume_percent=75" \
  -H "Authorization: Bearer $TOKEN"

# Toggle shuffle
curl -s -X PUT "https://api.spotify.com/v1/me/player/shuffle?state=true" \
  -H "Authorization: Bearer $TOKEN"

# Set repeat mode (off, context, track)
curl -s -X PUT "https://api.spotify.com/v1/me/player/repeat?state=context" \
  -H "Authorization: Bearer $TOKEN"
```

### Search

```bash
# Search for tracks
curl -s "https://api.spotify.com/v1/search?q=track:Shape+of+You&type=track&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.tracks.items[] | {name: .name, artist: .artists[0].name, album: .album.name}'

# Search for artist
curl -s "https://api.spotify.com/v1/search?q=taylor+swift&type=artist&limit=3" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.artists.items[] | {name: .name, followers: .followers.total}'

# Search for album
curl -s "https://api.spotify.com/v1/search?q=album:1989&type=album&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Track/Artist/Album Info

```bash
# Get track details
curl -s "https://api.spotify.com/v1/tracks/TRACK_ID" \
  -H "Authorization: Bearer $TOKEN"

# Get artist details
curl -s "https://api.spotify.com/v1/artists/ARTIST_ID" \
  -H "Authorization: Bearer $TOKEN"

# Get album details
curl -s "https://api.spotify.com/v1/albums/ALBUM_ID" \
  -H "Authorization: Bearer $TOKEN"

# Get artist albums
curl -s "https://api.spotify.com/v1/artists/ARTIST_ID/albums?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Playback Queue

```bash
# Get queue
curl -s "https://api.spotify.com/v1/me/player/queue" \
  -H "Authorization: Bearer $TOKEN"

# Add to queue
curl -s -X POST "https://api.spotify.com/v1/me/player/queue?uri=spotify:track:TRACK_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### User Playlists

```bash
# Get user playlists
curl -s "https://api.spotify.com/v1/me/playlists?limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Get playlist tracks
curl -s "https://api.spotify.com/v1/playlists/PLAYLIST_ID/tracks?limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Get playlist details
curl -s "https://api.spotify.com/v1/playlists/PLAYLIST_ID" \
  -H "Authorization: Bearer $TOKEN"

# Create playlist (requires user token)
curl -s -X POST "https://api.spotify.com/v1/users/USER_ID/playlists" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My New Playlist", "description": "Created by agent", "public": false}'

# Add track to playlist
curl -s -X POST "https://api.spotify.com/v1/playlists/PLAYLIST_ID/tracks?uris=spotify:track:TRACK_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### User Profile

```bash
# Get current user profile
curl -s "https://api.spotify.com/v1/me" \
  -H "Authorization: Bearer $TOKEN"

# Get user saved tracks
curl -s "https://api.spotify.com/v1/me/tracks?limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Get user saved albums
curl -s "https://api.spotify.com/v1/me/albums?limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Get user saved artists
curl -s "https://api.spotify.com/v1/me/artists?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

## Helper Functions

```bash
# Get access token
spotify_token() {
  curl -s -X POST "https://accounts.spotify.com/api/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials&client_id=$SPOTIFY_CLIENT_ID&client_secret=$SPOTIFY_CLIENT_SECRET" \
    | jq -r '.access_token'
}

# Search and play first result (requires user token + device)
spotify_play_track() {
  QUERY=$1
  TRACK_URI=$(curl -s "https://api.spotify.com/v1/search?q=$QUERY&type=track&limit=1" \
    -H "Authorization: Bearer $TOKEN" \
    | jq -r '.tracks.items[0].uri')
  
  curl -s -X PUT "https://api.spotify.com/v1/me/player/play?device_id=DEVICE_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"uris\": [\"$TRACK_URI\"]}"
}

# Get now playing info
spotify_now() {
  curl -s "https://api.spotify.com/v1/me/player/currently-playing" \
    -H "Authorization: Bearer $TOKEN" \
  | jq '{song: .item.name, artist: .item.artists[0].name, album: .item.album.name, progress: .progress_ms, duration: .item.duration_ms}'
}
```

## Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Get current track | GET | `/v1/me/player/currently-playing` |
| Play | PUT | `/v1/me/player/play` |
| Pause | PUT | `/v1/me/player/pause` |
| Next | POST | `/v1/me/player/next` |
| Previous | POST | `/v1/me/player/previous` |
| Volume | PUT | `/v1/me/player/volume` |
| Search | GET | `/v1/search?q={query}&type=track` |
| Get track | GET | `/v1/tracks/{id}` |
| Playlists | GET | `/v1/me/playlists` |

## Notes

- Client credentials flow = no user-specific features (just search, get track info)
- User authorization flow = full control but more complex setup
- API rate limits: 180 requests/minute for user endpoints
- Device ID required for playback control
- Many endpoints require user authentication, not just app authentication
