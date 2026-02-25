---
name: delegate-task
description: "Delegate subtasks to specialized AI agents. Use when: complex workflows need multi-agent collaboration or specialization."
metadata: { "openclaw": { "emoji": "🤖", "agent": true } }
---

# Delegate Task Skill

Delegate subtasks to specialized AI agents, enabling multi-agent collaboration. Each sub-agent can have different configurations, tools, and expertise.

## When to Use

✅ **USE this skill when:**
- Complex multi-step workflows
- Specialized expertise needed (code review, research, summarization)
- Parallel task execution
- Separation of concerns

❌ **DON'T use this skill when:**
- Simple single-step tasks
- Tasks requiring deep context from parent
- Tight-loop iterations

## Architecture

```
┌─────────────────┐
│  Parent Agent   │
│  (Orchestrator) │
└────────┬────────┘
         │ Delegations
         ▼
┌─────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Research │  │  Code    │  │  Review  │  │
│  │  Agent   │  │  Agent   │  │  Agent   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

## Agent Configurations

Define sub-agents in your configuration:

```json
{
  "delegations": {
    "research": {
      "model": "claude-sonnet-4-5-20250929",
      "tools": ["brave-search", "web-fetch", "summarize"],
      "systemPrompt": "You are a research specialist..."
    },
    "coder": {
      "model": "claude-sonnet-4-5-20250929",
      "tools": ["vscode", "git-structured", "content-search"],
      "systemPrompt": "You are an expert software engineer..."
    },
    "reviewer": {
      "model": "claude-3-5-sonnet",
      "tools": ["vscode", "content-search"],
      "systemPrompt": "You are a code reviewer focusing on quality..."
    }
  }
}
```

## Usage

### JavaScript API

```javascript
const { delegate } = require('/job/.pi/skills/delegate-task/delegate.js');

// Simple delegation
const result = await delegate('research', {
  task: 'Find the latest developments in AI agents',
  context: 'Focus on multi-agent systems'
});

console.log(result.response);
console.log(result.metadata);

// Delegation with custom config
const codeResult = await delegate('coder', {
  task: 'Implement a REST API endpoint',
  context: 'Use Express.js, add validation',
  timeout: 300000 // 5 minutes
});

// Parallel delegations
const [research, analysis] = await Promise.all([
  delegate('research', { task: 'Research topic X' }),
  delegate('analysis', { task: 'Analyze data Y' })
]);
```

### Bash

```bash
node /job/.pi/skills/delegate-task/delegate.js \
  --agent research \
  --task "Find AI agent frameworks" \
  --context "Compare features and pricing"
```

## API

```javascript
delegate(agentName, options)
```

**Options:**
- `task` - Task description (required)
- `context` - Additional context
- `timeout` - Timeout in ms (default: 300000)
- `maxTokens` - Max response tokens
- `model` - Override agent model
- `stream` - Enable streaming (default: false)

**Returns:**
```javascript
{
  success: true,
  agent: "research",
  response: "I found 3 main frameworks...",
  metadata: {
    model: "claude-sonnet-4-5-20250929",
    tokensUsed: 1542,
    duration: 12300,
    citations: ["https://..."]
  },
  conversationId: "conv_abc123"
}
```

## Delegation Chain

Supports nested delegation (up to 5 levels):

```javascript
// Parent delegates to researcher
const research = await delegate('research', {
  task: 'Compare CI/CD solutions'
});

// Researcher can further delegate
const analysis = await delegate('analysis', {
  task: 'Analyze cost differences',
  parentTask: research.response
});
```

## Multi-Agent Workflow Example

```javascript
async function buildFeature(featureName) {
  // 1. Research existing implementations
  const research = await delegate('research', {
    task: `Research how ${featureName} is implemented elsewhere`,
    context: 'Look at open source projects'
  });

  // 2. Plan architecture
  const plan = await delegate('architect', {
    task: 'Design the architecture',
    context: research.response
  });

  // 3. Implement code
  const code = await delegate('coder', {
    task: 'Implement the feature',
    context: `${research.response}\n\nArchitecture: ${plan.response}`
  });

  // 4. Review code
  const review = await delegate('reviewer', {
    task: 'Review the implementation',
    context: code.response
  });

  return { research, plan, code, review };
}
```

## Error Handling

```javascript
try {
  const result = await delegate('coder', {
    task: 'Write a function'
  });
  console.log(result.response);
} catch (error) {
  if (error.code === 'AGENT_NOT_FOUND') {
    console.error('Unknown agent');
  } else if (error.code === 'TIMEOUT') {
    console.error('Agent took too long');
  } else if (error.code === 'DEPTH_EXCEEDED') {
    console.error('Delegation chain too deep');
  }
}
```

## Best Practices

1. **Clear task descriptions** - Be specific about what you want
2. **Provide context** - Include relevant background
3. **Set timeouts** - Prevent infinite loops
4. **Chain thoughtfully** - Don't over-nest
5. **Handle errors** - Graceful degradation

## Agent-to-Agent Communication

```javascript
// Pass data between agents
const context = JSON.stringify({
  originalTask: task,
  researchFindings: research.data,
  constraints: ['Must use TypeScript', 'No external deps']
});

await delegate('coder', {
  task: 'Implement based on research',
  context
});
```
