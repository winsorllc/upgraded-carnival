---
name: text-processor
description: Text transformation and processing utilities. Format, convert, analyze, and manipulate text data. Inspired by Unix text utilities and modern text processing needs.
---

# Text Processor

Text transformation and processing utilities.

## Capabilities

- Case conversion (upper, lower, title)
- Format conversion (camelCase, snake_case, kebab-case)
- Text statistics (word count, character count, line count)
- Find and replace with regex support
- Extract patterns (emails, URLs, phone numbers)
- Whitespace normalization
- Base64 encode/decode
- URL encode/decode
- JSON/YAML/TOML format conversion
- Text diff/compare
- Generate word cloud data
- Detect language
- Sentiment analysis (basic)

## Usage

```bash
# Convert case
/job/.pi/skills/text-processor/processor.js case "Hello World" --to upper

# Convert format
/job/.pi/skills/text-processor/processor.js format "helloWorld" --to snake

# Text statistics
/job/.pi/skills/text-processor/processor.js stats /path/to/file.txt

# Find and replace
/job/.pi/skills/text-processor/processor.js replace /path/to/file.txt \
  --find "old" --replace "new"

# Extract patterns
/job/.pi/skills/text-processor/processor.js extract /path/to/file.txt \
  --pattern emails

# Encode/decode
/job/.pi/skills/text-processor/processor.js encode "Hello" --method base64
/job/.pi/skills/text-processor/processor.js decode "SGVsbG8=" --method base64

# Compare files
/job/.pi/skills/text-processor/processor.js diff file1.txt file2.txt

# Get text metrics (readability, complexity)
/job/.pi/skills/text-processor/processor.js metrics /path/to/file.txt
```

## Output Format

```json
{
  "operation": "stats",
  "result": {
    "characters": 1250,
    "words": 213,
    "lines": 15,
    "sentences": 18,
    "averageWordLength": 5.2
  }
}
```

## Notes

- Supports stdin for piping: echo "text" | processor.js case --to upper
- All text operations preserve Unicode characters
- Pattern extraction returns unique matches only