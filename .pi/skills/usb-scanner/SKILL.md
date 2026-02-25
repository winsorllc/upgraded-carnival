---
name: usb-scanner
description: Scan and list USB devices connected to the system. Shows device information, vendor/product IDs, and connection status. Inspired by ZeroClaw hardware discovery tools.
---

# USB Scanner

Scan and enumerate USB devices connected to the system.

## Features

- **list**: List all USB devices
- **info**: Get detailed device information
- **monitor**: Monitor USB connections (requires daemon)
- **filter**: Filter by vendor, product, or class

## Usage

```bash
# List all USB devices
./scripts/usb-scan.js --command list

# Get device details
./scripts/usb-scan.js --command info --device /dev/bus/usb/001/001

# Filter by vendor
./scripts/usb-scan.js --command list --vendor 0781

# Filter by class
./scripts/usb-scan.js --command list --class mass_storage
```

## Examples

| Task | Command |
|------|---------|
| All devices | `usb-scan.js --command list` |
| Vendor filter | `usb-scan.js --list --vendor 0781` |
| Device info | `usb-scan.js --info --device /dev/bus/001/001` |
| Mass storage | `usb-scan.js --list --class mass_storage` |

## Notes

- Requires read access to /dev/bus/usb
- May need elevated permissions for full info
- Supports hotplug monitoring
- Shows vendor/product names when available