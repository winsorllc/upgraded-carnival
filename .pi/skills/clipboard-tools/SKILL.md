---
name: clipboard-tools
description: "System clipboard operations. Copy text to clipboard, paste from clipboard, clear clipboard. Works on Linux (xclip/wl-copy), macOS (pbcopy/pbpaste), WSL. No API key required."
---

# Clipboard Tools Skill

Interact with the system clipboard for copy, paste, and clear operations.

## When to Use

Γ£à **USE this skill when:**

- "Copy text to clipboard"
- "Paste from clipboard"
- "Clear the clipboard"
- "Get clipboard content"
- "Copy file contents to clipboard"

## When NOT to Use

Γ¥î **DON'T use this skill when:**

- Working with binary files ΓåÆ use file operations
- Need clipboard history ΓåÆ use dedicated clipboard manager
- Cross-machine clipboard ΓåÆ use network tools

## Commands

### Copy to Clipboard

```bash
{baseDir}/clipboard.sh copy "text to copy"
{baseDir}/clipboard.sh copy --file /path/to/file.txt
```

### Paste from Clipboard

```bash
{baseDir}/clipboard.sh paste
{baseDir}/clipboard.sh paste --trim
{baseDir}/clipboard.sh paste --file /path/to/output.txt
```

### Clear Clipboard

```bash
{baseDir}/clipboard.sh clear
```

### Check Clipboard Status

```bash
{baseDir}/clipboard.sh status
{baseDir}/clipboard.sh has-content
```

### Platform Detection

```bash
{baseDir}/clipboard.sh detect
```

## Platform Support

| Platform | Tool Required | Status |
|----------|---------------|--------|
| macOS | pbcopy/pbpaste | Built-in |
| Linux (X11) | xclip or xsel | Auto-detected |
| Linux (Wayland) | wl-copy/wl-paste | Auto-detected |
| WSL | clip.exe/powershell | Auto-detected |
| Cygwin | putclip/getclip | Auto-detected |

## Output Format

```bash
# Copy: Exit code 0 on success
echo "Hello" | {baseDir}/clipboard.sh copy
echo "Copied to clipboard"

# Paste: Returns clipboard content
{baseDir}/clipboard.sh paste
# Output: <clipboard content>

# Status: JSON output
{baseDir}/clipboard.sh status --json
# Output: {"platform": "linux", "tool": "xclip", "available": true}
```

## Examples

**Copy a string:**
```bash
{baseDir}/clipboard.sh copy "Hello, World!"
# Exit 0, prints: Copied to clipboard
```

**Copy file contents:**
```bash
{baseDir}/clipboard.sh copy --file document.txt
```

**Copy command output:**
```bash
echo "$(date)" | {baseDir}/clipboard.sh copy
```

**Paste to stdout:**
```bash
CONTENT=$({baseDir}/clipboard.sh paste)
echo "Clipboard contains: $CONTENT"
```

**Paste to file:**
```bash
{baseDir}/clipboard.sh paste --file output.txt
```

**Check if clipboard has content:**
```bash
if {baseDir}/clipboard.sh has-content; then
    echo "Clipboard is not empty"
fi
```

## Notes

- Automatically detects platform and available clipboard tools
- Falls back to alternative tools if primary not available
- Creates tmp file for stdin if platform tool doesn't support pipes
- Graceful error if no clipboard tool is available
- Content is trimmed by default when pasting
- Use --no-trim to preserve whitespace
