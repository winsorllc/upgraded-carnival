#!/usr/bin/env node
/**
 * Robot Controller Skill for PopeBot
 * 
 * Trait-driven robotics control with independent safety monitoring.
 * Based on ZeroClaw's robot-kit architecture.
 * 
 * @module robot-controller
 */

const EventEmitter = require('events');
const path = require('path');

// Mock sensor simulator for testing without hardware
class MockSensors {
  constructor() {
    this.positions = { front: 2.5, left: 2.0, right: 2.0, back: 2.5 };
    this.variation = 0.1;
  }

  read(sensor) {
    if (sensor === 'all') {
      return { ...this.positions };
    }
    return this.positions[sensor] || 0;
  }

  simulateMovement(dx, dy) {
    // Simple simulated changes based on movement
    this.positions.front += dx;
    this.positions.back -= dx;
    this.positions.left += dy;
    this.positions.right -= dy;
    
    // Clamp values
    for (const key in this.positions) {
      this.positions[key] = Math.max(0.1, Math.min(10, this.positions[key]));
    }
  }
}

// Safety Monitor - runs independently with veto power
class SafetyMonitor extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      enabled: true,
      maxSpeed: 0.5,
      stopDistance: 0.3,
      slowDistance: 0.6,
      watchdogTimeout: 5000,
      ...config
    };
    
    this.engaged = false;
    this.estop = false;
    this.watchdogTimer = null;
    this.lastUpdate = Date.now();
    this.currentSpeed = 0;
    this.obstacles = [];
    
    // Start watchdog checker
    this._startWatchdog();
  }

  _startWatchdog() {
    setInterval(() => {
      const elapsed = Date.now() - this.lastUpdate;
      if (elapsed > this.config.watchdogTimeout && this.config.enabled) {
        console.log('[SafetyMonitor] Watchdog timeout! Engaging E-stop.');
        this.engage('watchdog');
        this.emit('watchdog_timeout', { elapsed });
      }
    }, 500);
  }

  resetWatchdog() {
    this.lastUpdate = Date.now();
  }

  /**
   * Check if movement is allowed (preflight check)
   * Returns: { allowed: bool, reason?: string, maxSpeed?: number }
   */
  async preflight(direction, distance) {
    if (!this.config.enabled) {
      return { allowed: true, mode: 'safety_disabled' };
    }

    if (this.estop || this.engaged) {
      return { allowed: false, reason: 'E-stop engaged' };
    }

    // In mock mode, check simulated sensors
    const sensorReading = global.mockSensors ? global.mockSensors.read(direction) : 2.0;
    
    if (sensorReading < this.config.stopDistance) {
      this.obstacles.push({ direction, distance: sensorReading });
      return { 
        allowed: false, 
        reason: `Obstacle too close: ${sensorReading.toFixed(2)}m < ${this.config.stopDistance}m` 
      };
    }

    if (sensorReading < this.config.slowDistance) {
      const maxSpeed = this.config.maxSpeed * (sensorReading / this.config.slowDistance);
      return { 
        allowed: true, 
        mode: 'speed_limited',
        maxSpeed: maxSpeed,
        reason: `Approaching obstacle: ${sensorReading.toFixed(2)}m`
      };
    }

    return { allowed: true, maxSpeed: this.config.maxSpeed };
  }

  /**
   * Emergency stop - overrides all commands
   */
  engage(reason = 'manual') {
    this.engaged = true;
    this.estop = true;
    console.log(`[SafetyMonitor] E-STOP ENGAGED: ${reason}`);
    this.emit('estop', { reason, timestamp: Date.now() });
  }

  /**
   * Reset E-stop
   */
  disengage() {
    this.engaged = false;
    this.estop = false;
    this.obstacles = [];
    console.log('[SafetyMonitor] E-stop reset');
    this.emit('estop_reset', { timestamp: Date.now() });
  }

  /**
   * Get current safety status
   */
  getStatus() {
    return {
      engaged: this.engaged,
      estop: this.estop,
      watchdog: (Date.now() - this.lastUpdate) < this.config.watchdogTimeout ? 'ok' : 'expired',
      obstacles: this.obstacles,
      currentSpeed: this.currentSpeed,
      uptime: Date.now() - this.lastUpdate
    };
  }

  setSpeed(speed) {
    this.currentSpeed = speed;
    this.resetWatchdog();
  }
}

