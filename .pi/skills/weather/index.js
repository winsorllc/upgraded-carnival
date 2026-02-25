const https = require('https');

async function getWeather(location, options = {}) {
  const query = new URLSearchParams({
    format: options.format || 'j1'
  });

  const path = `/${encodeURIComponent(location)}?${query}`;
  
  return new Promise((resolve, reject) => {
    https.get(`https://wttr.in${path}`, {
      headers: { 'User-Agent': 'curl/7.64.0' }
    }, (res) => {
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
  if (!data.current_condition || !data.nearest_area || data.nearest_area.length === 0) {
    throw new Error('Location not found or invalid response');
  }

  const current = data.current_condition[0];
  const location = data.nearest_area[0];
  
  return {
    location: `${location.areaName[0].value}, ${location.country[0].value}`,
    temperature: `${current.temp_C}°C (${current.temp_F}°F)`,
    tempC: current.temp_C,
    tempF: current.temp_F,
    feelsLike: `${current.FeelsLikeC}°C (${current.FeelsLikeF}°F)`,
    condition: current.weatherDesc[0].value,
    weatherCode: current.weatherCode,
    humidity: `${current.humidity}%`,
    windSpeed: `${current.windspeedKmph} km/h (${current.windspeedMiles} mph)`,
    windDir: current.winddir16Point,
    precipitation: `${current.precipMM} mm`,
    pressure: `${current.pressure} mb`,
    visibility: `${current.visibility} km`,
    uvIndex: current.uvIndex,
    cloudCover: `${current.cloudcover}%`,
    forecast: data.weather?.map(day => ({
      date: day.date,
      maxTempC: day.maxtempC,
      minTempC: day.mintempC,
      maxTemp: `${day.maxtempC}°C (${day.maxtempF}°F)`,
      minTemp: `${day.mintempC}°C (${day.mintempF}°F)`,
      condition: day.avgtempDesc,
      chanceOfRain: day.hourly?.[0]?.chanceofrain || '0',
      uvIndex: day.uvIndex
    })) || []
  };
}

async function getCurrentWeather(location) {
  const data = await getWeather(location);
  return {
    summary: `${data.location}: ${data.condition}, ${data.temperature} (feels like ${data.feelsLike})`,
    details: data
  };
}

async function getForecast(location, days = 3) {
  const data = await getWeather(location);
  const forecast = data.forecast.slice(0, Math.min(days, 7));
  
  return {
    location: data.location,
    forecast: forecast.map(day => ({
      date: day.date,
      summary: `${day.maxTemp}/${day.minTemp}`,
      condition: day.condition,
      chanceOfRain: day.chanceOfRain
    }))
  };
}

async function getSimpleWeather(location) {
  return new Promise((resolve, reject) => {
    https.get(`https://wttr.in/${encodeURIComponent(location)}?format=3`, {
      headers: { 'User-Agent': 'curl/7.64.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(data.trim());
      });
    }).on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const location = args[1];

  if (!command || !location) {
    console.log('Usage: node index.js <command> <location> [options]');
    console.log('Commands:');
    console.log('  current <location>         - Current weather');
    console.log('  forecast <location> [days] - Forecast (default 3 days)');
    console.log('  simple <location>          - One-line summary');
    console.log('  full <location>            - Full JSON data');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'current': {
        const result = await getCurrentWeather(location);
        console.log('📍', result.summary);
        console.log('\nDetails:');
        console.log('  💧 Humidity:', result.details.humidity);
        console.log('  💨 Wind:', result.details.windSpeed, result.details.windDir);
        console.log('  💨 Pressure:', result.details.pressure);
        console.log('  👁️ Visibility:', result.details.visibility);
        console.log('  ☁️ Cloud Cover:', result.details.cloudCover);
        console.log('  ☀️  UV Index:', result.details.uvIndex);
        break;
      }

      case 'forecast': {
        const days = parseInt(args[2]) || 3;
        const result = await getForecast(location, days);
        console.log(`📍 ${result.location} - ${days}-Day Forecast\n`);
        result.forecast.forEach(day => {
          console.log(`${day.date}: ${day.summary}, ${day.condition}, rain: ${day.chanceOfRain}%`);
        });
        break;
      }

      case 'simple': {
        const result = await getSimpleWeather(location);
        console.log(result);
        break;
      }

      case 'full': {
        const result = await getWeather(location);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      default:
        console.error('Unknown command:', command);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getWeather,
  getCurrentWeather,
  getForecast,
  getSimpleWeather
};
