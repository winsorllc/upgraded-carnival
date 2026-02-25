---
name: jwt-decoder
description: Decode, verify, and inspect JSON Web Tokens (JWT). Extract header and payload without verification, check signatures, and validate expiration.
---

# JWT Decoder

Decode, inspect, and validate JSON Web Tokens (JWT).

## Features

- **Decode**: Extract header and payload (Base64 decoding)
- **Verify**: Check signature with secret/key
- **Validate**: Check expiration (exp), issued at (iat), not before (nbf)
- **Inspect**: Show all claims and metadata
- **Debug**: Handle malformed tokens gracefully

## Usage

```bash
# Decode a JWT (no verification)
./scripts/jwt.js --token "eyJhbGci..."

# Verify signature
./scripts/jwt.js --token "eyJhbGci..." --secret "my-secret"

# Decode with verification
./scripts/jwt.js --token "eyJhbGci..." --secret "my-secret" --verify

# Check validation (exp, nbf)
./scripts/jwt.js --token "eyJhbGci..." --validate

# Pretty print output
./scripts/jwt.js --token "eyJhbGci..." --pretty
```

## Examples

| Task | Command |
|------|---------|
| Decode JWT | `./scripts/jwt.js --token "eyJ..."` |
| Verify signature | `./scripts/jwt.js --token "eyJ..." --secret "secret" --verify` |
| Check expiration | `./scripts/jwt.js --token "eyJ..." --validate` |
| Full inspection | `./scripts/jwt.js --token "eyJ..." --secret "secret" --verify --validate --pretty` |

## Output Format

```json
{
  "valid": true,
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "1234567890",
    "name": "John Doe",
    "iat": 1516239022,
    "exp": 1516242622
  },
  "verification": {
    "signature_valid": true,
    "algorithm": "HS256"
  },
  "validation": {
    "expired": false,
    "expires_at": "2023-01-18T12:30:22.000Z",
    "valid_at": "2023-01-18T11:30:22.000Z"
  },
  "signature": "SflKxwRJSMeKKF2QT4fwpMe..."
}
```

## Claims Reference

| Claim | Meaning |
|-------|---------|
| `iss` | Issuer |
| `sub` | Subject |
| `aud` | Audience |
| `exp` | Expiration Time |
| `nbf` | Not Before |
| `iat` | Issued At |
| `jti` | JWT ID |

## Supported Algorithms

| Algorithm | Type |
|-----------|------|
| HS256 | HMAC with SHA-256 |
| HS384 | HMAC with SHA-384 |
| HS512 | HMAC with SHA-512 |

## Notes

- Decoding does NOT verify the signature - use `--verify` for that
- Expiration checking requires current system time
- Supports RFC 7519 standard JWT format
