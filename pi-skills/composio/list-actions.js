#!/usr/bin/env node

/**
 * Composio Skill — List available actions for an app
 * 
 * Usage:
 *   node list-actions.js <app>
 *   
 * Examples:
 *   node list-actions.js gmail
 *   node list-actions.js notion
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
  .name('list-actions')
  .description('List available actions for a Composio app')
  .argument('<app>', 'App name (e.g., gmail, notion, github)')
  .option('--limit <n>', 'Maximum number of actions to show', '20')
  .action(async (appName, options) => {
    try {
      const apiKey = process.env.COMPOSIO_API_KEY;
      
      if (!apiKey) {
        console.error('Error: COMPOSIO_API_KEY environment variable not set');
        process.exit(1);
      }
      
      console.log(`=== Available Actions for ${appName} ===\n`);
      
      const composio = new Composio({ apiKey });
      
      // Get actions for the app
      const actions = await composio.actions.list({
        apps: [appName],
        limit: parseInt(options.limit),
      });
      
      if (!actions.items || actions.items.length === 0) {
        console.log(`No actions found for "${appName}"`);
        console.log('\nTip: Make sure the app name is correct. Try list-apps.js to see available apps.');
        process.exit(0);
      }
      
      actions.items.forEach((action, index) => {
        const actionName = action.actionName || action.name;
        const displayName = action.display_name || actionName;
        const description = action.description || 'No description';
        
        console.log(`${index + 1}. ${actionName}`);
        console.log(`   Display: ${displayName}`);
        console.log(`   Description: ${description?.substring(0, 100)}${description?.length > 100 ? '...' : ''}`);
        
        // Show parameters
        if (action.parameters && action.parameters.properties) {
          const required = action.parameters.required || [];
          const params = Object.keys(action.parameters.properties);
          if (params.length > 0) {
            console.log(`   Parameters: ${params.join(', ')}${required.length ? ` (required: ${required.join(', ')})` : ''}`);
          }
        }
        
        console.log('');
      });
      
      console.log(`\nTotal: ${actions.items.length} action(s) found`);
      console.log(`\nTo execute an action:`);
      console.log(`  node execute.js ${appName}.<action_name> --param1 value1 --param2 value2`);
      
    } catch (error) {
      console.error('Error:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data || error.response);
      }
      process.exit(1);
    }
  });

program.parse();
