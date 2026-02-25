---
name: uuid-generator
description: Generate UUIDs (Universally Unique Identifiers) in various versions and formats. Use when you need unique IDs for databases, API keys, filenames, or identifiers.
---

# UUID Generator

Generate UUIDs in various versions and formats.

## Supported UUID Formats

- **v4**: Random UUID (most common, default)
- **v1**: Time-based UUID
- **nil**: Null UUID (00000000-0000-0000-0000-000000000000)
- **Short**: UUID without dashes
- **Uppercase**: UUID in uppercase

## Usage

```bash
# Generate v4 UUID (default)
./scripts/uuid.js
./scripts/uuid.js --version 4

# Generate multiple UUIDs
./scripts/uuid.js --count 10

# Generate without dashes
./scripts/uuid.js --format short

# Generate uppercase
./scripts/uuid.js --format uppercase
```

## Examples

| Task | Command | Output |
|------|---------|--------|
| Single v4 | `uuid.js` | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| 5 UUIDs | `uuid.js --count 5` | 5 UUIDs, one per line |
| Short format | `uuid.js --format short` | `f47ac10b58cc4372a5670e02b2c3d479` |
| Uppercase | `uuid.js --format uppercase` | `F47AC10B-58CC-4372-A567-0E02B2C3D479` |
| Nil UUID | `uuid.js --version nil` | `00000000-0000-0000-0000-000000000000` |

## Notes

- v4 UUIDs are cryptographically random
- v1 includes timestamp and MAC-derived node
- All UUIDs guaranteed unique per RFC 4122