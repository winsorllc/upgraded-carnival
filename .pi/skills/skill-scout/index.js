#!/usr/bin/env node
/**
 * Skill Scout - Main Entry Point
 * 
 * Auto-discover, evaluate, and integrate Pi skills from public repositories
 * Adapted from ZeroClaw's SkillForge concept
 * 
 * @module skill-scout
 * @author PopeBot
 * @version 1.0.0
 */

const { Scout } = require('./lib/scout');
const { Evaluator } = require('./lib/evaluator');
const { Installer } = require('./lib/installer');
const { Registry } = require('./lib/registry');
const { Security } = require('./lib/security');

class SkillScout {
  constructor(options = {}) {
    this.options = {
      minScore: options.minScore || 0.7,
      autoInstall: options.autoInstall || false,
      cacheDir: options.cacheDir || './.scout/cache',
      registryPath: options.registryPath || './.scout/registry.json',
      sources: options.sources || ['github'],
      githubToken: options.githubToken || process.env.GITHUB_TOKEN,
      ...options
    };

    this.scout = new Scout(this.options);
    this.evaluator = new Evaluator(this.options);
    this.installer = new Installer(this.options);
    this.registry = new Registry(this.options);
    this.security = new Security(this.options);
  }

  /**
   * Run the full pipeline: Scout → Evaluate → Integrate
   * @param {Object} params - Pipeline parameters
   * @returns {Promise<Object>} Pipeline results
   */
  async runPipeline(params = {}) {
    console.log('🚀 Starting Skill Scout pipeline...\n');

    // 1. Scout - Discover candidates
    const discovered = await this.discover({
      query: params.query || 'pi-skill OR popebot-skill',
      limit: params.limit || 20
    });

    if (discovered.length === 0) {
      console.log('ℹ️ No skills discovered');
      return { discovered: 0, evaluated: 0, installed: 0 };
    }

    // 2. Evaluate - Score each candidate
    const evaluated = await this.evaluate({ 
      urls: discovered.map(d => d.url) 
    });

    // 3. Integrate - Install qualified candidates
    const installed = [];
    for (const result of evaluated) {
      if (result.score >= this.options.minScore) {
        if (this.options.autoInstall) {
          const installResult = await this.install({ url: result.url });
          installed.push(installResult);
        } else {
          console.log(`⏸️ Queued for review: ${result.name} (${result.score.toFixed(2)})`);
        }
      }
    }

    return {
      discovered: discovered.length,
      evaluated: evaluated.length,
      installed: installed.length,
      results: evaluated
    };
  }

  /**
   * Discover skills from public repositories
   * @param {Object} params - Discovery parameters
   * @returns {Promise<Array>} Discovered skills
   */
  async discover(params = {}) {
    return await this.scout.discover(params);
  }

  /**
   * Evaluate skill quality and compatibility
   * @param {Object} params - Evaluation parameters
   * @returns {Promise<Array>} Evaluation results
   */
  async evaluate(params = {}) {
    return await this.evaluator.evaluate(params);
  }

  /**
   * Install a skill
   * @param {Object} params - Installation parameters
   * @returns {Promise<Object>} Installation result
   */
  async install(params = {}) {
    return await this.installer.install(params);
  }

  /**
   * Update installed skills
   * @param {Object} params - Update parameters
   * @returns {Promise<Array>} Update results
   */
  async update(params = {}) {
    return await this.installer.update(params);
  }

  /**
   * List discovered or installed skills
   * @param {Object} params - List parameters
   * @returns {Promise<Array>} Skills list
   */
  async list(params = {}) {
    if (params.type === 'installed') {
      return await this.registry.getInstalledSkills();
    } else if (params.type === 'discovered') {
      return await this.scout.getCachedDiscoveries();
    }
    return [];
  }

  /**
   * Remove an installed skill
   * @param {Object} params - Removal parameters
   * @returns {Promise<Object>} Removal result
   */
  async remove(params = {}) {
    return await this.installer.remove(params);
  }

  /**
   * Get status and statistics
   * @param {Object} params - Status parameters
   * @returns {Promise<Object>} Status information
   */
  async status(params = {}) {
    const registry = await this.registry.getRegistry();
    const cache = await this.scout.getCachedDiscoveries();
    
    return {
      installed: Object.keys(registry.installed).length,
      discovered: cache.length,
      lastUpdate: registry.lastUpdate,
      sources: this.options.sources,
      autoInstall: this.options.autoInstall,
      minScore: this.options.minScore,
      registry
    };
  }

  /**
   * Run security audit on a skill
   * @param {Object} params - Audit parameters
   * @returns {Promise<Object>} Audit results
   */
  async audit(params = {}) {
    return await this.security.audit(params);
  }
}

// Export classes and API
module.exports = {
  SkillScout,
  Scout,
  Evaluator,
  Installer,
  Registry,
  Security
};

// CLI execution
if (require.main === module) {
  const scout = new SkillScout();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'discover':
      scout.discover({ query: args[1] }).then(results => {
        console.log('\n✅ Discovery complete!');
        console.log(`Found ${results.length} skills\n`);
        results.forEach((skill, i) => {
          console.log(`${i + 1}. ${skill.name}`);
          console.log(`   URL: ${skill.url}`);
          console.log(`   Description: ${skill.description?.substring(0, 60)}...`);
          console.log(`   Stars: ${skill.stars || 'N/A'}\n`);
        });
      }).catch(err => {
        console.error('❌ Discovery failed:', err.message);
        process.exit(1);
      });
      break;

    case 'status':
      scout.status().then(status => {
        console.log('\n📊 Skill Scout Status\n');
        console.log(`Installed skills: ${status.installed}`);
        console.log(`Cached discoveries: ${status.discovered}`);
        console.log(`Sources: ${status.sources.join(', ')}`);
        console.log(`Auto-install: ${status.autoInstall ? 'enabled' : 'disabled'}`);
        console.log(`Min score: ${status.minScore}`);
        console.log(`Last update: ${status.lastUpdate || 'Never'}`);
      }).catch(err => {
        console.error('❌ Status check failed:', err.message);
        process.exit(1);
      });
      break;

    case 'pipeline':
      scout.runPipeline().then(results => {
        console.log('\n' + '='.repeat(50));
        console.log('Pipeline Complete!');
        console.log('='.repeat(50));
        console.log(`Discovered: ${results.discovered}`);
        console.log(`Evaluated: ${results.evaluated}`);
        console.log(`Installed: ${results.installed}`);
      }).catch(err => {
        console.error('❌ Pipeline failed:', err.message);
        process.exit(1);
      });
      break;

    default:
      console.log(`
Skill Scout - Auto-discover Pi skills

Usage: skill-scout <command> [options]

Commands:
  discover <query>    Search for skills on GitHub
  status             Show current status
  pipeline           Run full discovery pipeline

Examples:
  skill-scout discover "notification skill"
  skill-scout status
  skill-scout pipeline

For detailed help, see SKILL.md
`);
  }
}
