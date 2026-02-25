#!/usr/bin/env node
/**
 * Health Check - System health monitoring and diagnostics
 * 
 * Usage: health-check.js <command> [options]
 * 
 * Commands:
 *   system              Show CPU and memory overview
 *   disk [path]         Show disk usage
 *   service <name>      Check if service is running
 *   endpoint <url>      Check HTTP endpoint health
 *   docker [container]  Check Docker container health
 *   top [--cpu|--mem]  Show top processes
 *   process <name>      Find process by name
 *   port <port>...      Check port availability
 *   ping <host>         Check if host is reachable
 *   report              Full system health report
 *   status              Quick status summary
 * 
 * Options:
 *   --json              Output as JSON
 *   --quiet             Exit code only
 *   --timing            Include timing info
 *   --expected <code>   Expected HTTP status code
 *   --systemd          Use systemd for service check
 */

const { execSync, spawn } = require('child_process');
const https = require('https');
const http = require('http');
const os = require('os');
const fs = require('fs');
const { URL } = require('url');

// Parse arguments
const args = process.argv.slice(2);
let command = args[0];

// Check for help
if (args.includes('--help') || args.includes('-h')) {
    showHelp();
}

const options = {
    json: args.includes('--json'),
    quiet: args.includes('--quiet'),
    timing: args.includes('--timing'),
    expected: getArgValue('--expected'),
    systemd: args.includes('--systemd'),
    cpu: args.includes('--cpu'),
    mem: args.includes('--mem')
};

function getArgValue(flag) {
    const idx = args.indexOf(flag);
    return idx > 0 && idx < args.length - 1 ? args[idx + 1] : null;
}

function showHelp() {
    console.log(`Health Check - System health monitoring

Usage: health-check.js <command> [options]

Commands:
  system              Show CPU and memory overview
  disk [path]         Show disk usage
  service <name>      Check if service is running
  endpoint <url>      Check HTTP endpoint health
  docker [container]  Check Docker container health
  top [--cpu|--mem]  Show top processes
  process <name>      Find process by name
  port <port>...      Check port availability
  ping <host>         Check if host is reachable
  report              Full system health report
  status              Quick status summary

Options:
  --json              Output as JSON
  --quiet             Exit code only
  --timing            Include timing info
  --expected <code>   Expected HTTP status code
  --systemd          Use systemd for service check
`);
    process.exit(0);
}

