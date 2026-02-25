---
name: weather
description: "Get current weather and forecasts via wttr.in or Open-Meteo. Use when: user asks about weather, temperature, or forecasts for any location. NOT for: historical weather data, severe weather alerts, or detailed meteorological analysis. No API key needed."
---

# Weather Skill

Get current weather conditions and forecasts from wttr.in (no API key required).

## When to Use

✅ **USE this skill when:**

- "What's the weather?"
- "Will it rain today/tomorrow?"
- "Temperature in [city]"
- "Weather forecast for the week"
- Travel planning weather checks

## When NOT to Use

❌ **DON'T use this skill when:**

- Historical weather data → use weather archives/APIs
- Climate analysis or trends → use specialized data sources
- Severe weather alerts → check official NWS sources
- Aviation/marine weather → use specialized services (METAR, etc.)

## Location

Always include a city, region, or airport code in weather queries.

## Commands

### Current Weather

```bash
{baseDir}/weather.sh "London"
{baseDir}/weather.sh "New York" --format=short
{baseDir}/weather.sh "Tokyo" --json
```

### Forecasts

```bash
{baseDir}/weather.sh "London" --forecast
{baseDir}/weather.sh "London" --days=3
```

### Format Options

```bash
# One-liner summary
{baseDir}/weather.sh "London" --format=short

# Detailed current conditions
{baseDir}/weather.sh "London" --format=full

# JSON output (parseable)
{baseDir}/weather.sh "London" --json
```

### Airport Codes

```bash
{baseDir}/weather.sh "JFK"    # John F. Kennedy Airport
{baseDir}/weather.sh "LAX"    # Los Angeles International
{baseDir}/weather.sh "ORD"    # Chicago O'Hare
```

## Quick Responses

**"What's the weather?"**

```bash
{baseDir}/weather.sh "San Francisco" --format=short
```

**"Will it rain?"**

```bash
{baseDir}/weather.sh "Seattle" --format=short | grep -i rain
```

**"Weekend forecast"**

```bash
{baseDir}/weather.sh "Paris" --forecast --days=3
```

## Output Formats

- **short**: Single line with location, condition, temperature
- **full**: Multi-line detailed view with wind, humidity, visibility
- **json**: Machine-parseable JSON output

## Notes

- No API key needed (uses wttr.in)
- Rate limited; don't spam requests
- Works for most global cities
- Supports airport codes: `LAX`, `JFK`, `ORD`, etc.