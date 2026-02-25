---
name: 1password
description: "Set up and use 1Password CLI (op). Use when installing the CLI, enabling desktop app integration, signing in (single or multi-account), or reading/injecting/running secrets via op."
homepage: https://developer.1password.com/docs/cli/get-started/
metadata:
  {
    "thepopebot":
      {
        "emoji": "🔐",
        "requires": { "bins": ["op"] },
      },
  }
---

# 1Password CLI

Use the 1Password CLI to manage and retrieve secrets.

## Setup

### Installation

**macOS:**
```bash
brew install --cask 1password-cli
# or
brew install 1password-cli
```

**Linux:**
```bash
curl -sS https://downloads.1password.com/linux/1password-release.key | gpg --dearmor > /tmp/1password-release-key.gpg
sudo mv /tmp/1password-release-key.gpg /usr/share/keyrings/
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/1password-release-key.gpg] https://downloads.1password.com/linux/debian/$(dpkg --print-architecture) stable main" | sudo tee /etc/apt/sources.list.d/1password.list
sudo apt update && sudo apt install 1password-cli
```

**Windows:**
```bash
winget install 1Password.CLI
```

## Usage

### Authentication

Sign in with 1Password app integration:
```bash
op signin
```

Sign in without app (using credentials):
```bash
op signin <account>
```

### Common Commands

**List vaults:**
```bash
op vault list
```

**List items in a vault:**
```bash
op item list --vault <vault-name>
```

**Get item details:**
```bash
op item get <item-name-or-id>
```

**Get password from an item:**
```bash
op item get <item-name> --field password
```

**Get username from an item:**
```bash
op item get <item-name> --field username
```

**Run command with secrets injected:**
```bash
op run -- <command-with-secrets>
```

**Create a new item:**
```bash
op item create --vault <vault-name> --category login --title "New Login"
```

### Secrets Injection

Instead of writing secrets to disk, use injection:
```bash
# Inject into environment
eval $(op signin)
op run --env-file - -- <command>
```

## Security Notes

- Never paste secrets into logs, chat, or code
- Prefer `op run` / `op inject` over writing secrets to disk
- If sign-in fails, re-run `op signin` and authorize in the app

## Quick Reference

| Command | Description |
|---------|-------------|
| `op signin` | Sign in to 1Password |
| `op whoami` | Show current user |
| `op vault list` | List all vaults |
| `op item list` | List items in vault |
| `op item get <id>` | Get item details |
| `op item get <id> --field password` | Get password field |
| `op run -- <cmd>` | Run command with secrets |
