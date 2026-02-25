---
name: mcporter
description: Use the mcporter CLI to list, configure, auth, and call MCP servers/tools directly (HTTP or stdio), including ad-hoc servers, config edits, and CLI/type generation.
homepage: http://mcporter.dev
metadata:
  {
    "openclaw":
      {
        "emoji": "📦",
        "requires": { "bins": ["mcporter"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "mcporter",
              "bins": ["mcporter"],
              "label": "Install mcporter (node)",
            },
          ],
      },
  }
---

# mcporter

Use `mcporter` to work with MCP servers directly.

## Quick start

```bash
mcporter list
mcporter list <server> --schema
mcporter call linear.list_issues team=ENG limit:5
```

## Call tools

- Selector syntax: `mcporter call linear.list_issues team=ENG limit:5`
- Function syntax: `mcporter call "linear.create_issue(title: \"Bug\")"`
- Full URL: `mcporter call https://api.example.com/mcp.fetch url:https://example.com`
- Stdio: `mcporter call --stdio "bun run ./server.ts" scrape url=https://example.com`
- JSON payload: `mcporter call <server.tool> --args '{"limit":5}'`

## Auth + config

```bash
# OAuth authentication
mcporter auth <server | url> [--reset]

# Configuration management
mcporter config list|get|add|remove|import|login|logout
```

## Daemon

```bash
mcporter daemon start|status|stop|restart
```

## Codegen

```bash
# Generate CLI
mcporter generate-cli --server <name> 
mcporter generate-cli --command <url>

# Inspect generated CLI
mcporter inspect-cli <path> [--json]

# Generate TypeScript
mcporter emit-ts <server> --mode client|types
```

## Notes

- Config default: `./config/mcporter.json` (override with `--config`)
- Prefer `--output json` for machine-readable results
