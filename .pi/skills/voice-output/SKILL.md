---
name: voice-output
description: "Speak text aloud using system TTS (say command on macOS/Linux) or browser TTS via Chrome DevTools Protocol. Use when: (1) job completes and you want to announce results, (2) user asks to hear something spoken, (3) notifications that need audio alerts, (4) accessibility - reading content aloud."
---

# Voice Output Skill

Convert text to speech and speak it aloud using system TTS or browser TTS.

## Setup

No additional setup required. Uses built-in system commands:
- **macOS**: `say` command (built-in)
- **Linux**: `espeak` or `festival` (install via `apt install espeak`)
- **Browser**: Web Speech API via Chrome DevTools Protocol

## Usage

### Speak text via system TTS (say command)

```bash
{baseDir}/scripts/speak.sh "Hello, the job has completed successfully!"
```

### Speak via browser TTS (requires Chrome with CDP)

```bash
{baseDir}/scripts/speak-browser.js "Hello from the browser!"
```

### List available voices (browser)

```bash
{baseDir}/scripts/list-voices.js
```

## Voice Options

### System voices (macOS)

List available voices:
```bash
say -v "?" 
```

Use a specific voice:
```bash
{baseDir}/scripts/speak.sh "Hello" --voice "Samantha"
```

Adjust speech rate:
```bash
{baseDir}/scripts/speak.sh "Hello" --rate 200
```

### Browser voices

The browser TTS uses Web Speech API with available system voices. Default is usually the best available voice.

## Trigger Patterns

Use this skill when:
- User asks "say", "speak", "read aloud", "text to speech"
- Job completes and you want to announce success/failure
- User wants notifications spoken rather than just displayed
- Accessibility - reading content aloud for visually impaired users
- Creating audio summaries or reports

## Examples

### Announce job completion

```bash
{baseDir}/scripts/speak.sh "Job complete! Processed 50 files, found 3 issues."
```

### Read a summary

```bash
{baseDir}/scripts/speak.sh "Summary: Four files were modified, two tests added."
```

### Browser TTS (when Chrome is available)

```bash
{baseDir}/scripts/speak-browser.js "Speaking directly through the browser!"
```

## Notes

- System TTS (`say`) works on macOS out of the box
- On Linux, install espeak: `sudo apt install espeak`
- Browser TTS requires Chrome running with remote debugging (see browser-tools skill)
- Both methods are synchronous - the command blocks until speech completes
- For non-blocking speech, add `&` at the end of the command
