---
name: robot-controller
description: Trait-driven robotics control with independent safety monitoring. Based on ZeroClaw's robot-kit architecture. Enables AI-controlled mobile robots with vision, speech, sensors, and collision avoidance.
---

# Robot Controller Skill

Trait-driven robotics control system inspired by ZeroClaw's robot-kit architecture. Provides safe, AI-controllable robotics with independent safety monitoring that can override AI decisions to prevent collisions and damage.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  PopeBot AI Brain                                        │
│  "Move forward, look for objects, report what you see"  │
└─────────────────────┬───────────────────────────────────┘
                      │ Tool calls
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Robot Controller Skill                                  │
│  ┌─────────┐ ┌──────┐ ┌────────┐ ┌───────┐ ┌───────┐   │
│  │ drive   │ │ look │ │ listen │ │ speak │ │ sense │   │
│  └────┬────┘ └──┬───┘ └───┬────┘ └───┬───┘ └───┬───┘   │
│       │         │         │          │         │        │
│  ┌────┴─────────┴─────────┴──────────┴─────────┴────┐  │
│  │           SafetyMonitor (independent thread)      │  │
│  │  • Pre-move obstacle check                        │  │
│  │  • Proximity-based speed limiting                 │  │
│  │  • Bump sensor response                           │  │
│  │  • Watchdog auto-stop                             │  │
│  │  • Emergency stop override                        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Hardware/Driver Layer (ROS2, Serial, GPIO, Mock)        │
│  Motors, Camera, Microphone, Speaker, LIDAR, Ultrasonic  │
└─────────────────────────────────────────────────────────┘
```

## Key Innovation: Safety Monitor

**The AI can REQUEST movement, but SafetyMonitor ALLOWS it.**

Unlike traditional robot control where the AI has direct hardware access, this skill implements an independent safety layer that:
- Runs on a separate event loop (cannot be blocked by AI)
- Has veto power over all motion commands
- Monitors proximity sensors in real-time
- Enforces speed limits based on sensor data
- Implements watchdog timer (auto-stop if no updates)
- Responds to hardware E-stop signals

This prevents collisions and damage even if the LLM hallucinates or receives bad instructions.

## Trait System

The skill uses a trait-driven architecture where each capability is a separate trait:

| Trait | Purpose | Methods |
|-------|---------|---------|
| **Drive** | Motor control (differential, omni, Ackermann) | `move(direction, distance)`, `rotate(angle)`, `stop()` |
| **Look** | Vision capture + AI description | `capture()`, `describe(scene)` |
| **Listen** | Speech-to-text via Whisper | `record(duration)`, `transcribe()` |
| **Speak** | Text-to-speech output | `say(text)`, `setVoice(voice)` |
| **Sense** | Sensor data (LIDAR, ultrasonic, IMU) | `read(sensor)`, `scan360()` |
| **Emote** | LED matrix, sounds, animations | `display(emoji)`, `playSound(effect)` |

## Usage

### Initialize the Robot

```javascript
const robot = require('/job/.pi/skills/robot-controller/robot.js');

// Initialize with configuration
await robot.init({
  driver: 'mock',  // 'mock', 'ros2', 'serial', 'gpio'
  safety: {
    enabled: true,
    maxSpeed: 0.5,      // m/s
    stopDistance: 0.3,  // meters
    watchdogTimeout: 5  // seconds
  }
});
```

### Control the Robot

```javascript
// Move forward 1 meter (safety-checked)
await robot.drive('forward', 1.0);

// Rotate 90 degrees
await robot.rotate(90);

// Take a photo and describe it
const image = await robot.look.capture();
const description = await robot.look.describe(image);

// Read distance sensors
const sensors = await robot.sense.read('all');

// Speak a response
await robot.speak.say('I see an object 2 meters ahead');

// Display emotion on LED matrix
await robot.emote.display('happy');
```

### Safety Monitor API

```javascript
// Check if movement is allowed
const allowed = await robot.safety.preflight('forward', 1.0);

// Get current safety status
const status = robot.safety.getStatus();
// { engaged: false, obstacles: [], watchdog: 'ok', estop: false }

// Emergency stop
await robot.safety.engage();

