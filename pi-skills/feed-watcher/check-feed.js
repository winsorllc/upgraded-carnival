#!/usr/bin/env node
/**
 * Check a single feed for new items
 * Usage: node check-feed.js --feed <feedId> [--config <path>]
 */

const fs = require('fs');
const path = require('path');
const { fetchFeed } = require('./feed-parser');
const { detectNewItems } = require('./feed-storage');
const { formatNotification, heuristicSummary } = require('./feed-summarizer');

const CONFIG_PATH = '/job/data/feeds.json';

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = { feedId: null, configPath: CONFIG_PATH };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--feed' && args[i + 1]) {
      result.feedId = args[i + 1];
      i++;
    } else if (args[i] === '--config' && args[i + 1]) {
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
 * Main function
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.feedId) {
    console.error('Usage: node check-feed.js --feed <feedId> [--config <path>]');
    process.exit(1);
  }

  console.log(`📡 Feed Watcher - Checking feed: ${args.feedId}`);
  console.log('─'.repeat(50));

  try {
    // Load config
    const config = loadConfig(args.configPath);
    
    // Find the feed
    const feedConfig = config.feeds.find(f => f.id === args.feedId);
    if (!feedConfig) {
      const availableFeeds = config.feeds.map(f => f.id).join(', ');
      throw new Error(`Feed "${args.feedId}" not found. Available feeds: ${availableFeeds}`);
    }

    console.log(`Feed: ${feedConfig.name}`);
    console.log(`URL: ${feedConfig.url}`);
    console.log(`Type: ${feedConfig.type || 'auto'}`);
    console.log();

    // Fetch the feed
    console.log('⏳ Fetching feed...');
    const feed = await fetchFeed(feedConfig.url, feedConfig.type);
    console.log(`✓ Found ${feed.items.length} items in feed`);

    // Detect new items
    console.log('🔍 Checking for new items...');
    const { newItems, seenCount } = detectNewItems(
      feedConfig.id, 
      feed.items, 
      config.storage?.seenItemsPath
    );

    console.log(`✓ ${newItems.length} new item(s), ${seenCount} previously seen`);
    console.log();

    if (newItems.length === 0) {
      console.log('✨ No new items since last check.');
      return;
    }

    // Display new items
    console.log('🆕 New Items:');
    console.log('─'.repeat(50));
    
    for (const item of newItems) {
      console.log(`\n📰 ${item.title}`);
      console.log(`   Link: ${item.link}`);
      console.log(`   Published: ${item.published || 'Unknown'}`);
      if (item.summary || item.description) {
        const excerpt = (item.summary || item.description).substring(0, 200);
        console.log(`   ${excerpt}${excerpt.length >= 200 ? '...' : ''}`);
      }
      if (item.categories && item.categories.length > 0) {
        console.log(`   Categories: ${item.categories.join(', ')}`);
      }
      
      // Filter by categories if configured
      if (feedConfig.categories && feedConfig.categories.length > 0) {
        const matchesCategory = item.categories?.some(c => 
          feedConfig.categories.includes(c.toLowerCase())
        );
        if (matchesCategory) {
          console.log(`   ⭐ Matches your categories: ${feedConfig.categories.join(', ')}`);
        }
      }
    }

    // Format notification
    console.log();
    console.log('─'.repeat(50));
    console.log('📧 Notification Preview:');
    const notification = formatNotification(newItems);
    console.log(notification);

    // Generate heuristic summary
    const summary = heuristicSummary(newItems, feedConfig.name);
    console.log('📄 Summary:');
    console.log(summary);

    // Save to output file
    const outputDir = '/job/logs/feeds';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `${feedConfig.id}-check-${timestamp}.json`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputData = {
      feedId: feedConfig.id,
      feedName: feedConfig.name,
      checkTime: new Date().toISOString(),
      totalItems: feed.items.length,
      newItemsCount: newItems.length,
      newItems,
      summary
    };

    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`💾 Results saved to: ${outputFile}`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
