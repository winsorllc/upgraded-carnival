---
name: pr-description-generator
description: "Automatically generate intelligent PR descriptions by analyzing code changes. Uses Git diffs, commit history, and context to create comprehensive pull request descriptions with summary, changes, testing notes, and breaking changes."
---

# PR Description Generator

Automatically generates comprehensive pull request descriptions by analyzing git diffs, commit history, and file changes. This skill creates meaningful PR descriptions that save developers time and ensure documentation quality.

## When to Use

- User wants to create a PR but doesn't want to write the description
- User asks "what changed in this branch/PR?"
- Automating PR creation workflows
- Reviewing code changes before submitting
- Generating changelogs from commits

## Setup

No additional installation required. Uses built-in git commands and Node.js.

## Usage

### Generate a PR description for the current branch

```bash
node /job/.pi/skills/pr-description-generator/generate.js
```

### Generate for a specific branch compared to main

```bash
node /job/.pi/skills/pr-description-generator/generate.js my-feature-branch main
```

### Generate for a specific commit range

```bash
node /job/.pi/skills/pr-description-generator/generate.js --from abc123 --to def456
```

### Generate from uncommitted changes

```bash
node /job/.pi/skills/pr-description-generator/generate.js --uncommitted
```

### Output as markdown (for PR body)

```bash
node /job/.pi/skills/pr-description-generator/generate.js --markdown
```

### JSON output (for programmatic use)

```bash
node /job/.pi/skills/pr-description-generator/generate.js --json
```

## Output Format

### Default (human-readable)

```
📋 PR Description Generator
============================

## Summary
Added user authentication flow with OAuth2 support for Google and GitHub login.

## Changes
• auth/login.ts - New OAuth2 login handler
• auth/callback.ts - OAuth callback processor  
• auth/store.ts - Session storage
• config/auth.json - OAuth configuration

## Testing
✓ Unit tests added for auth handlers
✓ Integration tests for OAuth flow
✓ Manual testing checklist provided

## Breaking Changes
None

## Files Changed: 4
• Modified: 2
• Added: 2
• Deleted: 0

## Commit History (3 commits)
• abc123 - Add Google OAuth provider
• def456 - Add GitHub OAuth provider
• ghi789 - Initial auth structure
```

### Markdown Output

```markdown
## Summary
Added user authentication flow with OAuth2 support for Google and GitHub login.

## Changes
- `auth/login.ts` - New OAuth2 login handler
- `auth/callback.ts` - OAuth callback processor
- `auth/store.ts` - Session storage
- `config/auth.json` - OAuth configuration

## Testing
- [x] Unit tests added for auth handlers
- [x] Integration tests for OAuth flow
- [ ] Manual testing checklist provided

## Breaking Changes
None

## Files Changed
- Modified: 2
- Added: 2
- Deleted: 0
```

### JSON Output

```json
{
  "summary": "Added user authentication flow with OAuth2 support",
  "changes": [
    { "file": "auth/login.ts", "type": "added", "description": "New OAuth2 login handler" },
    { "file": "auth/callback.ts", "type": "added", "description": "OAuth callback processor" }
  ],
  "testing": ["Unit tests added", "Integration tests"],
  "breakingChanges": [],
  "stats": { "added": 2, "modified": 2, "deleted": 0 }
}
```

## Common Workflows

### Auto-generate PR description
```
User: Create a PR for this branch
Agent: [Runs pr-description-generator]
Agent: Here's your PR description:
[Markdown output]
```

### Review changes before submitting
```
User: What's changed in this branch?
Agent: [Runs pr-description-generator --markdown]
```

### Generate changelog
```
User: Generate a changelog from the last release
Agent: [Runs pr-description-generator --from v1.0.0 --to HEAD]
```

## Integration with Other Skills

- **With session-files**: Use file change context for better descriptions
- **With memory-agent**: Store PR descriptions for future reference
- **With modify-self**: Auto-generate descriptions for the agent's own PRs

## Limitations

- Requires git repository with commits
- May need LLM for complex semantic summaries (currently uses pattern matching)
- Cannot detect runtime behavior changes from static analysis

## Tips

1. **For better summaries**: Ensure commit messages are descriptive
2. **For accurate detection**: Run from repository root
3. **For CI/CD**: Use JSON output for programmatic integration
