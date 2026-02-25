---
name: weather
description: "Get current weather and forecasts via wttr.in. Use when: user asks about weather, temperature, or forecasts for any location. NOT for: historical weather data, severe weather alerts, or detailed meteorological analysis. No API key needed."
metadata: { "openclaw": { "emoji": "🌤️", "requires": { "bins": ["curl"] } } }
---

# Weather Skill

Get current weather conditions and forecasts using wttr.in (no API key required).

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
- Hyper-local microclimate data → use local sensors
- Severe weather alerts → check official NWS sources
- Aviation/marine weather → use specialized services (METAR, etc.)

## Location

Always include a city, region, or airport code in weather queries.

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
# 3-day forecast (default)
curl -s "wttr.in/London"

# Week forecast
curl -s "wttr.in/London?format=v2"

# Specific day (0=today, 1=tomorrow, 2=day after)
curl -s "wttr.in/London/1"
```

### Format Options

```bash
# One-liner with custom format
curl -s "wttr.in/London?format=%l:+%c+%t+%w+%h"

# JSON output
curl -s "wttr.in/London?format=j1"

# PNG image (terminal-style)
curl -s "wttr.in/London.png" -o weather.png
```

### Format Codes

| Code | Description |
|------|-------------|
| `%c` | Weather condition emoji |
| `%t` | Temperature |
| `%f` | "Feels like" temperature |
| `%w` | Wind speed and direction |
| `%h` | Humidity |
| `%p` | Precipitation probability |
| `%l` | Location name |
| `%P` | Atmospheric pressure |
| `%d` | Dew point |
| `%x` | UV index |
| `%m` | Moon phase |

## Node.js Implementation

```javascript
const https = require('https');

async function getWeather(location, options = {}) {
  const query = new URLSearchParams({
    format: options.format || 'j1'
  });

  const path = `/${encodeURIComponent(location)}?${query}`;
  
  return new Promise((resolve, reject) => {
    https.get(`https://wttr.in${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const weather = JSON.parse(data);
          resolve(formatWeatherData(weather));
        } catch (e) {
          reject(new Error('Failed to parse weather data'));
        }
      });
    }).on('error', reject);
  });
}

function formatWeatherData(data) {
  const current = data.current_condition[0];
  const location = data.nearest_area[0];
  
  return {
    location: `${location.areaName[0].value}, ${location.country[0].value}`,
    temperature: `${current.temp_C}°C (${current.temp_F}°F)`,
    feelsLike: `${current.FeelsLikeC}°C (${current.FeelsLikeF}°F)`,
    condition: current.weatherDesc[0].value,
    icon: current.weatherCode,
    humidity: `${current.humidity}%`,
    windSpeed: `${current.windspeedKmph} km/h`,
    windDir: current.winddir16Point,
    precipitation: `${current.precipMM} mm`,
    pressure: `${current.pressure} mb`,
    visibility: `${current.visibility} km`,
    uvIndex: current.uvIndex,
    forecast: data.weather.map(day => ({
      date: day.date,
      maxTemp: `${day.maxtempC}°C`,
      minTemp: `${day.mintempC}°C`,
      condition: day.avgtempDesc,
      chanceOfRain: day.hourly[0]?.chanceofrain || '0'
    }))
  };
}

async function getCurrentWeather(location) {
  const data = await getWeather(location);
  return `${data.location}: ${data.condition}, ${data.temperature} (feels like ${data.feelsLike}), ${data.humidity} humidity, ${data.windSpeed} ${data.windDir} wind`;
}

async function getForecast(location, days = 3) {
  const data = await getWeather(location);
  const forecast = data.forecast.slice(0, days);
  
  return forecast.map(day => 
    `${day.date}: ${day.maxTemp}/${day.minTemp}, rain chance: ${day.chanceOfRain}%`
  ).join('\n');
}

// Usage
const weather = await getCurrentWeather('London');
console.log(weather);

const forecast = await getForecast('London', 5);
console.log(forecast);
```

## Quick Responses

**"What's the weather?"**

```bash
curl -s "wttr.in/London?format=%l:+%c+%t+(feels+like+%f),+%w+wind,+%h+humidity"
```

**"Will it rain?"**

```bash
curl -s "wttr.in/London?format=%l:+%c+%p"
```

**"Weekend forecast"**

```bash
curl -s "wttr.in/London?format=v2"
```

## Weather Codes

| Code | Description |
|------|-------------|
| 113 | Clear/Sunny |
| 116 | Partly cloudy |
| 119 | Cloudy |
| 122 | Overcast |
| 143 | Mist |
| 176 | Patchy rain possible |
| 179 | Patchy snow possible |
| 182 | Patchy sleet possible |
| 227 | Blowing snow |
| 230 | Blizzard |
| 248 | Fog |
| 260 | Freezing fog |
| 263 | Patchy light drizzle |
| 266 | Light drizzle |
| 281 | Freezing drizzle |
| 284 | Heavy freezing drizzle |
| 293 | Patchy light rain |
| 296 | Light rain |
| 299 | Moderate rain at times |
| 302 | Moderate rain |
| 305 | Heavy rain at times |
| 308 | Heavy rain |
| 311 | Light freezing rain |
| 314 | Moderate/Heavy freezing rain |
| 317 | Light sleet |
| 320 | Moderate/heavy sleet |
| 323 | Patchy light snow |
| 326 | Light snow |
| 329 | Patchy moderate snow |
| 332 | Moderate snow |
| 335 | Patchy heavy snow |
| 338 | Heavy snow |
| 350 | Ice pellets |
| 353 | Light rain shower |
| 356 | Moderate/heavy rain shower |
| 359 | Torrential rain shower |
| 362 | Light sleet showers |
| 365 | Moderate/heavy sleet showers |
| 368 | Light snow showers |
| 371 | Moderate/heavy snow showers |
| 374 | Light showers of ice pellets |
| 377 | Moderate/heavy showers of ice pellets |
| 386 | Patchy light rain in area with thunder |
| 389 | Moderate/heavy rain in area with thunder |
| 392 | Patchy light snow in area with thunder |
| 395 | Moderate/heavy snow in area with thunder |

## Error Handling

```javascript
if (data.nearest_area.length === 0) {
  throw new Error('Location not found');
}
```

## Notes

- No API key needed (uses wttr.in)
- Rate limited: ~60 requests/hour per IP
- Works for most global cities
- Supports airport codes: `curl wttr.in/ORD`
- Data sourced from various meteorological services
