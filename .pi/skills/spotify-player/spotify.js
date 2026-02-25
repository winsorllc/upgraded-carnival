#!/usr/bin/env node

/**
 * Spotify Player CLI Wrapper
 * 
 * Requires: spogo (https://github.com/petrspopos/spogo)
 * Fallback: spotify_player
 */

const { execSync } = require('child_process');

const SPOGO_BIN = 'spogo';
const SPOTIFY_PLAYER_BIN = 'spotify_player';

const args = process.argv.slice(2);
const command = args[0];

function checkSpogo() {
  try {
    execSync(`${SPOGO_BIN} --version`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

function checkSpotifyPlayer() {
  try {
    execSync(`${SPOTIFY_PLAYER_BIN} --version`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

function getBinary() {
  if (checkSpogo()) {
    return SPOGO_BIN;
  }
  if (checkSpotifyPlayer()) {
    return SPOTIFY_PLAYER_BIN;
  }
  return null;
}

async function run() {
  const bin = getBinary();
  
  if (!bin) {
    console.error('Error: No Spotify CLI found');
    console.error('Install spogo: brew tap steipete/tap && brew install spogo');
    process.exit(1);
  }
  
  console.log(`Using: ${bin}`);
  
  // Build command
  let cmd = bin;
  
  switch (command) {
    case 'play':
    case 'pause':
    case 'next':
    case 'prev':
    case 'previous':
      cmd += ` ${command}`;
      break;
    
    case 'shuffle':
    case 'repeat':
      cmd += ` ${command}`;
      break;
    
    case 'status':
    case 'st':
      cmd += ' status';
      break;
    
    case 'search':
      if (!args[1] || !args[2]) {
        console.error('Usage: spotify search <track|album|artist> "<query>"');
        process.exit(1);
      }
      cmd += ` search ${args[1]} "${args.slice(2).join(' ')}"`;
      break;
    
    case 'device':
      if (args[1] === 'list') {
        cmd += ' device list';
      } else if (args[1] === 'set' && args[2]) {
        cmd += ` device set "${args.slice(2).join(' ')}"`;
      } else {
        cmd += ' device list';
      }
      break;
    
    case 'queue':
      if (args[1] === 'add' && args[2]) {
        cmd += ` queue add "${args.slice(2).join(' ')}"`;
      } else if (args[1] === 'list') {
        cmd += ' queue list';
      } else {
        cmd += ' queue list';
      }
      break;
    
    case 'auth':
      if (args[1] === 'import') {
        cmd += ' auth import --browser chrome';
      } else {
        cmd += ' auth';
      }
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
Spotify Player CLI

Usage:
  spotify play              Start playback
  spotify pause            Pause playback
  spotify next             Next track
  spotify prev             Previous track
  spotify shuffle          Toggle shuffle
  spotify repeat           Toggle repeat
  spotify status           Show current status
  spotify search <type> "query"  Search for track/album/artist
  spotify device list      List devices
  spotify device set "name"  Switch device
  spotify queue add "song" Add to queue
  spotify queue list       View queue

Examples:
  spotify search track "Bohemian Rhapsody"
  spotify device set "Living Room"
  spotify status

Install:
  brew tap steipete/tap
  brew install spogo
  spogo auth import --browser chrome
`);
}

run();
