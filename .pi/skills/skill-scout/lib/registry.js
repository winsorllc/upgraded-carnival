#!/usr/bin/env node
/**
 * Registry Module - Skill State Management
 * 
 * Tracks installed skills, their versions, and metadata
 * 
 * @module registry
 * @author PopeBot
 */

const fs = require('fs').promises;
const path = require('path');

class Registry {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || './.scout';
    this.registryPath = path.join(this.cacheDir, 'registry.json');
    this.skillsDir = options.skillsDir || '/job/.pi/skills';
  }

  /**
   * Get full registry
   * @returns {Promise<Object>} Registry data
   */
  async getRegistry() {
    try {
      const data = await fs.readFile(this.registryPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {
        version: '1.0.0',
        installed: {},
        metadata: {},
        history: [],
        lastUpdate: null
      };
    }
  }

  /**
   * Save registry
   * @param {Object} registry - Registry data
   */
  async saveRegistry(registry) {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2));
  }

  /**
   * Register a new skill
   * @param {Object} entry - Skill entry
   */
  async register(entry) {
    const registry = await this.getRegistry();
    
    const record = {
      ...entry,
      registered_at: new Date().toISOString()
    };
    
    registry.installed[entry.name] = record;
    registry.history.push({
      action: 'install',
      name: entry.name,
      timestamp: entry.registered_at,
      url: entry.url
    });
    
    registry.lastUpdate = new Date().toISOString();
    await this.saveRegistry(registry);
    
    return record;
  }

  /**
   * Unregister a skill
   * @param {string} name - Skill name
   * @param {string} reason - Removal reason
   */
  async unregister(name, reason = 'manual') {
    const registry = await this.getRegistry();
    
    if (registry.installed[name]) {
      registry.history.push({
        action: 'remove',
        name,
        timestamp: new Date().toISOString(),
        reason
      });
      
      delete registry.installed[name];
      registry.lastUpdate = new Date().toISOString();
      await this.saveRegistry(registry);
    }
  }

  /**
   * Update skill metadata
   * @param {string} name - Skill name
   * @param {Object} updates - Updates to apply
   */
  async update(name, updates) {
    const registry = await this.getRegistry();
    
    if (registry.installed[name]) {
      registry.installed[name] = {
        ...registry.installed[name],
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      registry.history.push({
        action: 'update',
        name,
        timestamp: new Date().toISOString(),
        from: registry.installed[name].version,
        to: updates.version
      });
      
      registry.lastUpdate = new Date().toISOString();
      await this.saveRegistry(registry);
    }
  }

  /**
   * Get installed skills
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Installed skills
   */
  async getInstalledSkills(filters = {}) {
    const registry = await this.getRegistry();
    
    let skills = Object.entries(registry.installed).map(([name, data]) => ({
      name,
      ...data
    }));
    
    if (filters.source) {
      skills = skills.filter(s => s.source === filters.source);
    }
    
    if (filters.active) {
      skills = skills.filter(s => !s.disabled);
    }
    
    // Sort by installed date
    skills.sort((a, b) => {
      const aDate = new Date(a.installed_at || a.registered_at || 0);
      const bDate = new Date(b.installed_at || b.registered_at || 0);
      return bDate - aDate;
    });
    
    return skills;
  }

  /**
   * Get skill by name
   * @param {string} name - Skill name
   * @returns {Promise<Object|null>} Skill data
   */
  async getSkill(name) {
    const registry = await this.getRegistry();
    return registry.installed[name] || null;
  }

  /**
   * Check if skill is installed
   * @param {string} name - Skill name
   * @returns {Promise<boolean>}
   */
  async isInstalled(name) {
    const registry = await this.getRegistry();
    return !!registry.installed[name];
  }

  /**
   * Get installation history
   * @param {number} limit - Max results
   * @returns {Promise<Array>} History entries
   */
  async getHistory(limit = 50) {
    const registry = await this.getRegistry();
    return (registry.history || [])
      .slice(-limit)
      .reverse();
  }

  /**
   * Get registry statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    const registry = await this.getRegistry();
    const skills = Object.values(registry.installed);
    
    const bySource = skills.reduce((acc, skill) => {
      acc[skill.source || 'unknown'] = (acc[skill.source || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    
    const byDate = {};
    for (const skill of skills) {
      const date = (skill.installed_at || skill.registered_at)?.split('T')[0];
      if (date) {
        byDate[date] = (byDate[date] || 0) + 1;
      }
    }
    
    return {
      total: skills.length,
      bySource,
      byDate,
      lastUpdate: registry.lastUpdate
    };
  }

  /**
   * Set skill enabled/disabled state
   * @param {string} name - Skill name
   * @param {boolean} enabled - Enabled state
   */
  async setEnabled(name, enabled) {
    const registry = await this.getRegistry();
    
    if (registry.installed[name]) {
      registry.installed[name].disabled = !enabled;
      registry.installed[name].updated_at = new Date().toISOString();
      await this.saveRegistry(registry);
    }
  }

  /**
   * Clean up broken entries
   * @returns {Promise<number>} Removed count
   */
  async cleanup() {
    const registry = await this.getRegistry();
    const before = Object.keys(registry.installed).length;
    
    for (const [name, entry] of Object.entries(registry.installed)) {
      const skillPath = path.join(this.skillsDir, name);
      try {
        await fs.access(skillPath);
      } catch {
        // Symlink broken, remove from registry
        delete registry.installed[name];
        console.log(`🧹 Cleaned up broken entry: ${name}`);
      }
    }
    
    await this.saveRegistry(registry);
    return before - Object.keys(registry.installed).length;
  }
}

module.exports = { Registry };
