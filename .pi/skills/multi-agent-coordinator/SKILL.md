---
name: multi-agent-coordinator
description: Coordinate multiple AI agents, discover active sessions, send messages between agents, and delegate work. Use when: (1) a task is too large for one agent and needs to be split, (2) multiple agents need to collaborate, (3) checking status of other running agents, (4) passing context between agents.
---

# Multi-Agent Coordinator

Coordinate multiple AI agents, discover active sessions, send messages between agents, and delegate work. This skill enables the PopeBot Docker agent to work alongside other agents in a multi-agent workflow.

## When to Use

- **Task splitting**: A large task needs to be divided between multiple agents
- **Coordination**: Multiple agents need to collaborate on related work
- **Status checking**: Check what other jobs/agents are currently running
- **Context sharing**: Pass information from one agent to another
- **Delegation**: Offload sub-tasks to specialized agents

## Architecture

This skill works by interacting with the GitHub API to discover and coordinate with other PopeBot agents:

1. **List active jobs**: Query GitHub Actions workflows to find running jobs
2. **Query job status**: Get details about specific jobs
3. **Coordinate via git**: Use git branches and commits to share context between agents

## Usage

### List Active Jobs

```bash
node /job/.pi/skills/multi-agent-coordinator/list-jobs.js
```

Shows all currently running GitHub Actions workflow runs.

### Check Specific Job Status

```bash
node /job/.pi/skills/multi-agent-coordinator/job-status.js <job-id>
```

Get detailed status of a specific job.

### Send Message to Another Agent

```bash
node /job/.pi/skills/multi-agent-coordinator/send-message.js <job-branch> "<message>"
```

Leave a message for another agent by creating a file in their working directory.

### Request Help from Another Agent

```bash
node /job/.pi/skills/multi-agent-coordinator/request-help.js <target-branch> "<task description>"
```

Create a help request that another agent can pick up.

### Check for Waiting Messages

```bash
node /job/.pi/skills/multi-agent-coordinator/check-messages.js
```

Check if any messages have been left for the current agent.

### Coordinate Multi-Agent Task

```bash
node /job/.pi/skills/multi-agent-coordinator/coordinate.js --task "<overall task>" --agents 3
```

Break down a large task and coordinate multiple agents to work on it in parallel.

## Output Format

### List Jobs Output

```json
{
  "total_count": 5,
  "jobs": [
    {
      "id": "123456789",
      "name": "Run Job",
      "status": "in_progress",
      "branch": "job/abc-123",
      "started_at": "2026-02-25T12:00:00Z",
      "html_url": "https://github.com/owner/repo/actions/runs/123456789"
    }
  ]
}
```

### Job Status Output

```json
{
  "id": "123456789",
  "name": "Run Job",
  "status": "in_progress",
  "conclusion": null,
  "branch": "job/abc-123",
  "run_number": 42,
  "event": "push",
  "created_at": "2026-02-25T12:00:00Z",
  "updated_at": "2026-02-25T12:30:00Z",
  "html_url": "https://github.com/owner/repo/actions/runs/123456789"
}
```

## Common Workflows

### Task Delegation

```
User: Analyze all the log files in /logs and create a summary
Agent: [Splits task] 
  1. Uses list-jobs to check if other agents are available
  2. Uses coordinate to delegate log analysis to multiple agents
  3. Aggregates results from all agents
```

### Multi-Agent Research

```
Agent: [Coordinate research task]
  1. coordinate.js --task "Research AI agents" --agents 3
  2. Agent 1: Researches OpenClaw
  3. Agent 2: Researches ZeroClaw
  4. Agent 3: Researches AutoGPT
  5. All results combined into final report
```

### Check Existing Work

```
Agent: [Before starting new work]
  1. list-jobs.js to see what's already running
  2. check-messages.js for any pending requests
  3. Integrates with existing work rather than duplicating
```

## Integration with Other Skills

- **With memory-agent**: Store coordination history for future reference
- **With session-files**: Track what each agent has been working on
- **With modify-self**: Can create new job branches for delegation

## Requirements

- GitHub CLI (`gh`) authenticated with appropriate permissions
- `GH_TOKEN` environment variable or `gh` CLI configured
- `GH_OWNER` and `GH_REPO` environment variables (optional, auto-detected from git remote)

## Limitations

- Only works with PopeBot/GitHub Actions-based agents
- Message passing requires write access to the repository
- Coordination is asynchronous (agents may not be online simultaneously)
- No real-time messaging - uses file-based communication via git

## Tips

1. **Use descriptive branch names**: Makes it easier to identify what other agents are working on
2. **Check for existing work**: Always list jobs before starting large tasks
3. **Leave context**: When delegating, include relevant context in messages
4. **Monitor completion**: Use list-jobs to track when delegated tasks complete
