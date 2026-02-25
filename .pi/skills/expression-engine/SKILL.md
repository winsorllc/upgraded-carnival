---
name: expression-engine
description: Visual expression controller for status displays, LEDs, and notification states. Inspired by ZeroClaw's Emote tool for robot expressions.
---

# Expression Engine

Visual expression controller for status displays, LEDs, and notification states. Inspired by ZeroClaw's Emote tool.

## Capabilities

- LED pattern generation
- Status indicators
- Visual notifications
- ASCII art expressions
- Color-coded status messages

## Expressions

- happy, sad, surprised, thinking
- excited, love, angry, confused
- working, waiting, error, success

## Usage

```bash
# Display an expression
/job/.pi/skills/expression-engine/express.js happy

# Create LED pattern
/job/.pi/skills/expression-engine/led-pattern.js --expression excited --output led.json

# Status notification
/job/.pi/skills/expression-engine/status.js --state working --message "Processing..."

# ASCII art display
/job/.pi/skills/expression-engine/ascii.js thinking
```

## When to Use

- Status indication
- Progress visualization
- User feedback
- Notification styling
- Terminal UI enhancement

## Inspired By

- ZeroClaw Emote tool (LED matrix patterns)
