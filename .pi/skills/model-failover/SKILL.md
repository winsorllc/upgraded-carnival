---
name: model-failover
description: Automatic LLM provider failover with fallback chains, inspired by OpenClaw/ZeroClaw model configuration.
---

# Model Failover Skill

Automatically switch between LLM providers when one fails. Supports configurable fallback chains, rate limiting, and health monitoring. Inspired by OpenClaw's model failover system.

## Setup

Configure your provider chain in environment variables:

```bash
# Comma-separated list of providers (in fallback order)
export LLM_PROVIDER_CHAIN="anthropic:claude-3-5-sonnet-20241022,openai:gpt-4o-mini,google:gemini-1.5-flash"

# API keys for each provider
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."
```

## Usage

### Chat with automatic failover

```bash
{baseDir}/model-failover.js chat "Your message here"
```

### Add a new provider to the chain

```bash
{baseDir}/model-failover.js add-provider anthropic claude-3-5-sonnet-20241022
```

### Remove a provider from the chain

```bash
{baseDir}/model-failover.js remove-provider openai
```

### List providers in chain

```bash
{baseDir}/model-failover.js list
```

### Check provider health

```bash
{baseDir}/model-failover.js health
```

### Reset failure counts

```bash
{baseDir}/model-failover.js reset
```

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `LLM_PROVIDER_CHAIN` | Comma-separated `provider:model` pairs | `anthropic:claude-3-5-sonnet-20241022` |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `GOOGLE_API_KEY` | Google API key | - |
| `CUSTOM_API_KEY` | Custom provider API key | - |
| `MAX_RETRIES` | Max retries per provider | 2 |
| `RETRY_DELAY_MS` | Delay between retries | 1000 |

## Provider Format

```
provider:model
```

Supported providers:
- `anthropic` - Anthropic Claude models
- `openai` - OpenAI GPT models
- `google` - Google Gemini models
- `custom` - Custom OpenAI-compatible endpoint (set `OPENAI_BASE_URL`)

## How It Works

1. Try the first provider in the chain
2. If it fails (rate limit, error, timeout), wait and retry
3. If retries exhausted, move to next provider
4. Continue until success or all providers exhausted
5. Track failures per provider for health monitoring
