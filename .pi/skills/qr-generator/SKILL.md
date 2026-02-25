---
name: qr-generator
description: Generate QR codes for URLs, text, WiFi, contact cards, contact info, and more. ASCII art output and saves to files. Inspired by OpenClaw's text generation capabilities.
---

# QR Generator

Generate QR codes for various data types.

## Features

- **Text**: Generate QR codes for any text
- **URL**: QR codes that link to websites
- **WiFi**: WiFi connection QR codes
- **Contact**: vCard QR codes
- **Email**: Email QR codes
- **Phone**: Call/tel QR codes
- **Output**: ASCII art or save to PNG

## Usage

```bash
# Basic text QR
./scripts/qr.js "Hello World"

# URL QR
./scripts/qr.js --type url "https://example.com"

# WiFi QR
./scripts/qr.js --type wifi --ssid "MyNetwork" --password "secret123"

# Contact QR
./scripts/qr.js --type contact --name "John Doe" --phone "555-123-4567" --email "john@example.com"

# Save to file
./scripts/qr.js "Hello" --output qrcode.txt
```

## Examples

| Task | Command |
|------|---------|
| Simple text | `./scripts/qr.js "Hello World"` |
| URL | `./scripts/qr.js -t url "https://github.com"` |
| WiFi | `./scripts/qr.js -t wifi -s MySSID -p password` |
| Contact | `./scripts/qr.js -t contact -n "John Doe" -p "555-1234"` |
| Email | `./scripts/qr.js -t email -a "test@example.com" -s "Subject"` |
| Phone | `./scripts/qr.js -t tel "+1234567890"` |

## Output Format

```
███████████████████████████
██ ▄▄▄▄▄ █▀▄▀▀ ▀▄▀▄█ ▄▄▄▄▄ ██
██ █   █ ██▄█▀█▀ ▀█ █   █ ██
██ █▄▄▄█ █▀▀▀▀▄▀▄▀█ █▄▄▄█ ██
██▄▄▄▄▄▄▄█▄▀▄▀ █▀▄█▄▄▄▄▄▄▄██
██▄ █▄ █▄▀▀ ▀██▄▀▄██▀██ █ ██
██▀██ ▀█▄█▄▀▄▀ ▀▀▀█▄▄██▀▀▀██
██▀▄▄▀▀ ▄▄▀▄▀ █▀ ▄▄█▀▄▀█ ▄██
██▄ ▀█▄▀▀ █▀██ ██ ▄▄▄██▀ ▄██
██ ▀ ▄▀ ▄█▄█▄▀ ▀▀ ▀▀ ▄█▀█▀██
██▄██████▄▄ █▄ ▀ ▄█ ▄▄▄ █▀▀█
██ ▄▄▄▄▄ ██▄▄▀█▄▀▄█ █▄█ █▄██
██ █   █ ▄▄▀█ ▀▄█▄█ ▄▄▄▀▄███
██ █▄▄▄█ █▄▄█▄█▀▄▀▄ ▄█▄▀▀▄██
██▄▄▄▄▄▄▄█▄██▄▄▄██▄█▄██▄███
███████████████████████████
```

## QR Code Types

| Type | Data Format |
|------|-------------|
| text | Plain text |
| url | https://example.com |
| wifi | WIFI:T:WPA;S:ssid;P:password;; |
| contact | BEGIN:VCARD...END:VCARD |
| email | mailto:test@example.com?subject=...
| tel | tel:+1234567890 |

## Notes

- Uses simple ASCII art representation
- For real QR codes, use a proper QR library
- ASCII representation may not scan with all devices
- WiFi QRs follow the WIFI QR standard
- Contact QRs follow vCard 3.0 format
