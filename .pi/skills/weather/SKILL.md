---
name: weather
description: Get current weather and forecasts via wttr.in. Use when user asks about weather, temperature, or forecasts for any location. No API key needed.
---

# Weather Skill

Get current weather conditions and forecasts using wttr.in (free, no API key).

## When to Use

- "What's the weather?"
- "Will it rain today/tomorrow?"
- "Temperature in [city]"
- "Weather forecast for the week"
- Travel planning weather checks

## Location Format

Include a city name, region, or airport code. Use `+` or `%20` for spaces.

## Commands

### Current Weather

```bash
# One-line summary
curl -s "wttr.in/London?format=3"

# Detailed current conditions
curl -s "wttr.in/London?0"

# Specific city
curl -s "wttr.in/New+York?format=3"
```

### Forecasts

```bash
# 3-day forecast
curl -s "wttr.in/London"

# Week forecast
curl -s "wttr.in/London?format=v2"
```

### Format Options

```bash
# One-liner with custom format
curl -s "wttr.in/London?format=%l:+%c+%t+%w"

# JSON output
curl -s "wttr.in/London?format=j1"
```

### Format Codes

- `%c` — Weather condition emoji
- `%t` — Temperature
- `%f` — "Feels like"
- `%w` — Wind
- `%h` — Humidity
- `%p` — Precipitation
- `%l` — Location

## Quick Examples

**Get quick summary:**
```bash
curl -s "wttr.in/London?format=%l:+%c+%t+(feels+like+%f),+%w+wind,+%h+humidity"
```

**Check if rain:**
```bash
curl -s "wttr.in/London?format=%l:+%c+%p"
```

**Week forecast:**
```bash
curl -s "wttr.in/London?format=v2"
```

## Notes

- No API key needed (uses wttr.in)
- Rate limited; don't spam requests
- Works for most global cities
- Supports airport codes: `curl wttr.in/ORD`
