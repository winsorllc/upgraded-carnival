---
name: nostr-integration
description: Send and receive decentralized messages via Nostr protocol - supports NIP-04 (encrypted DMs) and NIP-17 (relays).
---

# Nostr Integration Skill

Send and receive decentralized messages using the Nostr protocol. Supports NIP-04 encrypted DMs, NIP-17 relay management, and public note publishing. Inspired by ZeroClaw's Nostr channel support.

## Setup

1. Generate a Nostr key pair:
   ```bash
   {baseDir}/nostr-integration.js generate-key
   ```

2. Configure environment:
   ```bash
   export NOSTR_PRIVATE_KEY="nsec1..."
   export NOSTR_RELAYS="wss://relay.damus.io,wss://nos.lol"
   ```

## Usage

### Generate a new key pair

```bash
{baseDir}/nostr-integration.js generate-key
```

### Send a public note

```bash
{baseDir}/nostr-integration.js publish "Hello, Nostr!"
```

### Send an encrypted DM

```bash
{baseDir}/nostr-integration.js dm <npub-or-hex-pubkey> "Secret message"
```

### Subscribe to events

```bash
{baseDir}/nostr-integration.js subscribe --kind 1 --limit 10
```

### List configured relays

```bash
{baseDir}/nostr-integration.js relays
```

### Add a relay

```bash
{baseDir}/nostr-integration.js add-relay wss://relay.example.com
```

### Remove a relay

```bash
{baseDir}/nostr-integration.js remove-relay wss://relay.example.com
```

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `NOSTR_PRIVATE_KEY` | Your Nostr private key (nsec...) | - |
| `NOSTR_PUBLIC_KEY` | Your Nostr public key (npub...) | derived from private key |
| `NOSTR_RELAYS` | Comma-separated relay URLs | wss://relay.damus.io |
| `NOSTR_RELAY_TIMEOUT` | Connection timeout (ms) | 5000 |

## Supported NIPs

| NIP | Feature | Status |
|-----|---------|--------|
| 01 | Basic protocol | ✓ |
| 02 | Contact list | ✓ |
| 04 | Encrypted DMs | ✓ |
| 09 | Event deletion | ✓ |
| 10 | Reaction events | ✓ |
| 17 | Relay list | ✓ |

## Security

- Private keys never leave the process
- DMs are encrypted using NIP-04 (AES-256-GCM with Schnorr signatures)
- Keys are stored securely in config file with proper permissions

## Example Use Cases

- Decentralized notifications without single point of failure
- Encrypted communication for sensitive tasks
- Alternative to Telegram/Discord for critical alerts
