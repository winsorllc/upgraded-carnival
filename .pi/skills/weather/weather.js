#!/usr/bin/env node

/**
 * Weather CLI - Get weather information from wttr.in or Open-Meteo
 * 
 * Usage:
 *   weather <location>              - Current weather summary
 *   weather <location> --detailed   - Detailed current conditions
 *   weather <location> --forecast    - 3-day forecast
 *   weather <location> --json       - JSON output
 */

const args = process.argv.slice(2);
let location = args[0] || 'London';
const options = args.slice(1);

// Simple location to coordinates mapping (or use API)
async function geocode(location) {
  // Try Open-Meteo's geocoding API
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return {
        lat: data.results[0].latitude,
        lon: data.results[0].longitude,
        name: data.results[0].name,
        country: data.results[0].country,
      };
    }
  } catch (e) {
    // Fall through to default
  }
  
  // Default fallback coordinates
  return { lat: 51.5074, lon: -0.1278, name: 'London', country: 'United Kingdom' };
}

async function getWeatherOpenMeteo(coords) {
  const { lat, lon, name, country } = coords;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&timezone=auto`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return { data, name, country };
}

function weatherCodeToEmoji(code) {
  const codes = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌧️', 53: '🌧️', 55: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '🌨️',
    77: '🌨️',
    80: '🌦️', 81: '🌦️', 82: '🌦️',
    85: '🌨️', 86: '🌨️',
    95: '⛈️', 96: '⛈️', 99: '⛈️',
  };
  return codes[code] || '🌡️';
}

function formatWeather(weatherData) {
  const { data, name, country } = weatherData;
  const current = data.current;
  const daily = data.daily;
  
  const emoji = weatherCodeToEmoji(current.weather_code);
  const isDay = current.is_day === 1 ? 'Day' : 'Night';
  
  let output = `${emoji} ${name}, ${country} (${isDay})\n`;
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  output += `🌡️  Temperature: ${current.temperature_2m}°C (feels like ${current.apparent_temperature}°C)\n`;
  output += `💧  Humidity: ${current.relative_humidity_2m}%\n`;
  output += `🌬️  Wind: ${current.wind_speed_10m} km/h, gusts ${current.wind_gusts_10m} km/h\n`;
  output += `☁️  Cloud Cover: ${current.cloud_cover}%\n`;
  output += `📊  Pressure: ${current.pressure_msl} hPa\n`;
  
  if (current.precipitation > 0) {
    output += `🌧️  Precipitation: ${current.precipitation} mm\n`;
  }
  
  output += `\n📅 Forecast:\n`;
  
  for (let i = 0; i < Math.min(3, daily.time.length); i++) {
    const day = new Date(daily.time[i]).toLocaleDateString('en-US', { weekday: 'short' });
    const code = daily.weather_code[i];
    const tempMax = daily.temperature_2m_max[i];
    const tempMin = daily.temperature_2m_min[i];
    const precip = daily.precipitation_probability_max[i] || 0;
    
    output += `  ${day}: ${weatherCodeToEmoji(code)} ${tempMin}° - ${tempMax}°C (${precip}% rain)\n`;
  }
  
  return output;
}

function formatJson(weatherData) {
  return JSON.stringify(weatherData.data, null, 2);
}

async function run() {
  if (options.includes('--help') || options.includes('-h')) {
    showHelp();
    return;
  }
  
  try {
    const coords = await geocode(location);
    const weather = await getWeatherOpenMeteo(coords);
    
    if (options.includes('--json') || options.includes('-j')) {
      console.log(formatJson(weather));
    } else {
      console.log(formatWeather(weather));
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Weather CLI - Get weather information from Open-Meteo

Usage:
  weather <location>              - Current weather summary
  weather <location> --json       - JSON output

Examples:
  weather London
  weather "New York"
  weather Tokyo --json

Notes:
  - No API key required
  - Uses Open-Meteo API for weather data
  - Uses Open-Meteo Geocoding API for location lookup
`);
}

run();
