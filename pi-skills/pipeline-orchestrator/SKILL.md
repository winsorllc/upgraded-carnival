---
name: pipeline-orchestrator
description: Deterministic pipeline orchestration with approval gates. Use for multi-step workflows that need human checkpoints, resumable execution, and structured JSON pipelines.
metadata: { "inspired_by": "OpenClaw Lobster", "version": "1.0.0" }
---

# Pipeline Orchestrator Skill

Execute deterministic, pipe-based workflows with approval checkpoints. Inspired by OpenClaw's Lobster architecture.

## When to Activate

Activate this skill when:

- User wants a repeatable multi-step automation
- Actions need human approval before executing (send, post, delete)
- Multiple tool calls should run as one deterministic operation
- Workflow needs to be resumable after approval
- User mentions "pipeline", "workflow with approval", or "checkpoint"

## Pipeline Syntax

Pipelines use a Unix pipe-like syntax with stages:

```
stage1 --arg1 value1 | stage2 --flag | stage3 --output result
```

### Stage Types

| Stage | Description | Example |
|-------|-------------|---------|
| `fetch` | Fetch data from URL or API | `fetch --url https://api.example.com/data` |
| `transform` | Transform/filter data | `transform --script ./transform.js` |
| `analyze` | LLM-based analysis | `analyze --prompt "Summarize this"` |
| `approve` | Human approval gate | `approve --prompt "Send these emails?"` |
| `send_email` | Send email | `send_email --to user@example.com` |
| `save` | Save to file | `save --path ./output.json` |
| `notify` | Send notification | `notify --channel telegram` |
| `command` | Run shell command | `command --run "npm test"` |

## Commands

### Run a Pipeline

```bash
# Run inline pipeline
pipeline run "fetch --url https://example.com | analyze --prompt 'Summarize' | save --path summary.md"

# Run from file
pipeline run ./my-pipeline.pln

# Run with variables
pipeline run ./my-pipeline.pln --var url=https://example.com --var recipient=user@example.com
```

### Resume After Approval

```bash
# Resume with approval
pipeline resume --token <resume_token> --approve

# Resume with rejection
pipeline resume --token <resume_token> --reject --reason "Not ready yet"
```

### Compile/Validate

```bash
# Validate pipeline syntax
pipeline compile ./my-pipeline.pln

# Show execution plan
pipeline plan ./my-pipeline.pln
```

## Pipeline File Format

`.pln` files use YAML-like syntax:

```yaml
# Example: Email triage pipeline
name: "Daily Email Triage"
version: "1.0"

variables:
  max_emails: 20
  recipient: "user@example.com"

stages:
  - id: fetch_emails
    type: fetch
    config:
      source: "gmail"
      query: "newer_than:1d"
      max: "{{max_emails}}"
    output: emails

  - id: triage
    type: analyze
    config:
      prompt: |
        Categorize these emails into:
        - needs_reply (urgent)
        - needs_action (tasks)
        - fyi (informational)
      input: "{{emails}}"
    output: categorized

  - id: approval_gate
    type: approve
    config:
      prompt: "Process {{categorized.needs_reply.length}} reply emails?"
      show_data: "{{categorized}}"
    on_approve:
      - id: send_replies
        type: send_email
        config:
          to: "{{recipient}}"
          subject: "Email Triage Results"
          body: "{{categorized}}"
    
    on_reject:
      - id: save_drafts
        type: save
        config:
          path: "./drafts.json"
          data: "{{categorized}}"

  - id: notify_complete
    type: notify
    config:
      channel: "telegram"
      message: "Email triage complete!"
```

## Approval Gate Behavior

When a pipeline hits an `approve` stage:

1. **Execution pauses** - No further stages run
2. **Returns structured response**:
   ```json
   {
     "status": "needs_approval",
     "resumeToken": "pipeline_abc123_stage_3",
     "prompt": "Send 3 draft replies?",
     "data": { ... preview data ... }
   }
   ```
3. **User reviews** and calls `pipeline resume` with `--approve` or `--reject`
4. **Execution continues** from the checkpoint

## Variables

Use `{{variable_name}}` for substitution:

