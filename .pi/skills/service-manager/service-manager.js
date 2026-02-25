#!/usr/bin/env node

/**
 * Service Manager Skill
 * Manage system services (systemd, launchd, OpenRC)
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Detect init system
function detectInitSystem() {
  if (fs.existsSync('/run/systemd/system')) {
    return 'systemd';
  }
  if (fs.existsSync('/sbin/openrc') || fs.existsSync('/etc/init.d')) {
    return 'openrc';
  }
  if (process.platform === 'darwin') {
    return 'launchd';
  }
  return 'unknown';
}

// Execute command
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && !stdout) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Get service manager functions
function getServiceManager() {
  const initSystem = detectInitSystem();
  
  const managers = {
    systemd: {
      list: async () => {
        const output = await execPromise('systemctl list-units --type=service --all --no-pager');
        const lines = output.trim().split('\n').slice(1);
        const services = [];
        
        for (const line of lines) {
          const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/);
          if (match) {
            services.push({
              name: match[1],
              load: match[2],
              active: match[3],
              sub: match[4]
            });
          }
        }
        return services;
      },
      
      status: async (serviceName) => {
        const output = await execPromise(`systemctl status ${serviceName}`);
        return output;
      },
      
      start: async (serviceName) => {
        await execPromise(`sudo systemctl start ${serviceName}`);
        return `Started ${serviceName}`;
      },
      
      stop: async (serviceName) => {
        await execPromise(`sudo systemctl stop ${serviceName}`);
        return `Stopped ${serviceName}`;
      },
      
      restart: async (serviceName) => {
        await execPromise(`sudo systemctl restart ${serviceName}`);
        return `Restarted ${serviceName}`;
      },
      
      enable: async (serviceName) => {
        await execPromise(`sudo systemctl enable ${serviceName}`);
        return `Enabled ${serviceName}`;
      },
      
      disable: async (serviceName) => {
        await execPromise(`sudo systemctl disable ${serviceName}`);
        return `Disabled ${serviceName}`;
      },
      
      logs: async (serviceName, lines = 50) => {
        const output = await execPromise(`journalctl -u ${serviceName} -n ${lines} --no-pager`);
        return output;
      },
      
      create: async (name, options) => {
        const serviceContent = `[Unit]
Description=${options.description || name}
After=${options.after || 'network.target'}

[Service]
Type=${options.type || 'simple'}
User=${options.user || os.userInfo().username}
WorkingDirectory=${options.workingDir || '/'}
ExecStart=${options.command}
${options.restart ? `Restart=${options.restart}` : 'Restart=on-failure'}
RestartSec=5
${options.env ? options.env.split(',').map(e => `Environment="${e}"`).join('\n') : ''}

[Install]
WantedBy=multi-user.target
`;
        
        const servicePath = `/etc/systemd/system/${name}.service`;
        await execPromise(`sudo tee ${servicePath} > /dev/null << 'EOF'
${serviceContent}
EOF`);
        
        await execPromise('sudo systemctl daemon-reload');
        return `Created service: ${name}`;
      },
      
      remove: async (name) => {
        await execPromise(`sudo systemctl stop ${name}`);
        await execPromise(`sudo systemctl disable ${name}`);
        await execPromise(`sudo rm /etc/systemd/system/${name}.service`);
        await execPromise('sudo systemctl daemon-reload');
        return `Removed service: ${name}`;
      }
    },
    
    launchd: {
      list: async () => {
        const output = await execPromise('launchctl list');
        return output;
      },
      
      status: async (serviceName) => {
        const output = await execPromise(`launchctl list | grep ${serviceName}`);
        return output || `${serviceName} not found`;
      },
      
      start: async (serviceName) => {
        await execPromise(`launchctl load /Library/LaunchDaemons/${serviceName}.plist`);
        return `Started ${serviceName}`;
      },
      
      stop: async (serviceName) => {
        await execPromise(`launchctl unload /Library/LaunchDaemons/${serviceName}.plist`);
        return `Stopped ${serviceName}`;
      },
      
      restart: async (serviceName) => {
        await execPromise(`launchctl unload /Library/LaunchDaemons/${serviceName}.plist`);
        await execPromise(`launchctl load /Library/LaunchDaemons/${serviceName}.plist`);
        return `Restarted ${serviceName}`;
      },
      
      enable: async (serviceName) => {
        await execPromise(`launchctl load -w /Library/LaunchDaemons/${serviceName}.plist`);
        return `Enabled ${serviceName}`;
      },
      
      disable: async (serviceName) => {
        await execPromise(`launchctl unload -w /Library/LaunchDaemons/${serviceName}.plist`);
        return `Disabled ${serviceName}`;
      },
      
      logs: async (serviceName, lines = 50) => {
        return `Logs for launchd services require Console.app or log show`;
      },
      
      create: async (name, options) => {
        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${name}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${options.command.split(' ')[0]}</string>
        ${options.command.split(' ').slice(1).map(a => `<string>${a}</string>`).join('\n        ')}
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>${options.workingDir || '/'}</string>
    <key>UserName</key>
    <string>${options.user || os.userInfo().username}</string>
</dict>
</plist>
`;
        
        const plistPath = `/Library/LaunchDaemons/${name}.plist`;
        await execPromise(`sudo tee ${plistPath} > /dev/null << 'EOF'
${plistContent}
EOF`);
        
        return `Created service: ${name}`;
      },
      
      remove: async (name) => {
        await execPromise(`launchctl unload /Library/LaunchDaemons/${name}.plist`);
        await execPromise(`sudo rm /Library/LaunchDaemons/${name}.plist`);
        return `Removed service: ${name}`;
      }
    },
    
    openrc: {
      list: async () => {
        try {
          const output = await execPromise('rc-status -a');
          return output;
        } catch (e) {
          return 'OpenRC not available on this system';
        }
      },
      
      status: async (serviceName) => {
        const output = await execPromise(`rc-service ${serviceName} status`);
        return output;
      },
      
      start: async (serviceName) => {
        await execPromise(`sudo rc-service ${serviceName} start`);
        return `Started ${serviceName}`;
      },
      
      stop: async (serviceName) => {
        await execPromise(`sudo rc-service ${serviceName} stop`);
        return `Stopped ${serviceName}`;
      },
      
      restart: async (serviceName) => {
        await execPromise(`sudo rc-service ${serviceName} restart`);
        return `Restarted ${serviceName}`;
      },
      
      enable: async (serviceName) => {
        await execPromise(`sudo rc-update add ${serviceName} default`);
        return `Enabled ${serviceName}`;
      },
      
      disable: async (serviceName) => {
        await execPromise(`sudo rc-update del ${serviceName} default`);
        return `Disabled ${serviceName}`;
      },
      
      logs: async (serviceName, lines = 50) => {
        return `Logs for OpenRC services: /var/log/${serviceName}.log`;
      },
      
      create: async (name, options) => {
        return `OpenRC service creation requires manual init script setup`;
      },
      
      remove: async (name) => {
        await execPromise(`sudo rc-service ${name} stop`);
        await execPromise(`sudo rc-update del ${name}`);
        return `Removed service: ${name}`;
      }
    }
  };
  
  return managers[initSystem] || managers.systemd;
}

// Main CLI
async function main() {
  const command = process.argv[2];
  const serviceName = process.argv[3];
  const args = process.argv.slice(4);
  
  const initSystem = detectInitSystem();
  console.log(`Init system: ${initSystem}\n`);
  
  const manager = getServiceManager();
  
  try {
    switch (command) {
      case 'list': {
        console.log('Services:\n');
        const services = await manager.list();
        if (Array.isArray(services)) {
          console.log('NAME              LOAD    ACTIVE   SUB');
          console.log('----------------  ------  -------  ----');
          services.slice(0, 20).forEach(s => {
            console.log(`${s.name.padEnd(16)} ${s.load.padEnd(6)} ${s.active.padEnd(7)} ${s.sub}`);
          });
          if (services.length > 20) {
            console.log(`... and ${services.length - 20} more`);
          }
        } else {
          console.log(services);
        }
        break;
      }
      
      case 'status': {
        if (!serviceName) {
          console.error('Usage: service-manager.js status <service-name>');
          process.exit(1);
        }
        console.log(await manager.status(serviceName));
        break;
      }
      
      case 'start': {
        if (!serviceName) {
          console.error('Usage: service-manager.js start <service-name>');
          process.exit(1);
        }
        console.log(await manager.start(serviceName));
        break;
      }
      
      case 'stop': {
        if (!serviceName) {
          console.error('Usage: service-manager.js stop <service-name>');
          process.exit(1);
        }
        console.log(await manager.stop(serviceName));
        break;
      }
      
      case 'restart': {
        if (!serviceName) {
          console.error('Usage: service-manager.js restart <service-name>');
          process.exit(1);
        }
        console.log(await manager.restart(serviceName));
        break;
      }
      
      case 'enable': {
        if (!serviceName) {
          console.error('Usage: service-manager.js enable <service-name>');
          process.exit(1);
        }
        console.log(await manager.enable(serviceName));
        break;
      }
      
      case 'disable': {
        if (!serviceName) {
          console.error('Usage: service-manager.js disable <service-name>');
          process.exit(1);
        }
        console.log(await manager.disable(serviceName));
        break;
      }
      
      case 'logs': {
        if (!serviceName) {
          console.error('Usage: service-manager.js logs <service-name> [--lines N]');
          process.exit(1);
        }
        let lines = 50;
        const linesIdx = args.indexOf('--lines');
        if (linesIdx !== -1 && args[linesIdx + 1]) {
          lines = parseInt(args[linesIdx + 1]);
        }
        console.log(await manager.logs(serviceName, lines));
        break;
      }
      
      case 'create': {
        if (!serviceName) {
          console.error('Usage: service-manager.js create <name> [--command "..."] [--user <user>]');
          process.exit(1);
        }
        
        const options = { command: '', user: os.userInfo().username, workingDir: '/' };
        
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--command' && args[i + 1]) options.command = args[++i];
          if (args[i] === '--user' && args[i + 1]) options.user = args[++i];
          if (args[i] === '--working-dir' && args[i + 1]) options.workingDir = args[++i];
          if (args[i] === '--description' && args[i + 1]) options.description = args[++i];
          if (args[i] === '--restart' && args[i + 1]) options.restart = args[++i];
        }
        
        if (!options.command) {
          console.error('Error: --command is required');
          process.exit(1);
        }
        
        console.log(await manager.create(serviceName, options));
        break;
      }
      
      case 'remove': {
        if (!serviceName) {
          console.error('Usage: service-manager.js remove <service-name>');
          process.exit(1);
        }
        console.log(await manager.remove(serviceName));
        break;
      }
      
      default:
        console.log(`
Service Manager Skill - CLI

Commands:
  list                       List all services
  status <name>              Check service status
  start <name>               Start a service
  stop <name>                Stop a service
  restart <name>            Restart a service
  enable <name>              Enable service on boot
  disable <name>             Disable service on boot
  logs <name> [--lines N]    View service logs
  create <name>              Create a new service
  remove <name>              Remove a service

Options for create:
  --command "..."            Executable command (required)
  --user <user>              User to run as
  --working-dir <path>       Working directory
  --description <text>       Service description
  --restart <policy>         Restart policy (on-failure, always)

Examples:
  service-manager.js list
  service-manager.js status nginx
  service-manager.js start myapp
  service-manager.js create myapp --command "/usr/bin/node /app/server.js" --user node
  service-manager.js logs myapp --lines 100
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
