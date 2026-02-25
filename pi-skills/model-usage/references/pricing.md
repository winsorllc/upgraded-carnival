# Model Usage Pricing Reference

## Anthropic Models (2024-2025)

| Model | Input ($/M) | Output ($/M) | Context |
|-------|-------------|--------------|---------|
| claude-3-5-sonnet-20241022 | $3.00 | $15.00 | Latest Sonnet |
| claude-opus-4-5-20250514 | $15.00 | $75.00 | Latest Opus |
| claude-3-opus-20240229 | $15.00 | $75.00 | Legacy Opus |
| claude-3-sonnet-20240229 | $3.00 | $15.00 | Legacy Sonnet |
| claude-3-haiku-20240307 | $0.25 | $1.25 | Fast & Cheap |

## OpenAI Models

| Model | Input ($/M) | Output ($/M) | Context |
|-------|-------------|--------------|---------|
| gpt-4o | $2.50 | $10.00 | Latest Omni |
| gpt-4o-mini | $0.15 | $0.60 | Fast & Cheap |
| gpt-4-turbo | $10.00 | $30.00 | Legacy Turbo |
| gpt-4 | $30.00 | $60.00 | Legacy GPT-4 |
| gpt-3.5-turbo | $0.50 | $1.50 | Legacy |

## Google Models

| Model | Input ($/M) | Output ($/M) | Context |
|-------|-------------|--------------|---------|
| gemini-2.0-flash | $0.10 | $0.40 | Latest Flash |
| gemini-1.5-flash | $0.075 | $0.30 | Fast & Cheap |
| gemini-1.5-pro | $1.25 | $5.00 | Pro tier |

## Cost Calculation Formula

```
totalCost = (inputTokens / 1,000,000) * inputPricePerM + (outputTokens / 1,000,000) * outputPricePerM
```

## Example Calculations

### Anthropic Claude 3.5 Sonnet
- 150K input + 3K output = $0.45 + $0.045 = **$0.50**

### OpenAI GPT-4o
- 100K input + 2K output = $0.25 + $0.02 = **$0.27**

### Google Gemini 1.5 Pro
- 1M input + 100K output = $1.25 + $0.50 = **$1.75**

## Notes

- Prices are subject to change; verify with official provider documentation
- Some providers offer batch pricing at lower rates
- Token counts are approximations; always use actual counts from API responses
