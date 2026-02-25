#!/bin/bash
# System information tool
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: system.sh <command> [options]

Commands:
  info          System overview (OS, CPU, memory, disk)
  cpu           CPU information and usage
  memory        Memory information
  disk          Disk usage information
  network       Network information
  processes     Process information
  env           Environment variables

Options:
  --json             Output as JSON
  --summary          Condensed summary
  --top <N>          Top N results
  --path <path>      Specific path for disk
  --filter <regex>   Filter environments
  --by-memory        Sort processes by memory
  --by-cpu           Sort processes by CPU
  --user <user>      Filter by user
  --tree             Show process tree
  -h, --help         Show this help

Examples:
  system.sh info
  system.sh cpu --usage
  system.sh memory --json
  system.sh disk --path /
  system.sh processes --top 10 --by-memory
EOF
    exit 2
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "linux"
    fi
}

OS=$(detect_os)

# Default values
COMMAND="${1:-}"
shift || true

JSON=false
SUMMARY=false
TOP=10
PATH_ARG=""
FILTER=""
SORT_BY=""
USER_FILTER=""
TREE=false

# Parse options
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --json)
            JSON=true
            ;;
        --summary)
            SUMMARY=true
            ;;
        --top)
            shift
            TOP="$1"
            ;;
        --path)
            shift
            PATH_ARG="$1"
            ;;
        --filter)
            shift
            FILTER="$1"
            ;;
        --by-memory)
            SORT_BY="memory"
            ;;
        --by-cpu)
            SORT_BY="cpu"
            ;;
        --user)
            shift
            USER_FILTER="$1"
            ;;
        --tree)
            TREE=true
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
    esac
    shift
done

# Execute command
case "$COMMAND" in
    info)
        python3 << PYEOF
import sys
import json
import platform
import os

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

info = {
    "os": platform.system(),
    "os_version": platform.version(),
    "os_release": platform.release(),
    "architecture": platform.machine(),
    "hostname": platform.node(),
    "python_version": platform.python_version(),
}

if HAS_PSUTIL:
    info["cpu_cores"] = psutil.cpu_count()
    info["cpu_percent"] = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory()
    info["memory_total_gb"] = round(mem.total / (1024**3), 2)
    info["memory_available_gb"] = round(mem.available / (1024**3), 2)
    info["memory_percent"] = mem.percent
    disk = psutil.disk_usage('/')
    info["disk_total_gb"] = round(disk.total / (1024**3), 2)
    info["disk_free_gb"] = round(disk.free / (1024**3), 2)
    info["disk_percent"] = round((disk.used / disk.total) * 100, 1)

if $JSON:
    print(json.dumps(info, indent=2))
else:
    print(f"System Information")
    print(f"===================")
    print(f"OS: {info['os']} {info.get('os_release', '')}")
    print(f"Architecture: {info['architecture']}")
    print(f"Hostname: {info['hostname']}")
    if HAS_PSUTIL:
        print(f"\nCPU:")
        print(f"  Cores: {info['cpu_cores']}")
        print(f"  Usage: {info['cpu_percent']}%")
        print(f"\nMemory:")
        print(f"  Total: {info['memory_total_gb']} GB")
        print(f"  Available: {info['memory_available_gb']} GB")
        print(f"  Usage: {info['memory_percent']}%")
        print(f"\nDisk:")
        print(f"  Total: {info['disk_total_gb']} GB")
        print(f"  Free: {info['disk_free_gb']} GB")
        print(f"  Usage: {info['disk_percent']}%")
PYEOF
        ;;

    cpu)
        if [[ "$OS" == "macos" ]]; then
            if [[ "$JSON" == "true" ]]; then
                python3 -c "
import json
import subprocess
import os

# Get CPU info on macOS
model = subprocess.check_output(['sysctl', '-n', 'machdep.cpu.brand_string']).decode().strip()
cores = os.cpu_count()
load = subprocess.check_output(['sysctl', '-n', 'vm.loadavg']).decode().strip().split()[1:4]

print(json.dumps({
    'model': model,
    'cores': cores,
    'load_avg': load
}, indent=2))
"
            else
                echo "CPU Information"
                echo "==============="
                sysctl -n machdep.cpu.brand_string
                echo "Cores: $(sysctl -n hw.ncpu)"
                echo "Load Average: $(sysctl -n vm.loadavg)"
            fi
        else
            if [[ "$JSON" == "true" ]]; then
                python3 -c "
import json
import os

# Get CPU info on Linux
with open('/proc/cpuinfo') as f:
    cpuinfo = f.read()
model = 'Unknown'
for line in cpuinfo.split('\n'):
    if 'model name' in line.lower():
        model = line.split(':')[1].strip()
        break

cores = os.cpu_count()
with open('/proc/loadavg') as f:
    load = f.read().split()[:3]

print(json.dumps({
    'model': model,
    'cores': cores,
    'load_avg': load
}, indent=2))
"
            else
                echo "CPU Information"
                echo "==============="
                lscpu | grep -E "^CPU\(s\)|^Model name|^CPU MHz" || cat /proc/cpuinfo | grep "model name" | head -1
                echo "Cores: $(nproc)"
                echo "Load Average: $(cat /proc/loadavg | cut -d' ' -f1-3)"
            fi
        fi
        ;;

    memory)
        python3 << PYEOF
