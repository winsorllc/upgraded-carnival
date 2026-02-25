---
name: delegate-multi-agent
description: Delegate subtasks to specialized AI agents with different models and configurations. Enables multi-agent workflows where a coordinator agent hands off work to specialist agents (research, coding, summarization).
metadata:
  {
    "thepopebot":
      {
        "emoji": "🤖",
        "version": "1.0.0",
        "features": ["multi-agent", "model-routing", "agentic-loops", "timeout-handling"]
      }
  }
---

# Delegate Multi-Agent — Subtask Delegation System

Delegate specialized tasks to different AI agents with custom model configurations and tool access.

## Overview

This skill enables multi-agent workflows by:
- **Model Routing**: Delegate to agents with different LLM providers (fast models for simple tasks, reasoning models for complex tasks)
- **Tool Isolation**: Each sub-agent gets a filtered set of tools appropriate for their task
- **Agentic Loops**: Sub-agents can run iterative tool-call loops for complex tasks
- **Timeout Management**: Configurable timeouts prevent runaway sub-agents
- **Depth Limiting**: Prevent infinite delegation chains
- **Result Aggregation**: Collect and combine results from multiple sub-agents

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Coordinator Agent                         │
│                    (Primary LLM)                             │
│                                                              │
│   ┌────────────────────────────────────────────────────┐    │
│   │              Delegation Tool                        │    │
│   │                                                     │    │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐        │    │
│   │   │ Research │  │  Coding  │  │ Summary  │        │    │
│   │   │  Agent   │  │  Agent   │  │  Agent   │ ...    │    │
│   │   │ (Fast)   │  │ (Smart)  │  │ (Cheap)  │        │    │
│   │   └──────────┘  └──────────┘  └──────────┘        │    │
│   └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

Configure sub-agents in `config/DELEGATE_AGENTS.json`:

```json
{
  "research": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "max_tokens": 2000,
    "temperature": 0.7,
    "allowed_tools": ["web-fetch", "brave-search", "summarize"],
    "timeout_secs": 120,
    "system_prompt": "You are a research assistant. Find and summarize information accurately."
  },
  "coding": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 8000,
    "temperature": 0.2,
    "allowed_tools": ["file_read", "file_write", "file_edit", "content-search"],
    "timeout_secs": 300,
    "system_prompt": "You are a coding assistant. Write clean, well-documented code."
  },
  "summarizer": {
    "provider": "google",
    "model": "gemini-2.0-flash-lite",
    "max_tokens": 1000,
    "temperature": 0.5,
    "allowed_tools": ["markdown-tools"],
    "timeout_secs": 60,
    "system_prompt": "You are a summarization assistant. Create concise, accurate summaries."
  }
}
```

## API

### Delegate a Task
```javascript
const result = await delegate({
  agent: 'research',
  prompt: 'Find the latest news about TypeScript 6.0 and summarize the key features',
  agentic: false  // Single-shot (default)
});

// Agentic mode - sub-agent can use tools iteratively
const result = await delegate({
  agent: 'coding',
  prompt: 'Refactor the utils.js file to use ES modules',
  agentic: true
});
```

### Available Agents
```javascript
const agents = await listAgents();
console.log(agents);
// ['research', 'coding', 'summarizer']
```

## Use Cases

### Research Workflow
1. Coordinator receives: "Research AI agent architectures"
2. Delegates to research agent: "Find 5 recent papers on agentic AI"
3. Research agent uses web-fetch and summarize tools
4. Results returned to coordinator for synthesis

### Coding Workflow
1. Coordinator receives: "Add authentication to the app"
2. Delegates to coding agent: "Implement JWT auth in auth.js"
3. Coding agent reads existing files, writes new code
4. Coordinator reviews and commits

### Multi-Agent Collaboration
```javascript
// Parallel delegation
const [research, coding] = await Promise.all([
  delegate({ agent: 'research', prompt: '...' }),
  delegate({ agent: 'coding', prompt: '...' })
]);

// Sequential delegation with context
const research = await delegate({ agent: 'research', prompt: '...' });
const summary = await delegate({ agent: 'summarizer', prompt: `Summarize: ${research.result}` });
```

## Timeout Handling

Sub-agents are killed if they exceed their timeout:

```javascript
try {
  const result = await delegate({
    agent: 'coding',
    prompt: 'Write a complex algorithm',
    timeout_secs: 60  // Override agent default
  });
} catch (error) {
  if (error.code === 'TIMEOUT') {
    console.log('Sub-agent timed out, retrying with simpler task');
  }
}
```

## Depth Limiting

Prevent infinite delegation chains:

```javascript
// Agent A delegates to B (depth 1)
// B tries to delegate to C (depth 2)
// If max_depth is 2, C cannot delegate further
await delegate({
  agent: 'research',
  prompt: '...',
  max_depth: 2  // Default: 3
});
```

## Best Practices

1. **Use Fast Models for Simple Tasks**: Don't use expensive models for basic lookups
2. **Set Appropriate Timeouts**: Give enough time for the task, but prevent runaway costs
3. **Limit Tool Access**: Only give sub-agents tools they actually need
4. **Clear System Prompts**: Define each agent's role explicitly
5. **Monitor Costs**: Track token usage across all sub-agents

## Error Handling

Sub-agent failures are caught and reported:

```json
{
  "success": false,
  "agent": "research",
  "error": "TIMEOUT",
  "message": "Sub-agent exceeded 120s timeout",
  "partial_result": "...",  // If any progress was made
  "retryable": true
}
```

## Example: Full Research Workflow

```javascript
const { delegate, listAgents } = require('./delegate-multi-agent');

async function researchTask(query) {
  console.log(`Starting research on: ${query}`);
  
  // Check available agents
  const agents = listAgents();
  if (!agents.includes('research')) {
    throw new Error('Research agent not configured');
  }
  
  // Delegate research
  const research = await delegate({
    agent: 'research',
    prompt: `Research: ${query}. Find 3-5 high-quality sources and summarize key points.`,
    agentic: true  // Allow iterative research
  });
  
  if (!research.success) {
    console.error('Research failed:', research.error);
    return null;
  }
  
  // Delegate summarization
  const summary = await delegate({
    agent: 'summarizer',
    prompt: `Create a concise executive summary from this research:\n\n${research.result}`,
    agentic: false
  });
  
  return {
    research: research.result,
    summary: summary.result,
    sources: research.sources || []
  };
}

// Run research
researchTask('The future of AI agent frameworks')
  .then(console.log)
  .catch(console.error);
```
