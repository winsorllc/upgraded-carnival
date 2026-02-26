# PopeBot Agent System — Final Handoff & Operations Manual
**Date:** 2026-02-25  
**Maintainer Identity:** Antigravity (PromptBus Pane E / Worker-Coach)  
**Status:** 🚀 DEPLOYED & STABILIZED  
**Repository:** `winsorllc/upgraded-carnival` (PUBLIC)

---

## 1. Executive Summary
PopeBot is an autonomous multi-agent system running on GitHub Actions. It utilizes Ollama Cloud models to scan repositories, conceive of new AI skills, write implementation code, and perform automated testing.

**Current Inventory:** 133 unique skills in `.pi/skills/` (Verified & Repaired).

---

## 2. Infrastructure & Secrets

### 2.1 Repository & CI/CD
- **Local Root:** `D:\dev_aiwinsor\popebot_agent\`
- **CI/CD:** GitHub Actions (`.github/workflows/run-job.yml`)
- **Docker Home:** Uses `stephengpope/thepopebot:job-1.2.71` image for autonomous runs.

### 2.2 Critical Security (Rotation Required)
- **GH_TOKEN:** System uses a GitHub Personal Access Token (Classic) stored in GitHub Secrets. **Note:** The local git remote URL contains the PAT (Check `git remote -v`).
- **AGENT_CUSTOM_API_KEY:** API key for Ollama Cloud (`https://ollama.com/v1`).
- **OLLAMA_API_KEY:** Local environment variable required for testing.

---

## 3. The Agent Roster

| Agent Name | LLM Model | Primary Strength |
|------------|-----------|------------------|
| **Kate** | `kimi-k2.5` | **The Architect**: Best documentation, unique skill ideation, high-density refactoring. |
| **Mimi** | `minimax-m2.5` | **The Engineer**: Superior code quality, best at hitting long-form prose/essay targets. |
| **Jackie** | `glm-5` | **The Scripter**: High-volume OS-level tools and Bash scripting. |

---

## 4. Maintenance & Operations Runbook

### 4.1 Dispatching an Agent
Agents are dispatched by editing `config/CRONS.json`. 
1. Set `"enabled": true` for the chosen job.
2. Commit and push to `main`.
3. **Internal Trigger:** Pushing to a branch prefixed with `job/` (e.g., `job/my-task`) automatically triggers the `run-agent` workflow.

### 4.2 Handling "The Symlink Bug" (CRITICAL)
**Warning:** Agents sometimes commit skills as "string-symlinks" (files where the content is a long path string). This crashes GitHub Actions with `File name too long`.
- **Fix:** Use the `fix_symlinks.ps1` logic (distilled in `.agent/skills/popebot-operations/SKILL.md`) to convert these back to directories before merging.

### 4.3 Recovering Lost Work
If a PR is closed due to conflicts, skills are not lost.
```powershell
git fetch origin job/<branch-id>
git checkout origin/job/<branch-id> -- .pi/skills/<skill-name>
```

---

## 5. Active Missions
- **Kate Media Refactor (`job/kate-media-refactor`):** Currently active refactoring `ffmpeg-tools`, `video-frames`, `youtube-transcript`, `transcribe`, `camsnap`, and `image-gen` to production standards.

---

## 6. Filing System
- `.agent/PROFILE.md`: Your operational identity and directives.
- `.agent/skills/popebot-operations/SKILL.md`: The technical playbook for `gh` CLI and Docker commands.
- `claude_mem/POPEBOT_IMPLEMENTATION_PLAN.md`: Full architectural history.

---

## 7. Directives for the New LLM
1. **Never merge blindly:** AI PRs often contain regressions. Always run `git diff main...job/branch` before merging.
2. **Prioritize Kate for Docs:** If a skill has a weak `SKILL.md`, assign a refactor job to `kimi-k2.5`.
3. **Maintain Public Visibility:** The repo is public to ensure unlimited GitHub Actions minutes. Ensure no secrets are committed to the codebase.
