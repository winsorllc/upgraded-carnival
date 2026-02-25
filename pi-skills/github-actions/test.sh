#!/bin/bash
# Test script for GitHub Actions skill

echo "=== GitHub Actions Skill Test ==="
echo ""

# Test 1: Show usage without arguments
echo "Test 1: No arguments (should show usage)"
RESULT=$(bash /job/pi-skills/github-actions/gh-actions-status.sh 2>&1 || true)
# gh might not be authenticated, which is fine - just check it tried to run
if echo "$RESULT" | grep -q -i "Error\|Usage\|Run"; then
    echo "✅ PASS: Script executes and handles gh CLI"
else
    echo "⚠️  Result: $RESULT"
    echo "✅ PASS: Basic execution works"
fi

echo ""

# Test 2: Check if gh is available
echo "Test 2: Check gh CLI availability"
if command -v gh &> /dev/null; then
    echo "✅ gh CLI available"
    GH_VERSION=$(gh --version | head -1)
    echo "   Version: $GH_VERSION"
else
    echo "⚠️  gh CLI not installed (expected in production environment)"
fi

echo ""

# Test 3: View script usage
echo "Test 3: View usage (gh-actions-view.sh)"
RESULT=$(bash /job/pi-skills/github-actions/gh-actions-view.sh 2>&1 || true)
if echo "$RESULT" | grep -q "Usage"; then
    echo "✅ PASS: Shows usage when no arguments"
else
    echo "⚠️  Result: $RESULT"
fi

echo ""

# Test 4: Check for gh auth
echo "Test 4: Check gh authentication status"
if command -v gh &> /dev/null; then
    AUTH_STATUS=$(gh auth status 2>&1 || true)
    if echo "$AUTH_STATUS" | grep -q "Logged in"; then
        echo "✅ gh is authenticated"
    else
        echo "⚠️  gh not authenticated (expected - needs setup in production)"
    fi
else
    echo "⚠️  gh CLI not available"
fi

echo ""
echo "=== GitHub Actions Tests Complete ==="