// Reset after E-stop
await robot.safety.disengage();
```

## Configuration

Create `config/robot.json`:

```json
{
  "driver": "mock",
  "hardware": {
    "motorController": { "type": "l298n", "pins": { "left": [5, 6], "right": [9, 10] } },
    "lidar": { "type": "rplidar", "port": "/dev/ttyUSB0", "baudrate": 256000 },
    "ultrasonic": { "type": "hc-sr04", "trigger": 2, "echo": 3 },
    "camera": { "type": "usb", "device": "/dev/video0", "resolution": "640x480" },
    "microphone": { "type": "usb", "device": "default" },
    "speaker": { "type": "alsa", "device": "default" },
    "ledMatrix": { "type": "max7219", "spi": "/dev/spidev0.0" }
  },
  "safety": {
    "enabled": true,
    "maxSpeed": 0.5,
    "stopDistance": 0.3,
    "slowDistance": 0.6,
    "watchdogTimeout": 5,
    "watchdogCheckInterval": 0.5
  },
  "ai": {
    "visionModel": "llava:7b",
    "speechModel": "piper-en-us-amy-medium",
    "language": "en"
  }
}
```

## Driver Support

| Driver | Hardware | Status |
|--------|----------|--------|
| **mock** | Simulated hardware (testing) | ✅ Ready |
| **ros2** | ROS2 Foxy/Humble/Nav2 | 🚧 In Progress |
| **serial** | Arduino/Raspberry Pi via serial | 🚧 In Progress |
| **gpio** | Direct Raspberry Pi GPIO | 🚧 In Progress |
| **can** | CAN bus (automotive/industrial) | 🔜 Planned |

## Mock Mode (Testing)

For development without physical hardware:

```javascript
await robot.init({ driver: 'mock' });

// Mock sensors return simulated data
const sensors = await robot.sense.read('all');
// { front: 2.5, left: 1.8, right: 3.2, back: 2.0 }

// Mock drive tracks position but doesn't move
await robot.drive('forward', 1.0);
const pos = robot.getPosition();
// { x: 1.0, y: 0.0, theta: 0 }
```

## Tool Calls (Agent Integration)

The skill exposes these tool calls for the Pi agent:

```
robot_drive(direction, distance_or_angle)
  - Move the robot: forward/backward/left/right or rotate
  - direction: string ('forward', 'backward', 'left', 'right', 'rotate')
  - distance_or_angle: number (meters for movement, degrees for rotation)
  - Returns: { success: true, position: { x, y, theta } }

robot_look_capture()
  - Capture image from camera
  - Returns: { success: true, imageBase64: '<base64>' }

robot_look_describe(image)
  - Describe what's in the image using Vision AI
  - image: string (base64 or path)
  - Returns: { success: true, description: 'text' }

robot_listen(duration)
  - Record audio for speech recognition
  - duration: number (seconds, default 5)
  - Returns: { success: true, transcription: 'text' }

robot_speak(text)
  - Speak text using TTS
  - text: string
  - Returns: { success: true }

robot_sense_read(sensor)
  - Read sensor data
  - sensor: string ('front', 'left', 'right', 'back', 'imu', 'all')
  - Returns: { success: true, data: number|object }

robot_emote_display(emoji)
  - Display emotion on LED matrix
  - emoji: string ('happy', 'sad', 'confused', 'alert', 'searching')
  - Returns: { success: true }

robot_safety_status()
  - Get safety monitor status
  - Returns: { engaged: bool, obstacles: array, watchdog: string, estop: bool }

robot_safety_emergency_stop()
  - Trigger emergency stop
  - Returns: { success: true }

robot_get_position()
  - Get current estimated position
  - Returns: { success: true, position: { x, y, theta } }
