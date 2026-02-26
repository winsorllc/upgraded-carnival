# PopeBot Agent — Operations Manual & Handoff Document
**Version:** 2.1 (Corrected after self-critique)  
**Last Updated:** 2026-02-25  
**Author:** Antigravity (Architecture + Operations Sessions)  
**Status:** ✅ PHASE 1-2 COMPLETE — Agents deployed, skills built, benchmarked

---

## 0. Executive Summary

**PopeBot** is a multi-agent autonomous AI system running on free GitHub Actions compute, powered by Ollama Cloud LLMs ($20/month). It uses [ThePopeBot](https://github.com/stephengpope/thepopebot) framework.

### Current State (as of 2026-02-25):
- **3 active agents** (Jackie, Mimi, Kate) — 1 shelved (Gwen)
- **102 skills** (with SKILL.md) across 103 directories on `main` branch
- **Repository:** `winsorllc/upgraded-carnival` (PUBLIC — unlimited free Actions minutes)
- **Cron jobs:** Currently DISABLED (all `"enabled": false`)
- **Cost:** $20/month (Ollama Cloud subscription only)

---

## 1. Agent Roster

### Active Agents

| Agent | Model | Provider | Cron Schedule (UTC) | Strengths | Role |
|---|---|---|---|---|---|
| **Kate** 🏆 | `kimi-k2.5` | Kimi | `40 20 * * *` | Best dedup compliance, most comprehensive docs, genuine creative engineering | The Architect |
| **Mimi** 🥈 | `minimax-m2.5` | Minimax | `30 20 * * *` | Best writer (535 words on target), strongest integrations, production-grade rewrites | The Heavy Engineer |
| **Jackie** 🥉 | `glm-5` | GLM | `20 20 * * *` | Highest volume (27 skills/run), excellent OS-level tools, native bash scripts | The System Scripter |

### Shelved Agents

| Agent | Model | Reason | Evidence |
|---|---|---|---|
| **Gwen** ❌ | `qwen3.5:397b` | Produces no output — confirmed broken across all tests | PR #16 had 0 skills; 500-word essay test returned empty; identity check returned empty |

### Agent Identity System
Agents are configured in `config/AGENT.md`. Each agent identifies itself by name based on the `LLM_MODEL` environment variable. They sign emails, PR titles, and reports with their name.

---

## 2. Infrastructure

### 2.1 GitHub Repository
- **Repo:** `winsorllc/upgraded-carnival`
- **Visibility:** PUBLIC (switched from private on 2026-02-25 for unlimited free Actions minutes)
- **Local clone:** `D:\dev_aiwinsor\popebot_agent\`
- **Remote URL:** `https://github.com/winsorllc/upgraded-carnival.git`

### 2.2 Authentication
- **GitHub PAT:** Stored as `GH_TOKEN` in GitHub Secrets
  - ⚠️ An earlier PAT was revoked after being exposed in a commit. Current PAT was generated 2026-02-25.
  - The local git remote URL contains the PAT inline (update if rotated)
- **Ollama Cloud API Key:** `AGENT_CUSTOM_API_KEY` in GitHub Secrets
  - Base URL: `https://ollama.com/v1`
  - Provider: `custom` (OpenAI-compatible endpoint)
- **Email:** `AGENT_POPEBOT_EMAIL_USER` and `AGENT_POPEBOT_EMAIL_PASS` in GitHub Secrets
  - Email: `winsorhoang@gmail.com` (Gmail App Password)
  - Reports sent to: `winsorllc@yahoo.com`

### 2.3 GitHub Actions Workflow
The main workflow is `.github/workflows/run-job.yml`:
- **Trigger:** Push to any `job/**` branch
- **Runner:** `ubuntu-latest` (4 CPU, 16 GB RAM, 14 GB SSD)
- **Docker image:** `stephengpope/thepopebot:job-1.2.71`
- **Flow:** Checkout branch → Read job config → Pull Docker image → Run agent inside container → Agent commits results → Agent opens PR

### 2.4 GitHub Actions Variables (Repo Settings → Variables)
| Variable | Value |
|---|---|
| `LLM_PROVIDER` | `custom` |
| `LLM_MODEL` | (set per-cron, not globally) |
| `OPENAI_BASE_URL` | `https://ollama.com/v1` |
| `AUTO_MERGE` | `false` |

### 2.5 Docker Event Handler
- **Container name:** `thepopebot-event-handler`
- **Image:** `popebot_agent-event-handler:latest` (built locally from `docker-compose.yml`)
- **Purpose:** Runs the Next.js web chat + webhook handler
- **Status:** Crashes on startup (Next.js issue), but `gh` CLI inside it works for API calls
- **Note:** This container frequently stops and needs `docker start thepopebot-event-handler`

### 2.6 Local Directory Structure
```
D:\dev_aiwinsor\popebot_agent\
├── .github/workflows/          # GitHub Actions (run-job.yml, auto-merge.yml, etc.)
├── .pi/skills/                 # ALL 112 SKILLS (consolidated here)
├── config/
│   ├── AGENT.md                # Agent identity (name mapping)
│   ├── CRONS.json              # Cron schedules (all disabled)
│   ├── SOUL.md                 # Agent personality
│   ├── EVENT_HANDLER.md        # Chat system prompt
│   └── HEARTBEAT.md            # Self-monitoring prompt
├── claude_mem/                 # This folder — handoff documents
│   ├── POPEBOT_IMPLEMENTATION_PLAN.md  # THIS FILE
│   ├── AGENT_PERFORMANCE.md    # Full agent rankings & benchmarks
│   ├── MODEL_TEST_RESULTS.md   # Direct API test (identity + essay)
│   ├── KATE_VS_JACKIE.md       # Head-to-head skill improvement test
│   ├── CRONS.json              # Copy of cron config
│   ├── AGENT.md                # Copy of agent identity
│   └── test_*.mjs/.cjs         # Rerunnable test scripts
├── logs/                       # Per-job execution logs (auto-generated)
├── docker-compose.yml          # Local Docker Compose for event handler
├── .env                        # Local environment (gitignored)
└── .gitignore                  # Includes .env, *.log, temp files
```

---

## 3. How It Works (End-to-End Flow)

### 3.1 Cron Job Flow
```
1. GitHub Actions cron fires (schedule in CRONS.json)
2. Workflow creates a `job/<uuid>` branch
3. Commits a `job.config.json` with the LLM model/provider
4. Pushes to the job branch → triggers run-job.yml
5. run-job.yml pulls thepopebot Docker image
6. Docker container clones the repo, reads AGENT.md + skills
7. Agent executes the job description using the assigned LLM
8. Agent commits results (new skills, code, logs) to the job branch
9. Agent opens a Pull Request against main
10. Auto-merge workflow runs (currently disabled — AUTO_MERGE=false)
11. User manually reviews and merges the PR
```

### 3.2 Enabling/Disabling Agents
To turn agents on/off, edit `config/CRONS.json`:
```json
{
  "name": "repo-scan-kimi",
  "schedule": "40 20 * * *",
  "type": "agent",
  "job": "...",
  "llm_provider": "custom",
  "llm_model": "kimi-k2.5",
  "enabled": true    ← flip this to true/false
}
```
Then commit and push to `main`.

### 3.3 Job Description (The Prompt)
The `"job"` field in CRONS.json IS the prompt sent to the agent. Current job includes:
1. **Dedup instruction:** "FIRST: List all existing skills in .pi/skills/ and note their names — DO NOT rebuild any skill that already exists there."
2. **Scan instruction:** Scan 3 GitHub repos for new ideas
3. **Build instruction:** Create SKILL.md + implementation + tests for each new skill
4. **Report instruction:** Email a progress report to winsorllc@yahoo.com

### 3.4 Manual Commands via Docker
To run ad-hoc commands using `gh` CLI:
```powershell
docker start thepopebot-event-handler
docker exec -e GH_TOKEN=<token> thepopebot-event-handler gh <command> -R winsorllc/upgraded-carnival
```

Or use a fresh container:
```powershell
docker run --rm -e GH_TOKEN=<token> popebot_agent-event-handler:latest sh -c '<commands>'
```

---

## 4. Skills Inventory

### 4.1 Current Count (Verified 2026-02-25)
- **103 skill directories** in `.pi/skills/`
- **102 SKILL.md files** (the `tests/` directory has no SKILL.md)
- **69 skills with implementation code** (index.js, watch.sh, etc.)
- **33 skills with SKILL.md only** (documentation/spec but no runnable code)

### 4.2 Skill Quality Tiers (based on content analysis)

**Tier 1 — Production-Grade (written by Kate/Mimi):**
- `hybrid-memory` (10.5K) — Multi-layer memory system
- `cost-tracker` (6.4K) — Budget alerts, cost attribution
- `spotify-player` (7.9K) — Full playback control with helper functions ← **Mimi's upgrade survived merge**
- `code-analyzer` (7.7K) — Static analysis

**⚠️ MERGE DOWNGRADE WARNING:** When merging PRs #14 and #15, we used `git merge -X theirs` which silently overwrote some superior skill versions:
- `weather` was **downgraded** from 6,511 bytes (Kate's) → 2,484 bytes (Mimi's simpler version)
- `http-request` was **downgraded** from 8,069 bytes → 3,349 bytes
- These could be restored from earlier commits if needed (see §12)

**Tier 2 — Solid (written by Jackie/Mimi):**
- `file-watcher` (5.0K) — Native bash with inotifywait, daemon mode, debouncing
- `notion` (5.1K) — Notion API integration
- `session-logs` (4.3K) — Session management
- `trello-ops` — Trello board management

**Tier 3 — SKILL.md only (no implementation code):**
- 33 skills have documentation but no runnable scripts. They serve as specs for future implementation.

### 4.3 Duplicate Prevention
All skills were consolidated from both `.pi/skills/` and `pi-skills/` (some agents used the wrong path) into `.pi/skills/` only. The job description now includes a dedup instruction that agents must follow.

---

## 5. Agent Performance Data

### 5.1 Skill Production (Feb 24-25, 2026)

| Agent | PRs Merged | Total Skills | Unique/New | Duplicates | Dedup Compliant |
|---|---|---|---|---|---|
| Kate | PR #5, #2, #17 | 47+ | ~40 | ~7 | ✅ Perfect (PR #17 had 0 dupes) |
| Mimi | PR #4, #15 | 32+ | ~19 | ~13 | ❌ Partial |
| Jackie | PR #1, #14 | 38+ | ~28 | ~10 | ❌ Partial |
| Gwen | PR #6, #16 | 0 | 0 | 0 | N/A (broken) |

### 5.2 Direct API Benchmarks (2026-02-25)

**500-Word Essay Test:**

| Agent | Model | Words | Time | Result |
|---|---|---|---|---|
| Mimi | minimax-m2.5 | **535** ✅ | 28.6s | Only model to hit target. Structured, cited real examples. |
| Jackie | glm-5 | 315 | 46.4s | Good prose but cut off at token limit. |
| Kate | kimi-k2.5 | 254 | 20.9s | Dense, specific, but cut off. Fastest thinker. |
| Gwen | qwen3.5:397b | 0 | 38.8s | No content. Broken. |

**Identity Check:** All models returned "No content" (Ollama Cloud may strip identity responses).

### 5.3 Head-to-Head: Kate vs Jackie
When given Jackie's `system-info` skill (303 words) and asked to improve it, Kate produced a 1,249-word version with:
- Global flags (--watch, --threshold, --export)
- Health scoring (0-100 rating)
- Hardware sensors, swap monitoring, disk I/O latency
- Container awareness (Docker/K8s detection)
- Edge cases section, exit codes, JSON schema versioning

**Conclusion:** Kate genuinely improves skills when given a baseline.

**⚠️ Methodology caveat:** This test explicitly asked Kate to "write a BETTER version." Any competent LLM will add more sections when told to improve. The stronger evidence for Kate's independent quality is her PR #17 output: 10 unique skills, 0 duplicates, all conceived from scratch without a baseline to copy or expand from.

---

## 6. Cost Analysis (Actual)

| Item | Cost | Notes |
|---|---|---|
| Ollama Cloud (3 models) | $20.00/mo | GLM-5, Minimax M2.5, Kimi K2.5 |
| GitHub Actions compute | **$0.00** | Public repo = unlimited free minutes |
| GitHub repo (public) | $0.00 | — |
| Voice / Chat | N/A | Not implemented yet (planned Phase 3) |
| **TOTAL** | **$20.00/month** | |

### Budget History:
- Before switching to public: Used $8.14 of $11.00 budget (2,000 free minutes exhausted quickly)
- After switching to public: Unlimited free minutes, no further budget concerns

---

## 7. Known Issues & Gotchas

### 7.1 Critical
- **PAT exposure:** An earlier GitHub PAT was committed to the repo history. It was revoked and a new one generated. The current PAT is also embedded in the local git remote URL (`git remote -v` will show it). Always use GitHub Secrets for CI, never commit tokens.
- **Gwen assessment:** `qwen3.5:397b` returned empty responses on all tests (2 prompts via API, 2 PR runs). **Caveat:** We only tested with 2 prompts and default settings. The 397B model may have different rate limits, timeouts, or content filtering. The "broken" diagnosis could be an API-level issue rather than a model defect. Consider retesting with higher `max_tokens`, different prompts, or checking raw HTTP response bodies before permanently decommissioning.

### 7.2 Operational
- **Event handler crashes:** The `thepopebot-event-handler` Docker container crashes on Next.js startup. It needs `docker start` before each use. The gh CLI inside still works.
- **pi-skills vs .pi/skills:** Some agents create skills in `pi-skills/` instead of `.pi/skills/`. We consolidated everything into `.pi/skills/` and the dedup instruction references that path.
- **Token limit on essays:** Kate and Jackie hit the 1500 token limit before finishing longer content. Increase `max_tokens` for complex tasks.
- **Merge downgrades:** Using `git merge -X theirs` to merge PRs silently overwrote some superior skill versions with inferior ones. Future merges should compare file sizes/content before using `-X theirs`.
- **Merge conflicts:** When merging PRs locally, symlink conflicts can occur (e.g., `.pi/skills/file-watcher~pr14`). Resolve with `git rm -f <conflict-file>` then commit.
- **Agent attribution is fragile:** After merging, the git history doesn't cleanly attribute which agent wrote which skill. Attribution requires cross-referencing job UUIDs in branch names with run logs. No agent-name tags exist in commits.

### 7.3 Security (UPDATED 2026-02-25)
- ✅ All hardcoded API keys removed from test scripts (now use `OLLAMA_API_KEY` env var)
- ✅ `.env` file is gitignored
- ✅ `.gitignore` includes: `.env`, `*.log`, `runs*.json`, temp files
- ✅ Secrets managed via GitHub Settings → Secrets and Variables → Actions
- ⚠️ The GitHub PAT is embedded in the local git remote URL (visible via `git remote -v`)
- ⚠️ API keys and PATs may still exist in git history (the repo is PUBLIC). Consider using `git filter-branch` or BFG Repo Cleaner if this is a concern.
- ⚠️ The Ollama Cloud API key was previously hardcoded in 8 committed files. Those commits are still in repo history.

---

## 8. How to Manage These Agents (Runbook)

### 8.1 Re-enable Agents
```powershell
# Edit CRONS.json, set "enabled": true for desired agents
# Commit and push
cd D:\dev_aiwinsor\popebot_agent
git add config/CRONS.json
git commit -m "Enable agents"
git push origin main
```

### 8.2 Check Agent Run Status
```powershell
# Via gh CLI in Docker
docker start thepopebot-event-handler
docker exec -e GH_TOKEN=<token> thepopebot-event-handler gh run list -R winsorllc/upgraded-carnival -L 10
```

### 8.3 View Agent Logs
```powershell
docker run --rm -e GH_TOKEN=<token> popebot_agent-event-handler:latest sh -c "gh run view <run-id> --log -R winsorllc/upgraded-carnival"
```

### 8.4 Merge a PR
```powershell
# Option 1: Via GitHub API
docker exec -e GH_TOKEN=<token> thepopebot-event-handler gh pr merge <pr-number> -R winsorllc/upgraded-carnival --merge

# Option 2: Locally (better for conflict resolution)
git fetch origin pull/<pr-number>/head:pr<number>
git merge pr<number> -X theirs -m "Merge PR <number>"
git push origin main
```

### 8.5 Close a PR
```powershell
docker exec -e GH_TOKEN=<token> thepopebot-event-handler gh pr close <pr-number> -R winsorllc/upgraded-carnival -c "Reason"
```

### 8.6 Run Model Tests
```powershell
# Set API key first (required — no longer hardcoded)
$env:OLLAMA_API_KEY = "your-ollama-api-key-here"

# All 4 models — identity + 500-word essay
node D:\dev_aiwinsor\popebot_agent\test_all_models.mjs

# Kate vs Jackie head-to-head
node D:\dev_aiwinsor\popebot_agent\test_kate_vs_jackie.mjs
```

### 8.7 Count Skills on Main
```powershell
Get-ChildItem D:\dev_aiwinsor\popebot_agent\.pi\skills\ -Directory | Measure-Object
```

### 8.8 Change Agent Job Description
Edit the `"job"` field in `config/CRONS.json`. The job field is the exact prompt sent to the agent. Include:
1. A dedup instruction (check existing skills first)
2. Clear task description
3. Email reporting instruction

---

## 9. What's Completed vs Remaining

### ✅ Completed (Phase 1-2)
- [x] PopeBot deployed on GitHub Actions
- [x] Ollama Cloud models configured (custom provider)
- [x] 3 agents running (Jackie, Mimi, Kate)
- [x] 102 skills built and consolidated (69 with implementation code, 33 spec-only)
- [x] Dedup instruction added to prevent skill rebuilds
- [x] Repository switched to public for free compute
- [x] PAT rotated and secured
- [x] Email notifications working (agents send reports)
- [x] Performance benchmarks completed
- [x] Agent rankings established

### ❌ Not Started (Phase 3-5)
- [ ] Voice integration (Web Speech API for phone browser)
- [ ] Legal skills ported from `litigant_warfare_gem3/legal_gem/skills/`
- [ ] Reference data synced to `data/source_facts/`
- [ ] Telegram bot for mobile notifications
- [ ] Cloudflare Tunnel for stable hosting
- [ ] Auto-merge policy for safe paths
- [ ] SOUL.md customized with full War Room personality

---

## 10. File Reference

| File | Location | Purpose |
|---|---|---|
| `AGENT_PERFORMANCE.md` | `claude_mem/` | Full rankings, stats, rebuild analysis |
| `MODEL_TEST_RESULTS.md` | `claude_mem/` | Direct API benchmark results |
| `KATE_VS_JACKIE.md` | `claude_mem/` | Head-to-head skill improvement proof |
| `AGENT.md` | `config/` | Agent name ↔ model mapping |
| `CRONS.json` | `config/` | Cron schedules and job descriptions |
| `run-job.yml` | `.github/workflows/` | Main GitHub Actions workflow |
| `test_all_models.mjs` | root + `claude_mem/` | Rerunnable 4-model benchmark |
| `test_kate_vs_jackie.mjs` | root + `claude_mem/` | Rerunnable head-to-head |

---

## 11. Quick Reference Card

```
REPO:       winsorllc/upgraded-carnival (PUBLIC)
PROVIDER:   custom (Ollama Cloud)
BASE URL:   https://ollama.com/v1
AGENTS:     Jackie (glm-5), Mimi (minimax-m2.5), Kate (kimi-k2.5)
SKILLS:     102 SKILL.md files in .pi/skills/ (69 with code, 33 spec-only)
COST:       $20/mo
STATUS:     Crons DISABLED — flip enabled:true in CRONS.json to restart
PAT:        In GitHub Secrets as GH_TOKEN (rotated 2026-02-25)
EMAIL:      winsorhoang@gmail.com → reports to winsorllc@yahoo.com
API KEY:    Set OLLAMA_API_KEY env var before running tests
LOCAL DIR:  D:\dev_aiwinsor\popebot_agent\
```

---

## 12. Secret Rotation Procedures

### 12.1 Rotate GitHub PAT
1. Go to https://github.com/settings/tokens → Generate new token (classic)
2. Scope: `repo`, `workflow`, `write:packages`
3. Update in GitHub Secrets: Repo → Settings → Secrets → `GH_TOKEN`
4. Update local git remote: `git remote set-url origin https://<new-pat>@github.com/winsorllc/upgraded-carnival.git`
5. Update Docker event handler if running: set `GH_TOKEN` env var

### 12.2 Rotate Ollama Cloud API Key
1. Go to Ollama Cloud dashboard → API Keys → Regenerate
2. Update in GitHub Secrets: `AGENT_CUSTOM_API_KEY`
3. Set locally: `$env:OLLAMA_API_KEY = "<new-key>"`

---

## 13. Disaster Recovery

### 13.1 Repo Corruption
The repo is on GitHub. Clone fresh: `git clone https://github.com/winsorllc/upgraded-carnival.git`

### 13.2 Agents Producing Garbage
- Disable crons immediately (`enabled: false` in CRONS.json, commit, push)
- Close bad PRs: `gh pr close <number> -R winsorllc/upgraded-carnival`
- Revert bad merges: `git revert <commit-hash>`

### 13.3 Ollama Cloud Subscription Lapses
- All agent runs will fail with auth errors
- No data loss — skills on main are safe
- Re-subscribe and update API key per §12.2

### 13.4 GitHub Actions Free Tier Changes
- If GitHub removes unlimited public repo minutes, switch back to private (2,000 min/mo free)
- Or move agent execution to a self-hosted runner or VPS

### 13.5 Recovering Downgraded Skills
Some skills were downgraded during merge (e.g., `weather` went from 6.5K → 2.5K). To restore:
```bash
# Find the commit with the better version
git log --all --oneline -- ".pi/skills/weather/SKILL.md"
# Restore from specific commit
git show <commit-hash>:.pi/skills/weather/SKILL.md > .pi/skills/weather/SKILL.md
git add .pi/skills/weather/SKILL.md && git commit -m "Restore best weather skill"
```

### 13.6 Recovering Skills from Closed PRs
PRs #1, #3, #6, #7 were closed with merge conflicts. Their branches still exist on GitHub and may contain ~26 unique skills not on main. To recover:
```bash
git fetch origin pull/<pr-number>/head:recovery-<pr-number>
git checkout recovery-<pr-number> -- .pi/skills/<skill-name>/
git add . && git commit -m "Recover <skill-name> from PR #<number>"
```

---

## 14. Accuracy & Limitations Disclosure

This document was written by an LLM (Antigravity) and self-critiqued. Known limitations:

1. **Skill counts** were verified against the filesystem on 2026-02-25. They may drift as agents create new skills.
2. **Agent attribution** (who built which skill) is based on PR branch names and run logs, not embedded metadata. It could be wrong for skills that were rebuilt by multiple agents.
3. **Performance rankings** are based on 2 days of runs and 2 API tests. A larger sample may yield different results.
4. **Gwen's "broken" diagnosis** is based on limited testing. It may be an API/infrastructure issue rather than a model deficiency.
5. **File sizes** were used as a proxy for quality in some comparisons. Actual quality requires reading the content (which was done for key skills but not all 102).

---

*This document is the complete handoff for any LLM or human operator to manage the PopeBot agent system. Last verified: 2026-02-25T20:08Z.*
