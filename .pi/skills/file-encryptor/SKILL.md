---
name: file-encryptor
description: Encrypt and decrypt files using AES-256-GCM encryption. Secure file protection with password-based key derivation. Inspired by ZeroClaw's secure-by-default architecture.
---

# File Encryptor

Encrypt and decrypt files using AES-256-GCM encryption.

## Features

- **Encrypt**: AES-256-GCM encryption with password
- **Decrypt**: Decrypt files with the correct password
- **Derive Keys**: PBKDF2 key derivation for security
- **Integrity**: GCM mode provides authentication
- **Output**: Encrypted files with .enc extension

## Usage

```bash
# Encrypt a file
./scripts/encrypt.js --input secret.txt --password "mypassword"

# Decrypt a file
./scripts/encrypt.js --decrypt --input secret.txt.enc --password "mypassword"

# Specify output file
./scripts/encrypt.js --input secret.txt --output secret.txt.enc --password "mypassword"

# Delete original after encryption
./scripts/encrypt.js --input secret.txt --password "mypassword" --delete-original
```

## Examples

| Task | Command |
|------|---------|
| Encrypt file | `./scripts/encrypt.js -i data.json -p "secret123"` |
| Decrypt file | `./scripts/encrypt.js -d -i data.json.enc -p "secret123"` |
| Custom output | `./scripts/encrypt.js -i file.txt -o encrypted.bin -p "pass"` |

## Output Format

Success:
```json
{
  "success": true,
  "operation": "encrypt",
  "input": "secret.txt",
  "output": "secret.txt.enc",
  "size_before": 1024,
  "size_after": 1048
}
```

Error:
```json
{
  "success": false,
  "error": "Decryption failed: incorrect password or corrupted file"
}
```

## Security Notes

- Uses AES-256-GCM for authenticated encryption
- PBKDF2 with 100,000 iterations for key derivation
- Random salt for each encryption
- GCM provides integrity checking
- Password is never stored
- Encrypted files include salt and auth tag

## Algorithm Details

1. Generate 16-byte random salt
2. Derive 256-bit key using PBKDF2 (SHA-256, 100k iterations)
3. Generate random 12-byte IV
4. Encrypt using AES-256-GCM
5. Store: salt + IV + ciphertext + authTag

## Warning

- Lost passwords cannot be recovered
- Keep backups of original files before encryption
- Use strong, unique passwords
- Verify decryption works before deleting originals
