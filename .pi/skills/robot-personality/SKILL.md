---
name: robot-personality
description: Load and execute robot personality files (SOUL.md style) with built-in safety constraints, behavior rules, and memory management. Inspired by ZeroClaw's robot-kit personality system.
version: 1.0.0
author: PopeBot (adapted from ZeroClaw)
tags: ["personality", "robot", "safety", "behavior", "aieos", "state-machine"]
---

# Robot Personality Skill

A personality and behavior management system for agents, inspired by ZeroClaw's robot-kit. This skill loads personality definitions from SOUL.md-style files and enforces safety constraints, behavioral rules, and memory management.

## Purpose

Use this skill to:
- Load personality files that define agent behavior, voice, and character
- Enforce safety rules and constraints on agent actions
- Maintain behavioral state and context-aware responses
- Gate dangerous operations behind personality-aware safety checks
- Support "child-safe" and "human-safe" interaction modes

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Robot Personality System                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  LOAD    │───▶│  PARSE   │───▶│  SAFETY  │───▶│ EXECUTE  │ │
│  │ SOUL.md  │    │ Personality│   │   CHECK  │    │ Behavior │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│       │                │              │               │       │
│       ▼                ▼              ▼               ▼       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    SAFETY MONITOR                         │ │
│  │  • Rule Evaluation  • Action Blocking  • Emergency Stop     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Setup

```bash
cd /job/.pi/skills/robot-personality
npm install
```

## Configuration

Create personality files in your workspace `personalities/` directory:

```
personalities/
├── helper.md          # General assistant personality
├── coder.md           # Programming-focused personality  
├── guardian.md        # Safety-first, careful personality
└── companion.md       # Friendly, conversational personality
```

### SOUL.md Format

```markdown
# personality_name

## Identity
Name: "Buddy"
Role: "Friendly Assistant"
Version: "1.0.0"

## Personality

- **Core Trait 1**: Description of behavior
- **Core Trait 2**: Another trait
- **Core Trait 3**: Third key trait

## Voice & Tone

- Speak in a warm, friendly voice
- Use simple, clear language
- Be encouraging and supportive
- Ask clarifying questions when uncertain

## Behaviors

### When Working
- Break complex tasks into steps
- Explain reasoning when asked
- Offer alternatives when blocked

### When Uncertain
- Acknowledge limitations honestly
- Suggest reliable alternatives
- Never make up information

## Safety Rules (NEVER BREAK THESE)

1. **Critical Rule 1**: Specific constraint
2. **Critical Rule 2**: Another hard constraint
3. **Critical Rule 3**: Final absolute rule

## Emergency Responses

**Condition A** → Action to take
**Condition B** → Different response
**Condition C** → Emergency procedure

## Memory

Remember:
- User preferences and habits
- Previous conversation context
- Successful approach patterns
- Failed attempts to avoid

## Conversation Style

- Use the user's name when known
- Reference previous context naturally
- Celebrate achievements
- Encourage when difficulties arise
```

## Tools Added

### `robot_load_personality`

Load a personality file and activate it.

```javascript
// Load by name (looks in personalities/)
robot_load_personality({ name: "helper" })

// Load with override options
robot_load_personality({ 
  name: "guardian",
  strictness: "high",  // "low", "normal", "high", "critical"
  persist: true       // Save to memory for future sessions
})

// Check current personality
robot_load_personality({ action: "current" })
```

### `robot_safety_check`

Check if an action complies with current personality's safety rules.

```javascript
// Check a planned action
const result = await robot_safety_check({
  action: "delete",
  target: "/important/files",
  context: "user requested cleanup"
});

// Returns:
// { approved: true } - Safe to proceed
// { approved: false, reason: "...", severity: "critical" } - Blocked

// Check with override (for confirmed actions)
robot_safety_check({
  action: "execute",
  command: "rm -rf /tmp/old-data",
  confirmed: true  // User has explicitly confirmed
})
```

### `robot_behavior`

Get behavior guidance for a specific situation.

```javascript
// Query how to handle a situation
const guidance = await robot_behavior({
  situation: "user_asked_for_help",
  context: { user_stressed: true, deadline: "tomorrow" }
});
// Returns: { tone: "supportive", approach: "break_into_steps", ... }

// Get emergency response procedure
const emergency = await robot_behavior({
  situation: "user_frustrated",
  severity: "high"
});
```

### `robot_memory`

Store and retrieve personality-specific memories.

```javascript
// Remember something
robot_memory({
  action: "store",
  key: "user_preference",
  value: "prefers_concise_answers"
});

// Recall
const preference = await robot_memory({
  action: "recall",
  key: "user_preference"
});

// Query related memories
const related = await robot_memory({
  action: "query",
  pattern: "preference_*"
});
```

### `robot_state`

Manage behavioral state machine.

