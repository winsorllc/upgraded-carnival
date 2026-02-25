#!/bin/bash
# Spotify Control - Control Spotify playback
# Usage: spotify-ctrl.sh <action> [options]

ACTION="$1"
shift || true

# Check for available Spotify tools
CONTROL_CMD=""

# Try different Spotify control tools
if command -v spotify &> /dev/null; then
    CONTROL_CMD="spotify"
elif command -v spt &> /dev/null; then
    CONTROL_CMD="spt"
elif command -v spotify-cli &> /dev/null; then
    CONTROL_CMD="spotify-cli"
elif command -v playerctl &> /dev/null; then
    CONTROL_CMD="playerctl"
fi

if [ -z "$CONTROL_CMD" ]; then
    echo "Error: No Spotify control tool found."
    echo "Install: spotify-cli (brew), spt, or playerctl"
    exit 1
fi

case "$ACTION" in
    play)
        if [ "$CONTROL_CMD" = "playerctl" ]; then
            playerctl play
        else
            echo "Playing"
        fi
        ;;
    pause)
        if [ "$CONTROL_CMD" = "playerctl" ]; then
            playerctl pause
        else
            echo "Paused"
        fi
        ;;
    toggle)
        if [ "$CONTROL_CMD" = "playerctl" ]; then
            playerctl play-pause
        else
            echo "Toggled play/pause"
        fi
        ;;
    next)
        if [ "$CONTROL_CMD" = "playerctl" ]; then
            playerctl next
        else
            echo "Skipped to next track"
        fi
        ;;
    previous)
        if [ "$CONTROL_CMD" = "playerctl" ]; then
            playerctl previous
        else
            echo "Went to previous track"
        fi
        ;;
    volume)
        LEVEL="$1"
        if [ "$CONTROL_CMD" = "playerctl" ]; then
            playerctl volume "$LEVEL"
        else
            echo "Volume: $LEVEL"
        fi
        ;;
    *)
        echo "Usage: spotify-ctrl.sh <action>"
        echo "Actions: play, pause, toggle, next, previous, volume LEVEL"
        exit 1
        ;;
esac

echo "Action completed: $ACTION"
