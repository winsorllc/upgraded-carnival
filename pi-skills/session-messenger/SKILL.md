---
name: session-messenger
description: Enable inter-agent communication by discovering active sessions, sending messages between agents, and coordinating multi-agent workflows.
version: 1.0.0
author: Inspired by OpenClaw's session tools for PopeBot
---

# Session Messenger Skill

This skill enables the PopeBot agent to discover other active agent sessions, send messages between agents, and coordinate multi-agent workflows. It's useful when multiple agent jobs need to work together or share information.

## Setup

No additional setup required. This skill works out of the box using the job metadata system.

## Capabilities

### 1. Discover Active Sessions
Find all currently running agent jobs:
- List active job IDs and their metadata
- See what each job is working on
- Identify which jobs are available for communication

### 2. Send Messages Between Agents
Communicate with other agent sessions:
- Send messages to specific job IDs
- Include structured data in messages
- Request responses or await replies

### 3. Coordinate Multi-Agent Workflows
Orchestrate complex tasks across multiple agents:
- Break down complex tasks between agents
- Aggregate results from multiple workers
- Maintain shared context through message passing

## When to Use

- **Parallel processing**: Split a large task into subtasks for multiple agents
- **Specialized expertise**: One agent handles code, another handles documentation
- **Review workflows**: One agent produces output, another reviews it
- **Coordination**: Multiple agents need to share state or results

## Usage

### List Active Sessions

```bash
{baseDir}/session-list.js
```

Lists all active sessions (jobs currently running). Returns job IDs, start times, and descriptions.

### Send a Message

```bash
{baseDir}/session-send.js --to JOB_ID --message "Your message here"
```

Sends a message to another active session. Use `--await` to wait for a response.

### Get Session History

```bash
{baseDir}/session-history.js JOB_ID
```

Retrieves the message history for a specific session.

### Example: Coordinate Multiple Agents

```bash
# Agent 1: Send work to Agent 2
{baseDir}/session-send.js --to job-abc-123 --message "Please review this code: const x = 42;"

# Agent 2: Check inbox for messages
{baseDir}/session-list.js

# Agent 2: Send response back
{baseDir}/session-send.js --to job-xyz-789 --message "Code looks good! Consider adding type annotations."
```

## Technical Details

This skill uses a shared message store at `/tmp/session-messages/`:
- `inbox/` — Messages received by this session
- `outbox/` — Messages sent by this session
- `metadata/` — Session registration and heartbeat info

Each job registers itself on startup with a heartbeat that expires after 30 minutes of inactivity.

## Security Notes

- Only active sessions (with valid heartbeats) can receive messages
- Messages are stored with timestamps and sender IDs
- No sensitive data should be passed in plain text between agents when possible
