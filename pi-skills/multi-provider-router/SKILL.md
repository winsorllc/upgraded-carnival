---
name: multi-provider-router
description: Intelligent LLM provider routing with fallback chains, cost optimization, and model selection. Inspired by ZeroClaw's reliable provider wrapper and router.
version: 1.0.0
author: zeroclaw-inspired
tags:
  - llm
  - provider
  - router
  - fallback
  - cost-optimization
  - ai
capabilities:
  - Route requests to multiple LLM providers
  - Automatic fallback on provider failure
  - Cost-based routing optimization
  - Latency-based routing
  - Custom routing rules and weights
  - Provider health monitoring
requires:
  - ANTHROPIC_API_KEY
  - OPENAI_API_KEY
environment:
  LLM_PROVIDERS: "anthropic,openai,google"
  COST_OPTIMIZATION: "true"
  LATENCY_SLO_MS: "5000"
---

# Multi-Provider Router Skill

This skill provides intelligent LLM (Large Language Model) provider routing with automatic failover, cost optimization, and configurable routing strategies. It's inspired by ZeroClaw's reliable provider wrapper and router architecture.

## Overview

The router can direct LLM requests to different providers based on:
- **Fallback chains** - Try provider A, then B, then C on failure
- **Cost optimization** - Route to cheapest provider that meets quality needs
- **Latency** - Route to fastest responding provider
- **Custom rules** - User-defined routing logic
- **Health monitoring** - Avoid unhealthy providers

## Commands

### Check provider status
```
router status
```
Shows health and latency status of all configured providers.

### Test a provider
```
router test <provider>
```
Tests a specific provider with a simple prompt.

### Estimate cost
```
router cost <provider> --model <model> --tokens <input>,<output>
```
Estimates cost for a request.

### Route a request (via environment)
```
router route --prompt "Your prompt" [--strategy <fallback|cost|latency|round-robin>]
```
Shows which provider would be selected with the given strategy.

### Get provider info
```
router info <provider>
```
Shows details about a specific provider including models and pricing.

## Provider Configuration

Configure providers via environment variables:

```bash
# Provider selection (comma-separated priority order)
LLM_PROVIDERS="anthropic,openai,google"

# Strategy: fallback, cost, latency, round-robin, custom
ROUTING_STRATEGY="fallback"

# Cost optimization
COST_OPTIMIZATION="true"

# Latency SLO (ms)
LATENCY_SLO_MS="5000"

# Provider API keys
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
GOOGLE_API_KEY="..."
```

## Routing Strategies

### Fallback (default)
Try providers in priority order until one succeeds:
```json
{
  "strategy": "fallback",
  "providers": ["anthropic", "openai", "google"]
}
```

### Cost Optimization
Route to cheapest provider that meets criteria:
```json
{
  "strategy": "cost",
  "max_cost_per_1k_tokens": 0.01,
  "preferred_providers": ["openai", "anthropic"]
}
```

### Latency-based
Route to fastest provider:
```json
{
  "strategy": "latency",
  "slo_ms": 5000,
  "timeout_ms": 10000
}
```

### Round-robin
Distribute load evenly:
```json
{
  "strategy": "round-robin"
}
```

### Custom Rules
Define complex routing logic:
```json
{
  "strategy": "custom",
  "rules": [
    { "condition": "prompt.length < 100", "provider": "openai" },
    { "condition": "system.includes('code')", "provider": "anthropic" },
    { "condition": "priority == 'low' && cost_sensitive", "provider": "google" }
  ]
}
```

## Provider Models and Pricing

| Provider | Model | Input ($/1M) | Output ($/1M) |
|----------|-------|--------------|---------------|
| Anthropic | claude-3-5-sonnet | $3.00 | $15.00 |
| Anthropic | claude-3-opus | $15.00 | $75.00 |
| OpenAI | gpt-4o | $2.50 | $10.00 |
| OpenAI | gpt-4o-mini | $0.15 | $0.60 |
| Google | gemini-1.5-pro | $1.25 | $5.00 |
| Google | gemini-1.5-flash | $0.075 | $0.30 |

## Fallback Behavior

When using fallback strategy:
1. Try first provider in chain
2. On failure (rate limit, error, timeout), log and try next
3. Continue until success or all providers exhausted
4. Return error with aggregate error information
5. Track failures for health monitoring

## Health Monitoring

The router maintains provider health scores:
- 100 = Healthy (no recent failures)
- 75 = Degraded (1-2 recent failures)
- 50 = Unhealthy (3+ failures, avoid)
- 0 = Down (explicit failure, skip)

Health scores decay over time and are reset on success.

## Usage Examples

### Basic usage with fallback
```bash
# Test the router
router test anthropic

# Check all provider status
router status
```

### Cost estimation
```bash
router cost openai --model gpt-4o --tokens 1000,500
# Output: Estimated cost: $0.0025 (input) + $0.005 (output) = $0.0075

router cost anthropic --model claude-3-5-sonnet --tokens 1000,500
# Output: Estimated cost: $0.003 (input) + $0.0075 (output) = $0.0105
```

### Compare providers
```bash
router route --prompt "Write a haiku" --strategy cost
# Output: openai (cheapest for short prompt)

router route --prompt "Analyze this 10,000 line codebase" --strategy latency
# Output: google (typically fastest for long context)
```

## Integration with Agent

To use this routing in your agent, call the router CLI:

```javascript
const { execSync } = require('child_process');

function routePrompt(prompt, strategy = 'fallback') {
  const result = execSync(
    `router route --prompt "${prompt.replace(/"/g, '\\"')}" --strategy ${strategy}`,
    { encoding: 'utf-8' }
  );
  return JSON.parse(result);
}
```

Or set environment variables and use your SDK normally:
```bash
export ROUTING_STRATEGY="cost"
export COST_OPTIMIZATION="true"
# Your code now routes automatically
```
