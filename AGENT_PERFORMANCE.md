# PopeBot Agent Performance Report
**Date:** February 25, 2026  
**Runs Analyzed:** Night of Feb 24 (PRs #1-#7) + Afternoon of Feb 25 (PRs #14-#17)

## Agent Roster

| Model | Agent Name | Provider |
|---|---|---|
| `glm-5` | **Jackie** | GLM |
| `minimax-m2.5` | **Mimi** | Minimax |
| `kimi-k2.5` | **Kate** | Kimi |
| `qwen3.5:397b` | **Gwen** | Qwen |

---

## Overall Rankings

### 🏆 1. Kate (Kimi K2.5) — The Architect / MVP
- **Duplicate skill wins:** 11 out of 15 categories (best versions)
- **Highlight builds:** `hybrid-memory` (10.5K), `cost-tracker` (6.4K), `blogwatcher` (6.0K), `code-analyzer` (7.7K)
- **Dedup compliance:** Perfect — PR #17 had 10 skills, ALL genuinely new, zero duplicates
- **Strengths:** Comprehensive documentation, rich API examples, enterprise features (budget alerts, throttling, cost attribution)
- **Style:** Deep, feature-complete integrations with programmatic APIs

### 🥈 2. Mimi (Minimax M2.5) — The Heavy Engineer
- **Duplicate skill wins:** 3 out of 15 (`notion` 7.2K, `session-logs` 4.3K, `cron-manager` 1.7K)
- **Highlight builds:** Completely rewrote `spotify-player` from 3.1K to 7.7K with bash helper functions, token handling, device targeting, jq parsing, queue management
- **Strengths:** Robust, production-grade rewrites; excellent at upgrading existing skills
- **Style:** Heavy engineering with complex integrations

### 🥉 3. Jackie (GLM-5) — The System Scripter
- **Duplicate skill wins:** 1 out of 15 (`obsidian` 3.9K)
- **Volume:** Built 27 skills in a single run (PR #14) — highest volume producer
- **Highlight builds:** Rewrote `file-watcher` from Node.js to native bash using `inotifywait`/`fswatch` with PID tracking, daemon mode, and per-file debouncing
- **Strengths:** OS-level automation, high volume output, system tools
- **Weaknesses:** Occasionally overwrites existing skills; less thorough documentation
- **Style:** Low-level bash scripts, system utilities

### ❌ 4. Gwen (Qwen 3.5:397b) — The Struggler
- **Duplicate skill wins:** 0
- **Volume:** PR #16 was completely empty (0 skills)
- **Past performance:** PR #6 from the night run had only bare-minimum stubs (47 bytes for cost-tracker)
- **Weaknesses:** Fails to complete tasks, crashes, doesn't commit code properly
- **Style:** N/A — rarely produces usable output

---

## Skill Production Summary

### Night Run (Feb 24 → PRs #1-#7)
- **Total skills created:** ~180
- **Unique skill names:** 157
- **Duplicate skill names:** 23 (across 15 different skills)
- **Most duplicated:** `cost-tracker` (4 agents built it)

### Afternoon Run (Feb 25 → PRs #14-#17)
| PR | Agent | Skills | New & Unique | Duplicates |
|---|---|---|---|---|
| #14 | Jackie (GLM-5) | 27 | ~19 new | 8 rebuilds |
| #15 | Mimi (Minimax) | 22 | ~9 new | 13 rebuilds |
| #16 | Gwen (Qwen) | 0 | — | — |
| #17 | Kate (Kimi) | 10 | **10 new** | 0 rebuilds ✅ |

### Final Tally on Main
- **Total skills on main:** ~112 (after merges and consolidation)
- **Located in:** `.pi/skills/` (consolidated from both `.pi/skills/` and `pi-skills/`)

---

## Rebuild Quality Analysis

When agents rebuilt existing skills, some produced genuinely superior versions:

| Skill | Main (bytes) | Rebuild (bytes) | Winner | Agent | Verdict |
|---|---|---|---|---|---|
| `file-watcher` | 2,613 | 4,860 | **Rebuild** | Jackie | Native bash rewrite with daemon mode, debouncing |
| `spotify-player` | 3,180 | 7,706 | **Rebuild** | Mimi | Full playback control, helper functions, queue mgmt |
| `json-tools` | 2,142 | 3,866 | **Rebuild** | Mimi | More comprehensive operations |
| `video-frames` | 1,797 | 2,278 | **Rebuild** | Jackie | Slightly more complete |
| `weather` | 6,511 | 2,315 | **Main** | — | Main version more comprehensive |
| `http-request` | 8,069 | 3,235 | **Main** | — | Main version much more detailed |
| `notion` | 3,915 | 4,937 | **Rebuild** | Mimi | More features |
| `summarize` | 3,284 | 1,656 | **Main** | — | Main version better |

---

## Recommendations

1. **For complex integrations:** Assign to **Kate** or **Mimi**
2. **For high-volume utility scripts:** Assign to **Jackie**
3. **Consider removing Gwen** from the rotation — she consistently fails to produce output
4. **Dedup instruction works** — Kate followed it perfectly on her first try
5. **Future runs should continue with dedup** to avoid wasted compute on rebuilds

---

## Infrastructure Notes

- **Runner:** GitHub-hosted `ubuntu-latest` (4 CPU, 16 GB RAM, 14 GB SSD)
- **Cost:** $0 (public repository = unlimited free Actions minutes)
- **Repo:** `winsorllc/upgraded-carnival` (switched to public on Feb 25)
- **Budget consumed before switch:** $8.14 of $11.00 (2,000 free minutes exhausted)
- **Secrets:** Managed via GitHub Secrets (GH_TOKEN, email credentials, API keys)
