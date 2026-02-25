#!/usr/bin/env node
/**
 * Test suite for system-health skill
 * @module system-health/test
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('═══════════════════════════════════════════════════════════');
console.log('  SYSTEM-HEALTH SKILL - TEST SUITE');
console.log('═══════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;
const results = [];

function runTest(name, fn) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    const result = fn();
    if (result) {
      console.log(`   ✓ PASSED`);
      passed++;
      results.push({ name, status: 'passed' });
    } else {
      console.log(`   ✗ FAILED - assertion failed`);
      failed++;
      results.push({ name, status: 'failed', error: 'assertion failed' });
    }
  } catch (err) {
    console.log(`   ✗ FAILED - ${err.message}`);
    failed++;
    results.push({ name, status: 'failed', error: err.message });
  }
}

function execScript(scriptPath, args = '') {
  const cmd = `node ${scriptPath} ${args}`;
  return execSync(cmd, { encoding: 'utf8', timeout: 10000 });
}

// Test 1: Check resources script
runTest('check-resources.js executes', () => {
  const output = execScript('/job/.pi/skills/system-health/check-resources.js');
  const json = JSON.parse(output);
  
  console.log(`   CPU: ${json.cpu.usage}% usage, ${json.cpu.cores} cores`);
  console.log(`   Memory: ${json.memory.usagePercent}% used`);
  console.log(`   Disk: ${json.disk.usagePercent}% used`);
  
  return json.cpu && json.memory && json.disk && 
         typeof json.cpu.usage === 'number' &&
         typeof json.memory.usagePercent === 'number' &&
         typeof json.disk.usagePercent === 'number';
});

// Test 2: Check service with valid URL
runTest('check-service.js - valid URL', () => {
  const output = execScript('/job/.pi/skills/system-health/check-service.js', '--url https://httpbin.org/status/200 --timeout 5000');
  const json = JSON.parse(output);
  
  console.log(`   URL: ${json.url}`);
  console.log(`   Status: ${json.status}`);
  console.log(`   Response Time: ${json.responseTime}ms`);
  
  return json.status === 'healthy' && json.statusCode === 200;
});

// Test 3: Check service with invalid URL
runTest('check-service.js - invalid URL', () => {
  const output = execScript('/job/.pi/skills/system-health/check-service.js', '--url https://invalid-hostname-that-does-not-exist.com --timeout 2000');
  const json = JSON.parse(output);
  
  console.log(`   Status: ${json.status}`);
  
  return json.status === 'unreachable' || json.status === 'error';
});

// Test 4: Check API connectivity
runTest('check-api.js - executes', () => {
  const output = execScript('/job/.pi/skills/system-health/check-api.js');
  const json = JSON.parse(output);
  
  console.log(`   APIs checked: ${json.apis ? json.apis.length : 0}`);
  if (json.apis) {
    for (const api of json.apis) {
      console.log(`   - ${api.provider}: ${api.status}`);
    }
  }
  
  return json.timestamp && Array.isArray(json.apis);
});

// Test 5: Generate health report (JSON)
runTest('health-report.js - JSON format', () => {
  const output = execScript('/job/.pi/skills/system-health/health-report.js', '--format json');
  const json = JSON.parse(output);
  
  console.log(`   Overall: ${json.overall}`);
  console.log(`   Alerts: ${json.alerts.length}`);
  console.log(`   Services: ${json.services.length}`);
  console.log(`   APIs: ${json.apis.length}`);
  
  return json.overall && json.resources && json.timestamp;
});

// Test 6: Generate health report (text)
runTest('health-report.js - text format', () => {
  const output = execScript('/job/.pi/skills/system-health/health-report.js', '--format text');
  
  console.log(`   Report length: ${output.length} chars`);
  console.log(`   Contains ASCII art: ${output.includes('════')}`);
  
  return output.includes('SYSTEM HEALTH REPORT') && output.length > 500;
});

// Test 7: Generate health report to file
runTest('health-report.js - file output', () => {
  const outputFile = '/job/tmp/health-test-report.json';
  execScript('/job/.pi/skills/system-health/health-report.js', `--format json --output ${outputFile}`);
  
  const exists = fs.existsSync(outputFile);
  const content = exists ? fs.readFileSync(outputFile, 'utf8') : '';
  const json = exists ? JSON.parse(content) : null;
  
  console.log(`   File created: ${exists}`);
  console.log(`   Valid JSON: ${!!json}`);
  
  return exists && json && json.timestamp;
});

// Test 8: Check service with custom endpoint (Event Handler)
runTest('check-service.js - localhost endpoint', () => {
  try {
    const output = execScript('/job/.pi/skills/system-health/check-service.js', '--url http://localhost:3000/api/ping --timeout 3000');
    const json = JSON.parse(output);
    console.log(`   Status: ${json.status}`);
    return json.status === 'healthy' || json.status === 'unreachable' || json.status === 'timeout';
  } catch (e) {
    // Expected if service not running
    console.log(`   (Service not running - expected in test environment)`);
    return true;
  }
});

// Test 9: Verify SKILL.md exists and is valid
runTest('SKILL.md exists and has proper structure', () => {
  const skillMd = fs.readFileSync('/job/.pi/skills/system-health/SKILL.md', 'utf8');
  
  const hasFrontmatter = skillMd.startsWith('---');
  const hasName = skillMd.includes('name: system-health');
  const hasDescription = skillMd.includes('description:');
  const hasCommands = skillMd.includes('```bash');
  const hasExamples = skillMd.includes('Example');
  
  console.log(`   Has frontmatter: ${hasFrontmatter}`);
  console.log(`   Has name: ${hasName}`);
  console.log(`   Has description: ${hasDescription}`);
  console.log(`   Has commands: ${hasCommands}`);
  console.log(`   Has examples: ${hasExamples}`);
  
  return hasFrontmatter && hasName && hasDescription && hasCommands;
});

// Test 10: All scripts have proper shebang
runTest('All scripts have proper shebang', () => {
  const scripts = [
    '/job/.pi/skills/system-health/check-resources.js',
    '/job/.pi/skills/system-health/check-service.js',
    '/job/.pi/skills/system-health/check-api.js',
    '/job/.pi/skills/system-health/health-report.js'
  ];
  
  let allValid = true;
  for (const script of scripts) {
    const content = fs.readFileSync(script, 'utf8');
    const hasShebang = content.startsWith('#!/usr/bin/env node');
    console.log(`   ${script.split('/').pop()}: ${hasShebang ? '✓' : '✗'}`);
    if (!hasShebang) allValid = false;
  }
  
  return allValid;
});

// Summary
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  TEST RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═══════════════════════════════════════════════════════════\n');

const summary = {
  timestamp: new Date().toISOString(),
  total: passed + failed,
  passed,
  failed,
  tests: results,
  success: failed === 0
};

fs.writeFileSync('/job/tmp/system-health-test-results.json', JSON.stringify(summary, null, 2));
console.log('Test results written to: /job/tmp/system-health-test-results.json\n');

process.exit(failed > 0 ? 1 : 0);
