---
name: port-scanner
description: Scan for open ports on hosts. Quick TCP port scanning for network diagnostics and service discovery.
---

# Port Scanner

Quick TCP port scanner for network diagnostics. Check which ports are open on a host.

## Setup
No dependencies required.

## Usage

### Scan common ports
```bash
{baseDir}/portscan.sh hostname
{baseDir}/portscan.sh 192.168.1.1
```

### Scan specific port
```bash
{baseDir}/portscan.sh hostname --port 8080
```

### Scan port range
```bash
{baseDir}/portscan.sh hostname --range 1-1000
```

### Scan multiple specific ports
```bash
{baseDir}/portscan.sh hostname --ports 22,80,443,3306,5432
```

### Quick mode (fast scan)
```bash
{baseDir}/portscan.sh hostname --quick
```

### Output
```
ΓòöΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòù
Γòæ                      PORT SCAN RESULTS                         Γòæ
ΓòÜΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓò¥

Target: 192.168.1.1
Ports Scanned: 22, 80, 443, 3306, 5432, 8080

PORT      STATE     SERVICE
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  22      OPEN      ssh
  80      OPEN      http
  443     OPEN      https
  3306    CLOSED    mysql
  5432    CLOSED    postgresql
  8080    OPEN      http-alt

Open Ports: 3 | Closed: 3
Duration: 3.2s
```

## When to Use
- Network troubleshooting
- Service discovery
- Security auditing
- Port availability checks
- DevOps debugging
