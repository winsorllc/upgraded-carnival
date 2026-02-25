---
name: gateway-pairing
description: Device pairing with 6-digit OTP and bearer tokens. Inspired by ZeroClaw's gateway pairing system with constant-time comparison.
---

# Gateway Pairing

Device pairing with 6-digit OTP and bearer tokens. Inspired by ZeroClaw's gateway pairing system with constant-time comparison.

## Setup

No additional setup required. Uses SQLite for persistent pairing storage.

## Usage

### Initiate Pairing (Server Side)

```bash
{baseDir}/gateway-pairing.js initiate --device-id "device-123"
```

### Verify OTP (Client Side)

```bash
{baseDir}/gateway-pairing.js verify --device-id "device-123" --otp "123456"
```

### Generate Bearer Token

```bash
{baseDir}/gateway-pairing.js token --device-id "device-123" --expires-in 86400
```

### Validate Bearer Token

```bash
{baseDir}/gateway-pairing.js validate --token "bearer_token_xxx"
```

### List Paired Devices

```bash
{baseDir}/gateway-pairing.js list
```

### Revoke Device

```bash
{baseDir}/gateway-pairing.js revoke --device-id "device-123"
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--device-id` | Unique device identifier | Required |
| `--otp` | 6-digit one-time password | - |
| `--token` | Bearer token to validate | - |
| `--expires-in` | Token expiration in seconds | 86400 (24h) |
| `--name` | Device friendly name | - |

## Security Features

- **6-digit OTP**: Time-limited one-time passwords
- **Constant-time comparison**: Timing attack resistant
- **Token expiration**: Automatic token expiry
- **Device revocation**: Manual device unpairing
- **Bearer token auth**: Standard bearer token validation

## OTP Generation

- 6 numeric digits
- 5 minute validity window
- Single-use (consumed on verification)

## Response Format

```json
{
  "success": true,
  "deviceId": "device-123",
  "otp": "123456",
  "expiresAt": "2026-02-25T14:00:00Z"
}
```

## When to Use

- Pairing mobile/web clients with gateway
- Device authentication for messaging
- Secure API access token generation
- Multi-device session management
- Initial device registration flow
