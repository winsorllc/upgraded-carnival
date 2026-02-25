---
name: color-converter
description: Convert between color formats including hex, rgb, hsl, hsv, and named colors. Use when you need to transform color values between different formats.
---

# Color Converter

Convert colors between different formats seamlessly.

## Supported Formats

- **HEX**: `#FF5733`, `FF5733`
- **RGB**: `rgb(255, 87, 51)` or `255, 87, 51`
- **HSL**: `hsl(9, 100%, 60%)` or `9, 100%, 60%`
- **HSV**: `hsv(9, 80%, 100%)` or `9, 80%, 100%`
- **Named colors**: `red`, `blue`, etc.

## Usage

```bash
# Convert hex to all formats
./scripts/color-convert.js hex '#FF5733'

# Convert RGB to hex
./scripts/color-convert.js rgb '255,87,51'

# Output specific format
./scripts/color-convert.js hex '#FF5733' --format hsl
```

## Examples

| Input | Command | Output |
|-------|---------|--------|
| `#FF5733` | `color-convert.js hex '#FF5733'` | All formats |
| `rgb(100,150,200)` | `color-convert.js rgb '100,150,200'` | All formats |
| Blue | `color-convert.js name 'blue'` | All formats |

## Notes

- Case insensitive
- Accepts with or without spaces
- Supports shorthand hex (#FFF → #FFFFFF)