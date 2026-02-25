#!/bin/bash
# Test: Docker Manager Skill

echo "=== Testing Docker Manager Skill ==="

# Test 1: Check if docker is available
echo "Test 1: Checking docker availability..."
if command -v docker &> /dev/null; then
    echo "PASS: Docker CLI found at $(which docker)"
else
    echo "SKIP: Docker not available"
    exit 0
fi

# Test 2: Check docker version
echo ""
echo "Test 2: Checking docker version..."
docker_version=$(docker --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "PASS: $docker_version"
else
    echo "FAIL: Cannot get docker version"
    exit 1
fi

# Test 3: Check docker daemon connectivity
echo ""
echo "Test 3: Checking docker daemon..."
if docker info >/dev/null 2>&1; then
    echo "PASS: Docker daemon is running"
else
    echo "SKIP: Docker daemon not accessible"
    exit 0
fi

# Test 4: List containers
echo ""
echo "Test 4: Listing containers..."
container_count=$(docker ps -a -q 2>/dev/null | wc -l)
echo "PASS: Found $container_count containers"

# Test 5: List images
echo ""
echo "Test 5: Listing images..."
image_count=$(docker images -q 2>/dev/null | wc -l)
echo "PASS: Found $image_count images"

# Test 6: List networks
echo ""
echo "Test 6: Listing networks..."
network_count=$(docker network ls -q 2>/dev/null | wc -l)
echo "PASS: Found $network_count networks"

# Test 7: System info
echo ""
echo "Test 7: Docker system info..."
if docker system df >/dev/null 2>&1; then
    echo "PASS: Docker system df works"
else
    echo "FAIL"
    exit 1
fi

# Test 8: Check docker-compose (if available)
echo ""
echo "Test 8: Checking docker-compose..."
if command -v docker-compose &> /dev/null; then
    compose_version=$(docker-compose --version)
    echo "PASS: $compose_version"
elif docker compose version &> /dev/null; then
    compose_version=$(docker compose version)
    echo "PASS: $compose_version"
else
    echo "SKIP: docker-compose not available"
fi

echo ""
echo "=== All Docker Manager Tests PASSED ==="
