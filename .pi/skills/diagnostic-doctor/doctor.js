#!/usr/bin/env node
/**
 * Diagnostic Doctor - System health checker
 * Inspired by ZeroClaw's doctor command
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Status levels
const STATUS = {
  OK: 'OK',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  INFO: 'INFO',
};

class DiagnosticDoctor {
  constructor() {
    this.results = [];
    this.options = {
      all: false,
      system: false,
      config: false,
      network: false,
      security: false,
      performance: false,
      report: null,
      verbose: false,
    };
  }

  parseArgs(args) {
    args.forEach((arg) => {
      if (arg === '--all') this.options.all = true;
      if (arg === '--system') this.options.system = true;
      if (arg === '--config') this.options.config = true;
      if (arg === '--network') this.options.network = true;
      if (arg === '--security') this.options.security = true;
      if (arg === '--performance') this.options.performance = true;
      if (arg === '--verbose') this.options.verbose = true;
      if (arg.startsWith('--report=')) this.options.report = arg.split('=')[1];
    });

    // If no specific check requested, run all
    if (!this.options.system && !this.options.config && !this.options.network && 
        !this.options.security && !this.options.performance) {
      this.options.all = true;
    }
  }

  addResult(status, category, message, recommendation = null) {
    this.results.push({
      status,
      category,
      message,
      recommendation,
      timestamp: new Date().toISOString(),
    });

    const statusColor = {
      [STATUS.OK]: colors.green,
      [STATUS.WARNING]: colors.yellow,
      [STATUS.ERROR]: colors.red,
      [STATUS.INFO]: colors.blue,
    }[status] || colors.reset;

    console.log(
      `${statusColor}[${status}]${colors.reset} ${colors.cyan}[${category}]${colors.reset} ${message}`
    );

    if (recommendation && status !== STATUS.OK) {
      console.log(`  ${colors.gray}→ ${recommendation}${colors.reset}`);
    }
  }

  // === SYSTEM CHECKS ===
  checkDiskSpace() {
    try {
      const output = execSync('df -h /', { encoding: 'utf8' });
      const lines = output.split('\n');
      const rootLine = lines.find(l => l.includes('/') && !l.includes('/boot'));
      
      if (rootLine) {
        const parts = rootLine.trim().split(/\s+/);
        const usagePercent = parseInt(parts[4].replace('%', ''));
        
        if (usagePercent > 90) {
          this.addResult(STATUS.ERROR, 'System', `Disk usage critical: ${usagePercent}%`, 
            'Free up disk space immediately or expand storage');
        } else if (usagePercent > 70) {
          this.addResult(STATUS.WARNING, 'System', `Disk usage high: ${usagePercent}%`, 
            'Consider cleaning up old logs and unused files');
        } else {
          this.addResult(STATUS.OK, 'System', `Disk usage normal: ${usagePercent}%`);
        }
      }
    } catch (e) {
      this.addResult(STATUS.ERROR, 'System', 'Unable to check disk space', e.message);
    }
  }

  checkMemory() {
    try {
      const output = execSync('free -m', { encoding: 'utf8' });
      const lines = output.split('\n');
      const memLine = lines.find(l => l.includes('Mem:'));
      
      if (memLine) {
        const parts = memLine.trim().split(/\s+/);
        const total = parseInt(parts[1]);
        const available = parseInt(parts[6]);
        const usagePercent = Math.round(((total - available) / total) * 100);
        
        if (usagePercent > 95) {
          this.addResult(STATUS.ERROR, 'System', `Memory usage critical: ${usagePercent}%`, 
            'Close unused processes or add more RAM');
        } else if (usagePercent > 80) {
          this.addResult(STATUS.WARNING, 'System', `Memory usage high: ${usagePercent}%`, 
            'Consider restarting services or reducing load');
        } else {
          this.addResult(STATUS.OK, 'System', `Memory usage normal: ${usagePercent}% (~${available}MB available)`);
        }
      }
    } catch (e) {
      // Try alternative method (macOS)
      try {
        const output = execSync('vm_stat', { encoding: 'utf8' });
        this.addResult(STATUS.INFO, 'System', 'Memory check (macOS) - manual review needed');
      } catch (e2) {
        this.addResult(STATUS.WARNING, 'System', 'Unable to check memory', 
          'Install procps or check memory manually');
      }
    }
  }

  checkNodeVersion() {
    try {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);
      
      if (major >= 20) {
        this.addResult(STATUS.OK, 'System', `Node.js version ${version} (supported)`);
      } else if (major >= 18) {
        this.addResult(STATUS.WARNING, 'System', `Node.js version ${version} (minimum supported)`, 
          'Upgrade to Node.js 20+ for best compatibility');
      } else {
        this.addResult(STATUS.ERROR, 'System', `Node.js version ${version} (not supported)`, 
          'Upgrade to Node.js 20+ immediately');
      }
    } catch (e) {
      this.addResult(STATUS.ERROR, 'System', 'Unable to check Node.js version');
    }
  }

  // === CONFIG CHECKS ===
  checkEnvFile() {
    const envPath = path.join('/job', '.env');
    
    if (!fs.existsSync(envPath)) {
      this.addResult(STATUS.WARNING, 'Config', '.env file not found', 
        'Create .env file from .env.example');
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = ['APP_URL', 'AUTH_SECRET', 'GH_TOKEN'];
    const missing = [];

    requiredVars.forEach(v => {
      if (!envContent.includes(`${v}=`) || envContent.includes(`${v}=\n`)) {
        missing.push(v);
      }
    });

    if (missing.length > 0) {
      this.addResult(STATUS.ERROR, 'Config', `Missing required env vars: ${missing.join(', ')}`, 
        `Set ${missing.join(', ')} in .env file`);
    } else {
      this.addResult(STATUS.OK, 'Config', 'All required environment variables configured');
    }

    // Check for example values
    if (envContent.includes('your-') || envContent.includes('placeholder')) {
      this.addResult(STATUS.WARNING, 'Config', '.env file contains placeholder values', 
        'Replace all placeholder values with actual configuration');
    }
  }

  checkConfigFiles() {
    const configFiles = [
      '/job/config/CRONS.json',
      '/job/config/TRIGGERS.json',
    ];

    configFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          const content = JSON.parse(fs.readFileSync(file, 'utf8'));
          this.addResult(STATUS.OK, 'Config', `${path.basename(file)} is valid JSON`);
        } catch (e) {
          this.addResult(STATUS.ERROR, 'Config', `${path.basename(file)} has invalid JSON`, 
            `Fix JSON syntax: ${e.message}`);
        }
      } else {
        this.addResult(STATUS.INFO, 'Config', `${path.basename(file)} not found (optional)`);
      }
    });
  }

  // === NETWORK CHECKS ===
  checkInternetConnectivity() {
    try {
      execSync('curl -s --max-time 5 https://api.github.com', { stdio: 'pipe' });
      this.addResult(STATUS.OK, 'Network', 'Internet connectivity verified');
    } catch (e) {
      this.addResult(STATUS.ERROR, 'Network', 'No internet connectivity', 
        'Check network connection and DNS settings');
    }
  }

  checkGitHubAccess() {
    try {
      const token = process.env.GH_TOKEN;
      if (!token) {
        this.addResult(STATUS.WARNING, 'Network', 'GH_TOKEN not set, cannot verify GitHub access',
          'Set GH_TOKEN environment variable');
        return;
      }

      const output = execSync('gh auth status 2>&1', { encoding: 'utf8' });
      if (output.includes('Logged in')) {
        this.addResult(STATUS.OK, 'Network', 'GitHub CLI authenticated');
      } else {
        this.addResult(STATUS.WARNING, 'Network', 'GitHub CLI not authenticated');
      }
    } catch (e) {
      this.addResult(STATUS.WARNING, 'Network', 'Unable to verify GitHub access');
    }
  }

  // === SECURITY CHECKS ===
  checkFilePermissions() {
    const sensitiveFiles = [
      '/job/.env',
      '/job/data',
    ];

    sensitiveFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          const stats = fs.statSync(file);
          const mode = stats.mode;
          const isWorldReadable = mode & 0o044;
          const isWorldWritable = mode & 0o022;

          if (isWorldWritable) {
            this.addResult(STATUS.ERROR, 'Security', `${file} is world-writable`, 
              'Run: chmod o-w ' + file);
          } else if (isWorldReadable && file.includes('.env')) {
            this.addResult(STATUS.WARNING, 'Security', `${file} is world-readable`, 
              'Run: chmod 600 ' + file);
          } else {
            this.addResult(STATUS.OK, 'Security', `${file} permissions OK`);
          }
        } catch (e) {
          this.addResult(STATUS.INFO, 'Security', `Cannot check permissions for ${file}`);
        }
      }
    });
  }

  checkSecretsExposure() {
    try {
      const result = execSync('grep -r "password\|secret\|token" --include="*.md" /job/.pi/skills/ 2>/dev/null || true', 
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      
      // Just a basic check - real implementation would be more sophisticated
      this.addResult(STATUS.INFO, 'Security', 'Manual review: Check for hardcoded secrets in source code');
    } catch (e) {
      // Ignore errors
    }
  }

  // === PERFORMANCE CHECKS ===
  checkStartupTime() {
    const start = Date.now();
    try {
      // Simple benchmark
      for (let i = 0; i < 100000; i++) {
        Math.sqrt(i);
      }
      const duration = Date.now() - start;
      
      if (duration < 50) {
        this.addResult(STATUS.OK, 'Performance', `CPU benchmark: ${duration}ms (fast)`);
      } else if (duration < 200) {
        this.addResult(STATUS.WARNING, 'Performance', `CPU benchmark: ${duration}ms (moderate)`);
      } else {
        this.addResult(STATUS.ERROR, 'Performance', `CPU benchmark: ${duration}ms (slow)`);
      }
    } catch (e) {
      this.addResult(STATUS.INFO, 'Performance', 'Unable to run performance check');
    }
  }

  // === MAIN ===
  run() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════╗`);
    console.log(`║           Diagnostic Doctor 🏥 v1.0.0                   ║`);
    console.log(`║   System health check inspired by ZeroClaw              ║`);
    console.log(`╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

    if (this.options.all || this.options.system) {
      console.log(`${colors.cyan}━━━ System Checks ━━━${colors.reset}`);
      this.checkDiskSpace();
      this.checkMemory();
      this.checkNodeVersion();
      console.log();
    }

    if (this.options.all || this.options.config) {
      console.log(`${colors.cyan}━━━ Configuration Checks ━━━${colors.reset}`);
      this.checkEnvFile();
      this.checkConfigFiles();
      console.log();
    }

    if (this.options.all || this.options.network) {
      console.log(`${colors.cyan}━━━ Network Checks ━━━${colors.reset}`);
      this.checkInternetConnectivity();
      this.checkGitHubAccess();
      console.log();
    }

    if (this.options.all || this.options.security) {
      console.log(`${colors.cyan}━━━ Security Checks ━━━${colors.reset}`);
      this.checkFilePermissions();
      this.checkSecretsExposure();
      console.log();
    }

    if (this.options.all || this.options.performance) {
      console.log(`${colors.cyan}━━━ Performance Checks ━━━${colors.reset}`);
      this.checkStartupTime();
      console.log();
    }

    // Summary
    const errors = this.results.filter(r => r.status === STATUS.ERROR).length;
    const warnings = this.results.filter(r => r.status === STATUS.WARNING).length;
    const ok = this.results.filter(r => r.status === STATUS.OK).length;

    console.log(`${colors.cyan}━━━ Summary ━━━${colors.reset}`);
    console.log(`${colors.green}OK: ${ok}${colors.reset} | ${colors.yellow}WARNINGS: ${warnings}${colors.reset} | ${colors.red}ERRORS: ${errors}${colors.reset}`);
    console.log(`Total checks: ${this.results.length}`);

    if (errors > 0) {
      console.log(`\n${colors.red}⚠  Found ${errors} error(s) that need attention${colors.reset}`);
    } else if (warnings > 0) {
      console.log(`\n${colors.yellow}ℹ  Found ${warnings} warning(s) to review${colors.reset}`);
    } else {
      console.log(`\n${colors.green}✓ All checks passed!${colors.reset}`);
    }

    // Save report if requested
    if (this.options.report) {
      fs.writeFileSync(this.options.report, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: { ok, warnings, errors, total: this.results.length },
        results: this.results,
      }, null, 2));
      console.log(`\nReport saved to: ${this.options.report}`);
    }

    // Exit with appropriate code
    process.exit(errors > 0 ? 1 : 0);
  }
}

// Run if called directly
if (require.main === module) {
  const doctor = new DiagnosticDoctor();
  doctor.parseArgs(process.argv.slice(2));
  doctor.run();
}

module.exports = { DiagnosticDoctor, STATUS };
