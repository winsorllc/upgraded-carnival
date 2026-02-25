---
name: disk-manager
description: "Disk space management and cleanup. Analyze usage, find large files, clean temp files, manage storage. No API key required."
---

# Disk Manager Skill

Analyze disk usage, find large files, clean up temporary files, and manage storage.

## When to Use

✅ **USE this skill when:**

- "Check disk space"
- "Find large files"
- "Clean up temp files"
- "Analyze directory size"
- "What's using my disk space?"

## When NOT to Use

❌ **DON'T use this skill when:**

- Need real-time monitoring → use system monitoring tools
- Disk benchmarks → use HD benchmarks tools
- File system repair → use fsck/repair tools

## Commands

### Disk Space

```bash
{baseDir}/disk.sh space
{baseDir}/disk.sh space --human-readable
{baseDir}/disk.sh space /path/to/check
{baseDir}/disk.sh space --all
```

### Directory Usage

```bash
{baseDir}/disk.sh du /path/to/directory
{baseDir}/disk.sh du /path/to/directory --depth 2
{baseDir}/disk.sh du /path/to/directory --sort-by-size
{baseDir}/disk.sh du /path/to/directory --threshold 100M
```

### Find Large Files

```bash
{baseDir}/disk.sh largest /path/to/search
{baseDir}/disk.sh largest /path/to/search --limit 20
{baseDir}/disk.sh largest /path/to/search --min-size 100M
{baseDir}/disk.sh largest /path/to/search --type f
```

### Find Old Files

```bash
{baseDir}/disk.sh old /path/to/search --days 30
{baseDir}/disk.sh old /path/to/search --days 90 --delete
{baseDir}/disk.sh old /tmp --days 7 --list
```

### Clean Up

```bash
{baseDir}/disk.sh clean --temp
{baseDir}/disk.sh clean --cache
{baseDir}/disk.sh clean --logs
{baseDir}/disk.sh clean --all
{baseDir}/disk.sh clean --dry-run
```

### File Type Distribution

```bash
{baseDir}/disk.sh types /path/to/analyze
{baseDir}/disk.sh types /path/to/analyze --by-size
{baseDir}/disk.sh types /path/to/analyze --by-count
```

### Inode Usage

```bash
{baseDir}/disk.sh inodes
{baseDir}/disk.sh inodes /path/to/check
{baseDir}/disk.sh inodes --find-high-usage
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--human-readable` | Show sizes in human format | false |
| `--depth N` | Directory traversal depth | 1 |
| `--sort-by-size` | Sort by size (largest first) | false |
| `--limit N` | Limit number of results | 10 |
| `--min-size SIZE` | Minimum file size (e.g., 100M) | None |
| `--max-size SIZE` | Maximum file size | None |
| `--type TYPE` | File type: f (file), d (dir) | all |
| `--days N` | Files older than N days | 30 |
| `--delete` | Delete found files (dangerous) | false |
| `--dry-run` | Show what would be deleted | false |
| `--threshold SIZE` | Show only directories above size | None |
| `--by-size` | Sort by total size | false |
| `--by-count` | Sort by file count | false |

## Size Units

| Unit | Value |
|------|-------|
| `K` | Kilobytes (1024 bytes) |
| `M` | Megabytes (1024K) |
| `G` | Gigabytes (1024M) |
| `T` | Terabytes (1024G) |

## Output Examples

### Disk Space
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   45G   55G  45% /
/dev/sda2       500G  200G  300G  40% /home
tmpfs           8.0G     0  8.0G   0% /tmp
```

### Directory Usage
```
Directory Usage: /home/user
================================
45.2G  Downloads/
32.1G  Documents/
10.5G  .cache/
8.2G   .local/
2.3G   .config/
--------------------------------
98.3G  Total
```

### Large Files
```
Top 10 Largest Files in /home/user
====================================
4.2G   Downloads/ubuntu.iso
2.1G   VMs/ubuntu-vm.vdi
1.8G   Downloads/movie.mp4
950M   .cache/pip/http/...
...
```

### File Types
```
File Types by Size: /home/user/Downloads
=========================================
mp4    12.5G  (45 files)
iso    4.2G   (1 file)
pdf    2.1G   (156 files)
zip    1.8G   (23 files)
jpg    1.2G   (890 files)
...
```

## Examples

**Check disk space:**
```bash
{baseDir}/disk.sh space --human-readable
# Shows all mounted filesystems with usage
```

**Find large files:**
```bash
{baseDir}/disk.sh largest /home/user --limit 20 --min-size 100M
# Top 20 files over 100MB
```

**Analyze directory:**
```bash
{baseDir}/disk.sh du /var/log --depth 2 --sort-by-size
# Show log directory structure by size
```

**Clean temp files:**
```bash
{baseDir}/disk.sh clean --temp --dry-run
# Show what would be cleaned (dry run)
{baseDir}/disk.sh clean --temp
# Actually clean temp files
```

**Find old files:**
```bash
{baseDir}/disk.sh old /tmp --days 7 --list
# List files in /tmp older than 7 days
```

**File type analysis:**
```bash
{baseDir}/disk.sh types /home/user/Downloads --by-size
# Show space used by each file type
```

## Danger Zone

Use `--delete` with caution:

```bash
# Dry run first!
{baseDir}/disk.sh old /tmp --days 30 --delete --dry-run

# Only then actually delete
{baseDir}/disk.sh old /tmp --days 30 --delete
```

## Notes

- Uses `df`, `du`, and `find` under the hood
- Safe operations by default (no deletion without --delete)
- Dry run recommended before any cleanup
- Handles permission errors gracefully
- Can analyze specific directories or entire filesystem