---
name: ordercli
description: Order management CLI for various services. Track orders, manage shipments, handle returns across multiple platforms.
metadata:
  {
    "openclaw": {
      "emoji": "📦",
      "requires": { "env": ["ORDERCLI_API_KEY"] }
    }
  }
---

# Order CLI

Track and manage orders across platforms.

## Configuration

```bash
export ORDERCLI_API_KEY="your-api-key"
```

## Usage

List orders:

```bash
ordercli list
ordercli list --status pending
ordercli list --days 30
```

Order details:

```bash
ordercli show <order-id>
```

Track shipment:

```bash
ordercli track <order-id>
ordercli track --carrier UPS --tracking 1Z999
```

Returns:

```bash
ordercli returns list
ordercli returns create --order <id> --reason "defective"
```

## Supported Platforms

- Amazon
- Shopify
- eBay
- Custom APIs via config
