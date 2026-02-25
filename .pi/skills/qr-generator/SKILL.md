---
name: qr-generator
description: Generate QR codes for URLs, text, WiFi, contact cards, and more. Outputs to text or saves as PNG.
---

# QR Code Generator

Generate QR codes for various purposes.

## Capabilities

- Generate QR codes for text and URLs
- Generate WiFi QR codes
- Generate contact card QR codes
- Generate vCard and meCard formats
- Output as ASCII art (for terminal display)
- Save as PNG files (requires qrcode library)
- Multiple error correction levels

## Usage

```bash
# Generate QR code for URL
/job/.pi/skills/qr-generator/qr.js url "https://example.com"

# Generate QR code for text
/job/.pi/skills/qr-generator/qr.js text "Hello World"

# Generate WiFi QR code
/job/.pi/skills/qr-generator/qr.js wifi --ssid "MyNetwork" --password "secret123" --type WPA

# Generate contact card
/job/.pi/skills/qr-generator/qr.js contact --name "John Doe" --phone "+1234567890" --email "john@example.com"

# Save to file
/job/.pi/skills/qr-generator/qr.js url "https://example.com" --output qr.png

# Display as ASCII
/job/.pi/skills/qr-generator/qr.js text "Hello" --ascii

# QR code with custom error correction
/job/.pi/skills/qr-generator/qr.js url "https://example.com" --error L | M | Q | H
```

## Output Formats

- Text: Base64 encoded PNG or ASCII art
- File: PNG image file

## Notes

- ASCII mode works without external dependencies
- PNG mode requires the qrcode npm package
- Default size: 256x256 pixels for PNG
- Color: Black modules on white background