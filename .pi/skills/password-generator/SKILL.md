---
name: password-generator
description: Generate secure passwords, passphrases, and tokens. Check password strength and generate memorable passwords. Inspired by ZeroClaw's secure-by-default architecture.
---

# Password Generator

Generate secure passwords, passphrases, and check password strength.

## Capabilities

- Generate random passwords with configurable length and character sets
- Create memorable passphrases from word lists
- Generate API tokens and secrets
- Check password strength (entropy, cracking time)
- Generate XKCD-style passwords
- Support for custom character sets
- Avoid ambiguous characters option

## Usage

```bash
# Generate strong password (default: 16 chars)
/job/.pi/skills/password-generator/passgen.js password

# Generate with specific length
/job/.pi/skills/password-generator/passgen.js password --length 24

# Generate with specific requirements
/job/.pi/skills/password-generator/passgen.js password --length 20 \
  --upper --lower --numbers --symbols

# Generate passphrase (XKCD style)
/job/.pi/skills/password-generator/passgen.js passphrase --words 5

# Generate API token
/job/.pi/skills/password-generator/passgen.js token --length 32

# Check password strength
/job/.pi/skills/password-generator/passgen.js check "MyP@ssw0rd!"

# Generate multiple passwords
/job/.pi/skills/password-generator/passgen.js password --count 5
```

## Strength Output Format

```json
{
  "password": "hunter2",
  "score": 3,
  "entropy": 45.8,
  "crackingTime": "2.3 years",
  "recommendations": ["Add more special characters"]
}
```

## Notes

- Strength score: 0-4 (very weak to very strong)
- Entropy calculated using Shannon entropy
- Cracking time based on 10^9 guesses/second
- Passphrases use EFF word list for memorability