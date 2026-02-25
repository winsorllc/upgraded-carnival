#!/usr/bin/env node
/**
 * Check all configured feeds for new items
 * Usage: node check-all-feeds.js [--config <path>]
 */

const fs = require('fs');
const path = require('path');
const { fetchFeed } = require('./feed-parser');
const { detectNewItems } = require('./feed-storage');
const { formatNotification, heuristicSummary, saveSummary } = require('./feed-summarizer');

const CONFIG_PATH = '/job/data/feeds.json';

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = { configPath: CONFIG_PATH };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      result.configPath = args[i + 1];
      i++;
    }
  }
  return result;
}

/**
 * Load feed configuration
 */
function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}\nCreate one with your feed definitions.`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

/**
 * Check a single feed
 */
async function checkFeed(feedConfig, storagePath) {
  console.log(`\n📡 Checking: ${feedConfig.name}`);
  console.log(`   URL: ${feedConfig.url}`);
  
  try {
    const feed = await fetchFeed(feedConfig.url, feedConfig.type || 'auto');
    const { newItems, seenCount } = detectNewItems(feedConfig.id, feed.items, storagePath);
    
    return {
      success: true,
      feedId: feedConfig.id,
      feedName: feedConfig.name,
      totalItems: feed.items.length,
      newItemsCount: newItems.length,
      seenCount,
      newItems,
      error: null
    };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return {
      success: false,
      feedId: feedConfig.id,
      feedName: feedConfig.name,
      error: error.message
    };
  }
}

/**
 * Main function
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  console.log('📡 Feed Watcher - Checking all feeds');
  console.log('═'.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);

  try {
    // Load config
    const config = loadConfig(args.configPath);
    const storagePath = config.storage?.seenItemsPath;
    
    console.log(`Loaded ${config.feeds.length} feed(s) from config`);

    // Check all feeds
    const results = [];
    for (const feedConfig of config.feeds) {
      const result = await checkFeed(feedConfig, storagePath);
      results.push(result);
    }

    // Summary report
    console.log();
    console.log('═'.repeat(60));
    console.log('📊 Summary Report');
    console.log('═'.repeat(60));

    const successfulFeeds = results.filter(r => r.success);
    const failedFeeds = results.filter(r => !r.success);
    const totalNewItems = results.reduce((sum, r) => sum + (r.newItemsCount || 0), 0);

    console.log(`✓ Successful: ${successfulFeeds.length}/${config.feeds.length}`);
    console.log(`✗ Failed: ${failedFeeds.length}/${config.feeds.length}`);
    console.log(`🆕 Total new items: ${totalNewItems}`);

    // Detail for feeds with new items
    const feedsNewItems = results.filter(r => r.success && r.newItemsCount > 0);
    if (feedsNewItems.length > 0) {
      console.log();
      console.log('🆕 Feeds with new content:');
      for (const result of feedsNewItems) {
        console.log(`\n   ${result.feedName}: ${result.newItemsCount} new item(s)`);
        for (const item of result.newItems.slice(0, 3)) {
          console.log(`      • ${item.title}`);
        }
        if (result.newItemsCount > 3) {
          console.log(`      ... and ${result.newItemsCount - 3} more`);
        }
      }
    }

    // Show failures
    if (failedFeeds.length > 0) {
      console.log();
      console.log('❌ Feeds that failed:');
      for (const result of failedFeeds) {
        console.log(`   ${result.feedName}: ${result.error}`);
      }
    }

    // Save combined report
    const outputDir = '/job/logs/feeds';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(outputDir, `all-feeds-report-${timestamp}.json`);

    const report = {
      checkTime: new Date().toISOString(),
      totalFeeds: config.feeds.length,
      successfulFeeds: successfulFeeds.length,
      failedFeeds: failedFeeds.length,
      totalNewItems,
      results
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
    console.log();
    console.log(`💾 Full report saved to: ${reportFile}`);

    // Exit with error code if any feeds failed
    if (failedFeeds.length > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
