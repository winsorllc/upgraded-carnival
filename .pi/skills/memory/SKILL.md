---
name: memory
description: "Persistent key-value memory storage for the agent. Store, recall, and forget information across sessions. Use when you need to remember facts, preferences, or context between conversations."
---

# Memory Skill

Persistent key-value storage for agent memory. Store important information and recall it later.

## When to Use

✅ **USE this skill when:**

- "Remember that my favorite color is blue"
- "What did I tell you about my project?"
- "Forget my preferences"
- "What do you know about X?"
- Storing user preferences for later recall
- Saving context across conversations

## When NOT to Use

❌ **DON'T use this skill when:**

- Temporary storage during a single session → use variables
- Large data storage → use file system
- Sensitive data → use secure storage

## Storage Location

Memory is stored in `~/.agent-memory/memory.json` as a JSON file.

## Commands

### Store Information

```bash
{baseDir}/memory.sh store "project_name" "My Cool Project"
{baseDir}/memory.sh store "preferences" '{"theme": "dark", "language": "en"}'
{baseDir}/memory.sh store --category "work" "company" "Acme Corp"
```

### Recall Information

```bash
{baseDir}/memory.sh recall "project_name"
{baseDir}/memory.sh recall --all
{baseDir}/memory.sh recall --category "work"
{baseDir}/memory.sh search "project"
```

### Forget Information

```bash
{baseDir}/memory.sh forget "project_name"
{baseDir}/memory.sh forget --category "work"
{baseDir}/memory.sh forget --all
```

### List Categories

```bash
{baseDir}/memory.sh categories
{baseDir}/memory.sh stats
```

## Categories

Organize memory by category:
- `personal` - Personal preferences and info
- `work` - Work-related information
- `projects` - Project details
- `context` - Conversation context
- Custom categories as needed

## Examples

**Store user preference:**
```bash
{baseDir}/memory.sh store --category "personal" "timezone" "America/New_York"
```

**Recall specific value:**
```bash
{baseDir}/memory.sh recall "timezone"
# Output: America/New_York
```

**Search for related keys:**
```bash
{baseDir}/memory.sh search "project"
# Output: project_name, project_status, project_url
```

**Get all memory for a category:**
```bash
{baseDir}/memory.sh recall --category "work"
# Output: {"company": "Acme Corp", "role": "Developer"}
```

## Notes

- Memory persists across sessions in a JSON file
- Values can be simple strings or JSON objects
- Categories help organize related memories
- Use `--all` flag carefully (affects all stored data)