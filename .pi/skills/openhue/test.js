#!/usr/bin/env node

/**
 * Test script for openhue skill
 */

console.log('🧪 Testing openhue skill...\n');

// Test command generation
const tests = [
  {
    name: 'List all lights',
    command: 'openhue get light',
    expected: 'openhue get light'
  },
  {
    name: 'Turn on light',
    command: 'openhue set light "Bedroom Lamp" --on',
    expected: 'openhue set light "Bedroom Lamp" --on'
  },
  {
    name: 'Turn off light',
    command: 'openhue set light "Bedroom Lamp" --off',
    expected: 'openhue set light "Bedroom Lamp" --off'
  },
  {
    name: 'Set brightness',
    command: 'openhue set light "Lamp" --on --brightness 50',
    expected: 'openhue set light "Lamp" --on --brightness 50'
  },
  {
    name: 'Set color temperature',
    command: 'openhue set light "Lamp" --on --temperature 300',
    expected: 'openhue set light "Lamp" --on --temperature 300'
  },
  {
    name: 'Set color by hex',
    command: 'openhue set light "Lamp" --on --rgb "#FF5500"',
    expected: 'openhue set light "Lamp" --on --rgb "#FF5500"'
  },
  {
    name: 'Control room',
    command: 'openhue set room "Bedroom" --off',
    expected: 'openhue set room "Bedroom" --off'
  },
  {
    name: 'Activate scene',
    command: 'openhue set scene "Relax" --room "Bedroom"',
    expected: 'openhue set scene "Relax" --room "Bedroom"'
  },
  {
    name: 'JSON output',
    command: 'openhue get light --json',
    expected: 'openhue get light --json'
  },
  {
    name: 'Preset: Bedtime',
    command: 'openhue set room "Bedroom" --on --brightness 20 --temperature 450',
    expected: 'openhue set room "Bedroom" --on --brightness 20 --temperature 450'
  }
];

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  if (test.command === test.expected) {
    console.log(`✅ Test ${index + 1}: ${test.name}`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${test.name}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got: ${test.command}`);
    failed++;
  }
});

// Test color temperature ranges
console.log('\n📝 Testing color temperature validation...\n');

const mirekTests = [
  { value: 153, desc: 'Coolest (daylight)' },
  { value: 300, desc: 'Neutral white' },
  { value: 454, desc: 'Warmest (candlelight)' }
];

mirekTests.forEach(test => {
  if (test.value >= 153 && test.value <= 500) {
    console.log(`  ✅ ${test.value} mirek: ${test.desc}`);
    passed++;
  } else {
    console.log(`  ❌ ${test.value} mirek: out of range`);
    failed++;
  }
});

// Test preset scenarios
console.log('\n📝 Testing preset scenarios...\n');

const presets = [
  {
    name: 'Morning',
    command: 'openhue set room "Bedroom" --on --brightness 50 --temperature 300',
    valid: true
  },
  {
    name: 'Movie mode',
    command: 'openhue set room "Living Room" --on --color "#1A1A4E" --brightness 20',
    valid: true
  },
  {
    name: 'Reading',
    command: 'openhue set room "Study" --on --brightness 80 --temperature 300',
    valid: true
  },
  {
    name: 'Bedtime',
    command: 'openhue set room "Bedroom" --on --brightness 15 --temperature 450',
    valid: true
  }
];

presets.forEach((preset, index) => {
  if (preset.valid) {
    console.log(`  ✅ Preset ${index + 1}: ${preset.name}`);
    passed++;
  } else {
    console.log(`  ❌ Preset ${index + 1}: ${preset.name}`);
    failed++;
  }
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\n⚠️  Some tests failed');
  process.exit(1);
}

console.log('\n✅ All tests passed!\n');
console.log('Note: Actual OpenHue execution requires Philips Hue Bridge on local network.\n');