```

## Safety Scenarios

### Scenario 1: Obstacle Detected

```
1. AI: "Move forward 2 meters"
2. SafetyMonitor: Checks front ultrasonic (reading: 0.4m)
3. SafetyMonitor: 0.4m < stopDistance (0.3m)? No, but < slowDistance (0.6m)
4. SafetyMonitor: Allows movement but limits speed to 0.2 m/s
5. Drive: Moves forward slowly
6. SafetyMonitor: Continuous monitoring during movement
```

### Scenario 2: Collision Imminent

```
1. AI: "Continue forward"
2. SafetyMonitor: Front reading drops to 0.25m
3. SafetyMonitor: 0.25m < stopDistance (0.3m)
4. SafetyMonitor: IMMEDIATE STOP (overrides AI)
5. Robot: Stops even though AI said continue
6. Robot: Reports "Emergency stop: obstacle too close"
```

### Scenario 3: Watchdog Timeout

```
1. AI: "Move forward" (then AI crashes/goes silent)
2. SafetyMonitor: Watchdog timer started (5s timeout)
3. 5 seconds pass with no update
4. SafetyMonitor: Watchdog expired → emergency stop
5. Robot: Stops safely even though AI is unresponsive
```

## Installation

```bash
# Activate the skill
ln -s ../../pi-skills/robot-controller /job/.pi/skills/robot-controller

# Install dependencies
cd /job/.pi/skills/robot-controller
npm install
```

## Dependencies

```json
{
  "fluent-ffmpeg": "^2.1.2",
  "sharp": "^0.33.2",
  "node-fetch": "^3.3.2"
}
```

For hardware drivers:
- `serialport` - Serial communication
- `onoff` - GPIO control
- `ros-nodejs` - ROS2 integration
- `usb` - USB device access

## Testing

```bash
# Run test suite
node /job/.pi/skills/robot-controller/test.js

# Mock hardware test
node /job/.pi/skills/robot-controller/test.js --mock

# Safety monitor stress test
node /job/.pi/skills/robot-controller/test.js --safety-stress
```

## When to Use

- When controlling physical robots (mobile platforms, arms, drones)
- When safety is critical (human-robot interaction, expensive equipment)
- When building autonomous navigation systems
- When you need trait-driven, swappable hardware abstraction
- When testing robot control logic without hardware (mock mode)

## Example Workflows

### Autonomous Exploration

```javascript
// Explore a room while avoiding obstacles
async function explore() {
  await robot.init({ driver: 'mock', safety: { enabled: true } });
  
  for (let i = 0; i < 8; i++) {
    // Move forward until obstacle
    while (true) {
      const dist = await robot.sense.read('front');
      if (dist < 0.5) break;
      await robot.drive('forward', 0.5);
    }
    
    // Scan and report
    const img = await robot.look.capture();
    const desc = await robot.look.describe(img);
    await robot.speak.say(`Sector ${i}: ${desc}`);
    
    // Turn 45 degrees
    await robot.rotate(45);
  }
}
```

### Voice-Controlled Robot

```javascript
// Listen for commands and execute
async function voiceControl() {
  await robot.init();
  
  while (true) {
    const cmd = await robot.listen.record(5);
    
    if (cmd.includes('forward')) {
      await robot.drive('forward', 1);
    } else if (cmd.includes('turn')) {
      await robot.rotate(90);
    } else if (cmd.includes('stop')) {
      await robot.safety.engage();
    }
    
    await robot.speak.say('Command executed');
  }
}
```

## Security Considerations

- Safety monitor runs on independent event loop (cannot be blocked)
- All motion commands are validated before execution
- Watchdog timer prevents runaway behavior
- Emergency stop has hardware priority (overrides all software)
- Sensor data is sanity-checked (rejects impossible readings)
- Rate limiting prevents spam commands

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Safety always blocks movement | Check sensor wiring / mock sensor data |
| Robot doesn't move | Verify driver selection in config |
| Vision describe fails | Check Ollama is running with llava model |
| Audio not recording | Verify microphone device in config |
| E-stop won't reset | Check hardware E-stop switch position |

## Future Enhancements

- [ ] ROS2 NAV2 integration for SLAM mapping
- [ ] Multi-robot coordination
- [ ] Object tracking and following
- [ ] Gesture recognition
- [ ] Autonomous docking/charging
- [ ] Swarm behavior primitives

## Credits

Architecture inspired by [ZeroClaw Robot Kit](https://github.com/zeroclaw-labs/zeroclaw/tree/main/crates/robot-kit). Reimplemented in JavaScript/Node.js for PopeBot with additional features (independent safety thread, mock driver, expanded traits).
