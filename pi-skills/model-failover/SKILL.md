---
name: model-failover
description: Automatic LLM provider failover with fallback chains. Configure primary and fallback providers for resilient AI operations. Inspired by OpenClaw/ZeroClaw model configuration.
metadata:
  {
    "requires": { "env": ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"] }
  }
---

# Model Failover

Automatic LLM provider failover with fallback chains. Ensures resilient AI operations by automatically switching to backup providers when the primary fails.

## Trigger

Use this skill when:
- Primary LLM provider is down or rate-limited
- Need to ensure continuous operation with multiple providers
- Want to optimize costs by using cheaper models as fallback
- Building critical systems that can't afford downtime

## Configuration

Configure fallback chains in your environment:

```bash
# Primary provider (highest priority)
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022

# Fallback chain (in order of priority)
FALLBACK_PROVIDER_1=openai
FALLBACK_MODEL_1=gpt-4o
FALLBACK_PROVIDER_2=google
FALLBACK_MODEL_2=gemini-2.0-flash-exp
```

Or use a config file:

```json
{
  "fallback_chain": [
    {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "timeout": 30
    },
    {
      "provider": "openai", 
      "model": "gpt-4o",
      "timeout": 30
    },
    {
      "provider": "google",
      "model": "gemini-2.0-flash-exp",
      "timeout": 30
    }
  ]
}
```

## Usage

### CLI Usage

```bash
# Use the failover wrapper
./scripts/model-failover.sh "Your prompt here"

# With custom config
./scripts/model-failover.sh "Prompt" --config /path/to/config.json

# Force specific provider
./scripts/model-failover.sh "Prompt" --provider openai
```

### As a Library

```bash
source ./scripts/model-failover.sh
call_with_failover "prompt" "system_prompt"
```

## Fallback Logic

1. **Try primary provider first** with configured timeout
2. **On failure**, try next provider in chain
3. **Continue** until success or all providers exhausted
4. **Return error** with all failure reasons if all fail

### Failure Types That Trigger Fallback

- API rate limiting (429)
- API errors (5xx)
- Network timeouts
- Invalid API keys
- Model not found

## Provider Configuration

| Provider | Env Var | Default Model |
|----------|---------|---------------|
| Anthropic | `ANTHROPIC_API_KEY` | claude-3-5-sonnet-20241022 |
| OpenAI | `OPENAI_API_KEY` | gpt-4o |
| Google | `GOOGLE_API_KEY` | gemini-2.0-flash-exp |
| Custom | `CUSTOM_API_KEY` | varies |

## Advanced Options

```bash
# Set timeout (seconds)
./scripts/model-failover.sh "prompt" --timeout 60

# Set max retries per provider
./scripts/model-failover.sh "prompt" --retries 2

# Stream responses
./scripts/model-failover.sh "prompt" --stream

# Set temperature
./scripts/model-failover.sh "prompt" --temperature 0.7
```

## Response Format

```json
{
  "success": true,
  "provider": "openai",
  "model": "gpt-4o",
  "response": "The model's response...",
  "usage": {
    "input_tokens": 100,
    "output_tokens": 200
  },
  "failures": []
}
```

## Example Workflow

```
User: "Generate a summary"

Attempt 1: Anthropic
  → Rate limited (429)
  
Attempt 2: OpenAI
  → Success!
  
Response: [returns OpenAI response]
```

## Monitoring

The failover system logs:
- Which provider was used
- How many fallbacks occurred
- Failure reasons for each provider
- Total latency

Use logs to optimize your fallback chain based on reliability and cost.
