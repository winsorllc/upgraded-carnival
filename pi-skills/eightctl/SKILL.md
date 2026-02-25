---
name: eightctl
description: Control 8th Wall / ESPHome devices via CLI. Manage smart home devices, scenes, and automations.
metadata:
  {
    "openclaw": {
      "emoji": "🏠",
      "requires": { "env": ["EIGHTHOME_URL", "EIGHTHOME_TOKEN"] }
    }
  }
---

# Eight Control CLI

Control smart home devices via the Eighthome API.

## Configuration

```bash
export EIGHTHOME_URL="http://homeassistant.local:8123"
export EIGHTHOME_TOKEN="your-long-lived-token"
```

## Usage

List devices:

```bash
eightctl devices
eightctl devices --room living-room
```

Control device:

```bash
eightctl light on --entity light.living_room
eightctl light off --entity light.bedroom
eightctl switch toggle --entity switch.garage
```

Scenes:

```bash
eightctl scene list
eightctl scene activate movie-time
```

## Device Types

- Lights (on/off, brightness, color)
- Switches
- Thermostats
- Sensors (read only)
- Covers (blinds)
- Locks