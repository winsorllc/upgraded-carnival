#!/bin/bash
# Test: System Health Skill

echo "=== Testing System Health Skill ==="

# Test 1: Check uptime
echo "Test 1: Checking uptime..."
if command -v uptime &> /dev/null; then
    uptime_output=$(uptime)
    echo "PASS: $uptime_output"
else
    echo "FAIL: uptime not found"
    exit 1
fi

# Test 2: Check memory (free -h)
echo ""
echo "Test 2: Checking memory..."
if command -v free &> /dev/null; then
    mem_output=$(free -h 2>/dev/null | head -2)
    echo "$mem_output"
    echo "PASS"
else
    echo "SKIP: free not available"
fi

# Test 3: Check disk space
echo ""
echo "Test 3: Checking disk space..."
if command -v df &> /dev/null; then
    disk_output=$(df -h / 2>/dev/null | tail -1)
    echo "$disk_output"
    echo "PASS"
else
    echo "FAIL: df not found"
    exit 1
fi

# Test 4: Check process list
echo ""
echo "Test 4: Checking process list..."
if command -v ps &> /dev/null; then
    proc_count=$(ps aux 2>/dev/null | wc -l)
    echo "Running processes: $proc_count"
    echo "PASS"
else
    echo "FAIL: ps not found"
    exit 1
fi

# Test 5: Check CPU info
echo ""
echo "Test 5: Checking CPU info..."
if [ -f /proc/cpuinfo ]; then
    cpu_model=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2)
    cpu_count=$(grep -c "processor" /proc/cpuinfo)
    echo "CPU: $cpu_model"
    echo "Cores: $cpu_count"
    echo "PASS"
else
    echo "SKIP: /proc/cpuinfo not available (macOS/BSD)"
fi

# Test 6: Check OS version
echo ""
echo "Test 6: Checking OS version..."
if [ -f /etc/os-release ]; then
    os_name=$(grep "PRETTY_NAME" /etc/os-release | cut -d= -f2)
    echo "OS: $os_name"
    echo "PASS"
elif command -v sw_vers &> /dev/null; then
    os_name=$(sw_vers 2>/dev/null | head -2)
    echo "$os_name"
    echo "PASS"
else
    echo "SKIP: OS detection not available"
fi

# Test 7: Network connectivity check
echo ""
echo "Test 7: Network check..."
if command -v curl &> /dev/null; then
    ping_result=$(curl -sI "https://google.com" 2>/dev/null | head -1)
    echo "$ping_result"
    echo "PASS"
else
    echo "SKIP: curl not available"
fi

echo ""
echo "=== All System Health Tests PASSED ==="
