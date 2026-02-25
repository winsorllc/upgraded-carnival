#!/usr/bin/env node
/**
 * List feed status and storage statistics
 * Usage: node list-feeds.js [--config <path>] [--stats]
 */

const fs = require('fs');
const path = require('path');
const { getStorageStats, loadSeenItems } = require('./feed-storage');

const CONFIG_PATH = '/job/data/feeds.json';

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = { configPath: CONFIG_PATH, showStats: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      result.configPath = args[i + 1];
      i++;
    } else if (args[i] === '--stats') {
      result.showStats = true;
    }
  }
  return result;
}

/**
 * Load feed configuration
 */
function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

/**
 * Main function
 */
function main() {
  const args = parseArgs(process.argv.slice(2));
  
  console.log('📡 Feed Watcher - Status Report');
  console.log('═'.repeat(60));

  // Load config
  const config = loadConfig(args.configPath);
  
  if (!config || !config.feeds) {
    console.log('⚠️  No configuration found.');
    console.log(`   Expected config at: ${args.configPath}`);
    console.log();
    console.log('   Create a feeds.json file with your feed definitions:');
    console.log('   {');
    console.log('     "feeds": [');
    console.log('       {');
    console.log('         "id": "example",');
    console.log('         "name": "Example Feed",');
    console.log('         "url": "https://example.com/feed.xml",');
    console.log('         "type": "rss"');
    console.log('       }');
    console.log('     ]');
    console.log('   }');
    return;
  }

  // Display configured feeds
  console.log();
  console.log('📋 Configured Feeds:');
  console.log('─'.repeat(60));

  for (const feed of config.feeds) {
    const storagePath = config.storage?.seenItemsPath;
    const seenItems = loadSeenItems(feed.id, storagePath);
    
    console.log();
    console.log(`🆔 ID: ${feed.id}`);
    console.log(`📰 Name: ${feed.name}`);
    console.log(`🔗 URL: ${feed.url}`);
    console.log(`📝 Type: ${feed.type || 'auto'}`);
    console.log(`⏱️  Check interval: ${feed.checkInterval || 'manual'}`);
    console.log(`👁️  Items tracked: ${seenItems.size}`);
    
    if (feed.notifyNew) {
      console.log(`🔔 Notifications: Enabled`);
    }
    
    if (feed.categories && feed.categories.length > 0) {
      console.log(`🏷️  Categories: ${feed.categories.join(', ')}`);
    }

    // Show last checked time if state exists
    const storageDir = storagePath || '/job/data/feed-states';
    const stateFile = path.join(storageDir, `${feed.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      console.log(`🕐 Last updated: ${state.lastUpdated || 'Unknown'}`);
    }
  }

  // Show storage stats
  if (args.showStats) {
    console.log();
    console.log('═'.repeat(60));
    console.log('💾 Storage Statistics:');
    console.log('─'.repeat(60));

    try {
      const stats = getStorageStats(config.storage?.seenItemsPath);
      console.log(`Total feeds tracked: ${stats.totalFeeds}`);
      console.log(`Total items stored: ${stats.totalItems}`);
      
      if (stats.feeds.length > 0) {
        console.log();
        console.log('Breakdown by feed:');
        for (const feed of stats.feeds) {
          console.log(`  ${feed.feedId}: ${feed.itemCount} items (last: ${feed.lastUpdated || 'never'})`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not retrieve storage stats: ${error.message}`);
    }
  }

  // Summary
  console.log();
  console.log('═'.repeat(60));
  console.log(`Total: ${config.feeds.length} feed(s) configured`);
}

main();
