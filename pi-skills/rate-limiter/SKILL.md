---
name: rate-limiter
description: Sliding window rate limiting for API calls, tool executions, and agent actions. Use to prevent exceeding API rate limits, control action frequency, and manage cost-per-day budgets.
metadata:
  {
    "thepopebot":
      {
        "emoji": "🚦",
        "os": ["linux", "darwin"],
        "requires": {},
        "install": []
      }
  }
---

# Rate Limiter

Implement sliding window rate limiting for API calls, tool executions, and agent actions. Inspired by production-grade rate limiting systems.

## Overview

The rate limiter provides:
- **Sliding window algorithm**: Smooth rate limiting without burst issues
- **Multiple limit types**: Requests per second, minute, hour, day
- **Cost tracking**: Track API costs with daily budgets
- **Key-based limits**: Different limits per API key or client
- **Burst allowance**: Allow short bursts while maintaining average rate

## Usage

### Check if Action is Allowed

```bash
# Check if can make API call
rate-limit check api_calls

# Check with cost
rate-limit check api_calls --cost 10
```

### Record an Action

```bash
# Record an API call
rate-limit record api_calls

# Record with cost
rate-limit record api_calls --cost 5
```

### Get Remaining Quota

```bash
rate-limit remaining api_calls
```

### Reset Limit

```bash
rate-limit reset api_calls
```

### Get Statistics

```bash
rate-limit stats
```

## API Usage

```javascript
const { RateLimiter } = require('./index.js');

// Create limiter with 100 requests per minute
const limiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 100,
  burstAllowance: 20
});

// Check before action
if (limiter.check('api_calls')) {
  // Make API call
  limiter.record('api_calls');
} else {
  // Wait or queue
  console.log('Rate limit exceeded');
}
```

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `windowMs` | Time window in milliseconds | 60000 |
| `maxRequests` | Max requests per window | 100 |
| `burstAllowance` | Extra requests allowed in burst | 0 |
| `costPerRequest` | Cost units per request | 1 |
| `maxCostPerDay` | Maximum cost per day | 1000 |

## Cost Tracking

Track API costs with daily budgets:

```javascript
const costLimiter = new RateLimiter({
  windowMs: 86400000, // 24 hours
  maxRequests: 1000,
  costPerRequest: 1,
  maxCostPerDay: 100 // $100/day budget
});

// Record with cost
costLimiter.record('openai', { cost: 50 });

// Check remaining budget
const remaining = costLimiter.getRemaining('openai');
```

## Use Cases

1. **API Rate Limits**: Respect external API rate limits (e.g., OpenAI, Anthropic)
2. **Cost Control**: Stay within daily/monthly API budgets
3. **Tool Execution**: Limit how often expensive tools run
4. **User Actions**: Rate limit user-initiated actions
5. **Parallel Jobs**: Control concurrent agent job creation

## Environment Variables

- `RATE_LIMIT_FILE`: Path to persist rate limit state (default: `data/rate-limits.json`)

## Notes

- Uses in-memory sliding window algorithm
- State can be persisted to disk for restarts
- Supports multiple independent limiters
- Thread-safe for concurrent access
