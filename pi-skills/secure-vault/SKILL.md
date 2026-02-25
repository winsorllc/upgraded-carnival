---
name: secure-vault
description: Secure encrypted secrets storage with local key file protection. Use for storing API keys, passwords, and sensitive data with XOR + local key file encryption.
metadata:
  {
    "thepopebot":
      {
        "emoji": "🔐",
        "os": ["linux", "darwin"],
        "requires": { "files": [".vault.key"] },
        "install": []
      }
  }
---

# Secure Vault

Store and retrieve secrets securely using encrypted storage with local key file protection.

## Overview

The secure vault provides:
- **XOR encryption**: Simple but effective encryption with local key
- **Key file protection**: Master key stored in local file (not in repo)
- **Multiple vaults**: Separate vaults for different purposes
- **Environment integration**: Export secrets as environment variables

## Setup

### Generate Master Key

```bash
vault init
# Creates .vault.key in your home directory
```

### Or use custom key location

```bash
vault init --key /secure/path/keyfile
```

## Usage

### Store a Secret

```bash
vault set openai_api_key sk-xxx
vault set database_url postgres://user:pass@host/db
vault set --vault production github_token ghp_xxx
```

### Get a Secret

```bash
vault get openai_api_key
vault get --vault production github_token
```

### List Secrets (names only)

```bash
vault list
vault list --vault production
```

### Delete a Secret

```bash
vault delete openai_api_key
```

### Export as Environment Variables

```bash
# Export to current shell
eval $(vault export)

# Export to file
vault export > .env.secrets
```

### Rotate Master Key

```bash
vault rotate
```

## API Usage

```javascript
const { SecureVault } = require('./index.js');

// Initialize vault
const vault = new SecureVault({
  keyFile: '.vault.key',
  vaultFile: '.vault.enc'
});

// Store secret
await vault.set('api_key', 'secret-value');

// Retrieve secret
const value = await vault.get('api_key');

// List secrets
const secrets = await vault.list();
```

## Security Notes

- The master key file (`.vault.key`) should NOT be committed to git
- Add `.vault.key` and `*.enc` to your `.gitignore`
- For production, consider using proper secret managers (1Password, AWS Secrets Manager)
- The XOR encryption is suitable for local development and testing

## Files

| File | Description |
|------|-------------|
| `.vault.key` | Master encryption key (keep private) |
| `.vault.enc` | Encrypted secrets database |
| `.vault.lock` | Lock file to prevent concurrent access |

## Notes

- Vault is locked after 3 failed unlock attempts
- Use `vault lock` to manually lock the vault
- Back up your key file - lost key means lost secrets!
