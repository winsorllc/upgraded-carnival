---
name: ssh-tool
description: Execute commands on remote servers via SSH. Run commands on remote hosts with key-based authentication.
---

# SSH Tool

Execute commands on remote servers via SSH. Supports key-based authentication, tunnels, and file transfers.

## Setup

Requires SSH access to remote servers. Uses system SSH client.

## Usage

### Execute a Command

```bash
{baseDir}/ssh-tool.js --host server.example.com --user ubuntu --command "ls -la"
```

### With Key File

```bash
{baseDir}/ssh-tool.js --host server.example.com --user ubuntu --key /path/to/key --command "uptime"
```

### With Password

```bash
{baseDir}/ssh-tool.js --host server.example.com --user ubuntu --password "secret" --command "df -h"
```

### Interactive Shell

```bash
{baseDir}/ssh-tool.js --host server.example.com --user ubuntu --key /path/to/key --shell
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--host` | Remote hostname or IP | Yes |
| `--user` | SSH username | Yes |
| `--command` | Command to execute | Yes* |
| `--key` | Path to SSH private key | No |
| `--password` | SSH password | No |
| `--port` | SSH port (default: 22) | No |
| `--shell` | Start interactive shell | No |
| `--timeout` | Command timeout in seconds | No (default: 30) |

## When to Use

- Running commands on remote servers
- Deploying code to production
- Checking server status
- Remote administration tasks

## Notes

- Key-based authentication is recommended for automation
- The tool uses system SSH client with ControlMaster for connection reuse
- Supports both password and key-based authentication
