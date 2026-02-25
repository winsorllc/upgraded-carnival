---
name: mintlify
description: Build and maintain documentation sites with Mintlify. Use when creating docs pages, configuring navigation, adding components, or setting up API references. Requires Node.js for CLI.
metadata:
  {
    "emoji": "📖",
    "requires": { "bins": ["node", "npm"], "note": "Mintlify CLI installed via npm i -g mint" },
  }
---

# Mintlify Skill

This skill enables the agent to build, maintain, and manage documentation sites using Mintlify - a popular documentation platform that transforms MDX files into beautiful, functional docs sites.

## Capabilities

The agent can:
- Create new documentation pages with proper frontmatter
- Configure navigation and sidebar structure in docs.json
- Add Mintlify components (callouts, code blocks, tabs, etc.)
- Set up API references from OpenAPI specs
- Validate and test documentation locally
- Check for broken links and accessibility issues

## Prerequisites

Before working with Mintlify, check if:
1. The project has a `docs/` directory
2. There's a `docs/docs.json` configuration file

If neither exists, this project doesn't use Mintlify - don't attempt to use Mintlify commands.

## Configuration Files

### docs.json

Located at `docs/docs.json`, this file defines the entire site:
- Navigation structure and sidebar groups
- Theme, colors, and branding
- API specifications
- Integrations (intercom, analytics, etc.)

**Key fields:**
- `name`: Site name
- `navigation`: Sidebar structure
- `colors`: Brand colors
- `api`: OpenAPI spec location

### Page Frontmatter

Every MDX page requires:

```yaml
---
title: "Page Title"
description: "SEO description"
---
```

Optional fields:
- `sidebarTitle`: Short sidebar title
- `icon`: Lucide/Font Awesome icon
- `tag`: Label (e.g., "NEW", "BETA")

## CLI Commands

```bash
# Install Mintlify CLI
npm install -g mint

# Start local dev server
mint dev

# Check for broken links
mint broken-links

# Check accessibility
mint a11y

# Rename/move pages (updates all references)
mint rename old-page new-page

# Validate documentation
mint validate
```

## Common Components

### Callouts (Admonitions)

```mdx
<Note>Information box</Note>
<Tip>Pro tip</Tip>
<Warning>Warning message</Warning>
<Caution>Caution message</Caution>
```

### Code Blocks

````mdx
```python title="hello.py"
def greet(name):
    return f"Hello, {name}!"
```
````

### Tabs

```mdx
<Tabs>
  <Tab title="npm">
  npm install package
  </Tab>
  <Tab title="yarn">
  yarn add package
  </Tab>
</Tabs>
```

### Cards

```mdx
<Card title="Getting Started" href="/quickstart">
  Learn how to set up your project
</Card>
```

## Workflow

1. **Read existing docs.json** to understand navigation structure
2. **Check existing pages** to match styling/voice
3. **Create/update pages** with proper frontmatter
4. **Test locally** with `mint dev`
5. **Validate** with `mint broken-links` and `mint validate`

## Examples

### Creating a New Guide

```bash
# 1. Read existing structure
cat docs/docs.json

# 2. Create new page
cat > docs/guides/new-feature.mdx << 'EOF'
---
title: "New Feature Guide"
description: "How to use the new feature"
---

# New Feature Guide

Introduction to the feature...

## Getting Started

Step 1...
EOF

# 3. Add to navigation (edit docs.json)
```

### Setting Up API Docs

```bash
# Place OpenAPI spec
cp openapi.yml docs/

# Update docs.json to reference it
```

## Important Notes

- Always consult [mintlify.com/docs](https://mintlify.com/docs) for latest features
- Favor built-in components over custom ones
- Use MDX extension for interactive components
- Keep frontmatter on all pages for proper navigation
