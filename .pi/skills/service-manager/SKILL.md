---
name: service-manager
description: Manage system services via systemd (Linux) or launchd (macOS) for background daemon management.
---

# Service Manager Skill

Manage system services for background daemon management. Supports systemd (Linux) and launchd (macOS), inspired by ZeroClaw's service management.

## Setup

No additional setup required. Requires appropriate permissions for system service management.

## Usage

### List all services

```bash
{baseDir}/service-manager.js list
```

### Check service status

```bash
{baseDir}/service-manager.js status <service-name>
```

### Start a service

```bash
{baseDir}/service-manager.js start <service-name>
```

### Stop a service

```bash
{baseDir}/service-manager.js stop <service-name>
```

### Restart a service

```bash
{baseDir}/service-manager.js restart <service-name>
```

### Enable service on boot

```bash
{baseDir}/service-manager.js enable <service-name>
```

### Disable service on boot

```bash
{baseDir}/service-manager.js disable <service-name>
```

### Create a new service

```bash
{baseDir}/service-manager.js create my-service --command "/usr/bin/node /path/to/app.js" --user node --working-dir /path/to
```

### Remove a service

```bash
{baseDir}/service-manager.js remove <service-name>
```

### View service logs

```bash
{baseDir}/service-manager.js logs <service-name> --lines 50
```

## Configuration

Service creation options:

| Option | Description | Default |
|--------|-------------|---------|
| `--command` | Executable command | required |
| `--user` | User to run as | current user |
| `--working-dir` | Working directory | / |
| `--env` | Environment variables | - |
| `--restart` | Restart policy (on-failure, always, etc.) | on-failure |
| `--after` | Services to start after | network.target |

## Service Types

- **systemd**: Linux systems (Ubuntu, Debian, Fedora, etc.)
- **launchd**: macOS systems
- **OpenRC**: Alpine Linux (basic support)

## Example Use Cases

- Install and manage custom daemons
- Set up scheduled services
- Configure auto-restart policies
- Manage third-party applications as services
