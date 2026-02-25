#!/bin/bash
# Test: Password Generation Skill

echo "=== Testing Password Generation Skill ==="

# Test 1: Generate random hex
echo "Test 1: Generating random hex..."
if command -v openssl &> /dev/null; then
    hex_pass=$(openssl rand -hex 16)
    if [ ${#hex_pass} -eq 32 ]; then
        echo "PASS: Generated 32-char hex password"
    else
        echo "FAIL: Wrong length"
        exit 1
    fi
else
    echo "SKIP: openssl not available"
fi

# Test 2: Generate base64 password
echo ""
echo "Test 2: Generating base64 password..."
if command -v openssl &> /dev/null; then
    b64_pass=$(openssl rand -base64 16)
    if [ ${#b64_pass} -gt 20 ]; then
        echo "PASS: Generated base64 password"
    else
        echo "FAIL"
        exit 1
    fi
else
    echo "SKIP"
fi

# Test 3: Generate UUID
echo ""
echo "Test 3: Generating UUID..."
if command -v uuidgen &> /dev/null; then
    uuid=$(uuidgen)
    if echo "$uuid" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'; then
        echo "PASS: UUID = $uuid"
    else
        echo "FAIL"
        exit 1
    fi
else
    echo "SKIP: uuidgen not available"
fi

# Test 4: Generate UUID with node
echo ""
echo "Test 4: Generating UUID with node..."
node_uuid=$(node -e "console.log(require('crypto').randomUUID())")
if echo "$node_uuid" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'; then
    echo "PASS: UUID = $node_uuid"
else
    echo "FAIL"
    exit 1
fi

# Test 5: SHA-256 hash
echo ""
echo "Test 5: SHA-256 hash..."
if command -v openssl &> /dev/null; then
    hash=$(echo -n "testpassword" | openssl dgst -sha256 | awk '{print $2}')
    if [ ${#hash} -eq 64 ]; then
        echo "PASS: SHA-256 hash generated"
    else
        echo "FAIL"
        exit 1
    fi
else
    echo "SKIP"
fi

# Test 6: Generate random using /dev/urandom
echo ""
echo "Test 6: Generate random string using /dev/urandom..."
random_str=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)
if [ ${#random_str} -eq 16 ]; then
    echo "PASS: Generated 16-char random string"
else
    echo "FAIL"
    exit 1
fi

# Test 7: Generate API key format
echo ""
echo "Test 7: Generate API key..."
if command -v openssl &> /dev/null; then
    api_key=$(openssl rand -hex 32 | sed 's/^/sk_/')
    if [[ "$api_key" == "sk_"* ]]; then
        echo "PASS: API key generated: ${api_key:0:10}..."
    else
        echo "FAIL"
        exit 1
    fi
else
    echo "SKIP"
fi

# Test 8: Generate salt
echo ""
echo "Test 8: Generate salt..."
if command -v openssl &> /dev/null; then
    salt=$(openssl rand -hex 16)
    if [ ${#salt} -eq 32 ]; then
        echo "PASS: Salt generated"
    else
        echo "FAIL"
        exit 1
    fi
else
    echo "SKIP"
fi

echo ""
echo "=== All Password Generation Tests PASSED ==="
