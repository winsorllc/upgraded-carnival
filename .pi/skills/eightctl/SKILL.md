---
name: eightctl
description: Control Eight Sleep pods (status, temperature, alarms, schedules). Use when you need to adjust bed temperature, set alarms, or check sleep pod status.
---

# eightctl

Control Eight Sleep pods from the command line.

## Install

```bash
go install github.com/steipete/eightctl/cmd/eightctl@latest
```

## Auth

```bash
# Config file: ~/.config/eightctl/config.yaml
# Or environment variables:
export EIGHTCTL_EMAIL="you@example.com"
export EIGHTCTL_PASSWORD="your-password"
```

## Quick Start

```bash
# Check status
eightctl status

# Turn pod on/off
eightctl on
eightctl off

# Set temperature (Celsius)
eightctl temp 20
```

## Alarms

```bash
# List alarms
eightctl alarm list

# Create alarm
eightctl alarm create --time "07:00" --days Mon,Tue,Wed,Thu,Fri

# Dismiss alarm
eightctl alarm dismiss <alarm-id>
```

## Schedules

```bash
# List schedules
eightctl schedule list

# Create schedule
eightctl schedule create --start "22:00" --end "06:00"

# Update schedule
eightctl schedule update <id> --start "21:00"
```

## Audio

```bash
# Audio state
eightctl audio state

# Play/pause
eightctl audio play
eightctl audio pause
```

## Base Control

```bash
# Base info
eightctl base info

# Set angle
eightctl base angle 45
```

## Notes

- Unofficial API - rate limited, avoid repeated logins
- Confirm before changing temperature or alarms
- Temperature in Celsius
