---
name: prose-runner
description: Execute OpenProse-style multi-agent workflows. Activate when user wants to orchestrate multiple AI sessions in parallel or sequence, run workflow files (.prose), or coordinate agents with context passing.
metadata:
  {
    "popebot":
      {
        "emoji": "📜",
        "requires": { "bins": ["node", "jq"] },
        "install":
          [
            {
              "id": "apt",
              "kind": "apt",
              "package": "jq",
              "bins": ["jq"],
              "label": "Install jq (apt)",
            },
          ],
      },
  }
---

# Prose Runner

Execute OpenProse-style multi-agent workflow files. Orchestrates parallel and sequential AI sessions with context passing between them.

## When to Use

✅ **USE this skill when:**

- Running a `.prose` workflow file
- Need to coordinate multiple AI agents in parallel or sequence
- Building pipelines where output from one session feeds into another
- Creating reusable multi-agent workflows
- Wanting to spawn specialized reviewers/analysts concurrently

❌ **DON'T use for:**

- Single AI queries (use chat directly)
- Simple tasks that don't need orchestration
- One-off questions

## Commands

### Run a Prose File

```bash
# Execute a .prose workflow
node /job/.pi/skills/prose-runner/run-prose.js /path/to/workflow.prose

# With custom output directory
node /job/.pi/skills/prose-runner/run-prose.js /path/to/workflow.prose --output /job/tmp/runs/my-run

# Debug mode (verbose logging)
node /job/.pi/skills/prose-runner/run-prose.js /path/to/workflow.prose --debug
```

### Validate a Prose File

```bash
# Check syntax without executing
node /job/.pi/skills/prose-runner/validate-prose.js /path/to/workflow.prose
```

### Quick Parallel Sessions

```bash
# Run multiple prompts in parallel, collect results
node /job/.pi/skills/prose-runner/parallel.js \
  --session "Review for security issues" \
  --session "Review for performance issues" \
  --session "Review for code style" \
  --synthesize "Combine all review results into one report"
```

## Prose File Format

A `.prose` file is a YAML-like workflow definition:

```prose
# Single session
session "Analyze this code and find bugs"

# Named binding - stores output for later use
analysis = session "Review the code for security vulnerabilities"

# Parallel execution - runs all sessions concurrently
parallel:
  security = session "Check for security issues"
  performance = session "Check for performance problems"
  style = session "Check for code style issues"

# Context passing - uses outputs from previous sessions
report = session "Create a unified report"
  context: { security, performance, style }

# Agent definition - creates a reusable agent template
agent reviewer:
  model: claude-sonnet-4-5-20250929
  system: "You are an expert code reviewer"

# Use defined agent
review = session: reviewer
  prompt: "Review this pull request"

# Conditional execution
if: { condition: "analysis contains 'critical'" }
  session: reviewer
    prompt: "Create urgent fix plan"
```

## Syntax Reference

| Statement | Description |
|-----------|-------------|
| `session "prompt"` | Run a single AI session with the given prompt |
| `name = session "prompt"` | Store session output in named binding |
| `parallel:` | Run nested sessions concurrently |
| `agent name:` | Define a reusable agent template |
| `session: agent_name` | Use a defined agent |
| `context: { a, b }` | Pass previous outputs as context to session |
| `use "handle/slug"` | Import external workflow (not yet implemented) |
| `output name` | Mark a binding as workflow output |

### Agent Properties

| Property | Description | Default |
|----------|-------------|---------|
| `model` | LLM model to use | `claude-sonnet-4-5-20250929` |
| `system` | System prompt for the agent | None |
| `max_tokens` | Max response tokens | 4096 |

## Output

### Session Results

Each session creates a result file:

```
.runs/<run-id>/
├── workflow.prose          # Copy of workflow
├── state.json              # Execution state
├── bindings/
│   ├── analysis.json       # Named output
│   └── report.json         # Named output
└── sessions/
    ├── session-001.jsonl   # Session log
    └── session-002.jsonl   # Session log
```

### Final Output

Workflow outputs are collected and returned as JSON:

```json
{
  "runId": "20260225-165134-a7b3c9",
  "status": "complete",
  "outputs": {
    "analysis": "...",
    "report": "..."
  },
  "sessions": 5,
  "duration": "45.2s"
}
```

## Examples

### Code Review Pipeline

```prose
# Define reusable reviewer agent
agent reviewer:
  model: claude-sonnet-4-5-20250929
  system: "You are an expert code reviewer. Be thorough but constructive."

# Run reviews in parallel
parallel:
  security = session: reviewer
    prompt: "Review for security vulnerabilities including SQL injection, XSS, and auth issues"
  performance = session: reviewer
    prompt: "Review for performance issues including N+1 queries, memory leaks, and inefficient algorithms"
  style = session: reviewer
    prompt: "Review for code style, readability, and maintainability"

# Synthesize into final report
final_report = session: reviewer
  prompt: "Create a unified code review report. Prioritize issues by severity. Include specific code examples and fix suggestions."
  context: { security, performance, style }

output final_report
```

### Research Workflow

```prose
# Gather information in parallel
parallel:
  market = session "Research current market trends for AI agent platforms"
  competitors = session "Identify top 5 competitors and their key features"
  users = session "Summarize common user pain points from forums"

# Analyze findings
swot = session "Create SWOT analysis based on research"
  context: { market, competitors, users }

# Generate strategy
strategy = session "Propose 3 strategic initiatives with implementation timeline"
  context: { swot }

output strategy
```

## Environment Configuration

Configure default settings via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PROSE_DEFAULT_MODEL` | Default LLM model | `claude-sonnet-4-5-20250929` |
| `PROSE_PARALLEL_LIMIT` | Max parallel sessions | 5 |
| `PROSE_OUTPUT_DIR` | Default output directory | `.prose/runs` |
| `ANTHROPIC_API_KEY` | API key for Claude | Required |

## Error Handling

- **Session failure**: Workflow pauses, error logged, can retry with `--resume`
- **Syntax error**: Validation fails with line number and description
- **Missing context**: Warning logged, session proceeds without missing bindings

## Integration

### With PopeBot Chat

```
/prose /path/to/workflow.prose
```

### With Cron Jobs

```json
{
  "name": "Daily Code Review",
  "schedule": "0 9 * * 1-5",
  "type": "command",
  "command": "node /job/.pi/skills/prose-runner/run-prose.js /job/workflows/daily-review.prose"
}
```

## See Also

- [OpenProse Specification](https://github.com/openclaw/openclaw/tree/main/extensions/open-prose)
- [Workflow Orchestrator Skill](../workflow-orchestrator/SKILL.md) - Alternative orchestration approach
