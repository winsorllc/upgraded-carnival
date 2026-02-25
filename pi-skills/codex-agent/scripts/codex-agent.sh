#!/bin/bash
# Codex agent helper - spawns sub-agents for coding tasks

set -e

COMMAND="${1:-help}"
PROMPT="${2:-}"

# Detect available agent
detect_agent() {
    if command -v codex &> /dev/null; then
        echo "codex"
    elif command -v claude &> /dev/null; then
        echo "claude"
    elif command -v pi &> /dev/null; then
        echo "pi"
    elif command -v opencode &> /dev/null; then
        echo "opencode"
    else
        echo "none"
    fi
}

# Run agent in PTY mode
run_agent() {
    local agent="$1"
    local prompt="$2"
    local workdir="${3:-.}"
    
    case "$agent" in
        codex)
            echo "Running Codex agent..."
            # Check if in git repo
            if [ ! -d "$workdir/.git" ]; then
                echo "Initializing git repo in $workdir..."
                (cd "$workdir" && git init)
            fi
            bash pty:true workdir:"$workdir" command:"codex exec '$prompt'"
            ;;
        claude)
            echo "Running Claude Code..."
            bash pty:true workdir:"$workdir" command:"claude --dangerously-skip-permissions '$prompt'"
            ;;
        pi)
            echo "Running Pi agent..."
            bash pty:true workdir:"$workdir" command:"pi '$prompt'"
            ;;
        opencode)
            echo "Running OpenCode agent..."
            bash pty:true workdir:"$workdir" command:"opencode '$prompt'"
            ;;
        *)
            echo "No coding agent found. Install one of: codex, claude, pi, opencode"
            echo ""
            echo "Install instructions:"
            echo "  Codex:    npm install -g @anthropic-ai/codex-cli"
            echo "  Claude:   npm install -g @anthropic/claude-code"
            echo "  Pi:       npm install -g @anthropic/pi-coding-agent"
            echo "  OpenCode: npm install -g opencode-ai"
            exit 1
            ;;
    esac
}

# Show help
show_help() {
    echo "Codex Agent Helper for PopeBot"
    echo "================================"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  detect              Detect available coding agents"
    echo "  run <prompt> [dir]  Run agent with prompt (in optional directory)"
    echo "  chat <prompt>       Quick chat with available agent"
    echo ""
    echo "Examples:"
    echo "  $0 detect"
    echo "  $0 run 'Build a todo app' ./myproject"
    echo "  $0 chat 'How do I center a div?'"
    echo ""
    echo "Environment:"
    echo "  ANTHROPIC_API_KEY   Required for Claude/Codex"
    echo "  OPENAI_API_KEY      Required for OpenAI models"
}

# Main
case "$COMMAND" in
    detect)
        agent=$(detect_agent)
        if [ "$agent" = "none" ]; then
            echo "No coding agent found. Install one of: codex, claude, pi, opencode"
            show_help
            exit 1
        else
            echo "Found: $agent"
        fi
        ;;
    run|chat)
        if [ -z "$PROMPT" ]; then
            echo "Error: Missing prompt"
            show_help
            exit 1
        fi
        agent=$(detect_agent)
        workdir="${3:-.}"
        run_agent "$agent" "$PROMPT" "$workdir"
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
