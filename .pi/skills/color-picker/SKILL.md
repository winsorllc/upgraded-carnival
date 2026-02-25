---
name: color-picker
description: Convert between color formats (HEX, RGB, HSL, CMYK), generate palettes, and analyze colors. Use when working with design systems or color manipulation.
---

# Color Picker

Convert and manipulate color values across different formats.

## Quick Start

```bash
/job/.pi/skills/color-picker/color.js convert "#FF5733"
```

## Usage

### Convert Color Format
```bash
/job/.pi/skills/color-picker/color.js convert "<color>"
```

### Generate Color Palette
```bash
/job/.pi/skills/color-picker/color.js palette "<color>" --scheme complementary
```

### Mix Colors
```bash
/job/.pi/skills/color-picker/color.js mix "#FF0000" "#0000FF" --ratio 50
```

### Get Color Info
```bash
/job/.pi/skills/color-picker/color.js info "<color>"
```

### Random Color
```bash
/job/.pi/skills/color-picker/color.js random
```

## Supported Formats

- **HEX**: #RRGGBB or #RGB
- **RGB**: rgb(255, 128, 0) or 255,128,0
- **HSL**: hsl(30, 100%, 50%)
- **CMYK**: cmyk(0, 50, 100, 0)
- **Named**: red, blue, green, etc.

## Color Schemes

- **complementary**: Opposite on color wheel
- **analogous**: Adjacent colors
- **triadic**: Three equally spaced
- **split-complementary**: Base + two adjacent to complement
- **tetradic**: Four colors (rectangle)
- **monochromatic**: Same hue, different saturation/lightness

## Examples

```bash
# Convert hex to all formats
/job/.pi/skills/color-picker/color.js convert "#3498db"

# Get complementary color
/job/.pi/skills/color-picker/color.js palette "#FF5733" --scheme complementary

# Generate analogous palette (3 colors)
/job/.pi/skills/color-picker/color.js palette "#3498db" --scheme analogous --count 3

# Mix two colors (50/50)
/job/.pi/skills/color-picker/color.js mix "#FF0000" "#0000FF"

# Get detailed color info
/job/.pi/skills/color-picker/color.js info "hsl(120, 100%, 25%)"

# Generate random color
/job/.pi/skills/color-picker/color.js random

# Generate 5 random harmonious colors
/job/.pi/skills/color-picker/color.js random --count 5
```

## Output Format

```json
{
  "hex": "#3498db",
  "rgb": { "r": 52, "g": 152, "b": 219 },
  "hsl": { "h": 204, "s": 70, "l": 53 },
  "cmyk": { "c": 76, "m": 31, "y": 0, "k": 14 },
  "brightness": 152,
  "luminance": 0.35
}
```

## When to Use

- Converting between color formats
- Generating color palettes for designs
- Finding complementary/accent colors
- Design system color management
- Accessibility contrast checking
