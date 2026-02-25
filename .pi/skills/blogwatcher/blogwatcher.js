#!/usr/bin/env node

/**
 * Blog Watcher CLI Wrapper
 * 
 * Requires: blogwatcher (https://github.com/Hyaxia/blogwatcher)
 */

const { execSync } = require('child_process');

const BLOGWATCHER_BIN = 'blogwatcher';
const args = process.argv.slice(2);
const command = args[0];

function checkBlogwatcher() {
  try {
    execSync(`${BLOGWATCHER_BIN} --version`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

async function run() {
  if (!checkBlogwatcher()) {
    console.error('Error: blogwatcher not found');
    console.error('Install: go install github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest');
    process.exit(1);
  }
  
  if (!command) {
    showHelp();
    return;
  }
  
  // Build command
  let cmd = BLOGWATCHER_BIN;
  
  switch (command) {
    case 'add':
      if (!args[1] || !args[2]) {
        console.error('Usage: blogwatcher add "Name" <url>');
        process.exit(1);
      }
      cmd += ` add "${args[1]}" ${args.slice(2).join(' ')}`;
      break;
    
    case 'blogs':
    case 'list':
      cmd += ' blogs';
      break;
    
    case 'scan':
    case 'check':
      cmd += ' scan';
      break;
    
    case 'articles':
    case 'articles':
      cmd += ' articles';
      break;
    
    case 'read':
      if (!args[1]) {
        console.error('Usage: blogwatcher read <article-id>');
        process.exit(1);
      }
      cmd += ` read ${args[1]}`;
      break;
    
    case 'read-all':
      cmd += ' read-all';
      break;
    
    case 'remove':
    case 'delete':
      if (!args[1]) {
        console.error('Usage: blogwatcher remove "Blog Name"');
        process.exit(1);
      }
      cmd += ` remove "${args.slice(1).join(' ')}"`;
      break;
    
    case 'version':
    case '--version':
    case '-v':
      cmd += ' --version';
      break;
    
    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
      return;
  }
  
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Blog Watcher CLI

Usage:
  blogwatcher add "Name" <url>    Add a blog/feed
  blogwatcher blogs               List tracked blogs
  blogwatcher scan                Scan for new articles
  blogwatcher articles            List articles
  blogwatcher read <id>           Mark article as read
  blogwatcher read-all            Mark all as read
  blogwatcher remove "Name"      Remove a blog

Examples:
  blogwatcher add "Tech News" https://techcrunch.com/feed/
  blogwatcher scan
  blogwatcher articles

Install:
  go install github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest
`);
}

run();