- Built-in: `{{datetime}}`, `{{job_id}}`, `{{workspace}}`
- Pipeline variables: Defined in `variables:` section or `--var` flag
- Stage outputs: `{{stage_id.output_field}}`

## Error Handling

```yaml
stages:
  - id: risky_fetch
    type: fetch
    config:
      url: "https://api.example.com/data"
    on_error:
      - id: fallback
        type: command
        config:
          run: "echo 'Using cached data'"
      - id: use_cache
        type: fetch
        config:
          source: "./cache.json"
```

## Output Format

Successful pipeline execution returns:

```json
{
  "protocolVersion": 1,
  "ok": true,
  "status": "completed",
  "pipeline": "Daily Email Triage",
  "stages_completed": 5,
  "outputs": {
    "fetch_emails": { ... },
    "triage": { ... },
    "send_replies": { "sent": 3 }
  },
  "duration_ms": 4521
}
```

## Examples

### Example 1: PR Review Pipeline

```yaml
name: "PR Auto-Review"
stages:
  - id: fetch_pr
    type: fetch
    config:
      source: "github"
      pr: "{{pr_number}}"
  
  - id: analyze_code
    type: analyze
    config:
      prompt: "Review this PR for bugs and best practices"
      input: "{{fetch_pr.diff}}"
  
  - id: post_comment
    type: command
    config:
      run: "gh pr comment {{pr_number}} --body '{{analyze_code.summary}}'"
```

### Example 2: Content Publishing with Approval

```yaml
name: "Blog Post Publisher"
stages:
  - id: draft
    type: analyze
    config:
      prompt: "Write a blog post about {{topic}}"
  
  - id: review
    type: approve
    config:
      prompt: "Publish this post?"
      show_data: "{{draft.content}}"
    on_approve:
      - id: publish
        type: command
        config:
          run: "npm run publish -- --content '{{draft.content}}'"
      - id: notify
        type: notify
        config:
          message: "Blog post published!"
```

### Example 3: Data Sync Pipeline

```
fetch --url https://api_source.com/data --format json |
transform --script ./normalize.js |
analyze --prompt "Validate data quality" |
approve --prompt "Sync {{count}} records?" |
command --run "node ./sync.js --records {{validated_data}}" |
notify --channel telegram --message "Sync complete"
```

## Implementation Files

| File | Purpose |
|------|---------|
| `pipeline.js` | Main executor |
| `parser.js` | Pipeline syntax parser |
| `stages/` | Stage implementations |
| `cli.js` | Command-line interface |
| `test.js` | Test suite |

## Installation

```bash
# Activate the skill
cd /job/.pi/skills
ln -s ../../pi-skills/pipeline-orchestrator pipeline-orchestrator

# Install dependencies
cd pipeline-orchestrator
npm install
```

## Dependencies

```json
{
  "node-fetch": "^3.3.2",
  "js-yaml": "^4.1.0",
  "uuid": "^9.0.0"
}
```

## Testing

```bash
# Run unit tests
node test.js

# Run integration test
node test.js --integration

# Test specific pipeline
node cli.js run ./examples/basic.pln --test
```

## When to Use Pipeline Orchestrator

- Multi-step workflows with clear stages
- Workflows requiring human approval checkpoints
- Repeatable automations (daily reports, syncs)
- Deterministic operations (same input → same output)

## When NOT to Use

- Single simple tasks (use direct agent)
- Workflows requiring LLM variance/creativity
- Real-time interactive sessions
- Workflows under 10 seconds (overhead)

## Security Considerations

- Approval gates prevent unauthorized actions
- Pipeline files are validated before execution
- Shell commands run in sandboxed subprocess
- Resume tokens are UUID-based and single-use

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Pipeline fails at stage | Check stage config, verify inputs |
| Approval not working | Ensure `resume_token` is correct |
| Variable not substituting | Check variable name matches definition |
| Stage timeout | Increase timeout in config |

## Credits

Inspired by [OpenClaw Lobster](https://github.com/openclaw/openclaw/tree/main/extensions/lobster). Reimplemented for PopeBot with YAML pipeline files and native tool integration.
