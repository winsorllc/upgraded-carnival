---
name: config-manager
description: Configuration management with schema validation, environment overrides, and configuration profiles. Inspired by ZeroClaw's config/schema.rs and config loading system.
---

# Config Manager

Configuration management with schema validation, environment overrides, and configuration profiles. Supports YAML, JSON, and environment variable configuration automatic merging with and validation.

## Setup

No additional setup required. Uses local JSON files for configuration storage.

## Usage

### Set a Configuration Value

```bash
{baseDir}/config-manager.js set --key "providers.anthropic.api_key" --value "sk-xxx"
```

### Get a Configuration Value

```bash
{baseDir}/config-manager.js get --key "providers.anthropic.api_key"
```

### List All Configuration

```bash
{baseDir}/config-manager.js list
```

### Validate Configuration Against Schema

```bash
{baseDir}/config-manager.js validate --schema-path "./config-schema.json"
```

### Load Configuration from File

```bash
{baseDir}/config-manager.js load --path "./config.yaml"
```

### Create Configuration Profile

```bash
{baseDir}/config-manager.js profile --name "production" --set "providers.anthropic.api_key=xxx"
```

### Switch Configuration Profile

```bash
{baseDir}/config-manager.js switch --profile "production"
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--key` | Configuration key (dot-notation supported) | Required for get/set |
| `--value` | Configuration value | - |
| `--path` | Path to configuration file | - |
| `--schema-path` | Path to JSON schema for validation | - |
| `--profile` | Configuration profile name | - |
| `--env` | Load from environment variables | false |
| `--format` | Output format: `json`, `yaml` | json |

## Key Patterns

Configuration keys support dot-notation for nested values:

```
providers.anthropic.api_key
providers.openai.model
channels.telegram.enabled
security.rate_limit.requests
```

## Configuration Profiles

Save and switch between different configuration profiles:
- `development` - Debug logging, relaxed rate limits
- `production` - Minimal logging, strict rate limits
- `testing` - Mock providers, test credentials

## Environment Override

Load configuration from environment variables with prefix:
- `CONFIG_PROVIDERS_ANTHROPIC_API_KEY` → `providers.anthropic.api_key`
- `CONFIG_CHANNELS_TELEGRAM_ENABLED` → `channels.telegram.enabled`

## Response Format

```json
{
  "success": true,
  "key": "providers.anthropic.api_key",
  "value": "sk-xxx"
}
```

## When to Use

- Managing multi-environment configurations
- Storing API keys securely
- Configuration validation before deployment
- Profile-based configuration switching
- Configuration migration between versions
