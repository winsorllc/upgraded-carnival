#!/usr/bin/env node
/**
 * Robot Controller Skill Test Suite
 * 
 * Tests all traits, safety monitor, and edge cases.
 * Run with: node test.js [--verbose] [--mock]
 */

const assert = require('assert');
const { RobotController, SafetyMonitor, MockSensors } = require('./robot.js');

const VERBOSE = process.argv.includes('--verbose');

function log(message, data = null) {
  if (VERBOSE || !log.suppressed) {
    console.log(message);
    if (data !== null) console.log('  →', JSON.stringify(data));
  }
}

log.suppressed = !VERBOSE;

// ============================================================================
// Test Suite Runner
// ============================================================================

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║    Robot Controller Skill - Test Suite                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  const tests = [
    { name: 'Safety Monitor - Basic Initialization', fn: testSafetyInit },
    { name: 'Safety Monitor - Preflight Check (Clear)', fn: testSafetyPreflightClear },
    { name: 'Safety Monitor - Preflight Check (Blocked)', fn: testSafetyPreflightBlocked },
    { name: 'Safety Monitor - Speed Limiting', fn: testSafetySpeedLimit },
    { name: 'Safety Monitor - E-Stop', fn: testSafetyEStop },
    { name: 'Safety Monitor - Watchdog Timeout', fn: testSafetyWatchdog },
    { name: 'Drive Tool - Forward Movement', fn: testDriveForward },
    { name: 'Drive Tool - Rotation', fn: testDriveRotate },
    { name: 'Drive Tool - Position Tracking', fn: testDrivePosition },
    { name: 'Drive Tool - Safety Veto', fn: testDriveSafetyVeto },
    { name: 'Look Tool - Capture', fn: testLookCapture },
    { name: 'Look Tool - Describe', fn: testLookDescribe },
    { name: 'Listen Tool - Transcription', fn: testListen },
    { name: 'Speak Tool - Output', fn: testSpeak },
    { name: 'Sense Tool - Read Sensors', fn: testSense },
    { name: 'Emote Tool - Display', fn: testEmote },
    { name: 'Robot Controller - Full Init', fn: testRobotInit },
    { name: 'Robot Controller - Complete Workflow', fn: testRobotWorkflow },
    { name: 'Robot Controller - Emergency Scenario', fn: testEmergencyScenario },
  ];

  for (const test of tests) {
    try {
      process.stdout.write(`  [TEST] ${test.name}... `);
      await test.fn();
      console.log('✓ PASS');
      passed++;
    } catch (err) {
      console.log('✗ FAIL');
      console.log(`    Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n' + '─'.repeat(58));
  console.log(`  Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('─'.repeat(58) + '\n');

  if (failed > 0) {
    console.log(`❌ Tests failed!`);
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

// ============================================================================
// Test Cases
// ============================================================================

async function testSafetyInit() {
  const safety = new SafetyMonitor({ enabled: true, stopDistance: 0.3 });
  assert(safety.config.enabled === true, 'Safety should be enabled');
  assert(safety.config.stopDistance === 0.3, 'Stop distance should be 0.3m');
  assert(safety.engaged === false, 'Should not be engaged initially');
  assert(safety.estop === false, 'E-stop should be false initially');
  
  const status = safety.getStatus();
  assert(status.engaged === false, 'Status should show not engaged');
  assert(status.watchdog === 'ok', 'Watchdog should be ok');
}

async function testSafetyPreflightClear() {
  global.mockSensors = new MockSensors();
  global.mockSensors.positions.front = 2.5; // Clear path
  
  const safety = new SafetyMonitor({ 
    enabled: true, 
    stopDistance: 0.3,
    slowDistance: 0.6
  });
  
  const result = await safety.preflight('forward', 1.0);
  assert(result.allowed === true, 'Movement should be allowed when path is clear');
  assert(result.maxSpeed === 0.5, 'Should allow max speed');
}

async function testSafetyPreflightBlocked() {
  global.mockSensors = new MockSensors();
  global.mockSensors.positions.front = 0.2; // Obstacle very close
  
  const safety = new SafetyMonitor({ 
    enabled: true, 
    stopDistance: 0.3,
    slowDistance: 0.6
  });
  
  const result = await safety.preflight('forward', 1.0);
  assert(result.allowed === false, 'Movement should be blocked when obstacle is too close');
  assert(result.reason.includes('Obstacle'), 'Should mention obstacle');
  assert(result.safety_veto !== true, 'Veto flag not set on preflight');
}

async function testSafetySpeedLimit() {
  global.mockSensors = new MockSensors();
  global.mockSensors.positions.front = 0.45; // Between slow and stop distance
  
  const safety = new SafetyMonitor({ 
    enabled: true, 
    stopDistance: 0.3,
    slowDistance: 0.6,
    maxSpeed: 0.5
  });
  
  const result = await safety.preflight('forward', 1.0);
  assert(result.allowed === true, 'Movement should be allowed but limited');
  assert(result.mode === 'speed_limited', 'Should be in speed limited mode');
  assert(result.maxSpeed < 0.5, 'Speed should be reduced');
}

async function testSafetyEStop() {
  const safety = new SafetyMonitor({ enabled: true });
  
  let estopTriggered = false;
  safety.on('estop', () => { estopTriggered = true; });
  
  safety.engage('test');
  assert(safety.engaged === true, 'Should be engaged after E-stop');
  assert(safety.estop === true, 'E-stop flag should be true');
  assert(estopTriggered === true, 'E-stop event should fire');
  
  // Test that preflight fails when E-stop is engaged
  const result = await safety.preflight('forward', 1.0);
  assert(result.allowed === false, 'Movement should be blocked during E-stop');
  
  // Reset and verify
  safety.disengage();
  assert(safety.engaged === false, 'Should be disengaged after reset');
  assert(safety.estop === false, 'E-stop flag should be false after reset');
}

async function testSafetyWatchdog() {
  return new Promise((resolve, reject) => {
    const safety = new SafetyMonitor({ 
      enabled: true, 
      watchdogTimeout: 500 
    });
    
    let watchdogFired = false;
    safety.on('watchdog_timeout', () => { watchdogFired = true; });
    
    // Don't reset watchdog - let it timeout
    setTimeout(() => {
      try {
        assert(watchdogFired === true, 'Watchdog timeout event should fire');
        assert(safety.engaged === true, 'Safety should engage on watchdog timeout');
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 800);
  });
}

async function testDriveForward() {
  global.mockSensors = new MockSensors();
  const safety = new SafetyMonitor({ enabled: false }); // Disable for this test
  const { DriveTool } = require('./robot.js');
  const drive = new DriveTool(safety);
  
  const result = await drive.execute({ action: 'forward', distance: 1.0 });
  assert(result.success === true, 'Drive should succeed');
  assert(result.position, 'Should return position');
}

async function testDriveRotate() {
  const safety = new SafetyMonitor({ enabled: false });
  const { DriveTool } = require('./robot.js');
  const drive = new DriveTool(safety);
  
  const result = await drive.execute({ action: 'rotate', angle: 90 });
  assert(result.success === true, 'Rotation should succeed');
  assert(result.position.theta === 90, 'Should rotate to 90 degrees');
}

async function testDrivePosition() {
  const safety = new SafetyMonitor({ enabled: false });
  const { DriveTool } = require('./robot.js');
  const drive = new DriveTool(safety);
  
  await drive.execute({ action: 'forward', distance: 1.0 });
  await drive.execute({ action: 'forward', distance: 1.0 });
  
  assert(Math.abs(drive.position.x - 2.0) < 0.01, 'Should be 2 meters forward');
}

async function testDriveSafetyVeto() {
  global.mockSensors = new MockSensors();
  global.mockSensors.positions.front = 0.1; // Very close obstacle
  
  const safety = new SafetyMonitor({ 
    enabled: true,
    stopDistance: 0.3
  });
  
  const { DriveTool } = require('./robot.js');
  const drive = new DriveTool(safety);
  
  const result = await drive.execute({ action: 'forward', distance: 1.0 });
  assert(result.success === false, 'Drive should fail when safety vetos');
  assert(result.safety_veto === true, 'Should have safety_veto flag');
  assert(result.error, 'Should include error message');
}

async function testLookCapture() {
  const { LookTool } = require('./robot.js');
  const look = new LookTool();
  
  const result = await look.execute({});
  assert(result.success === true, 'Capture should succeed');
  assert(result.message.includes('captured'), 'Should confirm capture');
}

async function testLookDescribe() {
  const { LookTool } = require('./robot.js');
  const look = new LookTool();
  
  const result = await look.describe('test-image');
  assert(result.success === true, 'Describe should succeed');
  assert(result.description, 'Should return description');
  assert(typeof result.description === 'string', 'Description should be string');
}

async function testListen() {
  const { ListenTool } = require('./robot.js');
  const listen = new ListenTool();
  
  const result = await listen.execute({ duration: 3 });
  assert(result.success === true, 'Listen should succeed');
  assert(result.transcription, 'Should return transcription');
  assert(result.confidence >= 0 && result.confidence <= 1, 'Confidence should be 0-1');
}

async function testSpeak() {
  const { SpeakTool } = require('./robot.js');
  const speak = new SpeakTool();
  
  const result = await speak.execute({ text: 'Hello world' });
  assert(result.success === true, 'Speak should succeed');
}

async function testSense() {
  global.mockSensors = new MockSensors();
  const { SenseTool } = require('./robot.js');
  const sense = new SenseTool();
  
  // Test single sensor
  const front = await sense.execute({ sensor: 'front' });
  assert(front.success === true, 'Should read front sensor');
  assert(typeof front.data === 'number', 'Should return number');
  
  // Test all sensors
  const all = await sense.execute({ sensor: 'all' });
  assert(all.success === true, 'Should read all sensors');
  assert(all.data.front, 'Should have front sensor data');
  assert(all.data.left, 'Should have left sensor data');
}

async function testEmote() {
  const { EmoteTool } = require('./robot.js');
  const emote = new EmoteTool();
  
  const result = await emote.execute({ emoji: 'happy' });
  assert(result.success === true, 'Emote should succeed');
  assert(result.displayed, 'Should display emoji');
}

async function testRobotInit() {
  const robot = new RobotController();
  await robot.init({ driver: 'mock', safety: { enabled: true } });
  
  assert(robot.initialized === true, 'Robot should be initialized');
  assert(robot.safety, 'Safety monitor should exist');
  assert(robot.tools.drive, 'Drive tool should exist');
  assert(robot.tools.look, 'Look tool should exist');
  assert(robot.tools.listen, 'Listen tool should exist');
  assert(robot.tools.speak, 'Speak tool should exist');
  assert(robot.tools.sense, 'Sense tool should exist');
  assert(robot.tools.emote, 'Emote tool should exist');
}

async function testRobotWorkflow() {
  const robot = new RobotController();
  await robot.init({ driver: 'mock', safety: { enabled: true } });
  
  // Complete workflow: move, sense, speak, emote
  const move1 = await robot.drive('forward', 0.5);
  assert(move1.success === true, 'Should move forward');
  
  const sensors = await robot.sense('all');
  assert(sensors.success === true, 'Should read sensors');
  
  const speak = await robot.speak('Moving forward');
  assert(speak.success === true, 'Should speak');
  
  const pos = robot.getPosition();
  assert(pos.x > 0, 'Position should change after movement');
}

async function testEmergencyScenario() {
  const robot = new RobotController();
  await robot.init({ 
    driver: 'mock', 
    safety: { enabled: true, stopDistance: 0.3, watchdogTimeout: 10000 }
  });
  
  // Trigger emergency stop
  await robot.emergencyStop('test');
  const status = robot.getSafetyStatus();
  assert(status.estop === true, 'E-stop should be engaged');
  
  // Try to move during E-stop
  const move = await robot.drive('forward', 1.0);
  assert(move.success === false, 'Movement should fail during E-stop');
  
  // Reset and verify movement works again
  robot.safety.disengage();
  const move2 = await robot.drive('forward', 0.5);
  assert(move2.success === true, 'Movement should work after E-stop reset');
}

// Run the tests
runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
