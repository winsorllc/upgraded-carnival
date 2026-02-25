#!/usr/bin/env node

/**
 * Composio Skill — List available apps
 * 
 * Usage:
 *   node list-apps.js [--search <query>]
 *   
 * Examples:
 *   node list-apps.js
 *   node list-apps.js --search gmail
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Command } from 'commander';
import dotenv from 'dotenv';
import { Composio } from '@composio/core';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('list-apps')
  .description('List available Composio apps')
  .option('-s, --search <query>', 'Search for apps by name')
  .option('--limit <n>', 'Maximum number of apps to show', '50')
  .action(async (options) => {
    try {
      const apiKey = process.env.COMPOSIO_API_KEY;
      
      if (!apiKey) {
        console.error('Error: COMPOSIO_API_KEY environment variable not set');
        console.error('Set it with: export COMPOSIO_API_KEY="your-api-key"');
        process.exit(1);
      }
      
      console.log('=== Available Composio Apps ===\n');
      
      const composio = new Composio({ apiKey });
      
      // Get list of apps
      const response = await composio.apps.list({
        limit: parseInt(options.limit),
      });
      
      let apps = response.items || [];
      
      // Filter by search query if provided
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        apps = apps.filter(app => 
          (app.name && app.name.toLowerCase().includes(searchLower)) ||
          (app.displayName && app.displayName.toLowerCase().includes(searchLower))
        );
      }
      
      if (apps.length === 0) {
        console.log(options.search 
          ? `No apps found matching "${options.search}"`
          : 'No apps found');
        process.exit(0);
      }
      
      // Sort alphabetically
      apps.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      apps.forEach((app, index) => {
        const name = app.name || 'unknown';
        const displayName = app.displayName || name;
        const logo = app.logo ? '✓' : ' ';
        
        console.log(`${index + 1}. [${logo}] ${name.padEnd(20)} - ${displayName}`);
      });
      
      console.log(`\nTotal: ${apps.length} app(s)${options.search ? ` matching "${options.search}"` : ''}`);
      console.log(`\nTo list actions for an app:`);
      console.log(`  node list-actions.js <app_name>`);
      console.log(`\nTo execute an action:`);
      console.log(`  node execute.js <app>.<action> --param1 value1`);
      
    } catch (error) {
      console.error('Error:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data || error.response);
      }
      process.exit(1);
    }
  });

program.parse();
