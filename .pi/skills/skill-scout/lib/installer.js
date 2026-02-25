#!/usr/bin/env node
/**
 * Installer Module - Skill Installation and Management
 * 
 * Handles cloning, symlinking, and updates for Pi skills
 * 
 * @module installer
 * @author PopeBot
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class Installer {
  constructor(options = {}) {
    this.skillsDir = options.skillsDir || '/job/.pi/skills';
    this.cacheDir = options.cacheDir || '/job/.pi/skills/skill-scout/.scout';
    this.backupDir = path.join(this.cacheDir, 'backups');
  }

  /**
   * Install a skill
   * @param {Object} params - Installation parameters
   * @returns {Promise<Object>} Installation result
   */
  async install(params = {}) {
    const { url, name: skillName, version, cachedId } = params;
    
    // Determine source
    let source = url;
    if (cachedId) {
      source = await this.resolveCachedId(cachedId);
    }
    
    if (!source) {
      throw new Error('No valid source for installation');
    }
    
    // Parse repo name if not provided
    const repoName = skillName || this.extractRepoName(source);
    const fullName = this.extractFullName(source);
    
    console.log(`📦 Installing: ${repoName}`);
    console.log(`   From: ${source}`);
    
    try {
      // Check if already installed
      const existing = await this.checkExisting(repoName);
      if (existing) {
        console.log(`⚠️ ${repoName} is already installed`);
        return {
          name: repoName,
          status: 'already-installed',
          path: existing,
          installed: false
        };
      }
      
      // Clone to cache
      const clonePath = await this.cloneToCache(source, repoName);
      
      // Create symlink
      const skillPath = path.join(this.skillsDir, repoName);
      const relativeClonePath = path.relative(
        path.dirname(skillPath),
        clonePath
      );
      
      // Remove existing if broken symlink
      try {
        await fs.unlink(skillPath);
      } catch {}
      
      await fs.symlink(clonePath, skillPath, 'dir');
      
      // Install dependencies if package.json exists
      await this.installDependencies(clonePath);
      
      // Update registry
      await this.updateRegistry({
        name: repoName,
        url: source,
        fullName,
        path: clonePath,
        symlink: skillPath,
        installed_at: new Date().toISOString(),
        version: version || 'latest'
      });
      
      console.log(`   ✅ Installed to: ${skillPath}`);
      console.log(`   Clone cache: ${clonePath}`);
      
      return {
        name: repoName,
        status: 'installed',
        path: skillPath,
        symlink: skillPath,
        clonePath,
        installed: true
      };
      
    } catch (err) {
      console.error(`   ❌ Installation failed: ${err.message}`);
      return {
        name: repoName,
        status: 'failed',
        error: err.message,
        installed: false
      };
    }
  }

  /**
   * Update installed skills
   * @param {Object} params - Update parameters
   * @returns {Promise<Array>} Update results
   */
  async update(params = {}) {
    const { name, all = false, check = false } = params;
    
    if (check) {
      return await this.checkUpdates();
    }
    
    if (all) {
      return await this.updateAll();
    }
    
    if (name) {
      return [await this.updateSingle(name)];
    }
    
    throw new Error('Specify --name, --all, or --check');
  }

  /**
   * Update a single skill
   * @param {string} name - Skill name
   * @returns {Promise<Object>} Update result
   */
  async updateSingle(name) {
    console.log(`🔄 Updating: ${name}`);
    
    const registry = await this.getRegistry();
    const entry = registry.installed[name];
    
    if (!entry) {
      console.log(`   ⚠️ ${name} is not installed`);
      return { name, status: 'not-installed', updated: false };
    }
    
    try {
      // Check for updates
      const hasUpdate = await this.checkHasUpdate(entry);
      
      if (!hasUpdate) {
        console.log(`   ✅ Already up to date`);
        return { name, status: 'up-to-date', updated: false };
      }
      
      if (check) {
        return { name, status: 'update-available', updated: false };
      }
      
      // Backup current version
      await this.backupSkill(name, entry);
      
      // Pull latest
      const clonePath = entry.path;
      await execAsync('git pull', { cwd: clonePath });
      
      // Update dependencies
      await this.installDependencies(clonePath);
      
      // Update registry
      entry.updated_at = new Date().toISOString();
      await this.saveRegistry(registry);
      
      console.log(`   ✅ Updated successfully`);
      
      return {
        name,
        status: 'updated',
        path: entry.symlink,
        updated: true
      };
      
    } catch (err) {
      console.error(`   ❌ Update failed: ${err.message}`);
      return {
        name,
        status: 'failed',
        error: err.message,
        updated: false
      };
    }
  }

  /**
   * Update all installed skills
   * @returns {Promise<Array>} Update results
   */
  async updateAll() {
    const registry = await this.getRegistry();
    const skills = Object.keys(registry.installed);
    
    console.log(`🔄 Updating ${skills.length} skills...\n`);
    
    const results = [];
    for (const name of skills) {
      const result = await this.updateSingle(name);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Check for available updates
   * @returns {Promise<Array>} Skills with updates
   */
  async checkUpdates() {
    const registry = await this.getRegistry();
    const skills = Object.entries(registry.installed);
    
    const updates = [];
    
    for (const [name, entry] of skills) {
      try {
        const hasUpdate = await this.checkHasUpdate(entry);
        if (hasUpdate) {
          updates.push({
            name,
            current: entry.installed_at,
            available: 'newer'
          });
        }
      } catch {}
    }
    
    return updates;
  }

  /**
   * Remove an installed skill
   * @param {Object} params - Removal parameters
   * @returns {Promise<Object>} Removal result
   */
  async remove(params = {}) {
    const { name, backup = true, force = false } = params;
    
    console.log(`🗑️ Removing: ${name}`);
    
    const registry = await this.getRegistry();
    const entry = registry.installed[name];
    
    if (!entry) {
      if (!force) {
        throw new Error(`${name} is not installed`);
      }
      // Try to find by symlink
      const skillPath = path.join(this.skillsDir, name);
      try {
        const stats = await fs.lstat(skillPath);
        if (stats.isSymbolicLink()) {
          await fs.unlink(skillPath);
          console.log(`   ✅ Removed symlink: ${skillPath}`);
        }
      } catch {}
      return { name, status: 'removed', backup: false };
    }
    
    try {
      // Backup if requested
      if (backup) {
        await this.backupSkill(name, entry);
      }
      
      // Remove symlink
      await fs.unlink(entry.symlink);
      
      // Remove clone (optional, can keep for backup)
      if (!backup) {
        await fs.rm(entry.path, { recursive: true, force: true });
      }
      
      // Remove from registry
      delete registry.installed[name];
      await this.saveRegistry(registry);
      
      console.log(`   ✅ Removed successfully${backup ? ' (backed up)' : ''}`);
      
      return {
        name,
        status: 'removed',
        backup,
        backedUp: backup
      };
      
    } catch (err) {
      console.error(`   ❌ Removal failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Clone a repository to cache
   * @param {string} url - Repository URL
   * @param {string} name - Repository name
   * @returns {Promise<string>} Clone path
   */
  async cloneToCache(url, name) {
    // Normalize URL
    let repoUrl = url;
    if (!repoUrl.endsWith('.git')) {
      repoUrl = repoUrl + '.git';
    }
    
    const cachePath = path.join(this.cacheDir, 'clones', name);
    
    // Ensure cache directory exists
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    
    // Check if already cloned
    const exists = await this.pathExists(path.join(cachePath, '.git'));
    
    if (exists) {
      console.log(`   Using cached clone: ${cachePath}`);
      // Pull latest
      try {
        await execAsync('git pull', { cwd: cachePath });
      } catch {
        // Ignore git pull errors
      }
      return cachePath;
    }
    
    // Clone
    console.log(`   Cloning to: ${cachePath}`);
    await execAsync(`git clone --depth 1 "${repoUrl}" "${cachePath}"`, {
      timeout: 60000
    });
    
    return cachePath;
  }

  /**
   * Install dependencies for a skill
   * @param {string} skillPath - Skill directory
   */
  async installDependencies(skillPath) {
    const packageJsonPath = path.join(skillPath, 'package.json');
    
    if (await this.pathExists(packageJsonPath)) {
      console.log(`   Installing dependencies...`);
      try {
        await execAsync('npm install --production', { cwd: skillPath });
      } catch (err) {
        console.error(`   ⚠️ Dependency install failed: ${err.message}`);
      }
    }
  }

  /**
   * Backup a skill before update/remove
   * @param {string} name - Skill name
   * @param {Object} entry - Registry entry
   */
  async backupSkill(name, entry) {
    const backupName = `${name}_backup_${Date.now()}`;
    const backupPath = path.join(this.backupDir, backupName);
    
    await fs.mkdir(this.backupDir, { recursive: true });
    
    // Copy clone to backup
    await execAsync(`cp -r "${entry.path}" "${backupPath}"`);
    
    console.log(`   💾 Backed up to: ${backupPath}`);
    
    return backupPath;
  }

  /**
   * Check if skill has updates
   * @param {Object} entry - Registry entry
   * @returns {Promise<boolean>}
   */
  async checkHasUpdate(entry) {
    try {
      const result = await execAsync('git fetch --dry-run', {
        cwd: entry.path
      });
      
      // Check if there are new commits
      const status = await execAsync('git status -uno', {
        cwd: entry.path
      });
      
      return status.stdout.includes('behind');
    } catch {
      return false;
    }
  }

  /**
   * Check if skill is already installed
   * @param {string} name - Skill name
   * @returns {Promise<string|null>} Path if exists
   */
  async checkExisting(name) {
    const skillPath = path.join(this.skillsDir, name);
    try {
      const stats = await fs.lstat(skillPath);
      if (stats.isSymbolicLink()) {
        return skillPath;
      }
    } catch {
      return null;
    }
  }

  /**
   * Resolve cached ID to URL
   * @param {string} cachedId - Cache ID
   * @returns {Promise<string|null>} URL
   */
  async resolveCachedId(cachedId) {
    try {
      const cacheFile = path.join(this.cacheDir, 'evaluations.json');
      const data = await fs.readFile(cacheFile, 'utf-8');
      const parsed = JSON.parse(data);
      const found = parsed.results.find(r => r.name === cachedId || r.url.includes(cachedId));
      return found?.url || null;
    } catch {
      return null;
    }
  }

  /**
   * Update registry with new installation
   * @param {Object} entry - Registry entry
   */
  async updateRegistry(entry) {
    const registry = await this.getRegistry();
    registry.installed[entry.name] = entry;
    registry.lastUpdate = new Date().toISOString();
    await this.saveRegistry(registry);
  }

  /**
   * Get registry
   * @returns {Promise<Object>} Registry data
   */
  async getRegistry() {
    try {
      const registryFile = path.join(this.cacheDir, 'registry.json');
      const data = await fs.readFile(registryFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { installed: {}, lastUpdate: null };
    }
  }

  /**
   * Save registry
   * @param {Object} registry - Registry data
   */
  async saveRegistry(registry) {
    const registryFile = path.join(this.cacheDir, 'registry.json');
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.writeFile(registryFile, JSON.stringify(registry, null, 2));
  }

  /**
   * Get installed skills
   * @returns {Promise<Array>} Installed skills
   */
  async getInstalledSkills() {
    const registry = await this.getRegistry();
    return Object.entries(registry.installed).map(([name, entry]) => ({
      name,
      ...entry
    }));
  }

  /**
   * Extract repo name from URL
   * @param {string} url - GitHub URL
   * @returns {string} Repo name
   */
  extractRepoName(url) {
    const match = url.match(/github\.com\/[^\/]+\/([^\/]+)/);
    return match ? match[1].replace(/\.git$/, '') : 'unknown';
  }

  /**
   * Extract full name from URL
   * @param {string} url - GitHub URL
   * @returns {string|null} owner/repo
   */
  extractFullName(url) {
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    return match ? match[1].replace(/\.git$/, '') : null;
  }

  /**
   * Check if path exists
   * @param {string} p - Path
   * @returns {Promise<boolean>}
   */
  async pathExists(p) {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { Installer };
