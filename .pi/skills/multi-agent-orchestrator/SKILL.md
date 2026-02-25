---
name: multi-agent-orchestrator
description: Multi-agent task delegation and orchestration system. Break complex tasks into subtasks, delegate to specialized agents, run parallel execution, and aggregate results. Enables swarm-like coordination for complex workflows.
metadata:
  version: "1.0.0"
  author: "PopeBot"
  tags: ["multi-agent", "orchestration", "delegation", "parallel", "swarm"]
---

# Multi-Agent Orchestrator Skill

A sophisticated multi-agent delegation and orchestration system inspired by ZeroClaw's delegate tool, extended with parallel execution pipelines, intelligent result aggregation, and skill-aware task routing.

## Overview

This skill enables your agent to:
- **Break down** complex tasks into manageable subtasks
- **Delegate** subtasks to specialized sub-agents with different configurations
- **Execute** tasks in parallel for efficiency
- **Aggregate** results from multiple agents into coherent outputs
- **Coordinate** multi-step workflows with dependencies

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Multi-Agent Orchestrator                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Parent     │───>│   Task       │───>│   Sub-Agent  │      │
│  │   Agent      │    │   Router     │    │   Pool       │      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
│         │                                       │               │
│         │                    ┌──────────────────┼──────────┐   │
│         │                    │                  │          │   │
│         ▼                    ▼                  ▼          ▼   │
│  ┌──────────────┐    ┌──────────────┐  ┌──────────────┐         │
│  │   Workflow   │    │   Code Agent │  │  Research    │         │
│  │   Engine     │    │              │  │   Agent      │         │
│  └──────┬───────┘    └──────────────┘  └──────────────┘         │
│         │                                                       │
│         │         ┌──────────────────────────────────────┐      │
│         │         │         Result Aggregator              │      │
│         └────────>│  (merge, synthesize, rank, combine)    │      │
│                   └──────────────────┬───────────────────┘      │
│                                      │                          │
│                                      ▼                          │
│                            ┌──────────────────┐                 │
│                            │  Final Output    │                 │
│                            └──────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Setup

```bash
cd /job/.pi/skills/multi-agent-orchestrator
npm install
```

## Configuration

Create `ORCHESTRATOR.md` in your workspace root:

```markdown
# Multi-Agent Orchestrator Configuration

## Available Agent Templates

### code-specialist
- **system_prompt**: "You are a code optimization specialist..."
- **model**: "claude-sonnet-4"
- **temperature**: 0.2
- **skills**: ["browser-tools"]

### research-analyst
- **system_prompt**: "You are a research analyst focused on..."
- **model**: "claude-opus-4"
- **temperature**: 0.5
- **skills**: ["browser-tools", "brave-search"]

### creative-writer
- **system_prompt**: "You are a creative writing assistant..."
- **model**: "claude-sonnet-4"
- **temperature**: 0.9
- **skills**: []

## Default Settings
- **max_parallel_agents**: 3
- **timeout_per_agent**: 120
- **auto_merge_results**: true
```

## Commands

### Delegate a Single Task
```bash
orchestrator-delegate --agent code-specialist --task "Review this code for bugs" --input file.js
```

### Run Parallel Tasks
```bash
orchestrator-parallel \
  --agents "code-specialist,research-analyst" \
  --task "Analyze authentication approaches" \
  --aggregate "synthesize"
```

### Create and Manage Workflows
```bash
# Define a workflow
orchestrator-workflow create security-audit --file workflow.json

# Run the workflow
orchestrator-workflow run security-audit --input target-repo/
```

### List Active Agents
```bash
orchestrator-list
```

### View Results
```bash
orchestrator-results --session <session-id>
```

## Tools Added

When this skill is active, the agent gains access to:

### `delegate_task`

Delegate a task to a specialized sub-agent.

```javascript
delegate_task({
  agent_type: "code-specialist",
  task: "Review this function for security vulnerabilities",
  input: "function authenticate(token) { return jwt.verify(token); }",
  timeout: 120,
  context: { language: "javascript", focus: "security" }
})
```