// Drive trait - motor control
class DriveTool {
  constructor(safety) {
    this.safety = safety;
    this.position = { x: 0, y: 0, theta: 0 };
  }

  async execute(params) {
    const { action, distance, angle } = params;

    // Safety preflight check
    const preflight = await this.safety.preflight(action, distance || 1);
    if (!preflight.allowed) {
      return { 
        success: false, 
        error: preflight.reason,
        safety_veto: true 
      };
    }

    // Set speed based on safety limits
    if (preflight.maxSpeed) {
      this.safety.setSpeed(preflight.maxSpeed);
      console.log(`[Drive] Speed limited to ${preflight.maxSpeed.toFixed(2)} m/s`);
    }

    // Execute movement (mock implementation)
    if (action === 'rotate') {
      this.position.theta = (this.position.theta + angle) % 360;
      console.log(`[Drive] Rotated ${angle} degrees, now facing ${this.position.theta}°`);
    } else {
      const dist = distance || 1;
      const rad = (this.position.theta * Math.PI) / 180;
      
      if (global.mockSensors) {
        const dx = Math.cos(rad) * dist;
        const dy = Math.sin(rad) * dist;
        global.mockSensors.simulateMovement(dx, dy);
      }
      
      this.position.x += Math.cos(rad) * dist;
      this.position.y += Math.sin(rad) * dist;
      console.log(`[Drive] Moved ${dist}m in direction ${action}, pos: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)})`);
    }

    return {
      success: true,
      position: { ...this.position }
    };
  }
}

// Look trait - vision
class LookTool {
  async execute(params) {
    // Mock implementation
    console.log('[Look] Simulating camera capture...');
    return {
      success: true,
      message: 'Mock: Image captured (640x480)',
      imageBase64: null
    };
  }

  async describe(image) {
    // Mock implementation
    const descriptions = [
      'A clear path ahead with no obstacles',
      'Wall detected approximately 2 meters ahead',
      'Open space with a doorway to the left',
      'Person detected moving across the field of view',
      'Chair and desk visible in the room'
    ];
    const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
    console.log(`[Look] Vision AI description: ${desc}`);
    return {
      success: true,
      description: desc
    };
  }
}

// Listen trait - speech recognition
class ListenTool {
  async execute(params) {
    const duration = params.duration || 5;
    console.log(`[Listen] Recording ${duration} seconds of audio...`);
    
    // Mock transcriptions
    const commands = [
      'move forward',
      'turn left',
      'stop',
      'what do you see',
      'go back'
    ];
    const cmd = commands[Math.floor(Math.random() * commands.length)];
    
    return {
      success: true,
      transcription: cmd,
      language: 'en',
      confidence: 0.95
    };
  }
}

// Speak trait - text-to-speech
class SpeakTool {
  async execute(params) {
    const text = params.text || 'Hello';
    console.log(`[Speak] "${text}"`);
    return {
      success: true,
      message: 'Speech output (mock)'
    };
  }
}

// Sense trait - sensor readings
class SenseTool {
  constructor() {
    this.sensors = {
      front: 2.5,
      left: 2.0,
      right: 2.0,
      back: 2.5,
      imu: { roll: 0, pitch: 0.5, yaw: 0 }
    };
  }

  async execute(params) {
    const sensor = params.sensor || 'all';
    
    if (global.mockSensors) {
      const data = sensor === 'all' 
        ? global.mockSensors.read('all')
        : global.mockSensors.read(sensor);
      return { success: true, data };
    }
    
    // Simulated sensor data
    return {
      success: true,
      data: this.sensors[sensor] || this.sensors
    };
  }
}

// Emote trait - LED matrix, sounds
class EmoteTool {
  async execute(params) {
    const emoji = params.emoji || 'neutral';
    console.log(`[Emote] Displaying: ${emoji}`);
    
    const emojis = {
      happy: '😊',
      sad: '😢',
      confused: '🤔',
      alert: '⚠️',
      searching: '👀',
      neutral: '😐'
    };
    
    return {
      success: true,
      displayed: emojis[emoji] || emojis.neutral
    };
  }
}

// Main Robot Controller class
class RobotController {
  constructor() {
    this.initialized = false;
    this.safety = null;
    this.tools = {};
    this.config = null;
  }

