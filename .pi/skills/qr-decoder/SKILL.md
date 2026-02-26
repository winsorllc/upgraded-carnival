---
name: qr-decoder
description: "Decode QR codes from images. Extract URLs, text, WiFi credentials, vCard contacts. Uses zbar or libdecodeqr. No API key required."
---

# QR Decoder Skill

Decode and extract data from QR codes in image files.

## When to Use

Γ£à **USE this skill when:**

- "Read this QR code"
- "Decode QR from image"
- "Extract URL from QR code"
- "Scan QR code image"
- "What's in this QR code?"

## When NOT to Use

Γ¥î **DON'T use this skill when:**

- Creating QR codes ΓåÆ use qr-generator
- Interactive camera scanning ΓåÆ use browser-tools
- Need real-time decoding ΓåÆ use native tools

## Commands

### Decode from File

```bash
{baseDir}/decode.sh <image_file>
{baseDir}/decode.sh qrcode.png
{baseDir}/decode.sh photo.jpg
```

### Decode Multiple Files

```bash
{baseDir}/decode.sh *.png
{baseDir}/decode.sh --dir ./images --pattern "*.jpg"
```

### Output Formats

```bash
{baseDir}/decode.sh qrcode.png --format text
{baseDir}/decode.sh qrcode.png --format json
{baseDir}/decode.sh qrcode.png --format raw
{baseDir}/decode.sh qrcode.png --format qr-type
```

### Batch Processing

```bash
{baseDir}/decode.sh --batch images.txt
{baseDir}/decode.sh --dir ./qrcodes --output results.json
```

### From URL

```bash
{baseDir}/decode.sh --url "https://example.com/qrcode.png"
{baseDir}/decode.sh --url "https://example.com/qrcode.png" --save temp.png
```

### From Webcam (if supported)

```bash
{baseDir}/decode.sh --camera
{baseDir}/decode.sh --camera --device /dev/video0
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--format FORMAT` | Output format: text, json, raw, qr-type | text |
| `--dir DIR` | Process all images in directory | None |
| `--pattern GLOB` | File pattern for --dir | `*.{png,jpg,jpeg,gif}` |
| `--batch FILE` | Read image paths from file | None |
| `--url URL` | Decode from URL | None |
| `--save FILE` | Save downloaded image | None |
| `--camera` | Use camera for live decode | false |
| `--device DEVICE` | Camera device path | /dev/video0 |
| `--output FILE` | Output to file | stdout |
| `--multi` | Return all QR codes found | first only |
| `--quiet` | Suppress errors | false |

## QR Code Types

The skill can decode:

| Type | Description | Example |
|------|-------------|----------|
| URL | Website links | `https://example.com` |
| TEXT | Plain text | Any text content |
| WIFI | WiFi credentials | `WIFI:S:MyNetwork;T:WPA;P:password;;` |
| VEVENT | Calendar event | iCalendar format |
| VCARD | Contact card | vCard format |
| EMAIL | Email address | `mailto:user@example.com` |
| TEL | Phone number | `tel:+1234567890` |
| SMS | SMS message | `sms:+1234567890?body=Hello` |
| GEO | Geographic location | `geo:40.7128,-74.0060` |

## Output Format (JSON)

```json
{
  "file": "qrcode.png",
  "type": "URL",
  "data": "https://example.com",
  "parsed": {
    "url": "https://example.com",
    "domain": "example.com",
    "scheme": "https"
  },
  "position": {
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 200
  }
}
```

## Examples

**Decode a QR code:**
```bash
{baseDir}/decode.sh qrcode.png
# https://example.com
```

**Get QR type:**
```bash
{baseDir}/decode.sh qrcode.png --format qr-type
# URL
```

**Decode WiFi credentials:**
```bash
{baseDir}/decode.sh wifi.png
# WIFI:S:MyNetwork;T:WPA;P:password123;;
```

**Parse as JSON:**
```bash
{baseDir}/decode.sh qrcode.png --format json | jq '.data'
```

**Decode from URL:**
```bash
{baseDir}/decode.sh --url "https://example.com/qr.png"
```

**Batch decode directory:**
```bash
{baseDir}/decode.sh --dir ./qrcodes --format json --output results.json
```

**Find all QR codes in image:**
```bash
{baseDir}/decode.sh photo.jpg --multi
```

## Parsed Output

For recognized formats (WiFi, vCard, URL, etc.), the skill provides parsed output:

**WiFi QR:**
```
Type: WIFI
SSID: MyNetwork
Security: WPA
Password: password123
Hidden: No
```

**vCard QR:**
```
Type: VCARD
Name: John Doe
Phone: +1234567890
Email: john@example.com
Organization: Example Corp
```

## Exit Codes

- 0: Successfully decoded
- 1: No QR code found
- 2: Invalid image file
- 3: Dependency missing (zbar not installed)
- 4: Network error (for --url)

## Dependencies

- **zbarimg** (recommended): Primary decoder, handles most formats
- **libdecodeqr**: Alternative decoder
- **fswebcam**: For camera capture

Install on Debian/Ubuntu:
```bash
sudo apt install zbar-tools
```