### `parallel_delegates`

Run multiple sub-agents in parallel on different aspects of a task.

```javascript
parallel_delegates({
  tasks: [
    { agent_type: "security-analyst", task: "Check for SQL injection" },
    { agent_type: "perf-analyst", task: "Check for N+1 queries" },
    { agent_type: "style-reviewer", task: "Check code style" }
  ],
  aggregate_mode: "synthesize",  // "synthesize", "concatenate", "vote", "merge"
  input: codebase_path
})
```

### `create_workflow`

Define a multi-step workflow with dependencies.

```javascript
create_workflow({
  name: "comprehensive-review",
  steps: [
    { id: "1", action: "delegate", agent: "security-analyst", task: "Security review" },
    { id: "2", action: "delegate", agent: "perf-analyst", task: "Performance review", depends_on: ["1"] },
    { id: "3", action: "delegate", agent: "style-reviewer", task: "Style review", depends_on: ["1"] },
    { id: "4", action: "aggregate", mode: "synthesize", depends_on: ["2", "3"] }
  ]
})
```

### `run_workflow`

Execute a defined workflow.

```javascript
run_workflow({
  name: "comprehensive-review",
  input: "./src",
  variables: { priority: "high", scope: "full" }
})
```

### `aggregate_results`

Combine results from multiple agents.

```javascript
aggregate_results({
  results: [
    { agent: "security", output: "Found 2 issues..." },
    { agent: "perf", output: "1 optimization needed..." }
  ],
  mode: "synthesize",  // "synthesize", "concatenate", "vote", "rank"
  context: "Code review for authentication module"
})
```

### `spawn_agent`

Create a temporary specialized agent instance.

```javascript
spawn_agent({
  name: "temp-code-reviewer",
  system_prompt: "You are a specialist in...",
  model: "claude-sonnet-4",
  temperature: 0.3,
  timeout: 60
})
```

## Usage in Agent Prompt

When this skill is active, include this context:

```
## Multi-Agent Orchestration

You have access to a multi-agent orchestration system for complex tasks:

### When to Use Multi-Agent Delegation

Use orchestration when:
- A task has multiple distinct aspects (security + performance + style)
- You need specialized expertise for subtasks
- Work can be parallelized for efficiency
- Multiple perspectives improve the final result

### Available Commands

**delegate_task(agent_type, task, input, context?)**
- Delegates to a single specialized agent
- Returns structured result with confidence score

**parallel_delegates(tasks[], input, aggregate_mode?)**
- Runs multiple agents in parallel
- Available modes: "synthesize" (merge with reasoning), "concatenate", "vote" (majority), "rank" (best first)

**create_workflow(name, steps[])** / **run_workflow(name, input)**
- Define and execute multi-step workflows with dependencies
- Steps can depend on previous step outputs

**aggregate_results(results[], mode, context?)**
- Combine outputs from multiple agents
- Context helps the aggregator understand how to merge results

### Best Practices

1. **Keep agent types focused** - Each agent type should have a clear specialty
2. **Use parallel execution** - Run independent tasks simultaneously
3. **Synthesize, don't concatenate** - Merge results into coherent output
4. **Provide rich context** - Give sub-agents all needed context
5. **Set appropriate timeouts** - Complex analysis needs longer timeouts

### Example Workflows

**Code Review Pipeline:**
```
1. Security Analyst → Security review
2. Performance Analyst → Performance review (parallel with 1)
3. Style Reviewer → Style review (parallel with 1)
4. Synthesizer → Merge all reviews into final report
```

**Research & Drafting:**
```
1. Research Agent → Gather information from web
2. Outline Agent → Create structure (depends on 1)
3. Writer Agent → Draft content (depends on 2)
4. Editor Agent → Polish and refine (depends on 3)
```
```

## Workflow Definition Format

Workflows are defined in JSON:

```json
{
  "name": "security-audit",
  "description": "Comprehensive security review",
  "steps": [
    {
      "id": "scan-deps",
      "action": "delegate",
      "agent": "security-analyst",
      "task": "Scan dependencies for known vulnerabilities",
      "output_key": "deps_report"
    },
    {
      "id": "review-code",
      "action": "delegate",
      "agent": "security-analyst",
      "task": "Review code for security issues",
      "output_key": "code_report"
    },
    {
      "id": "check-config",
      "action": "delegate",
      "agent": "security-analyst",
      "task": "Check configuration files",
      "output_key": "config_report"
    },
    {
      "id": "synthesize",
      "action": "aggregate",
      "mode": "synthesize",
      "depends_on": ["scan-deps", "review-code", "check-config"],
      "context": "Combine into comprehensive security report",
      "output_key": "final_report"
    }
  ]
}
```

## Implementation Notes

### Agent Spawning

Sub-agents are spawned as separate Pi agent processes with:
- Custom system prompts from templates
- Configured model and temperature
- Specific skill sets
- Isolated workspace directories

### Parallel Execution

- Uses Promise.all() for true parallelism
- Respects `max_parallel_agents` limit
- Individual timeouts per agent
- Failure handling (continue on partial failure)

### Result Aggregation

Modes:
- **synthesize**: LLM merges results with reasoning
- **concatenate**: Simple join with headers
- **vote**: Take majority/similarity-based best
- **rank**: Order by confidence/score
- **diff**: Highlight disagreements

### Session Management

Each orchestration run gets:
- Unique session ID
- Timestamp and duration tracking
- Individual agent results logged
- Final output preserved
- Status: pending → running → complete/failed

## File Structure

```
.pi/skills/multi-agent-orchestrator/
├── SKILL.md                      # This file
├── package.json                  # Dependencies
├── lib/
│   ├── orchestrator.js          # Main orchestration engine
│   ├── agent-pool.js            # Agent lifecycle management
│   ├── task-router.js          # Route tasks to appropriate agents
│   ├── result-aggregator.js    # Result merging/combining
│   ├── session-manager.js      # Session tracking
│   └── workflow-engine.js     # Dependency graph execution
├── bin/
│   ├── orchestrator-delegate.js      # Single task delegation
│   ├── orchestrator-parallel.js      # Parallel execution
│   ├── orchestrator-workflow.js     # Workflow management
│   ├── orchestrator-list.js         # List active agents
│   ├── orchestrator-results.js      # View results
│   └── orchestrator-spawn.js        # Spawn custom agent
├── examples/
│   ├── code-review-workflow.json
│   ├── research-workflow.json
│   └── security-audit-workflow.json
└── tests/
    └── orchestrator.test.js
```

## Performance Characteristics

| Metric | Expected |
|--------|----------|
| Agent spawn time | ~2-5 seconds |
| Parallel limit | 3-5 agents (configurable) |
| Result aggregation | ~5-15 seconds |
| Workflow overhead | ~1 second per step |
| Session storage | ~50KB per completed session |

## Error Handling

- **Partial failures**: Continue with available results
- **Timeouts**: Mark timed-out agents, proceed with others
- **Retries**: Automatic retry up to 2 times per agent
- **Fallback**: If synthesis fails, return concatenated results

## Inspiration

This skill is inspired by:
- **ZeroClaw's delegate tool**: Sub-agent delegation with different configurations
- **OpenClaw's routing**: Channel-based agent routing
- **PopeBot's skills**: Modular capability system

## When NOT to Use

Don't use multi-agent orchestration when:
- The task is simple and single-faceted
- Latency is critical (overhead adds 5-10s)
- The task requires tight feedback loops
- Cost is a major constraint (multiplies API calls)

## Future Extensions

Planned enhancements:
- **Dynamic agent creation**: Agents define themselves based on task
- **Learning**: Remember which agent types work best for which tasks
- **Agent negotiation**: Agents communicate with each other
- **Hierarchical teams**: Team leads managing sub-teams
