#!/bin/bash
# Session logs helper script for PopeBot
# Provides quick access to session log analysis

COMMAND="${1:-help}"
SESSION_DIR="${SESSION_DIR:-logs}"

# Function to list sessions
list_sessions() {
    shopt -s nullglob
    for f in "$SESSION_DIR"/*.jsonl; do
        if [ -f "$f" ]; then
            date=$(head -1 "$f" | jq -r '.timestamp // "unknown"' 2>/dev/null | cut -dT -f1)
            if [ -z "$date" ]; then date="unknown"; fi
            size=$(ls -lh "$f" | awk '{print $5}')
            echo "$date $size $(basename "$f")"
        fi
    done | sort -r
}

case "$COMMAND" in
  list)
    list_sessions
    ;;
  recent)
    COUNT="${2:-10}"
    ls -lt "$SESSION_DIR"/*.jsonl 2>/dev/null | head -"$COUNT" || echo "No sessions found"
    ;;
  search)
    PATTERN="${2:-}"
    if [ -z "$PATTERN" ]; then
      echo "Usage: $0 search <pattern>"
      exit 1
    fi
    grep -l "$PATTERN" "$SESSION_DIR"/*.jsonl 2>/dev/null || echo "No matches found"
    ;;
  count)
    SESSION="${2:-}"
    if [ -z "$SESSION" ]; then
      echo "Usage: $0 count <session-file>"
      exit 1
    fi
    if [ -f "$SESSION" ]; then
      wc -l < "$SESSION"
    else
      echo "Session not found: $SESSION"
      exit 1
    fi
    ;;
  messages)
    SESSION="${2:-}"
    ROLE="${3:-}"
    if [ -z "$SESSION" ]; then
      echo "Usage: $0 messages <session-file> [user|assistant|all]"
      exit 1
    fi
    if [ ! -f "$SESSION" ]; then
      echo "Session not found: $SESSION"
      exit 1
    fi
    if [ "$ROLE" = "user" ]; then
      jq -r 'select(.role == "user") | .content' "$SESSION" 2>/dev/null | head -50
    elif [ "$ROLE" = "assistant" ]; then
      jq -r 'select(.role == "assistant") | .content' "$SESSION" 2>/dev/null | head -50
    else
      jq -r '.content' "$SESSION" 2>/dev/null | head -50
    fi
    ;;
  help|*)
    echo "Session Logs Helper for PopeBot"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  list                           List all sessions by date and size"
    echo "  recent [count]                Show recent sessions (default: 10)"
    echo "  search <pattern>              Search for pattern across all sessions"
    echo "  count <session-file>          Count messages in a session"
    echo "  messages <session-file> [role] Extract messages (role: user|assistant|all)"
    echo ""
    echo "Environment:"
    echo "  SESSION_DIR                   Directory containing session logs (default: logs)"
    ;;
esac