import sys
import json

try:
    import psutil
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()

    data = {
        "total_gb": round(mem.total / (1024**3), 2),
        "available_gb": round(mem.available / (1024**3), 2),
        "used_gb": round(mem.used / (1024**3), 2),
        "percent": mem.percent,
        "swap_total_gb": round(swap.total / (1024**3), 2),
        "swap_used_gb": round(swap.used / (1024**3), 2),
        "swap_percent": swap.percent
    }

    if $JSON:
        print(json.dumps(data, indent=2))
    else:
        print("Memory Information")
        print("==================")
        print(f"Total: {data['total_gb']} GB")
        print(f"Used: {data['used_gb']} GB ({data['percent']}%)")
        print(f"Available: {data['available_gb']} GB")
        print(f"\nSwap:")
        print(f"Total: {data['swap_total_gb']} GB")
        print(f"Used: {data['swap_used_gb']} GB ({data['swap_percent']}%)")

except ImportError:
    print("psutil not installed. Install with: pip install psutil", file=sys.stderr)
    sys.exit(1)
PYEOF
        ;;

    disk)
        python3 << PYEOF
import sys
import json
import os

try:
    import psutil

    path = "$PATH_ARG" if "$PATH_ARG" else "/"
    usage = psutil.disk_usage(path)

    data = {
        "path": path,
        "total_gb": round(usage.total / (1024**3), 2),
        "used_gb": round(usage.used / (1024**3), 2),
        "free_gb": round(usage.free / (1024**3), 2),
        "percent": round((usage.used / usage.total) * 100, 1)
    }

    if $JSON:
        print(json.dumps(data, indent=2))
    else:
        print(f"Disk Usage: {path}")
        print("=================")
        print(f"Total: {data['total_gb']} GB")
        print(f"Used: {data['used_gb']} GB ({data['percent']}%)")
        print(f"Free: {data['free_gb']} GB")

except ImportError:
    print("psutil not installed. Install with: pip install psutil", file=sys.stderr)
    sys.exit(1)
PYEOF
        ;;

    network)
        python3 << PYEOF
import sys
import json

try:
    import psutil

    if $JSON:
        data = {}
        for name, addrs in psutil.net_if_addrs().items():
            data[name] = [addr.address for addr in addrs]
        print(json.dumps(data, indent=2))
    else:
        print("Network Interfaces")
        print("===================")
        for name, addrs in psutil.net_if_addrs().items():
            print(f"\n{name}:")
            for addr in addrs:
                print(f"  {addr.family.name}: {addr.address}")

except ImportError:
    print("psutil not installed. Install with: pip install psutil", file=sys.stderr)
    sys.exit(1)
PYEOF
        ;;

    processes)
        if [[ "$TREE" == "true" ]]; then
            pstree -p 2>/dev/null || ps auxf
        else
            python3 << PYEOF
import sys
import json

try:
    import psutil

    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'username', 'memory_percent', 'cpu_percent']):
        try:
            pinfo = proc.info
            pinfo['memory_percent'] = round(pinfo.get('memory_percent', 0) or 0, 1)
            pinfo['cpu_percent'] = round(proc.cpu_percent(interval=0.1), 1)
            processes.append(pinfo)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    # Sort
    sort_by = "$SORT_BY"
    if sort_by == "memory":
        processes.sort(key=lambda x: x['memory_percent'], reverse=True)
    elif sort_by == "cpu":
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)

    # Filter by user
    user_filter = "$USER_FILTER"
    if user_filter:
        processes = [p for p in processes if user_filter in p.get('username', '')]

    # Top N
    top = $TOP
    processes = processes[:top]

    if $JSON:
        print(json.dumps(processes, indent=2))
    else:
        print(f"{'PID':<8} {'NAME':<20} {'USER':<15} {'MEM%':<8} {'CPU%':<8}")
        print("=" * 60)
        for p in processes:
            print(f"{p['pid']:<8} {p['name'][:20]:<20} {str(p.get('username', ''))[:15]:<15} {p['memory_percent']:<8.1f} {p['cpu_percent']:<8.1f}")

except ImportError:
    print("psutil not installed. Install with: pip install psutil", file=sys.stderr)
    sys.exit(1)
PYEOF
        fi
        ;;

    env)
        python3 << PYEOF
import sys
import json
import os
import re

env_vars = dict(os.environ)
filter_pattern = "$FILTER"

if filter_pattern:
    regex = re.compile(filter_pattern, re.IGNORECASE)
    env_vars = {k: v for k, v in env_vars.items() if regex.search(k)}

if $JSON:
    print(json.dumps(env_vars, indent=2))
else:
    print("Environment Variables")
    print("===================")
    for k, v in sorted(env_vars.items()):
        print(f"{k}={v[:100]}")
PYEOF
        ;;

    -h|--help)
        usage
        ;;

    "")
        usage
        ;;

    *)
        echo "Unknown command: $COMMAND" >&2
        usage
        ;;
esac