---
name: cli-discovery
description: Automatically discover and learn how to use CLI tools available in the environment. Use when: (1) you need to find a command-line tool to accomplish a task, (2) you encounter an unfamiliar command and want to understand it, (3) exploring what tools are available in the container, (4) generating usage examples for discovered tools.
---

# CLI Discovery

Automatically discover and learn how to use CLI tools available in the environment. This skill enables the agent to explore available commands, understand their purpose, and generate usage examples.

## When to Use

- You need to find a specific tool but don't know if it's installed
- You encounter an unfamiliar command in logs or documentation
- You want to explore what capabilities are available in the container
- You need to generate examples for discovered tools
- Building up context about the runtime environment

## How It Works

The skill scans standard locations for binaries and builds a searchable index of available CLI tools:

1. **PATH scanning**: Scans directories in $PATH for executable files
2. **man page parsing**: Extracts documentation from man pages
3. **help parsing**: Runs `--help` or `-h` on discovered tools
4. **description extraction**: Uses `whatis` or `apropos` where available

## Usage

### Discover all CLI tools

```bash
node /job/pi-skills/cli-discovery/discover.js
```

Lists all discovered CLI tools with their paths and brief descriptions.

### Search for a specific tool

```bash
node /job/pi-skills/cli-discovery/search.js <keyword>
```

Searches for tools matching a keyword (e.g., "git", "docker", "curl").

### Get detailed info about a tool

```bash
node /job/pi-skills/cli-discovery/info.js <tool-name>
```

Shows full help output, description, and usage examples for a specific tool.

### Learn about a tool by running it

```bash
node /job/pi-skills/cli-discovery/learn.js <tool-name>
```

Runs the tool with various flags to discover its capabilities.

### Generate usage examples

```bash
node /job/pi-skills/cli-discovery/examples.js <tool-name>
```

Generates common usage examples for a tool based on its help output.

## Output Format

### Discover Output

```json
{
  "total": 42,
  "tools": [
    {
      "name": "git",
      "path": "/usr/bin/git",
      "description": "the stupid content tracker",
      "version": "2.43.0"
    },
    {
      "name": "docker",
      "path": "/usr/bin/docker",
      "description": "Docker container runtime",
      "version": "24.0.0"
    }
  ]
}
```

### Search Output

```json
{
  "query": "git",
  "matches": [
    {
      "name": "git",
      "path": "/usr/bin/git",
      "description": "the stupid content tracker"
    },
    {
      "name": "gitk",
      "path": "/usr/bin/gitk",
      "description": "The Git repository browser"
    }
  ]
}
```

### Info Output

```json
{
  "name": "curl",
  "path": "/usr/bin/curl",
  "description": "transfer a URL",
  "version": "7.88.1",
  "help": "curl [options] <URL>...",
  "options": [
    {"flag": "-o", "description": "write output to <file>"},
    {"flag": "-X", "description": "HTTP request method"}
  ]
}
```

## Common Workflows

### Find a tool for a task
```
User: I need to download a file from a URL
Agent: [Uses search.js with keyword "download" or "http"]
  → Finds curl, wget, aria2c
  → Uses info.js to learn about curl
  → Generates usage example
```

### Explore container capabilities
```
Agent: [Before starting a job]
  → Uses discover.js to see what tools are available
  → Builds mental model of environment capabilities
```

### Learn unknown commands
```
Agent: [Sees "docker-compose" in documentation]
  → Uses info.js to learn what it does
  → Uses examples.js to understand common usage
```

## Integration with Other Skills

- **With link-scraper**: Use discovered tools to process fetched content
- **With memory-agent**: Cache tool knowledge for future sessions
- **With modify-self**: Can add new tools to the environment

## Requirements

- Node.js 18+
- Standard Unix utilities: `which`, `whatis`, `man` (optional)
- Tools must be in PATH to be discovered

## Directories Scanned

The scanner checks these standard locations:
- `/usr/bin/`
- `/usr/local/bin/`
- `/bin/`
- `/sbin/`
- `/usr/sbin/`
- All directories in `$PATH`

## Limitations

- Only discovers executable files, not built-in shell commands
- Some tools require specific arguments to show help
- Very large PATHs may take time to scan
- Some tools may have non-standard help formats

## Tips

1. **Cache results**: For repeated sessions, cache the discovery output
2. **Use search**: Faster than full discovery when you know the keyword
3. **Check version**: Always verify version for compatibility
4. **Explore related**: Use search to find related tools (e.g., "git" finds git, gitk, git-cvsimport)
