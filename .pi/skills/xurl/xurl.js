#!/usr/bin/env node

/**
 * X (Twitter) CLI - Interact with X/Twitter API v2
 * Based on the xurl tool from xdevplatform
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const BASE_URL = 'api.twitter.com';
const API_VERSION = '2';

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function getCreds() {
  return {
    bearer: process.env.TWITTER_BEARER_TOKEN || process.env.X_BEARER_TOKEN,
    apiKey: process.env.TWITTER_API_KEY || process.env.X_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET || process.env.X_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN || process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET || process.env.X_ACCESS_SECRET
  };
}

// Simple OAuth 1.0a signature (simplified for basic operations)
function oauth1Header(method, url, creds) {
  // For Bearer token only auth (app-only)
  return `Bearer ${creds.bearer}`;
}

// Make request to Twitter API
function twitterRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const creds = getCreds();
    
    if (!creds.bearer && !creds.accessToken) {
      return reject(new Error('Twitter credentials not configured. Set TWITTER_BEARER_TOKEN or TWITTER_ACCESS_TOKEN'));
    }
    
    const url = new URL(endpoint, `https://${BASE_URL}`);
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'thepopebot-xurl'
    };
    
    if (creds.bearer) {
      headers['Authorization'] = `Bearer ${creds.bearer}`;
    } else if (creds.accessToken) {
      headers['Authorization'] = `OAuth2 Bearer ${creds.accessToken}`;
    }
    
    const reqOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers
    };
    
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`));
          }
        } catch (e) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

function parseArgs(args) {
  const parsed = {
    positional: [],
    options: {}
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace('--', '').replace(/-/g, '');
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsed.options[key] = next;
        i += 2;
      } else {
        parsed.options[key] = true;
        i++;
      }
    } else if (arg.startsWith('-')) {
      parsed.options[arg.replace(/-/g, '')] = true;
      i++;
    } else {
      parsed.positional.push(arg);
      i++;
    }
  }
  
  return parsed;
}

// Extract tweet ID from URL or direct ID
function extractTweetId(input) {
  if (!input) return null;
  // Handle URLs like https://x.com/user/status/1234567890
  const urlMatch = input.match(/status\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  // Handle direct numeric ID
  if (/^\d+$/.test(input)) return input;
  return input;
}

// Extract username from @handle or URL
function extractUsername(input) {
  if (!input) return null;
  // Remove @ prefix
  return input.replace(/^@/, '');
}

async function cmdPost(text) {
  if (!text) {
    log('Error: Please provide tweet text', 'red');
    process.exit(1);
  }
  
  const result = await twitterRequest(`/${API_VERSION}/tweets`, {
    method: 'POST',
    body: { text }
  });
  
  log(`\n${colors.green}Tweet posted successfully!${colors.reset}`);
  log(`ID: ${result.data.id}`);
  log(`URL: https://x.com/user/status/${result.data.id}`);
}

async function cmdReply(tweetId, text) {
  if (!tweetId || !text) {
    log('Error: Please provide tweet ID and reply text', 'red');
    process.exit(1);
  }
  
  const result = await twitterRequest(`/${API_VERSION}/tweets`, {
    method: 'POST',
    body: {
      text,
      reply: { in_reply_to_tweet_id: tweetId }
    }
  });
  
  log(`\n${colors.green}Reply posted!${colors.reset}`);
  log(`ID: ${result.data.id}`);
  log(`URL: https://x.com/user/status/${result.data.id}`);
}

async function cmdQuote(tweetId, text) {
  if (!tweetId || !text) {
    log('Error: Please provide tweet ID and quote text', 'red');
    process.exit(1);
  }
  
  const result = await twitterRequest(`/${API_VERSION}/tweets`, {
    method: 'POST',
    body: {
      text,
      quote_tweet_id: tweetId
    }
  });
  
  log(`\n${colors.green}Quote posted!${colors.reset}`);
  log(`ID: ${result.data.id}`);
}

async function cmdDelete(tweetId) {
  if (!tweetId) {
    log('Error: Please provide tweet ID', 'red');
    process.exit(1);
  }
  
  await twitterRequest(`/${API_VERSION}/tweets/${tweetId}`, {
    method: 'DELETE'
  });
  
  log(`\n${colors.green}Tweet deleted successfully${colors.reset}`);
}

async function cmdRead(tweetId) {
  if (!tweetId) {
    log('Error: Please provide tweet ID', 'red');
    process.exit(1);
  }
  
  const id = extractTweetId(tweetId);
  const result = await twitterRequest(`/${API_VERSION}/tweets/${id}?expansions=author_id&user.fields=name,username,profile_image_url`);
  
  const tweet = result.data;
  const author = result.includes?.users?.[0] || {};
  
  log(`\n${colors.bright}@${author.username}: ${tweet.text}${colors.reset}`, 'cyan');
  log(`Likes: ${tweet.public_metrics?.like_count || 0} | Retweets: ${tweet.public_metrics?.retweet_count || 0} | Replies: ${tweet.public_metrics?.reply_count || 0}`);
  log(`Posted: ${new Date(tweet.created_at).toLocaleString()}`);
  log(`URL: https://x.com/${author.username}/status/${tweet.id}`);
}

async function cmdSearch(query, options) {
  if (!query) {
    log('Error: Please provide search query', 'red');
    process.exit(1);
  }
  
  const maxResults = parseInt(options.n) || 10;
  const result = await twitterRequest(`/${API_VERSION}/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${Math.min(maxResults, 100)}&expansions=author_id&user.fields=name,username,profile_image_url`);
  
  log(`\n${colors.bright}Search Results${colors.reset}\n`, 'cyan');
  
  if (!result.data || result.data.length === 0) {
    log('No results found');
    return;
  }
  
  for (const tweet of result.data) {
    const author = result.includes?.users?.find(u => u.id === tweet.author_id) || {};
    log(`@${author.username}: ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`, 'green');
    log(`  ❤️ ${tweet.public_metrics?.like_count || 0} | 🔄 ${tweet.public_metrics?.retweet_count || 0} | 💬 ${tweet.public_metrics?.reply_count || 0}`);
    log(`  ID: ${tweet.id}`);
    log('');
  }
}

async function cmdTimeline(options) {
  const maxResults = parseInt(options.n) || 20;
  const result = await twitterRequest(`/${API_VERSION}/users/me/tweets?max_results=${Math.min(maxResults, 100)}`);
  
  log(`\n${colors.bright}Your Timeline${colors.reset}\n`, 'cyan');
  
  if (!result.data || result.data.length === 0) {
    log('No tweets found');
    return;
  }
  
  for (const tweet of result.data) {
    log(`@me: ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`, 'green');
    log(`  ❤️ ${tweet.public_metrics?.like_count || 0} | 🔄 ${tweet.public_metrics?.retweet_count || 0} | ${new Date(tweet.created_at).toLocaleDateString()}`);
    log(`  ID: ${tweet.id}`);
    log('');
  }
}

async function cmdMentions(options) {
  const maxResults = parseInt(options.n) || 10;
  const result = await twitterRequest(`/${API_VERSION}/tweets/search/recent?query=to:@me&max_results=${Math.min(maxResults, 100)}&expansions=author_id&user.fields=name,username`);
  
  log(`\n${colors.bright}Mentions${colors.reset}\n`, 'cyan');
  
  if (!result.data || result.data.length === 0) {
    log('No mentions found');
    return;
  }
  
  for (const tweet of result.data) {
    const author = result.includes?.users?.find(u => u.id === tweet.author_id) || {};
    log(`@${author.username}: ${tweet.text}`, 'green');
    log(`  ID: ${tweet.id} | ${new Date(tweet.created_at).toLocaleString()}`);
    log('');
  }
}

async function cmdUser(handle, options) {
  if (!handle) {
    log('Error: Please provide username', 'red');
    process.exit(1);
  }
  
  const username = extractUsername(handle);
  const result = await twitterRequest(`/${API_VERSION}/users/by/username/${username}?user.fields=description,public_metrics,profile_image_url,created_at`);
  
  const user = result.data;
  
  log(`\n${colors.bright}@${user.username}${colors.reset}`, 'cyan');
  log(`Name: ${user.name}`);
  log(`Bio: ${user.description || '(No bio)'}`);
  log(`Following: ${user.public_metrics?.following_count || 0} | Followers: ${user.public_metrics?.followers_count || 0} | Tweets: ${user.public_metrics?.tweet_count || 0}`);
  log(`Joined: ${user.created_at}`);
  log(`URL: https://x.com/${user.username}`);
}

async function cmdLike(tweetId) {
  if (!tweetId) {
    log('Error: Please provide tweet ID', 'red');
    process.exit(1);
  }
  
  const id = extractTweetId(tweetId);
  
  // Get user ID first
  const me = await twitterRequest(`/${API_VERSION}/users/me`);
  const userId = me.data.id;
  
  await twitterRequest(`/${API_VERSION}/users/${userId}/likes`, {
    method: 'POST',
    body: { tweet_id: id }
  });
  
  log(`\n${colors.green}Liked tweet ${id}${colors.reset}`);
}

async function cmdUnlike(tweetId) {
  if (!tweetId) {
    log('Error: Please provide tweet ID', 'red');
    process.exit(1);
  }
  
  const id = extractTweetId(tweetId);
  const me = await twitterRequest(`/${API_VERSION}/users/me`);
  const userId = me.data.id;
  
  await twitterRequest(`/${API_VERSION}/users/${userId}/likes/${id}`, {
    method: 'DELETE'
  });
  
  log(`\n${colors.green}Unliked tweet ${id}${colors.reset}`);
}

async function cmdRetweet(tweetId) {
  if (!tweetId) {
    log('Error: Please provide tweet ID', 'red');
    process.exit(1);
  }
  
  const id = extractTweetId(tweetId);
  const me = await twitterRequest(`/${API_VERSION}/users/me`);
  const userId = me.data.id;
  
  await twitterRequest(`/${API_VERSION}/users/${userId}/retweets`, {
    method: 'POST',
    body: { tweet_id: id }
  });
  
  log(`\n${colors.green}Retweeted ${id}${colors.reset}`);
}

async function cmdUnretweet(tweetId) {
  if (!tweetId) {
    log('Error: Please provide tweet ID', 'red');
    process.exit(1);
  }
  
  const id = extractTweetId(tweetId);
  const me = await twitterRequest(`/${API_VERSION}/users/me`);
  const userId = me.data.id;
  
  await twitterRequest(`/${API_VERSION}/users/${userId}/retweets/${id}`, {
    method: 'DELETE'
  });
  
  log(`\n${colors.green}Unretweeted ${id}${colors.reset}`);
}

async function cmdFollow(handle) {
  if (!handle) {
    log('Error: Please provide username', 'red');
    process.exit(1);
  }
  
  const username = extractUsername(handle);
  const me = await twitterRequest(`/${API_VERSION}/users/me`);
  const userId = me.data.id;
  
  // Get target user ID
  const target = await twitterRequest(`/${API_VERSION}/users/by/username/${username}`);
  
  await twitterRequest(`/${API_VERSION}/users/${userId}/following`, {
    method: 'POST',
    body: { target_user_id: target.data.id }
  });
  
  log(`\n${colors.green}Now following @${username}${colors.reset}`);
}

async function cmdUnfollow(handle) {
  if (!handle) {
    log('Error: Please provide username', 'red');
    process.exit(1);
  }
  
  const username = extractUsername(handle);
  const me = await twitterRequest(`/${API_VERSION}/users/me`);
  const userId = me.data.id;
  
  const target = await twitterRequest(`/${API_VERSION}/users/by/username/${username}`);
  
  await twitterRequest(`/${API_VERSION}/users/${userId}/following/${target.data.id}`, {
    method: 'DELETE'
  });
  
  log(`\n${colors.green}Unfollowed @${username}${colors.reset}`);
}

async function cmdWhoami() {
  const result = await twitterRequest(`/${API_VERSION}/users/me?user.fields=description,public_metrics,profile_image_url,created_at`);
  
  const user = result.data;
  
  log(`\n${colors.bright}Authenticated as:${colors.reset}`, 'cyan');
  log(`@${user.username} (${user.name})`);
  log(`Bio: ${user.description || '(No bio)'}`);
  log(`Followers: ${user.public_metrics?.followers_count || 0}`);
  log(`Following: ${user.public_metrics?.following_count || 0}`);
  log(`ID: ${user.id}`);
}

async function cmdFollowers(handle, options) {
  const username = extractUsername(handle) || (await twitterRequest(`/${API_VERSION}/users/me`)).data.username;
  const user = await twitterRequest(`/${API_VERSION}/users/by/username/${username}`);
  const maxResults = parseInt(options.n) || 20;
  
  const result = await twitterRequest(`/${API_VERSION}/users/${user.data.id}/followers?max_results=${Math.min(maxResults, 1000)}&user.fields=name,username,description`);
  
  log(`\n${colors.bright}Followers of @${username}${colors.reset}\n`, 'cyan');
  
  if (!result.data || result.data.length === 0) {
    log('No followers found');
    return;
  }
  
  for (const follower of result.data) {
    log(`@${follower.username}: ${follower.name}`, 'green');
    log(`  Bio: ${follower.description || '(No bio)'}`);
    log('');
  }
}

async function cmdFollowing(handle, options) {
  const username = extractUsername(handle) || (await twitterRequest(`/${API_VERSION}/users/me`)).data.username;
  const user = await twitterRequest(`/${API_VERSION}/users/by/username/${username}`);
  const maxResults = parseInt(options.n) || 20;
  
  const result = await twitterRequest(`/${API_VERSION}/users/${user.data.id}/following?max_results=${Math.min(maxResults, 1000)}&user.fields=name,username,description`);
  
  log(`\n${colors.bright}Following @${username}${colors.reset}\n`, 'cyan');
  
  if (!result.data || result.data.length === 0) {
    log('Not following anyone');
    return;
  }
  
  for (const follow of result.data) {
    log(`@${follow.username}: ${follow.name}`, 'green');
    log(`  Bio: ${follow.description || '(No bio)'}`);
    log('');
  }
}

async function cmdDm(handle, message) {
  if (!handle || !message) {
    log('Error: Please provide username and message', 'red');
    process.exit(1);
  }
  
  const username = extractUsername(handle);
  log(`\nNote: Direct Messages require OAuth 1.0a or OAuth 2.0 with DM scope`, 'yellow');
  log(`Would send DM to @${username}: ${message}`);
}

async function cmdDms(options) {
  log(`\nNote: Direct Messages require OAuth 1.0a or OAuth 2.0 with DM scope`, 'yellow');
  log(`Listing DMs...`);
}

async function cmdBookmark(tweetId) {
  if (!tweetId) {
    log('Error: Please provide tweet ID', 'red');
    process.exit(1);
  }
  
  const id = extractTweetId(tweetId);
  const me = await twitterRequest(`/${API_VERSION}/users/me`);
  const userId = me.data.id;
  
  await twitterRequest(`/${API_VERSION}/users/${userId}/bookmarks`, {
    method: 'POST',
    body: { tweet_id: id }
  });
  
  log(`\n${colors.green}Bookmarked tweet ${id}${colors.reset}`);
}

async function cmdUnbookmark(tweetId) {
  if (!tweetId) {
    log('Error: Please provide tweet ID', 'red');
    process.exit(1);
  }
  
  const id = extractTweetId(tweetId);
  const me = await twitterRequest(`/${API_VERSION}/users/me`);
  const userId = me.data.id;
  
  await twitterRequest(`/${API_VERSION}/users/${userId}/bookmarks/${id}`, {
    method: 'DELETE'
  });
  
  log(`\n${colors.green}Removed bookmark ${id}${colors.reset}`);
}

async function cmdBookmarks(options) {
  const me = await twitterRequest(`/${API_VERSION}/users/me`);
  const userId = me.data.id;
  const maxResults = parseInt(options.n) || 10;
  
  const result = await twitterRequest(`/${API_VERSION}/users/${userId}/bookmarks?max_results=${Math.min(maxResults, 100)}&expansions=author_id&user.fields=username,name`);
  
  log(`\n${colors.bright}Bookmarks${colors.reset}\n`, 'cyan');
  
  if (!result.data || result.data.length === 0) {
    log('No bookmarks');
    return;
  }
  
  for (const tweet of result.data) {
    const author = result.includes?.users?.find(u => u.id === tweet.author_id) || {};
    log(`@${author.username}: ${tweet.text.substring(0, 80)}...`, 'green');
    log(`  ID: ${tweet.id}`);
    log('');
  }
}

async function cmdAuthStatus() {
  const creds = getCreds();
  
  log(`\n${colors.bright}Twitter API Credentials${colors.reset}\n`, 'cyan');
  log(`Bearer Token: ${creds.bearer ? '✓ Configured' : '✗ Not set'}`);
  log(`API Key: ${creds.apiKey ? '✓ Configured' : '✗ Not set'}`);
  log(`Access Token: ${creds.accessToken ? '✓ Configured' : '✗ Not set'}`);
  
  if (creds.accessToken) {
    try {
      const me = await twitterRequest(`/${API_VERSION}/users/me`);
      log(`\n${colors.green}Authenticated as: @${me.data.username}${colors.reset}`);
    } catch (e) {
      log(`\n${colors.red}Authentication failed: ${e.message}${colors.reset}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log(`
${colors.bright}X (Twitter) CLI${colors.reset}
Interact with X/Twitter API v2

${colors.cyan}Commands:${colors.reset}
  post <text>                Post a tweet
  reply <id> <text>         Reply to a tweet
  quote <id> <text>         Quote tweet with comment
  delete <id>               Delete a tweet
  read <id>                 Read tweet details
  search <query>            Search tweets
  timeline                  Your recent tweets
  mentions                  Recent mentions
  user <handle>             Get user info
  like <id>                 Like a tweet
  unlike <id>               Unlike a tweet
  retweet <id>              Retweet
  unretweet <id>            Unretweet
  follow <handle>           Follow user
  unfollow <handle>         Unfollow user
  whoami                    Current user info
  followers <handle>        List followers
  following <handle>        List following
  bookmark <id>             Bookmark tweet
  unbookmark <id>           Remove bookmark
  bookmarks                 List bookmarks
  dm <handle> <message>     Send DM
  dms                       List DMs
  auth status               Check auth status

${colors.cyan}Options:${colors.reset}
  -n <num>                  Number of results

${colors.cyan}Environment Variables:${colors.reset}
  TWITTER_BEARER_TOKEN      App-only auth token
  TWITTER_ACCESS_TOKEN      OAuth access token

${colors.cyan}Examples:${colors.reset}
  xurl post "Hello from thepopebot!"
  xurl read 1234567890
  xurl search "AI news" -n 10
  xurl follow @elonmusk
`);
    process.exit(0);
  }
  
  const cmd = args[0];
  const cmdArgs = args.slice(1);
  const { positional, options } = parseArgs(cmdArgs);
  
  try {
    switch (cmd) {
      case 'post':
        await cmdPost(positional.join(' '));
        break;
      case 'reply':
        await cmdReply(positional[0], positional.slice(1).join(' '));
        break;
      case 'quote':
        await cmdQuote(positional[0], positional.slice(1).join(' '));
        break;
      case 'delete':
        await cmdDelete(positional[0]);
        break;
      case 'read':
        await cmdRead(positional[0]);
        break;
      case 'search':
        await cmdSearch(positional.join(' '), options);
        break;
      case 'timeline':
        await cmdTimeline(options);
        break;
      case 'mentions':
        await cmdMentions(options);
        break;
      case 'user':
        await cmdUser(positional[0], options);
        break;
      case 'like':
        await cmdLike(positional[0]);
        break;
      case 'unlike':
        await cmdUnlike(positional[0]);
        break;
      case 'retweet':
        await cmdRetweet(positional[0]);
        break;
      case 'unretweet':
        await cmdUnretweet(positional[0]);
        break;
      case 'follow':
        await cmdFollow(positional[0]);
        break;
      case 'unfollow':
        await cmdUnfollow(positional[0]);
        break;
      case 'whoami':
        await cmdWhoami();
        break;
      case 'followers':
        await cmdFollowers(positional[0], options);
        break;
      case 'following':
        await cmdFollowing(positional[0], options);
        break;
      case 'dm':
        await cmdDm(positional[0], positional.slice(1).join(' '));
        break;
      case 'dms':
        await cmdDms(options);
        break;
      case 'bookmark':
        await cmdBookmark(positional[0]);
        break;
      case 'unbookmark':
        await cmdUnbookmark(positional[0]);
        break;
      case 'bookmarks':
        await cmdBookmarks(options);
        break;
      case 'auth':
        if (positional[0] === 'status') {
          await cmdAuthStatus();
        }
        break;
      default:
        log(`Unknown command: ${cmd}`, 'red');
        process.exit(1);
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
