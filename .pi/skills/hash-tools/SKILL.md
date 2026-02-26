---
name: hash-tools
description: "Calculate file and string hashes. MD5, SHA-1, SHA-256, SHA-512, BLAKE2. Verify integrity, compare files, generate checksums. No API key required."
---

# Hash Tools Skill

Calculate cryptographic hashes for files and strings. Support for multiple algorithms and hash comparison.

## When to Use

Γ£à **USE this skill when:**

- "Calculate MD5/SHA hash of a file"
- "Hash this string"
- "Verify file integrity"
- "Compare two files"
- "Generate checksum"
- "Find duplicate files"

## When NOT to Use

Γ¥î **DON'T use this skill when:**

- Encrypt/decrypt data ΓåÆ use encryption tools
- Password hashing ΓåÆ use bcrypt/argon2
- Digital signatures ΓåÆ use gpg/signing tools

## Commands

### File Hash

```bash
{baseDir}/hash.sh <algorithm> <file>
{baseDir}/hash.sh md5 /path/to/file
{baseDir}/hash.sh sha256 /path/to/file
{baseDir}/hash.sh sha512 /path/to/file
{baseDir}/hash.sh blake2b /path/to/file
```

### String Hash

```bash
{baseDir}/hash.sh <algorithm> --string "text to hash"
{baseDir}/hash.sh sha256 --string "hello world"
```

### Hash All Files in Directory

```bash
{baseDir}/hash-dir.sh <algorithm> <directory>
{baseDir}/hash-dir.sh sha256 ./my-files --output hashes.txt
```

### Compare Files by Hash

```bash
{baseDir}/hash-compare.sh <file1> <file2>
{baseDir}/hash-compare.sh file1.txt file2.txt --algorithm sha256
```

### Verify Against Checksum

```bash
{baseDir}/hash-verify.sh <algorithm> <file> <expected-hash>
{baseDir}/hash-verify.sh sha256 file.txt "abc123..."
```

### Find Duplicate Files

```bash
{baseDir}/hash-dupes.sh <directory>
{baseDir}/hash-dupes.sh ./my-files --algorithm md5
{baseDir}/hash-dupes.sh ./my-files --delete
```

## Supported Algorithms

| Algorithm | Command | Notes |
|-----------|---------|-------|
| MD5 | `md5` | Fast, not collision-safe |
| SHA-1 | `sha1` | Deprecated for security |
| SHA-256 | `sha256` | Recommended default |
| SHA-512 | `sha512` | Longer hash |
| BLAKE2b | `blake2b` | Fast, secure alternative |
| BLAKE2s | `blake2s` | 256-bit variant |

## Output Formats

```bash
{baseDir}/hash.sh sha256 file.txt          # Just the hash
{baseDir}/hash.sh sha256 file.txt --format long  # "SHA256 (file.txt) = abc123..."
{baseDir}/hash.sh sha256 file.txt --json         # JSON output
{baseDir}/hash.sh sha256 file.txt --base64       # Base64 encoded
```

## Examples

**Hash a file:**
```bash
{baseDir}/hash.sh sha256 document.pdf
# Output: a1b2c3d4e5f6...
```

**Hash a string:**
```bash
{baseDir}/hash.sh sha256 --string "hello world"
# Output: b94d27b9934d3e08...
```

**Verify a download:**
```bash
{baseDir}/hash-verify.sh sha256 download.tar.gz "expected-hash-value"
# Output: Γ£à Hash matches!
```

**Find duplicates in directory:**
```bash
{baseDir}/hash-dupes.sh ./photos --algorithm sha256
# Output: Duplicates found:
#   sha256:abc123... -> file1.jpg, file2.jpg
```

**Generate checksums file:**
```bash
{baseDir}/hash-dir.sh sha256 ./dist > CHECKSUMS.sha256
```

## Notes

- Uses system utilities (md5sum, sha256sum, b2sum) when available
- Falls back to OpenSSL for algorithms not in coreutils
- All hash operations are deterministic
- No network access required
