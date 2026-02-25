---
name: qr-code
description: Generate QR codes from URLs, text, WiFi credentials, contact info, and more. Use when you need to share information in scannable format.
---

# QR Code Generator

Create QR codes for various data types including URLs, WiFi credentials, contact information, and plain text.

## Quick Start

```bash
/job/.pi/skills/qr-code/qr-generate.js "https://example.com" /tmp/qrcode.png
```

## Usage

### Generate QR Code from URL/Text
```bash
/job/.pi/skills/qr-code/qr-generate.js "<data>" <output_file>
```

### Generate WiFi QR Code
```bash
/job/.pi/skills/qr-code/qr-generate.js --wifi "SSID:password:WPA" /tmp/wifi.png
```

### Generate Contact (vCard) QR Code
```bash
/job/.pi/skills/qr-code/qr-generate.js --contact "<name>;<phone>;<email>" /tmp/contact.png
```

### With Custom Options
```bash
/job/.pi/skills/qr-code/qr-generate.js "<data>" <output_file> --size 512 --color "#000000" --bg "#ffffff"
```

## Data Types

### URL/Text
Plain URLs or text content.

### WiFi
Format: `SSID:password:encryption_type`
- SSID: Network name
- password: WiFi password
- encryption_type: WEP, WPA, or nopass

Example: `MyNetwork:secret123:WPA`

### Contact (vCard)
Format: `name;phone;email;organization`
- name: Full name
- phone: Phone number
- email: Email address
- organization: Company/organization (optional)

Example: `John Doe;555-1234;john@example.com;Acme Inc`

### Email
Format: `mailto:email?subject=Subject&body=Body`

### Phone
Format: `tel:phone_number`

### SMS
Format: `sms:phone_number?body=message`

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--size` | 256 | QR code size in pixels |
| `--color` | #000000 | Foreground color (hex) |
| `--bg` | #ffffff | Background color (hex) |
| `--error` | M | Error correction level (L, M, Q, H) |
| `--type` | auto | Data type: url, wifi, contact, email, tel, sms |

## Error Correction Levels

- **L** (Low): 7% recovery
- **M** (Medium): 15% recovery (default)
- **Q** (Quartile): 25% recovery
- **H** (High): 30% recovery

## Output

Creates PNG file at specified path. Returns path on success.

## Examples

```bash
# Generate simple URL QR code
/job/.pi/skills/qr-code/qr-generate.js "https://example.com" /tmp/url-qr.png

# Generate WiFi QR (for easy network sharing)
/job/.pi/skills/qr-code/qr-generate.js --wifi "HomeNetwork:password123:WPA" /tmp/wifi.png

# Generate contact card
/job/.pi/skills/qr-code/qr-generate.js --contact "Jane Doe;555-9876;jane@example.com;Tech Corp" /tmp/contact.png

# Custom styling (blue on yellow)
/job/.pi/skills/qr-code/qr-generate.js "https://example.com" /tmp/styled.png --size 512 --color "#0000FF" --bg "#FFFF00"

# High error correction for damaged environments
/job/.pi/skills/qr-code/qr-generate.js "https://example.com" /tmp/robust.png --error H
```

## When to Use

- User requests QR code generation
- Need to share WiFi credentials easily
- Creating contact cards for networking
- Generating payment/billing QR codes
- Sharing URLs in print materials