// Helper: Execute command
function exec(cmd, silent = false) {
    try {
        return execSync(cmd, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' }).trim();
    } catch (e) {
        return silent ? '' : null;
    }
}

// Output helpers
function output(data) {
    if (options.json) {
        console.log(JSON.stringify(data, null, 2));
    } else if (typeof data === 'string') {
        console.log(data);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

function error(msg) {
    if (options.json) {
        console.log(JSON.stringify({ error: msg }));
    } else {
        console.error(msg);
    }
    process.exit(1);
}

// Commands
async function systemHealth() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
        for (let type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });
    
    const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = Math.round((usedMem / totalMem) * 100);
    
    const load = os.loadavg();
    
    const result = {
        cpu: { usage: cpuUsage, cores: cpus.length },
        memory: { 
            total: formatBytes(totalMem), 
            used: formatBytes(usedMem), 
            free: formatBytes(freeMem),
            usage: memUsage
        },
        load: { '1m': load[0], '5m': load[1], '15m': load[2] },
        uptime: formatUptime(os.uptime())
    };
    
    if (options.json) {
        output(result);
    } else {
        console.log(`CPU: ${result.cpu.usage}% (${result.cpu.cores} cores)`);
        console.log(`Memory: ${result.memory.usage}% (${result.memory.used} / ${result.memory.total})`);
        console.log(`Load: ${result.load['1m']} (1m), ${result.load['5m']} (5m), ${result.load['15m']} (15m)`);
        console.log(`Uptime: ${result.uptime}`);
    }
}

function diskUsage(path = '/') {
    try {
        const df = exec(`df -h "${path}" | tail -1`, true);
        const parts = df.split(/\s+/);
        
        if (parts.length < 6) {
            error('Failed to get disk usage');
        }
        
        const result = {
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            usePercent: parts[4],
            mounted: parts[5]
        };
        
        const usePercent = parseInt(result.usePercent);
        result.status = usePercent >= 95 ? 'critical' : usePercent >= 85 ? 'warning' : 'ok';
        
        if (options.json) {
            output(result);
        } else {
            const status = result.status === 'critical' ? '🔴' : result.status === 'warning' ? '🟡' : '🟢';
            console.log(`${status} Disk: ${result.usePercent} used (${result.used} / ${result.size}) on ${result.mounted}`);
        }
    } catch (e) {
        error('Failed to get disk usage: ' + e.message);
    }
}

function checkService(name) {
    try {
        // Try systemd first
        if (options.systemd || fs.existsSync('/run/systemd/system')) {
            const status = exec(`systemctl is-active "${name}"`, true);
            const result = { service: name, running: status === 'active' };
            
            if (options.json) {
                output(result);
            } else {
                console.log(result.running ? `✅ ${name} is running` : `❌ ${name} is not running`);
            }
            return;
        }
        
        // Fall back to ps
        const running = exec(`pgrep -x "${name}" > /dev/null && echo "yes" || echo "no"`, true) === 'yes';
        const result = { service: name, running };
        
        if (options.json) {
            output(result);
        } else {
            console.log(result.running ? `✅ ${name} is running` : `❌ ${name} is not running`);
        }
    } catch (e) {
        error('Failed to check service: ' + e.message);
    }
}

async function checkEndpoint(urlStr) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
        try {
            const url = new URL(urlStr);
            const client = url.protocol === 'https:' ? https : http;
            
            const req = client.request(url, { method: 'GET', timeout: 10000 }, (res) => {
                const timing = Date.now() - startTime;
                const statusCode = res.statusCode;
                const expectedCode = options.expected ? parseInt(options.expected) : 200;
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const result = {
                        url: urlStr,
                        status: statusCode,
                        ok: statusCode === expectedCode,
                        timing: timing + 'ms'
                    };
                    
                    if (options.quiet) {
                        process.exit(result.ok ? 0 : 1);
                    }
                    
                    if (options.json) {
                        output(result);
                    } else {
                        console.log(result.ok ? `✅ ${url.hostname} is healthy (${statusCode} in ${timing}ms)` : 
                            `❌ ${url.hostname} is down (${statusCode})`);
                    }
                    resolve();
                });
            });
            
            req.on('error', (e) => {
                const result = { url: urlStr, ok: false, error: e.message };
                
                if (options.quiet) {
                    process.exit(1);
                }
                
                if (options.json) {
                    output(result);
                } else {
                    console.log(`❌ ${url.hostname} is unreachable: ${e.message}`);
                }
                resolve();
            });
            
            req.on('timeout', () => {
                req.destroy();
                const result = { url: urlStr, ok: false, error: 'timeout' };
                
                if (options.quiet) {
                    process.exit(1);
                }
                
                if (options.json) {
                    output(result);
                } else {
                    console.log(`❌ ${url.hostname} timed out`);
                }
                resolve();
            });
            
            req.end();
        } catch (e) {
            error('Invalid URL: ' + e.message);
        }
    });
}

function checkDocker(container = null) {
    try {
        if (container) {
            const info = exec(`docker inspect --format '{{.State.Status}}' "${container}" 2>/dev/null`, true);
            const running = info === 'running';
            
            const result = { container, status: info || 'unknown', running };
            
            if (options.json) {
                output(result);
            } else {
                console.log(result.running ? `✅ ${container} is running` : `❌ ${container}: ${info}`);
            }
        } else {
            const containers = exec('docker ps -a --format "{{.Names}}: {{.Status}}"', true);
            const result = containers.split('\n').filter(c => c).map(line => {
                const [name, status] = line.split(': ');
                return { name, status, running: status?.startsWith('Up') };
            });
            
            if (options.json) {
                output(result);
            } else {
                result.forEach(c => {
                    console.log(c.running ? `✅ ${c.name}: ${c.status}` : `❌ ${c.name}: ${c.status}`);
                });
            }
        }
    } catch (e) {
        // Docker might not be available
        if (options.json) {
            output({ error: 'Docker not available', containers: [] });
        } else {
            console.log('Docker not available');
        }
    }
}

function topProcesses() {
    const sortBy = options.mem ? '%mem' : '%cpu';
    const output = exec(`ps aux --sort=-${sortBy} | head -11 | tail -10`, true);
    
    const lines = output.split('\n');
    const processes = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
            pid: parts[1],
            user: parts[0],
            cpu: parseFloat(parts[2]),
            mem: parseFloat(parts[3]),
            command: parts.slice(10).join(' ')
        };
    });
    
    if (options.json) {
        output(processes);
    } else {
        console.log('Top processes by ' + (options.mem ? 'memory' : 'CPU') + ':');
        processes.forEach(p => {
            console.log(`  ${p.pid}: ${p.cpu}% CPU, ${p.mem}% MEM - ${p.command}`);
        });
    }
}

