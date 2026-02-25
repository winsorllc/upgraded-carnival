#!/usr/bin/env node

/**
 * Component Health Monitor
 * Track and monitor component health status
 */

const os = require('os');

class ComponentHealth {
  constructor(name) {
    this.name = name;
    this.status = 'unknown';
    this.updatedAt = null;
    this.lastOk = null;
    this.lastError = null;
    this.restartCount = 0;
  }
}

class HealthMonitor {
  constructor() {
    this.components = new Map();
    this.startedAt = Date.now();
    this.pid = process.pid;
  }

  /**
   * Get current timestamp in RFC3339 format
   */
  now() {
    return new Date().toISOString();
  }

  /**
   * Mark a component as OK
   */
  markOk(component) {
    let health = this.components.get(component);
    if (!health) {
      health = new ComponentHealth(component);
      this.components.set(component, health);
    }

    health.status = 'ok';
    health.updatedAt = this.now();
    health.lastOk = this.now();
    health.lastError = null;

    return health;
  }

  /**
   * Mark a component as having an error
   */
  markError(component, error) {
    let health = this.components.get(component);
    if (!health) {
      health = new ComponentHealth(component);
      this.components.set(component, health);
    }

    health.status = 'error';
    health.updatedAt = this.now();
    health.lastError = {
      message: error,
      timestamp: this.now()
    };

    return health;
  }

  /**
   * Mark a component as degraded
   */
  markDegraded(component, reason) {
    let health = this.components.get(component);
    if (!health) {
      health = new ComponentHealth(component);
      this.components.set(component, health);
    }

    health.status = 'degraded';
    health.updatedAt = this.now();
    health.lastError = {
      message: reason,
      timestamp: this.now()
    };

    return health;
  }

  /**
   * Mark a component as starting
   */
  markStarting(component) {
    let health = this.components.get(component);
    if (!health) {
      health = new ComponentHealth(component);
      this.components.set(component, health);
    }

    health.status = 'starting';
    health.updatedAt = this.now();

    return health;
  }

  /**
   * Bump restart count for a component
   */
  bumpRestart(component) {
    let health = this.components.get(component);
    if (!health) {
      health = new ComponentHealth(component);
      this.components.set(component, health);
    }

    health.restartCount++;
    health.updatedAt = this.now();

    return health;
  }

  /**
   * Get health status for a specific component
   */
  getStatus(component) {
    return this.components.get(component) || null;
  }

  /**
   * Get full health snapshot
   */
  getSnapshot() {
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    
    const components = {};
    for (const [name, health] of this.components) {
      components[name] = {
        status: health.status,
        updated_at: health.updatedAt,
        last_ok: health.lastOk,
        last_error: health.lastError,
        restart_count: health.restartCount
      };
    }

    return {
      pid: this.pid,
      updated_at: this.now(),
      uptime_seconds: uptimeSeconds,
      components
    };
  }

  /**
   * List all components
   */
  list() {
    const list = [];
    for (const [name, health] of this.components) {
      list.push({
        name: health.name,
        status: health.status,
        updatedAt: health.updatedAt
      });
    }
    return list;
  }

  /**
   * Reset a component (clear error state)
   */
  reset(component) {
    if (this.components.has(component)) {
      this.components.delete(component);
      return true;
    }
    return false;
  }

  /**
   * Check if any component has errors
   */
  hasErrors() {
    for (const health of this.components.values()) {
      if (health.status === 'error') {
        return true;
      }
    }
    return false;
  }

  /**
   * Get error count
   */
  getErrorCount() {
    let count = 0;
    for (const health of this.components.values()) {
      if (health.status === 'error') {
        count++;
      }
    }
    return count;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const monitor = new HealthMonitor();

  switch (command) {
    case 'mark':
      const subcommand = args[1];
      const component = args[2];
      const message = args.slice(3).join(' ');
      
      if (!component) {
        console.error('Usage: health mark <ok|error|degraded> <component> [message]');
        process.exit(1);
      }
      
      switch (subcommand) {
        case 'ok':
          monitor.markOk(component);
          console.log(`✓ ${component} marked as OK`);
          break;
        case 'error':
          monitor.markError(component, message || 'Unknown error');
          console.log(`✗ ${component} marked as error: ${message}`);
          break;
        case 'degraded':
          monitor.markDegraded(component, message || 'Degraded');
          console.log(`⚠ ${component} marked as degraded: ${message}`);
          break;
        default:
          console.error('Unknown status. Use: ok, error, or degraded');
          process.exit(1);
      }
      break;

    case 'status':
      if (!args[1]) {
        console.error('Usage: health status <component>');
        process.exit(1);
      }
      const status = monitor.getStatus(args[1]);
      if (status) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log(`Component not found: ${args[1]}`);
      }
      break;

    case 'snapshot':
      const snapshot = monitor.getSnapshot();
      console.log(JSON.stringify(snapshot, null, 2));
      break;

    case 'list':
      const list = monitor.list();
      console.log('Registered components:');
      list.forEach(c => {
        const icon = c.status === 'ok' ? '✓' : c.status === 'error' ? '✗' : c.status === 'degraded' ? '⚠' : '?';
        console.log(`  ${icon} ${c.name}: ${c.status}`);
      });
      break;

    case 'reset':
      if (!args[1]) {
        console.error('Usage: health reset <component>');
        process.exit(1);
      }
      monitor.reset(args[1]);
      console.log(`Component ${args[1]} reset`);
      break;

    default:
      console.log('Component Health Monitor Commands:');
      console.log('  mark ok <component>              - Mark component as healthy');
      console.log('  mark error <component> <msg>    - Mark component as error');
      console.log('  mark degraded <component> <msg> - Mark component as degraded');
      console.log('  status <component>              - Get component status');
      console.log('  snapshot                        - Get full health snapshot');
      console.log('  list                            - List all components');
      console.log('  reset <component>              - Reset component state');
  }
}

module.exports = { HealthMonitor, ComponentHealth };
