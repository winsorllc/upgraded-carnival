---
name: 1password
description: Access and manage 1Password secrets via CLI. Use when: (1) retrieving passwords, API keys, or credentials, (2) injecting secrets into environment variables, (3) running commands with secrets, (4) listing vaults and items.
---

# 1Password Skill

Access and manage 1Password secrets via the `op` CLI.

## When to Use

✅ **USE this skill when:**
- Retrieving passwords, API keys, or credentials
- Injecting secrets into environment variables
- Running commands with secrets
- Listing vaults and items

❌ **DON'T use this skill when:**
- Creating new secrets → use 1Password app directly
- Complex secret management → use 1Password app

## Setup

### Install 1Password CLI

**macOS:**
```bash
brew install --cask 1password-cli
```

**Linux:**
```bash
# Add 1Password repository
curl -sS https://downloads.1password.com/linux/keys/1password.asc | gpg --dearmor > /tmp/1password.gpg
sudo mv /tmp/1password.gpg /etc/apt/trusted.gpg.d/
echo "deb [arch=amd64] https://downloads.1password.com/linux/debian stable main" | sudo tee /etc/apt/sources.list.d/1password.list
sudo apt update && sudo apt install 1password-cli
```

### Sign In

```bash
# Sign in with your 1Password account
op signin

# Or with a specific account
op signin my.1password.com
```

## Common Commands

### List Vaults

```bash
# List all vaults
op vault list

# Get vault details
op vault get "Personal"
```

### List Items

```bash
# List items in a vault
op item list --vault "Personal"

# Search for items
op item list --query "AWS"
```

### Get Item Details

```bash
# Get item by name
op item get "AWS Production" --vault "Work"

# Get specific field
op item get "API Key" --fields password
```

### Get Password

```bash
# Get password for an item
op item get "GitHub" --vault "Work" --attributes password

# Copy password to clipboard (macOS)
op item get "GitHub" --attributes password | pbcopy
```

### Environment Variables

```bash
# Inject secrets into environment
eval $(op env "MyApp")

# Run command with secrets
op run --env-file=.env -- your-command.sh
```

### Run with Secrets

```bash
# Run a command with secrets loaded
op run -- "npm run deploy"

# With specific environment variables
op run --env OP_API_KEY="item:API Keys/GitHub" -- your-script.sh
```

## Scripting Examples

### Get API Key

```bash
#!/bin/bash
# Get API key from 1Password
op item get "API Keys/GitHub" --vault "Work" --attributes password
```

### Use in .env File

```bash
#!/bin/bash
# Generate .env file from 1Password
cat > .env << EOF
DATABASE_URL=$(op item get "Database" --attributes password)
API_KEY=$(op item get "API Key" --attributes password)
EOF
```

### AWS Credentials

```bash
#!/bin/bash
# Get AWS credentials
AWS_ACCESS_KEY=$(op item get "AWS" --attributes username)
AWS_SECRET_KEY=$(op item get "AWS" --attributes password)

export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_KEY"
```

## Notes

- Requires 1Password CLI (`op`) installed and signed in
- Use `--vault` to specify which vault to use
- Use `--format json` for structured output
- Secrets are printed to stdout - be careful with logging!
- The `op run` command automatically handles secret injection