  async init(config = {}) {
    this.config = {
      driver: config.driver || 'mock',
      safety: config.safety || {},
      ...config
    };

    console.log('[RobotController] Initializing...');
    console.log(`[RobotController] Driver: ${this.config.driver}`);
    console.log(`[RobotController] Safety: ${this.config.safety.enabled !== false ? 'enabled' : 'disabled'}`);

    // Initialize safety monitor
    this.safety = new SafetyMonitor(this.config.safety);
    
    // Listen for safety events
    this.safety.on('estop', (data) => {
      console.warn(`🚨 EMERGENCY STOP: ${data.reason}`);
    });

    this.safety.on('watchdog_timeout', () => {
      console.warn('⏰ Watchdog expired - robot auto-stopped');
    });

    // Initialize mock sensors
    if (this.config.driver === 'mock') {
      global.mockSensors = new MockSensors();
      console.log('[RobotController] Mock sensors initialized');
    }

    // Create tools
    this.tools = {
      drive: new DriveTool(this.safety),
      look: new LookTool(),
      listen: new ListenTool(),
      speak: new SpeakTool(),
      sense: new SenseTool(),
      emote: new EmoteTool()
    };

    this.initialized = true;
    console.log('[RobotController] Ready');
    
    return this;
  }

  // Convenience methods
  async drive(action, distance) {
    return this.tools.drive.execute({ action, distance });
  }

  async rotate(angle) {
    return this.tools.drive.execute({ action: 'rotate', angle });
  }

  async capture() {
    return this.tools.look.execute({});
  }

  async describe(image) {
    return this.tools.look.describe(image);
  }

  async listen(duration) {
    return this.tools.listen.execute({ duration });
  }

  async speak(text) {
    return this.tools.speak.execute({ text });
  }

  async sense(sensor) {
    return this.tools.sense.execute({ sensor });
  }

  async emote(emoji) {
    return this.tools.emote.execute({ emoji });
  }

  getSafetyStatus() {
    return this.safety.getStatus();
  }

  async emergencyStop(reason = 'manual') {
    this.safety.engage(reason);
  }

  getPosition() {
    return this.tools.drive.position;
  }
}

// Export for use as a module
module.exports = {
  RobotController,
  SafetyMonitor,
  MockSensors,
  DriveTool,
  LookTool,
  ListenTool,
  SpeakTool,
  SenseTool,
  EmoteTool,
  
  // Singleton instance
  instance: null,
  
  // Convenience factory
  create: async (config) => {
    const robot = new RobotController();
    await robot.init(config);
    module.exports.instance = robot;
    return robot;
  }
};

// CLI interface for testing
if (require.main === module) {
  const robot = new RobotController();
  
  robot.init({ 
    driver: 'mock', 
    safety: { enabled: true, stopDistance: 0.3, watchdogTimeout: 10000 }
  }).then(async () => {
    console.log('\n=== Robot Controller Test ===\n');
    
    // Test movement
    console.log('1. Moving forward 1 meter...');
    const move1 = await robot.drive('forward', 1);
    console.log('   Result:', move1);
    
    console.log('\n2. Rotating 90 degrees...');
    const rotate = await robot.rotate(90);
    console.log('   Result:', rotate);
    
    console.log('\n3. Reading sensors...');
    const sensors = await robot.sense('all');
    console.log('   Result:', sensors);
    
    console.log('\n4. Capturing and describing...');
    const img = await robot.capture();
    const desc = await robot.describe(img);
    console.log('   Result:', desc);
    
    console.log('\n5. Speaking...');
    await robot.speak('Hello, I am a robot');
    
    console.log('\n6. Displaying emotion...');
    const emoji = await robot.emote('happy');
    console.log('   Result:', emoji);
    
    console.log('\n7. Safety status...');
    const status = robot.getSafetyStatus();
    console.log('   Result:', status);
    
    console.log('\n8. Testing safety veto (simulating obstacle)...');
    // Simulate obstacle very close
    if (global.mockSensors) {
      global.mockSensors.positions.front = 0.2;
    }
    const blocked = await robot.drive('forward', 1);
    console.log('   Result:', blocked);
    
    console.log('\n=== Test Complete ===\n');
    process.exit(0);
  }).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}
