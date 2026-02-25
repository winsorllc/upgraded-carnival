---
name: agent-delegate
description: Spawn specialized sub-agents with context handoff for complex multi-phase tasks. Enables expertise delegation within a session with automatic context merging and depth limiting to prevent infinite loops.
metadata:
  {
    "inspired_by": "ZeroClaw delegate.rs",
    "version": "1.0.0",
    "popebot":
      {
        "emoji": "🔄",
        "requires": { "bins": ["node", "jq", "curl"] },
      },
  }
---

# Agent Delegate Skill

Spawn specialized sub-agents to handle specific phases of complex tasks. Each delegate receives curated context from the parent session and returns structured results that merge back into the main conversation.

## When to Use

✅ **USE this skill when:**

- A task requires multiple distinct areas of expertise (security review + performance + style)
- You need to break down a complex problem into specialized phases
- Different parts of a task need different system prompts/personalities
- You want parallel execution of independent subtasks
- Building recursive problem-solving workflows

❌ **DON'T use for:**

- Simple single-focus tasks (delegate adds overhead)
- Tasks requiring continuous human interaction
- When you already have the expertise needed
- Deep recursion (capped at depth 3 to prevent infinite loops)

## Architecture

```
┌─────────────────────────────────────────┐
│         Parent Agent Session            │
│  "Review this entire codebase"          │
└──────────────┬──────────────────────────┘
               │ delegate()
               ▼
    ┌──────────────────────┐
    │  Delegate Context    │
    │  - Parent prompt     │
    │  - Relevant files    │
    │  - Parent's analysis │
    │  - Depth counter     │
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │  Sub-Agent Session   │
    │  "Check for security │
    │   vulnerabilities"   │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Structured Result   │
    │  { findings, files,  │
    │    severity, next }  │
    └──────────────────────┘
```

## Commands

```bash
# Delegate a subtask with default settings
node /job/.pi/skills/agent-delegate/delegate.js \
  --task "Review for security vulnerabilities"

# Delegate with custom system prompt
node /job/.pi/skills/agent-delegate/delegate.js \
  --task "Analyze performance bottlenecks" \
  --system "You are a performance optimization expert" \
  --model "claude-sonnet-4-5-20250929"

# Delegate with file context
node /job/.pi/skills/agent-delegate/delegate.js \
  --task "Review this code" \
  --files "./src/auth.ts ./src/api.ts"

# Parallel delegation (spawn multiple agents)
node /job/.pi/skills/agent-delegate/delegate.js \
  --parallel \
  --task-1 "Check for security issues" \
  --task-2 "Check for performance issues" \
  --task-3 "Check for code style"

# With parent context
node /job/.pi/skills/agent-delegate/delegate.js \
  --task "Build on this analysis" \
  --context "./parent_analysis.md"
```

## Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--task` | The task prompt for the delegate | Required |
| `--system` | Custom system prompt for delegate | Inherited from parent |
| `--model` | LLM model to use | `claude-sonnet-4-5-20250929` |
| `--files` | Space-separated file paths to include | None |
| `--context` | Parent analysis/context file | None |
| `--parallel` | Enable parallel delegation mode | false |
| `--task-N` | Task N for parallel mode (1-5) | N/A |
| `--depth` | Current delegation depth (internal) | 0 |
| `--max-depth` | Maximum recursion depth | 3 |
| `--output` | Output file for results | stdout |
| `--verbose` | Verbose logging | false |

## Delegation Depth & Loop Prevention

To prevent infinite delegation loops:

- **Depth 0**: Parent agent (you)
- **Depth 1**: First-level delegates (spawned by parent)
- **Depth 2**: Second-level delegates (spawned by depth-1)
- **Depth 3**: Maximum - delegates at this depth cannot spawn further delegates

The delegate skill automatically tracks depth via the `DELEGATE_DEPTH` environment variable. Attempts to delegate beyond max depth return an error.

## Context Handoff

When you delegate, the sub-agent receives:

1. **Task prompt** - What to do
2. **System prompt** - How to behave (expertise persona)
3. **File context** - Relevant files from parent session
4. **Parent analysis** - Your findings so far (optional)
5. **Depth metadata** - Prevents infinite recursion