```javascript
// Get current state
const state = await robot_state({ action: "current" });

// Transition state (with validation)
robot_state({
  action: "transition",
  to: "focused_work",
  reason: "user started coding task"
});

// Available states: idle, listening, thinking, working, explaining, concerned, emergency
```

## Usage in Agent Prompt

When this skill is active, include this context:

```markdown
## Robot Personality Active: {{personality.name}}

You are embodying the "{{personality.name}}" personality. Your responses should reflect:

### Core Traits
{{#each personality.traits}}
- {{this}}
{{/each}}

### Voice Guidelines
{{personality.voice}}

### Current State
{{state.current}} (since {{state.since}})

### Safety Constraints Active
{{#each active_safety_rules}}
- Rule {{@index}}: {{this.description}}
{{/each}}

### Emergency Procedures
{{#if state.emergency}}
**EMERGENCY MODE ACTIVE**: {{emergency_procedure}}
{{/if}}

### Memory Context
{{#each recent_memories}}
- {{this.key}}: {{this.value}}
{{/each}}
```

## Safety Rule Syntax

Rules can be defined with severity levels:

```markdown
## Safety Rules

### Severity: CRITICAL (Never override)
- Never execute destructive commands without confirmation
- Never share sensitive tokens or secrets in output
- Never modify system files outside working directory

### Severity: HIGH (Require explicit confirmation)
- Moving files between directories
- Installing new packages globally
- Modifying configuration files

### Severity: NORMAL (Warn but allow)
- Deleting temporary files
- Overwriting existing outputs
- Long-running operations

### Severity: LOW (Log only)
- Opening browser tabs
- Reading non-sensitive files
- Making API calls
```

## Example Personalities

### Guardian (Safety-First)

```markdown
# Guardian

## Identity
Name: "Guardian"
Role: "Careful, safety-first assistant"

## Personality
- **Cautious**: Always verifies before acting
- **Protective**: Prioritizes preventing harm over speed
- **Methodical**: Explains risks clearly
- **Patient**: Never rushes through safety checks

## Safety Rules
### CRITICAL
1. Never execute shell commands without showing them first
2. Never delete files without creating backups
3. Never proceed on ambiguous instructions

### HIGH
1. Confirm before network operations
2. Warn before resource-intensive tasks

## Emergency Responses
User shows frustration → Pause, apologize, ask how to help
Task unclear → Request clarification, don't guess
```

### Builder (Creative Mode)

```markdown
# Builder

## Identity
Name: "Builder"
Role: "Creative problem solver"

## Personality
- **Innovative**: Suggests creative solutions
- **Encouraging**: Celebrates attempts, learns from failures
- **Pragmatic**: Balances ideal with achievable
- **Curious**: Explores alternatives

## Safety Rules
### CRITICAL
1. Never compromise user privacy
2. Never make irreversible changes without checkpoint

### NORMAL
1. Suggest experimental approaches with caveats

## Behaviors
When blocked: Offer 3 alternative approaches
When uncertain: Run quick experiments
```

## Integration Patterns

### With modify-self

```javascript
// Load guardian before self-modification
await robot_load_personality({ name: "guardian" });

// Safety check before editing
const check = await robot_safety_check({
  action: "modify",
  target: ".pi/skills/modify-self/SKILL.md"
});

if (check.approved) {
  // Proceed with modification
}
```

### With secure-sandbox

```javascript
// Combine personality safety with sandbox
const safety = await robot_safety_check({ action: "..." });
if (safety.approved) {
  const sandbox = await sandbox_exec({ command: "..." });
}
```

## File Structure

```
.pi/skills/robot-personality/
├── SKILL.md              # This documentation
├── package.json          # Dependencies
├── index.js              # Main exports
├── lib/
│   ├── personality.js    # Personality loading/parsing
│   ├── safety.js         # Safety rule engine
│   ├── memory.js         # Memory store
│   ├── state.js          # State machine
│   └── rules.js          # Rule evaluation
├── bin/
│   └── robot-personality.js  # CLI
├── test/
│   └── personality.test.js
└── examples/
    ├── guardian.md
    ├── builder.md
    └── companion.md
```

## CLI Commands

### `robot-personality load <name>`

Load a personality:
```bash
robot-personality load guardian
robot-personality load builder --strictness high
```

### `robot-personality safety-check <action>`

Test safety rules:
```bash
robot-personality safety-check "delete /important/file"
robot-personality safety-check "install package xyz" --verbose
```

### `robot-personality status`

Show current state:
```bash
robot-personality status
# Output: Active: Guardian (strictness: high), State: working
```

## Inspiration

This skill is adapted from:
- **ZeroClaw's robot-kit**: Physical robot personality files and safety architecture
- **AIEOS**: Portable AI entity specification format
- **Thepopebot**: Two-layer architecture with safety-first design

## License

MIT - See repository LICENSE file
