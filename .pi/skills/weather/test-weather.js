#!/usr/bin/env node

/**
 * Test script for the weather skill
 * Tests Open-Meteo API connectivity and various endpoints
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Helper to make HTTPS requests
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

// Test locations with known coordinates
const TEST_LOCATIONS = [
  { name: 'New York', lat: 40.71, lon: -74.01 },
  { name: 'London', lat: 51.51, lon: -0.13 },
  { name: 'Chicago', lat: 41.85, lon: -87.65 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Sydney', lat: -33.87, lon: 151.21 },
];

// Weather code to emoji mapping
const WEATHER_EMOJI = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️'
};

function celsiusToFahrenheit(celsius) {
  return (celsius * 9/5 + 32).toFixed(1);
}

function kmhToMph(kmh) {
  return (kmh * 0.621371).toFixed(1);
}

async function testGeocoding(cityName) {
  console.log(`\n🔍 Testing geocoding for "${cityName}"...`);
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`;
    const data = await fetch(url);
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      console.log(`   ✅ Geocoding PASSED`);
      console.log(`      Found: ${result.name}, ${result.country}`);
      console.log(`      Coordinates: ${result.latitude}, ${result.longitude}`);
      return { lat: result.latitude, lon: result.longitude, passed: true };
    } else {
      console.log(`   ❌ Geocoding FAILED - no results`);
      return { passed: false };
    }
  } catch (error) {
    console.log(`   ❌ Geocoding FAILED - ${error.message}`);
    return { passed: false };
  }
}

async function testCurrentWeather(location, lat, lon) {
  console.log(`\n🌡️  Testing current weather for ${location}...`);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const data = await fetch(url);
    
    if (data.current_weather) {
      const cw = data.current_weather;
      const tempF = celsiusToFahrenheit(cw.temperature);
      const windMph = kmhToMph(cw.windspeed);
      const emoji = WEATHER_EMOJI[cw.weathercode] || '❓';
      
      console.log(`   ✅ Current weather PASSED`);
      console.log(`      Temperature: ${tempF}°F (${cw.temperature}°C)`);
      console.log(`      Conditions: ${emoji} (code: ${cw.weathercode})`);
      console.log(`      Wind: ${windMph} mph from ${cw.winddirection}°`);
      return { passed: true, data: cw };
    } else {
      console.log(`   ❌ Current weather FAILED - no current_weather field`);
      console.log(`      Response: ${JSON.stringify(data).slice(0, 200)}...`);
      return { passed: false };
    }
  } catch (error) {
    console.log(`   ❌ Current weather FAILED - ${error.message}`);
    return { passed: false };
  }
}

async function testDailyForecast(location, lat, lon) {
  console.log(`\n📅 Testing daily forecast for ${location}...`);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode`;
    const data = await fetch(url);
    
    if (data.daily && data.daily.time && data.daily.time.length > 0) {
      const days = data.daily.time.length;
      console.log(`   ✅ Daily forecast PASSED - ${days} days`);
      console.log(`      Date range: ${data.daily.time[0]} to ${data.daily.time[days-1]}`);
      
      // Show tomorrow's forecast
      if (days > 1) {
        const maxTemp = celsiusToFahrenheit(data.daily.temperature_2m_max[1]);
        const minTemp = celsiusToFahrenheit(data.daily.temperature_2m_min[1]);
        const precip = data.daily.precipitation_sum[1];
        console.log(`      Tomorrow: High ${maxTemp}°F, Low ${minTemp}°F, Precip: ${precip}mm`);
      }
      
      return { passed: true };
    } else {
      console.log(`   ❌ Daily forecast FAILED - no daily data`);
      return { passed: false };
    }
  } catch (error) {
    console.log(`   ❌ Daily forecast FAILED - ${error.message}`);
    return { passed: false };
  }
}

async function testFullConditions(location, lat, lon) {
  console.log(`\n📊 Testing detailed conditions for ${location}...`);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weathercode,cloud_cover,wind_speed_10m,wind_direction_10m`;
    const data = await fetch(url);
    
    if (data.current) {
      const c = data.current;
      console.log(`   ✅ Detailed conditions PASSED`);
      console.log(`      Feels like: ${celsiusToFahrenheit(c.apparent_temperature)}°F`);
      console.log(`      Humidity: ${c.relative_humidity_2m}%`);
      console.log(`      Cloud cover: ${c.cloud_cover}%`);
      return { passed: true };
    } else {
      console.log(`   ❌ Detailed conditions FAILED - no current field`);
      return { passed: false };
    }
  } catch (error) {
    console.log(`   ❌ Detailed conditions FAILED - ${error.message}`);
    return { passed: false };
  }
}

async function saveWeatherData(location, lat, lon) {
  console.log(`\n💾 Saving weather data for ${location}...`);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&hourly=temperature_2m,precipitation_probability`;
    const data = await fetch(url);
    
    const outputPath = path.join('/job/tmp', `weather-${location.replace(/\s+/g, '-').toLowerCase()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    const stats = fs.statSync(outputPath);
    console.log(`   ✅ Data saved PASSED - ${Math.round(stats.size / 1024)}KB to ${outputPath}`);
    return { passed: true, file: outputPath };
  } catch (error) {
    console.log(`   ❌ Data save FAILED - ${error.message}`);
    return { passed: false };
  }
}

// Main test runner
async function runTests() {
  console.log('='.repeat(70));
  console.log('🌤️  Weather Skill Test Suite (Open-Meteo API)');
  console.log('='.repeat(70));
  console.log(`Test started at: ${new Date().toISOString()}`);
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Geocoding (one city)
  console.log('\n' + '='.repeat(70));
  console.log('Test Suite 1: Geocoding API');
  console.log('='.repeat(70));
  
  const geoTest = await testGeocoding('Chicago');
  results.tests.push({ name: 'Geocoding - Chicago', passed: geoTest.passed });
  if (geoTest.passed) results.passed++; else results.failed++;
  
  // Test 2: Current weather for multiple locations
  console.log('\n' + '='.repeat(70));
  console.log('Test Suite 2: Current Weather (Multiple Locations)');
  console.log('='.repeat(70));
  
  for (const location of TEST_LOCATIONS) {
    const test = await testCurrentWeather(location.name, location.lat, location.lon);
    results.tests.push({ name: `${location.name} - Current Weather`, passed: test.passed });
    if (test.passed) results.passed++; else results.failed++;
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test 3: Daily forecasts
  console.log('\n' + '='.repeat(70));
  console.log('Test Suite 3: Daily Forecasts');
  console.log('='.repeat(70));
  
  for (const location of TEST_LOCATIONS.slice(0, 3)) {
    const test = await testDailyForecast(location.name, location.lat, location.lon);
    results.tests.push({ name: `${location.name} - Daily Forecast`, passed: test.passed });
    if (test.passed) results.passed++; else results.failed++;
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test 4: Detailed conditions
  console.log('\n' + '='.repeat(70));
  console.log('Test Suite 4: Detailed Conditions');
  console.log('='.repeat(70));
  
  const detailedTest = await testFullConditions('Chicago', 41.85, -87.65);
  results.tests.push({ name: 'Chicago - Detailed Conditions', passed: detailedTest.passed });
  if (detailedTest.passed) results.passed++; else results.failed++;
  
  // Test 5: Save data to file
  console.log('\n' + '='.repeat(70));
  console.log('Test Suite 5: Data Persistence');
  console.log('='.repeat(70));
  
  const saveTest = await saveWeatherData('Chicago', 41.85, -87.65);
  results.tests.push({ name: 'Save Weather Data to File', passed: saveTest.passed });
  if (saveTest.passed) results.passed++; else results.failed++;
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(70));
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  const successRate = Math.round((results.passed / (results.passed + results.failed)) * 100);
  console.log(`Success rate: ${successRate}%`);
  
  console.log('\nDetailed Results:');
  results.tests.forEach((test, i) => {
    console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
  });
  
  // Write summary to file
  const summaryPath = '/job/tmp/weather-test-summary.json';
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    successRate,
    tests: results.tests
  }, null, 2));
  
  console.log(`\n💾 Summary saved to: ${summaryPath}`);
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
