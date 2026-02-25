---
name: 1password-cli
description: "1Password CLI (op) for secrets management. Use for reading, creating, and managing 1Password secrets, vault items, and credentials."
metadata:
  {
    "openclaw": {
      "emoji": "🔐",
      "requires": { "bins": ["op"] },
      "install": [
        {
          "id": "brew",
          "kind": "brew",
          "formula": "1password-cli",
          "label": "Install 1Password CLI (brew)"
        }
      ]
    }
  }
---

# 1Password CLI

Manage secrets and credentials via 1Password.

## When to Use

✅ **USE this skill when:**

- Need to read secrets from 1Password
- Create or update vault items
- Manage 1Password vaults
- Sign in to 1Password

## When NOT to Use

❌ **DON'T use this skill when:**

- No 1Password account → use other secrets management
- Need to inject secrets into environment (use llm-secrets skill)

## Setup

### Installation

```bash
# macOS
brew install --cask 1password-cli
# or
brew install 1password-cli

# Linux
curl -sS https://downloads.1password.com/linux/keys/1password.asc | \
  sudo gpg --dearmor --output /usr/share/keyrings/1password-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/1password-archive-keyring.gpg] https://downloads.1password.com/linux/debian/$(dpkg --print-architecture) stable main" | \
  sudo tee /etc/apt/sources.list.d/1password.list
sudo apt update && sudo apt install 1password-cli
```

### Sign In

```bash
# Interactive sign in
op signin

# Sign in to specific instance
op signin <subdomain>.1password.com

# Use environment variable (for CI/CD)
export OP_SESSION_my=<session-token>
```

## Usage

### Read Secrets

```bash
# Get item by name
op read "my-vault/Login"

# Get specific field
op read "my-vault/Login" --fields password

# Get password only
op item get "my-vault/Login" --format json | jq '.password'
```

### List Items

```bash
# List all vaults
op vault list

# List items in vault
op item list --vault "Personal"

# Search items
op item list --tags "production"
```

### Create Items

```bash
# Create login item
op item create \
  --vault "Personal" \
  --category "Login" \
  --title "GitHub" \
  --url "https://github.com" \
  --username "user@example.com" \
  --password "secret-password"

# Create note
op item create \
  --vault "Personal" \
  --category "SecureNote" \
  --title "Server Notes" \
  --note "Server access details"
```

### Edit Items

```bash
# Update password
op item edit "GitHub" --password "new-password"

# Add field
op item edit "GitHub" --label "API Token" --value "xxx"
```

### Delete Items

```bash
op item delete "GitHub"
```

### Document Management

```bash
# Attach file
op document attach "my-item" --file /path/to/file.pdf

# Get document
op document get "my-file.pdf" --output /tmp/
```

## Commands

### signin

Sign in to 1Password.

```bash
op signin [instance]
op signin --sso  # SSO sign in
op signin --raw  # Output session token only
```

### vault

Manage vaults.

```bash
op vault list
op vault create "New Vault"
op vault delete "Vault Name"
```

### item

Manage items.

```bash
op item list [--vault VAULT]
op item get ITEM [--format json]
op item create [--vault VAULT] [--category TYPE] [--title NAME]
op item edit ITEM [--field VALUE]...
op item delete ITEM
```

### read

Read item fields.

```bash
op read ITEM [--fields FIELD]
op read ITEM --fields password,username
```

### document

Manage document attachments.

```bash
op document list
op document attach ITEM --file PATH
op document get NAME --output DIR
```

## Examples

### Get database password

```bash
DB_PASS=$(op read "Production/Database" --fields password)
```

### Create API key item

```bash
op item create \
  --vault "Secrets" \
  --category "Login" \
  --title "AWS API Key" \
  --url "https://aws.amazon.com" \
  --username "AKIAIOSFODNN7EXAMPLE" \
  --password "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

### List all passwords

```bash
op item list --category "Login" --format json | jq '.[].title'
```

## Notes

- Session expires after 30 minutes of inactivity
- Use `op signin --raw` for CI/CD automation
- Supports 2FA/Okta/SSO sign in
- Items can have custom fields beyond standard fields
- Use `--vault` flag to specify vault explicitly
