#!/usr/bin/env node

/**
 * Composio Skill — Execute actions via Composio API
 * 
 * Usage:
 *   node execute.js <app>.<action> [options]
 *   
 * Examples:
 *   node execute.js gmail.send_email --to user@example.com --subject "Hello" --body "Test"
 *   node execute.js notion.create_page --parent_id abc123 --title "My Page"
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Command } from 'commander';
import dotenv from 'dotenv';
import { Composio } from '@composio/core';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('execute')
  .description('Execute a Composio action')
  .argument('<action>', 'Action to execute (format: app.action)')
  .option('-p, --params <json>', 'Parameters as JSON string')
  .option('--entity-id <id>', 'Entity ID (default: default)', 'default')
  .action(async (actionSpec, options) => {
    try {
      const apiKey = process.env.COMPOSIO_API_KEY;
      
      if (!apiKey) {
        console.error('Error: COMPOSIO_API_KEY environment variable not set');
        console.error('Set it with: export COMPOSIO_API_KEY="your-api-key"');
        process.exit(1);
      }
      
      const [appName, actionName] = actionSpec.split('.');
      
      if (!appName || !actionName) {
        console.error('Error: Action must be in format "app.action" (e.g., gmail.send_email)');
        process.exit(1);
      }
      
      // Parse parameters
      let params = {};
      if (options.params) {
        try {
          params = JSON.parse(options.params);
        } catch (e) {
          // If not valid JSON, try to parse from remaining arguments
          params = {};
        }
      }
      
      // Extract remaining arguments as parameters
      const remainingArgs = process.argv.slice(process.argv.indexOf(actionSpec) + 1);
      for (let i = 0; i < remainingArgs.length; i++) {
        const arg = remainingArgs[i];
        if (arg.startsWith('--')) {
          const key = arg.replace('--', '');
          const value = remainingArgs[i + 1];
          if (value && !value.startsWith('--')) {
            params[key] = value;
            i++;
          } else {
            params[key] = true;
          }
        }
      }
      
      console.log('=== Composio Action Execution ===\n');
      console.log(`App: ${appName}`);
      console.log(`Action: ${actionName}`);
      console.log(`Entity ID: ${options.entityId}`);
      console.log(`Parameters: ${JSON.stringify(params, null, 2)}\n`);
      
      // Initialize Composio client
      const composio = new Composio({ apiKey });
      
      // Get entity and execute action
      const entity = composio.getEntity(options.entityId);
      
      console.log('Executing action...\n');
      
      const result = await entity.execute({
        appName: appName,
        actionName: actionName,
        params: params,
      });
      
      console.log('=== Action Result ===\n');
      console.log('Status: success');
      console.log('Result:');
      console.log(JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.error('=== Action Failed ===\n');
      console.error(`Error: ${error.message}`);
      
      if (error.response) {
        console.error('\nResponse:', error.response.data || error.response);
      }
      
      process.exit(1);
    }
  });

program.parse();
