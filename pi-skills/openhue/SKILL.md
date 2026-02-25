---
name: openhue
description: Control Philips Hue lights and scenes via OpenHue CLI. Use when: user wants to turn on/off lights, adjust brightness, set colors, activate scenes, or control smart lighting by room/zone.
metadata:
  requires:
    bins: ["openhue"]
  install:
    - id: brew
      kind: brew
      formula: openhue/cli/openhue-cli
      bins: ["openhue"]
      label: Install OpenHue CLI (brew)
---

# OpenHue CLI

Control Philips Hue lights and scenes via the official OpenHue CLI. Manage individual lights, rooms, zones, and scenes with simple commands.

## When to Use

✅ **USE this skill when:**
- "Turn on/off the lights"
- "Dim the living room lights"
- "Set a scene" or "movie mode"
- Controlling specific Hue rooms or zones
- Adjusting brightness, color, or color temperature
- Creating lighting automations

❌ **DON'T use this skill when:**
- Non-Hue smart devices (other brands) → not supported
- HomeKit scenes or Shortcuts → use Apple Home app
- TV or entertainment system control
- Thermostat or HVAC
- Smart plugs (unless Hue smart plugs)

## Installation

```bash
# Install via Homebrew
brew install openhue/cli/openhue-cli

# Verify installation
openhue --version
```

## Setup

### Bridge Discovery

```bash
# Discover Hue Bridge on network
openhue get bridge

# Or specify bridge IP
openhue get bridge --ip 192.168.1.100
```

### Authentication

First-time setup requires pressing the link button on your Hue Bridge:

```bash
openhue config setup
```

Follow the prompts to:
1. Press the link button on your Hue Bridge
2. Create a new API user
3. Save configuration

## Common Commands

### List Resources

```bash
openhue get light       # List all lights
openhue get room        # List all rooms  
openhue get zone        # List all zones
openhue get scene       # List all scenes
openhue get group       # List all groups
```

### Control Individual Lights

```bash
# Turn on/off
openhue set light "Bedroom Lamp" --on
openhue set light "Bedroom Lamp" --off

# Brightness (0-100)
openhue set light "Bedroom Lamp" --on --brightness 50

# Dim/brighten
openhue set light "Bedroom Lamp" --brightness +10
openhue set light "Bedroom Lamp" --brightness -10

# Color temperature (warm to cool: 153-500 mirek)
openhue set light "Bedroom Lamp" --on --temperature 300

# Warmer (lower mirek = warmer)
openhue set light "Bedroom Lamp" --temperature +50

# Cooler (higher mirek = cooler)
openhue set light "Bedroom Lamp" --temperature -50

# Color (by name or hex)
openhue set light "Bedroom Lamp" --on --color red
openhue set light "Bedroom Lamp" --on --color blue
openhue set light "Bedroom Lamp" --on --rgb "#FF5500"
```

### Control Rooms

```bash
# Turn off entire room
openhue set room "Bedroom" --off

# Turn on with brightness
openhue set room "Living Room" --on --brightness 80

# Set color for all lights in room
openhue set room "Bedroom" --on --color "#4A90D9" --brightness 40

# Scene activation
openhue set room "Living Room" --scene "Relax"
```

### Control Zones

```bash
# Zones group multiple rooms
openhue set zone "Downstairs" --on
openhue set zone "Downstairs" --brightness 60
openhue set zone "Downstairs" --off
```

### Scenes

```bash
# List all scenes
openhue get scene

# Activate scene
openhue set scene "Relax" --room "Bedroom"
openhue set scene "Concentrate" --room "Office"
openhue set scene "Energize" --room "Kitchen"

# Set scene with brightness override
openhue set scene "Relax" --room "Bedroom" --brightness 30
```

### Groups

```bash
# List groups
openhue get group

# Control group
openhue set group "Group Name" --on
openhue set group "Group Name" --off
```

## Quick Presets

```bash
# Bedtime (dim warm lights)
openhue set room "Bedroom" --on --brightness 20 --temperature 450

# Wake up (bright cool lights)
openhue set room "Bedroom" --on --brightness 100 --temperature 153

# Movie mode (dark blue)
openhue set room "Living Room" --on --color "#1A1A4E" --brightness 15

# Reading (bright neutral)
openhue set room "Study" --on --brightness 80 --temperature 300

# Party (colorful)
openhue set room "Living Room" --on --color "#FF0080" --brightness 70

# Work mode (focus)
openhue set scene "Concentrate" --room "Office"

# Relax mode
openhue set scene "Relax" --room "Living Room"
```

## Color Reference

### Color Names
- red, orange, yellow, green, blue, purple, pink
- cyan, magenta, lime, teal, navy
- white, warm-white, cool-white

