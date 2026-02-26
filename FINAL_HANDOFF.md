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

| Agent Name | LLM Model | Primary Strength | Status |
|------------|-----------|------------------|--------|
| **Kate** | `kimi-k2.5` | **The Architect**: Best documentation, unique skill ideation. | ✅ ACTIVE |
| **Mimi** | `minimax-m2.5` | **The Engineer**: Superior code quality, hits prose targets. | ✅ ACTIVE |
| **Jackie** | `glm-5` | **The Scripter**: High-volume OS tools and Bash/Shell. | ✅ ACTIVE |
| **Gwen** | `qwen3.5:397b` | Large model capability. | ⚠️ SHELVED (Broken/Empty) |

---

## 4. Maintenance & Operations Runbook

### 4.1 Dispatching an Agent
Agents are dispatched by editing `config/CRONS.json`. 
1. Set `"enabled": true` for the chosen job.
2. Commit and push to `main`.
3. **Emergency Manual Dispatch:** If the local event handler is down, manually push a branch named `job/<any-name>` containing a `logs/<any-name>/job.config.json` (LLM config) and `job.md` (the prompt).

### 4.2 Handling "The Symlink Bug" (CRITICAL)
**Warning:** Agents sometimes commit skills as "string-symlinks" (files where the content is a long path string). This crashes GitHub Actions with `File name too long`.
- **Fix:** Execute the **Symlink Repair Procedure** found in `.agent/skills/popebot-operations/SKILL.md`.

### 4.3 Troubleshooting via CLI
If a job fails, check the logs immediately using the `gh` CLI:
```powershell
# Get last 5 runs
gh run list -R winsorllc/upgraded-carnival -L 5
# View full logs for a specific run
gh run view <run-id> --log -R winsorllc/upgraded-carnival
```

### 4.4 Recovering Lost Work
If a PR is closed due to conflicts, skills are not lost.
```powershell
git fetch origin job/<branch-id>
git checkout origin/job/<branch-id> -- .pi/skills/<skill-name>
```

---

## 5. Active Missions
- **Kate Media Refactor (`job/kate-media-refactor`):** Currently active refactoring `ffmpeg-tools`, `video-frames`, `youtube-transcript`, `transcribe`, `camsnap`, and `image-gen`.

---

## 6. Filing System
- `.agent/PROFILE.md`: Your operational identity and directives.
- `.agent/skills/popebot-operations/SKILL.md`: **CORE PLAYBOOK** for Docker, Git, and Repair commands.
- `claude_mem/POPEBOT_IMPLEMENTATION_PLAN.md`: Full architectural history.

---

## 7. Directives for the New LLM Maintainer
1. **Never merge blindly:** AI PRs often contain regressions. Always run `git diff main...job/branch` before merging.
2. **Docker Consistency:** Always use `docker exec` against the `thepopebot-event-handler` container to ensure you are operating in a sterile, configured environment.
3. **Maintain Public Visibility:** The repo is public for free CI/CD. **DO NOT COMMIT SECRETS.**
4. **Audit Symlinks:** Periodically run `git ls-tree -r HEAD | Select-String "120000"` to check for corrupted symlink skills.
