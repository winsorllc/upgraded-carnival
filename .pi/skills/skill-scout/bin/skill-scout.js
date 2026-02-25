#!/usr/bin/env node
/**
 * Skill Scout CLI - Main Entry Point
 */

const { Command } = require('commander');
const { SkillScout } = require('../index');
const chalk = require('chalk');
const { Scout } = require('../lib/scout');
const { Evaluator } = require('../lib/evaluator');
const { Installer } = require('../lib/installer');
const { Registry } = require('../lib/registry');

const program = new Command();

program
  .name('skill-scout')
  .description('Auto-discover, evaluate, and integrate Pi skills')
  .version('1.0.0');

// Discover command
program
  .command('discover [query]')
  .description('Search for skills on GitHub')
  .option('-l, --limit <number>', 'Maximum results', '20')
  .option('--json', 'Output as JSON')
  .action(async (query, options) => {
    try {
      const scout = new Scout();
      const results = await scout.discover({
        query,
        limit: parseInt(options.limit)
      });
      
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(chalk.green(`\n✅ Found ${results.length} skills\n`));
        
        results.forEach((skill, i) => {
          console.log(chalk.cyan(`${i + 1}. ${skill.name}`));
          console.log(`   URL: ${chalk.blue(skill.url)}`);
          console.log(`   ⭐ ${skill.stars || 0} | ${skill.language || 'N/A'} | Updated: ${skill.updated_at?.split('T')[0] || 'N/A'}`);
          if (skill.description) {
            console.log(`   ${skill.description.substring(0, 80)}${skill.description.length > 80 ? '...' : ''}`);
          }
          console.log();
        });
      }
    } catch (err) {
      console.error(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

// Evaluate command
program
  .command('evaluate <url>')
  .description('Evaluate a skill before installing')
  .option('-v, --verbose', 'Verbose output')
  .action(async (url, options) => {
    try {
      const evaluator = new Evaluator();
      const results = await evaluator.evaluate({ url });
      
      const result = results[0];
      const scorePct = (result.score * 100).toFixed(1);
      
      console.log(chalk.cyan(`\n🔬 Evaluation: ${result.name}`));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`Score: ${result.score >= 0.7 ? chalk.green(scorePct + '%') : chalk.yellow(scorePct + '%')}`);
      console.log(`Recommendation: ${chalk.cyan(result.recommendation.toUpperCase())}`);
      console.log();
      
      if (result.reasons?.length > 0) {
        console.log(chalk.bold('Reasons:'));
        result.reasons.forEach(reason => {
          const color = reason.includes('dangerous') || reason.includes('Missing') 
            ? chalk.yellow : chalk.gray;
          console.log(`  • ${color(reason)}`);
        });
        console.log();
      }
      
      if (options.verbose) {
        console.log(chalk.bold('Details:'));
        console.log(JSON.stringify(result.details, null, 2));
      }
      
      console.log();
      
    } catch (err) {
      console.error(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

// Install command
program
  .command('install <name-or-url>')
  .description('Install a skill')
  .option('-v, --version <version>', 'Specific version')
  .action(async (source, options) => {
    try {
      const installer = new Installer();
      const isUrl = source.includes('github.com');
      
      const result = await installer.install({
        url: isUrl ? source : undefined,
        name: isUrl ? undefined : source,
        version: options.version
      });
      
      if (result.installed) {
        console.log(chalk.green(`\n✅ Successfully installed: ${result.name}`));
        console.log(`   Path: ${result.symlink}`);
      } else {
        console.log(chalk.yellow(`\n⚠️ ${result.status}: ${result.name}`));
      }
    } catch (err) {
      console.error(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

// Update command
program
  .command('update [name]')
  .description('Update installed skills')
  .option('-a, --all', 'Update all skills')
  .option('-c, --check', 'Check for updates only')
  .action(async (name, options) => {
    try {
      const installer = new Installer();
      
      const params = {};
      if (options.all) params.all = true;
      if (options.check) params.check = true;
      if (name && !options.all) params.name = name;
      
      const results = await installer.update(params);
      
      if (options.check) {
        if (results.length === 0) {
          console.log(chalk.green('\n✅ All skills are up to date'));
        } else {
          console.log(chalk.yellow(`\n📦 ${results.length} update(s) available:`));
          results.forEach(r => console.log(`  • ${r.name}`));
        }
      } else {
        console.log(chalk.green(`\n✅ Updated ${results.filter(r => r.updated).length} skill(s)`));
      }
    } catch (err) {
      console.error(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List installed or discovered skills')
  .option('-i, --installed', 'List installed skills')
  .option('-d, --discovered', 'List discovered skills')
  .option('-s, --with-scores', 'Show evaluation scores')
  .action(async (options) => {
    try {
      const scout = new SkillScout();
      
      if (options.discovered || (!options.installed && !options.discovered)) {
        // List discovered
        const results = await scout.list({ type: 'discovered' });
        console.log(chalk.cyan(`\n📋 Discovered Skills (${results.length})`));
        console.log(chalk.gray('─'.repeat(50)));
        
        results.slice(0, 20).forEach((skill, i) => {
          console.log(`${i + 1}. ${chalk.bold(skill.name)}`);
          console.log(`   ${chalk.blue(skill.url)}`);
          console.log(`   ⭐ ${skill.stars || 0} | ${chalk.gray(skill.description?.substring(0, 60) || 'No description')}`);
        });
      }
      
      if (options.installed) {
        // List installed
        const results = await scout.list({ type: 'installed' });
        console.log(chalk.cyan(`\n📦 Installed Skills (${results.length})`));
        console.log(chalk.gray('─'.repeat(50)));
        
        results.forEach((skill, i) => {
          const status = skill.disabled ? chalk.yellow('[disabled]') : chalk.green('[active]');
          console.log(`${i + 1}. ${chalk.bold(skill.name)} ${status}`);
          console.log(`   ${chalk.gray(skill.symlink)}`);
        });
      }
      
      console.log();
    } catch (err) {
      console.error(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

// Remove command
program
  .command('remove <name>')
  .description('Remove an installed skill')
  .option('--no-backup', 'Remove without backup')
  .action(async (name, options) => {
    try {
      const installer = new Installer();
      const result = await installer.remove({ name, backup: options.backup });
      
      if (result.status === 'removed') {
        console.log(chalk.green(`\n✅ Successfully removed: ${result.name}`));
        if (result.backedUp) {
          console.log(chalk.gray('   (Backed up before removal)'));
        }
      }
    } catch (err) {
      console.error(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show current status')
  .action(async () => {
    try {
      const scout = new SkillScout();
      const status = await scout.status({ detailed: true });
      
      console.log(chalk.cyan('\n📊 Skill Scout Status'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`Installed skills: ${chalk.bold(status.installed)}`);
      console.log(`Cached discoveries: ${chalk.bold(status.discovered)}`);
      console.log(`Sources: ${status.sources.join(', ')}`);
      console.log(`Auto-install: ${status.autoInstall ? chalk.green('enabled') : chalk.gray('disabled')}`);
      console.log(`Min score: ${status.minScore}`);
      console.log(`Last update: ${status.lastUpdate ? chalk.gray(status.lastUpdate) : chalk.yellow('Never')}`);
      console.log();
    } catch (err) {
      console.error(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

// Pipeline command
program
  .command('pipeline')
  .description('Run full discovery pipeline')
  .action(async () => {
    try {
      const scout = new SkillScout();
      
      console.log(chalk.cyan('\n🚀 Starting Skill Scout Pipeline...'));
      console.log(chalk.gray('─'.repeat(50)) + '\n');
      
      const results = await scout.runPipeline();
      
      console.log(chalk.green('✅ Pipeline Complete!'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`Discovered: ${chalk.bold(results.discovered)}`);
      console.log(`Evaluated: ${chalk.bold(results.evaluated)}`);
      console.log(`Installed: ${chalk.bold(results.installed)}`);
      console.log();
    } catch (err) {
      console.error(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

// Default action (no command)
if (process.argv.length === 2) {
  console.log(chalk.cyan(`
╔════════════════════════════════════════╗
║     Skill Scout - Pi Skill Discovery   ║
║   Adapted from ZeroClaw SkillForge     ║
╠════════════════════════════════════════╣
║ Commands:                              ║
║   discover [query]  Search GitHub      ║
║   evaluate <url>     Score a skill      ║
║   install <name>    Install a skill    ║
║   update [name]     Update skills      ║
║   list              Show skills        ║
║   status            Show status        ║
║   pipeline          Run full pipeline  ║
╚════════════════════════════════════════╝

Run: skill-scout --help for full usage
`));
}

program.parse();