function findProcess(name) {
    const output = exec(`pgrep -a "${name}"`, true);
    const processes = output.split('\n').filter(p => p).map(line => {
        const parts = line.trim().match(/^(\S+)\s+(.*)$/);
        return parts ? { pid: parts[1], command: parts[2] } : null;
    }).filter(p => p);
    
    if (options.json) {
        output({ name, processes });
    } else {
        if (processes.length === 0) {
            console.log(`No processes found matching "${name}"`);
        } else {
            console.log(`Found ${processes.length} process(es):`);
            processes.forEach(p => {
                console.log(`  ${p.pid}: ${p.command}`);
            });
        }
    }
}

function checkPorts() {
    const ports = args.slice(1).filter(a => !a.startsWith('--'));
    const results = [];
    
    ports.forEach(port => {
        const result = { port, open: false };
        
        // Check if something is listening
        const output = exec(`ss -tln | grep ":${port} "`, true);
        result.open = output.includes('LISTEN');
        
        results.push(result);
        
        if (!options.json) {
            console.log(result.open ? `✅ Port ${port} is open` : `❌ Port ${port} is closed`);
        }
    });
    
    if (options.json) {
        output(results);
    }
}

function pingHost(host) {
    try {
        const output = exec(`ping -c 1 -W 2 "${host}"`, true);
        const match = output.match(/time=(\d+\.?\d*)/);
        
        const result = { host, reachable: !!match, time: match ? match[1] + 'ms' : null };
        
        if (options.json) {
            output(result);
        } else {
            console.log(result.reachable ? `✅ ${host} is reachable (${result.time})` : `❌ ${host} is unreachable`);
        }
    } catch (e) {
        if (options.json) {
            output({ host, reachable: false, error: e.message });
        } else {
            console.log(`❌ ${host} is unreachable`);
        }
    }
}

async function fullReport() {
    console.log('╔═══════════════════════════════════════╗');
    console.log('║     System Health Report             ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
    
    // System
    await systemHealth();
    console.log('');
    
    // Disk
    diskUsage();
    console.log('');
    
    // Docker (if available)
    try {
        exec('docker ps -q', true);
        console.log('Docker containers:');
        checkDocker();
    } catch (e) {}
}

function quickStatus() {
    const checks = [];
    
    // CPU check
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    cpus.forEach(cpu => {
        for (let type in cpu.times) totalTick += cpu.times[type];
        totalIdle += cpu.times.idle;
    });
    const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);
    checks.push({ name: 'CPU', ok: cpuUsage < 80, value: cpuUsage + '%' });
    
    // Memory
    const memUsage = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
    checks.push({ name: 'Memory', ok: memUsage < 80, value: memUsage + '%' });
    
    // Disk
    try {
        const df = exec(`df / | tail -1`, true);
        const usePercent = parseInt(df.split(/\s+/)[4]);
        checks.push({ name: 'Disk', ok: usePercent < 85, value: usePercent + '%' });
    } catch (e) {}
    
    if (options.json) {
        output({ checks });
    } else {
        console.log('System Status:');
        checks.forEach(c => {
            console.log(c.ok ? `✅ ${c.name}: ${c.value}` : `❌ ${c.name}: ${c.value}`);
        });
    }
}

// Utility functions
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return bytes.toFixed(1) + ' ' + units[i];
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
}

// Main dispatcher
async function main() {
    if (!command) {
        showHelp();
        return;
    }
    
    const remainingArgs = args.slice(1).filter(a => !a.startsWith('--'));
    
    try {
        switch (command) {
            case 'system':
                systemHealth();
                break;
            case 'disk':
                diskUsage(remainingArgs[0] || '/');
                break;
            case 'service':
                if (!remainingArgs[0]) error('Service name required');
                checkService(remainingArgs[0]);
                break;
            case 'endpoint':
                if (!remainingArgs[0]) error('URL required');
                await checkEndpoint(remainingArgs[0]);
                break;
            case 'docker':
                checkDocker(remainingArgs[0]);
                break;
            case 'top':
                topProcesses();
                break;
            case 'process':
                if (!remainingArgs[0]) error('Process name required');
                findProcess(remainingArgs[0]);
                break;
            case 'port':
                checkPorts();
                break;
            case 'ping':
                if (!remainingArgs[0]) error('Host required');
                pingHost(remainingArgs[0]);
                break;
            case 'report':
                await fullReport();
                break;
            case 'status':
                quickStatus();
                break;
            default:
                error(`Unknown command: ${command}`);
        }
    } catch (e) {
        error(e.message);
    }
}

main();
