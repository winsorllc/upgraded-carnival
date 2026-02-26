---
name: PopeBot Operations
description: Manage, configure, and troubleshoot the PopeBot agent deployment — includes LLM provider setup, Docker operations, GitHub Actions job dispatch, secret rotation, and disaster recovery.
---

# PopeBot Operations Skill

## Overview

PopeBot (thepopebot) is an autonomous AI agent system deployed at `d:\dev_aiwinsor\popebot_agent\`. It runs primarily via GitHub Actions for completely autonomous operation.

**GitHub Repo:** `winsorllc/upgraded-carnival` (**PUBLIC** — for unlimited free Actions minutes)

---

## Architecture

```
Schedule (CRONS.json) → GitHub Actions (job/** branch) → Pulls Docker Image → Executes Job → Opens PR
```

1. **GitHub Actions Runner:** Runs `stephengpope/thepopebot:job-1.2.71` container.
2. **Local Event Handler:** A local Docker container (`thepopebot-event-handler`) that can be used to run `gh` CLI commands to interact with the repository and jobs. (Note: The Next.js web chat portion crashes on startup).

---

## Active Agents

The system runs 3 distinct agents mapped directly to Ollama Cloud models via `CRONS.json`:

| Agent | Model | Provider | Role |
|-------|-------|----------|------|
| **Kate** | `kimi-k2.5` | custom | The Architect (Best at dedup and comprehensive docs) |
| **Mimi** | `minimax-m2.5` | custom | The Heavy Engineer (Best writer, production-grade) |
| **Jackie** | `glm-5` | custom | The System Scripter (High volume, OS-level tools) |

*(Note: Gwen `qwen3.5:397b` is shelved due to consistently returning empty responses).*

---

## Key Files

| File | Purpose |
|------|---------|
| `d:\dev_aiwinsor\popebot_agent\claude_mem\POPEBOT_IMPLEMENTATION_PLAN.md` | **The Master Operations Manual & Handoff Document** |
| `d:\dev_aiwinsor\popebot_agent\config\CRONS.json` | Agent schedules, job descriptions, and on/off switches |
| `d:\dev_aiwinsor\popebot_agent\config\AGENT.md` | Agent identity mappings |
| `d:\dev_aiwinsor\popebot_agent\.pi\skills\` | The 100+ skills the agents have built |
| `d:\dev_aiwinsor\popebot_agent\.github\workflows\run-job.yml` | Main GitHub Actions workflow |

---

## LLM Configuration (Ollama Cloud)

**GitHub Secrets/Variables Target Config:**
```
LLM_PROVIDER=custom
OPENAI_BASE_URL=https://ollama.com/v1
# LLM_MODEL is set dynamically per job within CRONS.json
# AGENT_CUSTOM_API_KEY is stored in GitHub Secrets
```

**Local Testing Security & Manifest:**
Do **NOT** hardcode the `CUSTOM_API_KEY` in local testing scripts (`*.mjs`, `*.cjs`). Instead, use the environment variable:
```powershell
$env:OLLAMA_API_KEY = "<your-api-key>"

# 4-model benchmark test
node test_all_models.mjs

# Head-to-head evaluation
node test_kate_vs_jackie.mjs
```

---

## GitHub Operations via Docker

Because the local Event Handler container's Next.js web app currently crashes, use it purely as a clean environment for `gh` CLI commands. **Always use the persistently running container (`docker exec`)** to maintain state consistency.

### Start the Container
```powershell
docker start thepopebot-event-handler
```

### Check Agent Run Status
```powershell
docker exec -e GH_TOKEN=<token> thepopebot-event-handler gh run list -R winsorllc/upgraded-carnival -L 10
```

### View Agent Logs
```powershell
docker exec -e GH_TOKEN=<token> thepopebot-event-handler gh run view <run-id> --log -R winsorllc/upgraded-carnival
```

### Merge a PR
```powershell
# Option 1: Via GitHub API
docker exec -e GH_TOKEN=<token> thepopebot-event-handler gh pr merge <pr-number> -R winsorllc/upgraded-carnival --merge

# Option 2: Locally (better for resolving conflicts and preventing merge downgrades)
cd d:\dev_aiwinsor\popebot_agent
git fetch origin pull/<pr-number>/head:pr<number>
git checkout main
# WARNING: Always review the diff before merging. Do NOT blindly use "-X theirs" as it can overwrite superior skills.
git diff main...pr<number>
# After manual review:
git merge pr<number> -m "Merge PR <number>"
git push origin main
```

---

## Secret Rotation Procedures

In the event of token exposure (especially since the repository is **PUBLIC**), immediately execute these rotations:

### 1. Rotate GitHub PAT
1. Go to https://github.com/settings/tokens → Generate new token (classic).
2. Scope: `repo`, `workflow`, `write:packages`.
3. Update in GitHub Secrets: Repo → Settings → Secrets → `GH_TOKEN`.
4. Update local git remote: `git remote set-url origin https://<new-pat>@github.com/winsorllc/upgraded-carnival.git`.
5. Update Docker event handler if running (by setting `GH_TOKEN` env var).

### 2. Rotate Ollama Cloud API Key
1. Go to Ollama Cloud dashboard → API Keys → Regenerate.
2. Update in GitHub Secrets: `AGENT_CUSTOM_API_KEY`.
3. Update local environment variable: `$env:OLLAMA_API_KEY = "<new-key>"`.

---

## Disaster Recovery

If skills are accidentally downgraded from a bad merge or lost, use these recovery commands:

### Recovering Downgraded Skills
If a skill is inadvertently lost to an inferior copy, restore it from its best commit history:
```powershell
# Find the commit with the better version
git log --all --oneline -- ".pi/skills/<skill-name>/SKILL.md"
# Restore from specific commit
git show <commit-hash>:.pi/skills/<skill-name>/SKILL.md > .pi/skills/<skill-name>/SKILL.md
git add .pi/skills/<skill-name>/SKILL.md
git commit -m "Restore best <skill-name> skill"
```

### Recovering Skills from Closed PRs
If a PR was closed without merging, its codebase can still be recovered:
```powershell
git fetch origin pull/<pr-number>/head:recovery-<pr-number>
git checkout recovery-<pr-number> -- .pi/skills/<skill-name>/
git add .
git commit -m "Recover <skill-name> from PR #<number>"
```

---

## Known Issues & Gotchas

1. **Merge Downgrades:** When merging multiple agents' PRs, blindly accepting incoming changes can cause an inferior skill version to overwrite a superior, larger version from an earlier PR. Always verify file differences (using the local merge option).
2. **Event Handler Crash:** `thepopebot-event-handler` Next.js process crashes inside the local Docker container. Rely on GitHub Actions for jobs, and the raw `gh` CLI using `docker exec` for management.
3. **PAT / Key Exposure:** The repository is **PUBLIC**. Never commit API keys, `.env` files, or GitHub PATs to the codebase.
