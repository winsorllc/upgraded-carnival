#!/usr/bin/env node

/**
 * Component Health - In-memory health registry for tracking component status
 */

const os = require('os');
const { EventEmitter } = require('events');

class ComponentHealth {
  constructor(name) {
    this.name = name;
    this.status = 'starting';
    this.updatedAt = new Date().toISOString();
    this.lastOk = null;
    this.lastError = null;
    this.restartCount = 0;
  }
  
  markOk() {
    this.status = 'ok';
    this.updatedAt = new Date().toISOString();
    this.lastOk = new Date().toISOString();
    this.lastError = null;
  }
  
  markError(error) {
    this.status = 'error';
    this.updatedAt = new Date().toISOString();
    this.lastError = error;
  }
  
  bumpRestart() {
    this.restartCount++;
  }
  
  toJSON() {
    return {
      status: this.status,
      updated_at: this.updatedAt,
      last_ok: this.lastOk,
      last_error: this.lastError,
      restart_count: this.restartCount,
    };
  }
}

class HealthRegistry {
  constructor() {
    this.startedAt = Date.now();
    this.components = new Map();
  }
  
  markOk(name) {
    let component = this.components.get(name);
    if (!component) {
      component = new ComponentHealth(name);
      this.components.set(name, component);
    }
    component.markOk();
    return component;
  }
  
  markError(name, error) {
    let component = this.components.get(name);
    if (!component) {
      component = new ComponentHealth(name);
      this.components.set(name, component);
    }
    component.markError(error);
    return component;
  }
  
  bumpRestart(name) {
    let component = this.components.get(name);
    if (!component) {
      component = new ComponentHealth(name);
      this.components.set(name, component);
    }
    component.bumpRestart();
    return component;
  }
  
  snapshot() {
    const components = {};
    for (const [name, component] of this.components) {
      components[name] = component.toJSON();
    }
    
    return {
      pid: process.pid,
      updated_at: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - this.startedAt) / 1000),
      components,
    };
  }
  
  snapshotJson() {
    return this.snapshot();
  }
  
  getComponent(name) {
    return this.components.get(name);
  }
  
  listComponents() {
    return Array.from(this.components.keys());
  }
}

// Singleton registry
const registry = new HealthRegistry();

// CLI handling
const args = process.argv.slice(2);
const command = args[0];

async function run() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  if (command === 'ok' || command === 'ok') {
    // component-health ok <name>
    const name = args[1];
    if (!name) {
      console.error('Usage: component-health ok <name>');
      process.exit(1);
    }
    registry.markOk(name);
    console.log(`Component '${name}' marked as OK`);
    return;
  }
  
  if (command === 'error') {
    // component-health error <name> [error-message]
    const name = args[1];
    if (!name) {
      console.error('Usage: component-health error <name> [error-message]');
      process.exit(1);
    }
    const error = args.slice(2).join(' ') || 'Unknown error';
    registry.markError(name, error);
    console.log(`Component '${name}' marked as error: ${error}`);
    return;
  }
  
  if (command === 'restart') {
    // component-health restart <name>
    const name = args[1];
    if (!name) {
      console.error('Usage: component-health restart <name>');
      process.exit(1);
    }
    registry.bumpRestart(name);
    console.log(`Component '${name}' restart count incremented`);
    return;
  }
  
  if (command === 'status') {
    // component-health status [--json]
    const json = args.includes('--json') || args.includes('-j');
    const snapshot = registry.snapshot();
    
    if (json) {
      console.log(JSON.stringify(snapshot, null, 2));
    } else {
      console.log(`PID: ${snapshot.pid}`);
      console.log(`Uptime: ${snapshot.uptime_seconds}s`);
      console.log(`Components: ${registry.listComponents().length}`);
      console.log('');
      
      for (const [name, health] of Object.entries(snapshot.components)) {
        const status = health.status === 'ok' ? '✓' : '✗';
        console.log(`[${status}] ${name}`);
        console.log(`  Status: ${health.status}`);
        if (health.last_error) {
          console.log(`  Error: ${health.last_error}`);
        }
        if (health.restart_count > 0) {
          console.log(`  Restarts: ${health.restart_count}`);
        }
      }
    }
    return;
  }
  
  if (command === 'list') {
    // component-health list
    const components = registry.listComponents();
    if (components.length === 0) {
      console.log('No components registered');
    } else {
      console.log('Registered components:');
      for (const name of components) {
        const health = registry.getComponent(name);
        console.log(`  - ${name}: ${health.status}`);
      }
    }
    return;
  }
  
  console.error(`Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}

function showHelp() {
  console.log(`
Component Health CLI

Usage:
  component-health ok <name>           Mark component as healthy
  component-health error <name> [msg] Mark component as errored
  component-health restart <name>     Increment restart count
  component-health status [--json]     Get health snapshot
  component-health list               List registered components

Examples:
  component-health ok database
  component-health error database "Connection refused"
  component-health restart api-server
  component-health status
  component-health status --json

Module Usage (JavaScript):
  const health = require('./component-health');
  health.markOk('database');
  health.markError('api', 'Timeout');
  const snapshot = health.getSnapshot();
`);
}

// Export for module usage
module.exports = {
  markOk: (name) => registry.markOk(name),
  markError: (name, error) => registry.markError(name, error),
  bumpRestart: (name) => registry.bumpRestart(name),
  getSnapshot: () => registry.snapshot(),
  getSnapshotJson: () => registry.snapshotJson(),
  getComponent: (name) => registry.getComponent(name),
  listComponents: () => registry.listComponents(),
  registry,
};

// Run CLI only if executed directly (not required as module)
if (require.main === module) {
  run();
}
