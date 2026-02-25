---
name: spotify-player
description: Control Spotify playback, search tracks, manage playlists via Spotify API.
metadata: { "popebot": { "emoji": "🎵", "requires": { "env": ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "SPOTIFY_ACCESS_TOKEN"] } } }
---

# Spotify Player

Control Spotify playback and manage your music library via the Spotify Web API.

## Setup

Get credentials from Spotify Developer Dashboard:
1. Go to https://developer.spotify.com/dashboard
2. Create an app to get Client ID and Client Secret
3. Get an access token via OAuth flow

Set environment variables:
```bash
export SPOTIFY_CLIENT_ID="your-client-id"
export SPOTIFY_CLIENT_SECRET="your-client-secret"
export SPOTIFY_ACCESS_TOKEN="your-access-token"
```

## Usage

### Search Tracks

Search for tracks:
```bash
curl "https://api.spotify.com/v1/search?q=track:hello&type=track&limit=5" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN"
```

### Search Artists

Search for artists:
```bash
curl "https://api.spotify.com/v1/search?q=artist:beatles&type=artist&limit=5" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN"
```

### Search Albums

Search for albums:
```bash
curl "https://api.spotify.com/v1/search?q=album:1989&type=album&limit=5" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN"
```

### Get Track Info

Get details for a specific track:
```bash
curl "https://api.spotify.com/v1/tracks/{track_id}" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN"
```

### Get Artist Info

Get artist details:
```bash
curl "https://api.spotify.com/v1/artists/{artist_id}" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN"
```

### Get Album Tracks

Get tracks from an album:
```bash
curl "https://api.spotify.com/v1/albums/{album_id}/tracks" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN"
```

### Get User Playlists

List user's playlists:
```bash
curl "https://api.spotify.com/v1/me/playlists" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN"
```

### Get Playlist Tracks

Get tracks from a playlist:
```bash
curl "https://api.spotify.com/v1/playlists/{playlist_id}/tracks" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN"
```

### Create Playlist

Create a new playlist:
```bash
curl -X POST "https://api.spotify.com/v1/me/playlists" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Playlist","public":false}'
```

### Add Tracks to Playlist

Add tracks to a playlist:
```bash
curl -X POST "https://api.spotify.com/v1/playlists/{playlist_id}/tracks" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uris":["spotify:track:xxx","spotify:track:yyy"]}'
```

### Get Currently Playing

Get currently playing track:
```bash
curl "https://api.spotify.com/v1/me/player/currently-playing" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN"
```

### Get Playback State

Get current playback state:
```bash
curl "https://api.spotify.com/v1/me/player" \
  -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN"
```

## Notes

- Access tokens expire after 1 hour - refresh as needed
- Requires Spotify Premium for playback control
- Rate limit: ~180 requests per minute
