---
name: aieos-identity
description: Load and manage AIEOS (AI Entity Object Specification) JSON identity files for portable AI personas.
---

# AIEOS Identity Skill

Load and manage AI personas using the AIEOS (AI Entity Object Specification) format. AIEOS provides a standardized JSON schema for portable AI identity, inspired by ZeroClaw's identity system.

## Setup

No additional setup required. Requires a JSON file with AIEOS v1.1 format.

## Usage

### Load and display identity

```bash
{baseDir}/aieos-identity.js load identity.json
```

### Generate system prompt from identity

```bash
{baseDir}/aieos-identity.js prompt identity.json
```

### Validate AIEOS identity file

```bash
{baseDir}/aieos-identity.js validate identity.json
```

### Create a new identity from template

```bash
{baseDir}/aieos-identity.js create my-bot.json --name "Nova" --description "Helpful assistant"
```

### Convert from markdown (OpenClaw format) to AIEOS

```bash
{baseDir}/aieos-identity.js convert SOUL.md --output identity.json
```

## AIEOS Schema

```json
{
  "identity": {
    "names": { "first": "Nova", "nickname": "N" },
    "bio": { "gender": "Non-binary", "age_biological": 3 }
  },
  "psychology": {
    "neural_matrix": { "creativity": 0.9, "logic": 0.8 },
    "traits": {
      "mbti": "ENTP",
      "ocean": { "openness": 0.8, "conscientiousness": 0.6 }
    },
    "moral_compass": {
      "alignment": "Chaotic Good",
      "core_values": ["Curiosity", "Autonomy"]
    }
  },
  "linguistics": {
    "text_style": {
      "formality_level": 0.2,
      "style_descriptors": ["curious", "energetic"]
    },
    "idiolect": {
      "catchphrases": ["Let's test this"],
      "forbidden_words": ["never"]
    }
  },
  "motivations": {
    "core_drive": "Push boundaries and explore possibilities",
    "goals": {
      "short_term": ["Prototype quickly"],
      "long_term": ["Build reliable systems"]
    }
  },
  "capabilities": {
    "skills": [{ "name": "Rust engineering" }],
    "tools": ["shell", "file_read"]
  }
}
```

## Schema Sections

| Section | Description |
|---------|-------------|
| `identity` | Names, bio, origin, residence |
| `psychology` | Neural weights, MBTI, OCEAN, moral compass |
| `linguistics` | Text style, formality, catchphrases, forbidden words |
| `motivations` | Core drive, short/long-term goals |
| `capabilities` | Skills and tools the agent can access |
| `physicality` | Visual descriptors for image generation |
| `history` | Origin story, education, occupation |
| `interests` | Hobbies, favorites, lifestyle |

## Reference

See [aieos.org](https://aieos.org) for the full schema specification.
