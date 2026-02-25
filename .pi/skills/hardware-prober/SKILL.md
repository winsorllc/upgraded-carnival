---
name: hardware-prober
description: Probe system hardware information including CPU, memory, storage, and network interfaces. Shows detailed specs and configuration.
---

# Hardware Prober

Probe system hardware information and specs.

## Features

- **cpu**: CPU information (cores, frequency, architecture)
- **memory**: RAM information
- **storage**: Disk information
- **network**: Network interface info
- **all**: Complete system overview

## Usage

```bash
# CPU info
./scripts/hardware-probe.js --component cpu

# Memory
./scripts/hardware-probe.js --component memory

# Storage
./scripts/hardware-probe.js --component storage

# Network
./scripts/hardware-probe.js --component network

# Full system
./scripts/hardware-probe.js --component all
```

## Examples

| Task | Command |
|------|---------|
| CPU | `hardware-probe.js --component cpu` |
| Memory | `hardware-probe.js --component memory` |
| Storage | `hardware-probe.js --component storage` |
| Network | `hardware-probe.js --component network` |
| Full | `hardware-probe.js --component all` |

## Output

Shows:
- CPU: Model, cores, threads, frequency, architecture
- Memory: Total, free, used, type
- Storage: Disks, capacity, filesystem
- Network: Interfaces, MAC, IP addresses

## Notes

- Uses /proc and /sys filesystems
- Reports container-aware values when applicable