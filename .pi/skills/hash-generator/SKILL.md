---
name: hash-generator
description: Generate cryptographic hashes including MD5, SHA-1, SHA-256, SHA-512, and checksums. Use when you need to hash strings or files for verification, integrity checks, or data fingerprinting.
---

# Hash Generator

Generate cryptographic hashes for strings and files.

## Supported Algorithms

- **MD5**: Fast, legacy (not secure for passwords)
- **SHA-1**: Secure hash algorithm (legacy)
- **SHA-256**: Standard secure hash (recommended)
- **SHA-512**: High security hash
- **Base64 encoding**: For hash output encoding

## Usage

```bash
# Hash a string
./scripts/hash.js --text "hello world" --algo sha256

# Hash a file
./scripts/hash.js --file ./document.txt --algo md5

# Multiple algorithms
./scripts/hash.js --text "data" --algo all

# Checksum comparison
./scripts/hash.js --file ./file.txt --verify "abc123..."
```

## Examples

| Task | Command |
|------|---------|
| SHA256 of string | `hash.js --text "secret" --algo sha256` |
| MD5 of file | `hash.js --file ./data.json --algo md5` |
| All algorithms | `hash.js --text "test" --algo all` |
| Verify checksum | `hash.js --file ./bin --verify "a1b2c3..."` |

## Output Formats

- hex (default)
- base64

## Security Note

- MD5/SHA-1 are for checksums only, not security
- Use SHA-256+ for security-sensitive operations