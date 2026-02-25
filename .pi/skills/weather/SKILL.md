---
name: weather
description: Get current weather conditions and forecasts for any location using Open-Meteo API (no API key required). Use when user asks about weather, temperature, precipitation, or forecasts.
homepage: https://open-meteo.com/
---

# Weather Skill

Get current weather conditions and forecasts using the Open-Meteo API (free, no API key needed).

## When to Use

✅ **USE this skill when:**
- "What's the weather?"
- "Will it rain today/tomorrow?"
- "Temperature in [city]"
- "Weather forecast for the week"
- Travel planning weather checks
- Outdoor activity planning

❌ **DON'T use this skill when:**
- Historical weather data → use weather archives/APIs  
- Climate analysis or long-term trends
- Severe weather alerts → check official NWS sources
- Aviation/marine weather → use specialized services (METAR, etc.)

## Always Include Location

Weather queries require a city name, coordinates, or airport code. If the user doesn't specify, ask: "Which location would you like the weather for?"

## Geocoding (Get Coordinates)

First, get coordinates for the city name using the Open-Meteo geocoding API:

```bash
# Search for a city
curl -s "https://geocoding-api.open-meteo.com/v1/search?name=Chicago&count=1"

# Get latitude/longitude from response
# Example response: {"results":[{"latitude":41.85,"longitude":-87.65,"name":"Chicago",...}]}
```

For major cities, you can use known coordinates:

| City | Latitude | Longitude |
|------|----------|-----------|
| New York | 40.71 | -74.01 |
| Los Angeles | 34.05 | -118.24 |
| Chicago | 41.85 | -87.65 |
| London | 51.51 | -0.13 |
| Paris | 48.86 | 2.35 |
| Tokyo | 35.68 | 139.69 |
| Sydney | -33.87 | 151.21 |

## Commands

### Current Weather

```bash
# Get current weather by coordinates
curl -s "https://api.open-meteo.com/v1/forecast?latitude=41.85&longitude=-87.65&current_weather=true"

# Parse current temperature (in Celsius)
# Response: {"current_weather":{"temperature":-1.4,"windspeed":19.9,...,"weathercode":1}}
```

### Weather Codes

| Code | Description |
|------|-------------|
| 0 | Clear sky |
| 1, 2, 3 | Mainly clear, partly cloudy, overcast |
| 45, 48 | Fog, depositing rime fog |
| 51, 53, 55 | Drizzle: light, moderate, dense |
| 61, 63, 65 | Rain: slight, moderate, heavy |
| 66, 67 | Freezing rain: light, heavy |
| 71, 73, 75 | Snow fall: slight, moderate, heavy |
| 77 | Snow grains |
| 80, 81, 82 | Rain showers: slight, moderate, violent |
| 85, 86 | Snow showers: slight, heavy |
| 95 | Thunderstorm: slight or moderate |
| 96, 99 | Thunderstorm with hail: slight, heavy |

### Daily Forecast

```bash
# Get 7-day forecast
curl -s "https://api.open-meteo.com/v1/forecast?latitude=41.85&longitude=-87.65&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode"

# Response includes daily arrays for each parameter
```

### Hourly Forecast

```bash
# Get hourly forecast for next 48 hours
curl -s "https://api.open-meteo.com/v1/forecast?latitude=41.85&longitude=-87.65&hourly=temperature_2m,precipitation_probability,weathercode"
```

### Full Current Conditions

```bash
# Get detailed current conditions
curl -s "https://api.open-meteo.com/v1/forecast?latitude=41.85&longitude=-87.65&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weathercode,cloud_cover,wind_speed_10m,wind_direction_10m"
```

## Quick Response Templates

**"What's the weather in [city]?"**
```bash
# Step 1: Get coordinates (or use known values)
curl -s "https://geocoding-api.open-meteo.com/v1/search?name=[CITY]&count=1"

# Step 2: Get current weather
curl -s "https://api.open-meteo.com/v1/forecast?latitude=[LAT]&longitude=[LON]&current_weather=true"
```

**"Will it rain today?"**
```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=[LAT]&longitude=[LON]&daily=precipitation_sum,weathercode"
```

**"What's the temperature range this week?"**
```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=[LAT]&longitude=[LON]&daily=temperature_2m_max,temperature_2m_min"
```

## Node.js Helper Function

```javascript
async function getWeather(cityName) {
  // Step 1: Geocode
  const geoResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`
  );
  const geoData = await geoResponse.json();
  
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`City not found: ${cityName}`);
  }
  
  const { latitude, longitude, name } = geoData.results[0];
  
  // Step 2: Get weather
  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
  );
  const weatherData = await weatherResponse.json();
  
  return {
    city: name,
    temperature: weatherData.current_weather.temperature,
    windspeed: weatherData.current_weather.windspeed,
    winddirection: weatherData.current_weather.winddirection,
    weathercode: weatherData.current_weather.weathercode,
    time: weatherData.current_weather.time
  };
}
```

## Examples

### Example 1: Current weather in Chicago

```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=41.85&longitude=-87.65&current_weather=true"
```

Output:
```json
{
  "current_weather": {
    "temperature": -1.4,
    "windspeed": 19.9,
    "winddirection": 290,
    "weathercode": 1,
    "time": "2026-02-25T14:15"
  }
}
```

**Response:** "Chicago: 29°F, mainly clear, wind 12 mph from WNW"
*(Convert C→F: °F = °C × 9/5 + 32)*

### Example 2: 7-day forecast for London

```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=51.51&longitude=-0.13&daily=temperature_2m_max,temperature_2m_min,weathercode"
```

### Example 3: Check for rain

```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&daily=precipitation_sum,weathercode"
```

## Notes

- **No API key needed** - Open-Meteo is completely free
- **Rate limits:** 10,000 calls/day per IP (generous for agent use)
- **Units:** Temperature in Celsius, wind speed in km/h
- **Conversion formulas:**
  - °F = °C × 9/5 + 32
  - mph = km/h × 0.621371
- **Always include coordinates** - the API requires lat/lon, not city names
- **Save outputs** - For detailed analysis, save JSON to `/job/tmp/weather-data.json`

## Alternative APIs (if needed)

If Open-Meteo doesn't meet requirements, consider:

- **wttr.in** - Simple, text-based (try: `curl wttr.in/Chicago`)
- **Weather.gov** - US only, official NWS data
- **OpenWeatherMap** - Requires API key, more features
