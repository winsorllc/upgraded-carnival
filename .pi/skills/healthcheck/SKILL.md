---
name: healthcheck
description: Host security hardening and risk assessment for machine deployments. Use when user asks for security audits, firewall/SSH hardening, risk posture, exposure review, or version status checks.
---

# Host Hardening & Security

## Overview

Assess and harden the host machine, align it to a user-defined risk tolerance without breaking access.

## Core Rules

- Recommend using a state-of-the-art model (e.g., Opus, GPT-4.5+). Self-check current model.
- Require explicit approval before any state-changing action.
- Do not modify remote access settings without confirming how the user connects.
- Prefer reversible, staged changes with a rollback plan.
- Formatting: present numbered choices so user can reply with a single digit.
- System-level backups are recommended.

## Workflow

### 1) Establish Context (Read-only)

Determine (infer where possible):

1. OS and version (Linux/macOS/Windows), container vs host
2. Privilege level (root/admin vs user)
3. Access path (local console, SSH, RDP, tailnet)
4. Network exposure (public IP, reverse proxy, tunnel)
5. Backup system and status
6. Disk encryption status (FileVault/LUKS/BitLocker)
7. OS automatic security updates status

Ask once for permission to run read-only checks. Keep permission ask as a single sentence.

### 2) Risk Profile Selection

Present numbered options for risk tolerance:

1. **High Security** - Strict firewall, SSH key-only, automatic updates, minimal exposure
2. **Balanced** - Reasonable defaults, some convenience
3. **Developer** - More flexibility, tools, local access
4. **Minimal** - User knows best, recommend only obvious issues

### 3) Run Checks

After approval, run hardening checks:

```bash
# Check OS version
uname -a
sw_vers  # macOS
cat /etc/os-release  # Linux

# Check open ports
sudo lsof -i -P -n
netstat -tulpn  # Linux

# Check firewall status
sudo ufw status  # Ubuntu
sudo iptables -L  # Linux
sudo pfctl -s all  # macOS

# Check SSH config
sudo grep -E "^PermitRootLogin|^PubkeyAuthentication|^PasswordAuthentication" /etc/ssh/sd_config

# Check recent logins
last
sudo lastlog

# Check disk encryption
sudo diskutil list  # macOS
sudo cryptsetup luksDump /dev/sda5  # Linux

# Check automatic updates
sudo softwareupdate -l  # macOS
sudo apt-get -s upgrade  # Linux
```

### 4) Present Findings

Format as:
- **Critical** - Immediate action required
- **Warning** - Consider addressing
- **Info** - FYI

Include reversible recommendations with rollback steps.

## Common Hardening Steps

### SSH Hardening

```bash
# Disable password auth
sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Disable root login
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Use SSH keys only
```

### Firewall

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable

# macOS
sudo pfctl -e
```

### Automatic Updates

```bash
# Ubuntu
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# macOS
sudo softwareupdate --schedule on
```

## Never Do Without Explicit Approval

- Change firewall rules
- Modify SSH settings
- Disable services
- Update system packages
- Reboot the machine