### Context Packaging

```javascript
{
  delegateTask: "Check for SQL injection vulnerabilities",
  parentAnalysis: "Found 3 database queries in auth.ts...",
  relevantFiles: [
    { path: "./src/auth.ts", content: "..." },
    { path: "./src/db.ts", content: "..." }
  ],
  delegationDepth: 1,
  maxDepth: 3,
  parentSession: "job/abc123"
}
```

## Structured Output Format

Delegates return JSON-structured results:

```json
{
  "delegateTask": "Check for SQL injection vulnerabilities",
  "delegationDepth": 1,
  "status": "complete",
  "findings": [
    {
      "file": "./src/auth.ts",
      "line": 42,
      "severity": "high",
      "issue": "Potential SQL injection via unsanitized input",
      "codeSnippet": "const query = `SELECT * FROM users WHERE id = ${userId}`;",
      "recommendation": "Use parameterized queries"
    }
  ],
  "summary": "Found 2 high-severity SQL injection risks",
  "filesAnalyzed": 5,
  "nextSteps": [
    "Review ./src/api.ts for similar patterns",
    "Add input validation layer"
  ],
  "allowFurtherDelegation": true
}
```

## Examples

### Example 1: Code Review with Specialized Delegates

```bash
# Parent: "Review this PR comprehensively"

# Delegate security review
node /job/.pi/skills/agent-delegate/delegate.js \
  --task "Review for security vulnerabilities: SQL injection, XSS, auth bypass, CSRF" \
  --system "You are a security engineer with 10 years experience. Focus on OWASP Top 10." \
  --files "./src/auth.ts ./src/api.ts ./src/db.ts" \
  --output security_review.json

# Delegate performance review
node /job/.pi/skills/agent-delegate/delegate.js \
  --task "Review for performance issues: N+1 queries, memory leaks, inefficient algorithms" \
  --system "You are a performance optimization expert. Identify bottlenecks and optimization opportunities." \
  --files "./src/db.ts ./src/cache.ts" \
  --output performance_review.json

# Merge results
node /job/.pi/skills/agent-delegate/merge.js \
  --inputs security_review.json performance_review.json \
  --output combined_review.md
```

### Example 2: Research with Parallel Delegates

```bash
# Parallel research delegation
node /job/.pi/skills/agent-delegate/delegate.js \
  --parallel \
  --task-1 "Research market trends for AI agents in enterprise" \
  --task-2 "Identify top 10 competitors and their key features" \
  --task-3 "Summarize customer pain points from Reddit, Hacker News, Twitter" \
  --system-1 "You are a market analyst" \
  --system-2 "You are a competitive intelligence specialist" \
  --system-3 "You are a user research expert" \
  --output-1 market_trends.json \
  --output-2 competitor_analysis.json \
  --output-3 user_pain_points.json
```

### Example 3: Multi-Phase Problem Solving

```bash
# Phase 1: Analysis
node /job/.pi/skills/agent-delegate/delegate.js \
  --task "Analyze this bug report and identify root cause candidates" \
  --context "./bug_report.md" \
  --output analysis.json

# Phase 2: Solution Design (builds on Phase 1)
node /job/.pi/skills/agent-delegate/delegate.js \
  --task "Design a fix for the identified root cause" \
  --context "./analysis.json" \
  --system "You are a senior engineer specializing in system design" \
  --output solution.json

# Phase 3: Implementation Plan
node /job/.pi/skills/agent-delegate/delegate.js \
  --task "Create a step-by-step implementation plan with code examples" \
  --context "./solution.json" \
  --system "You are a tech lead who writes clear implementation guides" \
  --output implementation_plan.md
```

## Integration with PopeBot Jobs

Use agent delegation inside a job by calling the delegate script:

```markdown
# job.md

I need to review this pull request comprehensively.

## Step 1: Delegate Security Review

First, let me spawn a security specialist:

\`\`\`bash
node /job/.pi/skills/agent-delegate/delegate.js \
  --task "Review PR #{{pr_number}} for security vulnerabilities" \
  --system "You are a security engineer focused on OWASP Top 10" \
  --files "./src/auth.ts ./src/api.ts"
\`\`\`

## Step 2: Delegate Performance Review

Now a performance specialist:

\`\`\`bash
node /job/.pi/skills/agent-delegate/delegate.js \
  --task "Review PR #{{pr_number}} for performance issues" \
  --system "You are a performance optimization expert"
\`\`\`

## Step 3: Synthesize Results

Now I'll merge the findings...
```

## Parallel Delegation Mode

The `--parallel` flag spawns multiple delegates concurrently:

```bash
node /job/.pi/skills/agent-delegate/delegate.js \
  --parallel \
  --task-1 "Security review" \
  --task-2 "Performance review" \
  --task-3 "Style review" \
  --system-1 "Security expert persona..." \
  --system-2 "Performance expert persona..." \
  --system-3 "Style expert persona..." \
  --output-1 security.json \
  --output-2 performance.json \
  --output-3 style.json \
  --synthesize "Combine all reviews into unified report"
```

**Parallel mode behavior:**
- Spawns all delegates simultaneously (up to 5)
- Waits for all to complete
- Optionally runs a synthesis step to merge results
- Returns array of all delegate results

## Error Handling

### Delegation Depth Exceeded

```json
{
  "error": "MAX_DEPTH_EXCEEDED",
  "message": "Cannot delegate further: maximum depth (3) reached",
  "currentDepth": 3,
  "recommendation": "Complete this subtask directly without further delegation"
}
```

### Task Failure

```json
{
  "error": "DELEGATE_FAILED",
  "message": "Sub-agent failed to complete task",
  "task": "Check for SQL injection",
  "reason": "LLM API error: rate limit exceeded",
  "retryable": true
}
```

## Best Practices

### When to Delegate

1. **Clear expertise boundaries** - Security, performance, style, UX
2. **Independent subtasks** - Can run in parallel
3. **Need different personas** - Each delegate has unique system prompt
4. **Complex multi-phase work** - Analysis → Design → Implementation

### When NOT to Delegate

1. **Simple tasks** - Overhead exceeds benefit
2. **Tightly coupled work** - Requires continuous back-and-forth
3. **You have the expertise** - No need to spawn a clone
4. **Time-critical** - Delegation adds latency

### Effective Delegation Patterns

**Good:**
```
Parent: "Comprehensive code review"
├─ Delegate 1: Security review (OWASP focus)
├─ Delegate 2: Performance review (bottleneck focus)
└─ Delegate 3: Style review (best practices focus)
```

**Bad:**
```
Parent: "Review code"
├─ Delegate 1: "Find bugs"
│  └─ Delegate 2: "Find security bugs"  # Too similar!
└─ Delegate 3: "Find security issues"   # Duplicate!
```

## Testing

```bash
# Run unit tests
node /job/.pi/skills/agent-delegate/tests/unit.test.js

# Run integration test
node /job/.pi/skills/agent-delegate/tests/integration.test.js

# Test depth limiting
node /job/.pi/skills/agent-delegate/tests/depth.test.js
```

## Files

| File | Purpose |
|------|---------|
| `delegate.js` | Main delegation executor |
| `merge.js` | Merge multiple delegate results |
| `parallel.js` | Parallel delegation coordinator |
| `context.js` | Context packaging utilities |
| `tests/` | Unit and integration tests |
| `SKILL.md` | This documentation |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DELEGATE_DEPTH` | Current delegation depth | 0 |
| `DELEGATE_MAX_DEPTH` | Maximum recursion depth | 3 |
| `DELEGATE_PARALLEL_LIMIT` | Max parallel delegates | 5 |
| `ANTHROPIC_API_KEY` | API key for Claude | Required |

## See Also

- [Prose Runner](../prose-runner/SKILL.md) - Multi-session workflow orchestration
- [Workflow Orchestrator](../workflow-orchestrator/SKILL.md) - Job-based pipelines
- [SOP System](../sop-system/SKILL.md) - Standard operating procedures

---

**Inspired by ZeroClaw's delegate.rs architecture** - Real-time agent-to-agent context handoff with depth limiting and structured result merging.
