---
name: shell-completer
description: Generate shell completion scripts for your CLI tools. Supports bash, zsh, and fish.
---

# Shell Completer

Generate shell completion scripts for CLI tools. Inspired by zeroclaw completions command.

## Setup
No dependencies required.

## Usage

### Generate completions for a tool
```bash
{baseDir}/completer.sh my-cli-tool --bash
{baseDir}/completer.sh my-cli-tool --zsh
{baseDir}/completer.sh --fish my-cli-tool
```

### Generate from package.json scripts
```bash
{baseDir}/completer.sh --from-package
```

### Auto-detect shell
```bash
{baseDir}/completer.sh my-cli-tool
```

### Install completions
```bash
{baseDir}/completer.sh my-cli-tool --install
```

### Output
```bash
# Generated completions can be:
# 1. Printed to stdout
{baseDir}/completer.sh my-tool

# 2. Saved to file
{baseDir}/completer.sh my-tool --output ~/.completions/_my-tool

# 3. Auto-installed
{baseDir}/completer.sh my-tool --install
```

## Generated Script Example
```bash
#!/bin/bash
# Completion for my-cli-tool

_my_cli_tool_complete() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    opts="--help --version --config --verbose --quiet"
    
    if [[ ${cur} == -* ]]; then
        COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
        return 0
    fi
}

complete -F _my_cli_tool_complete my-cli-tool
```

## When to Use
- Adding completions to new CLI tools
- Updating completions after CLI changes
- Setting up new development environments
- Creating completion scripts for custom tools