### Color Temperature (Mirek Scale)
- 153 (6500K) - Coolest (daylight)
- 200 (5000K) - Cool white
- 300 (3300K) - Neutral white
- 400 (2500K) - Warm white
- 454 (2200K) - Warmest (candlelight)

### Hex Colors
```
#FF0000 - Red
#00FF00 - Green
#0000FF - Blue
#FFFF00 - Yellow
#00FFFF - Cyan
#FF00FF - Magenta
#FFA500 - Orange
#800080 - Purple
#FFC0CB - Pink
#4A90D9 - Soft Blue
#FFB6C1 - Soft Pink
#90EE90 - Soft Green
```

## Advanced Usage

### Effects

```bash
# Color loop (cycle through colors)
openhue set light "Party Light" --on --alert "select"

# Alert (flash once)
openhue set light "Living Room" --alert "select"

# Alert (flash multiple times)
openhue set light "Living Room" --alert "lselect"
```

### Multiple Lights

```bash
# Control by exact name
openhue set light "Hue White 1" --on
openhue set light "Hue Color 2" --on --color red

# Use wildcards (if supported)
openhue set light "Bedroom*" --off
```

### JSON Output (for scripting)

```bash
# Get lights as JSON
openhue get light --json

# Parse with jq
openhue get light --json | jq '.[] | select(.on == true)'

# Get room details
openhue get room "Living Room" --json
```

### Brightness Ramping

```bash
# Gradual changes (if supported by your version)
openhue set room "Bedroom" --brightness 50 --duration 5
```

## Integration Examples

### Morning Routine

```bash
# Gradually turn on bedroom lights
openhue set room "Bedroom" --on --brightness 30 --temperature 350
echo "Good morning! Lights are on."
```

### Leaving Home

```bash
# Turn off all lights
openhue set room "Bedroom" --off
openhue set room "Living Room" --off
openhue set room "Kitchen" --off
openhue set room "Office" --off
echo "All lights off. Have a great day!"
```

### Movie Time

```bash
# Set movie atmosphere
openhue set room "Living Room" --on --color "#1A1A4E" --brightness 20
openhue set light "TV Backlight" --on --color "#4A0080" --brightness 30
```

### Bedtime

```bash
# Dim lights for sleep
openhue set room "Bedroom" --on --brightness 15 --temperature 450
# Then turn off after delay
sleep 300  # 5 minutes
openhue set room "Bedroom" --off
```

### Welcome Home

```bash
# Turn on entry and living room
openhue set room "Entryway" --on --brightness 80
openhue set room "Living Room" --on --brightness 60
```

## Troubleshooting

### Bridge Not Found

```bash
# Check network connectivity
ping 192.168.1.100

# Rediscover bridge
openhue get bridge

# Check bridge IP in config
openhue config show
```

### Authentication Failed

```bash
# Re-authenticate
openhue config setup

# Make sure to press the link button on the bridge
```

### Light Not Responding

```bash
# Check if light is reachable
openhue get light --json | jq '.[] | select(.name == "Problem Light")'

# Power cycle the light
# Turn off at wall switch, wait 5 seconds, turn back on
```

### Scene Not Working

```bash
# Verify scene exists
openhue get scene | grep "Scene Name"

# Check room exists
openhue get room | grep "Room Name"

# Try activating scene differently
openhue set room "Room Name" --scene "Scene Name"
```

## Best Practices

1. **Use Rooms**: Group lights by room for easier control
2. **Name Lights Clearly**: Use descriptive names like "Desk Lamp" not "Light 3"
3. **Favorite Scenes**: Identify scenes you use often for quick access
4. **Automations**: Consider Hue app for time-based automations
5. **Zones**: Use zones to control multiple rooms together

## Security Notes

- Hue Bridge uses local network only (no cloud required)
- API keys are stored locally in configuration
- Keep Bridge firmware updated
- Use guest network for IoT devices if concerned about security

## Examples

### Daily Schedules

```bash
# Morning (7 AM)
openhue set room "Bedroom" --on --brightness 50 --temperature 300

# Work hours (9 AM)
openhue set scene "Concentrate" --room "Office"

# Evening (6 PM)
openhue set room "Living Room" --on --brightness 70 --temperature 350

# Night (10 PM)
openhue set room "Bedroom" --on --brightness 20 --temperature 450
```

### Party Mode

```bash
# Colorful party lights
openhue set room "Living Room" --on --color "#FF0080" --brightness 80
openhue set room "Kitchen" --on --color "#00FF80" --brightness 70
```

### Focus Mode

```bash
# Deep work lighting
openhue set scene "Concentrate" --room "Office"
openhue set room "Living Room" --off
```

## References

- [OpenHue CLI Documentation](https://www.openhue.io/cli)
- [Philips Hue Developer API](https://developers.meethue.com/)
- [Hue Mirek Color Temperature](https://developers.meethue.com/develop/application-design-guidance/color-conversion-formulas-rgb-to-xy-and-back/)
