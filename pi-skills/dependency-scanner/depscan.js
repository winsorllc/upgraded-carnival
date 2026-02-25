#!/usr/bin/env node
/**
 * Dependency Scanner - Check for outdated dependencies
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const check = colors.green + '✓' + colors.reset;
const warn = colors.yellow + '!' + colors.reset;
const fail = colors.red + '✗' + colors.reset;

// Parse arguments
const args = process.argv.slice(2);
let targetDir = '.';
let showOutdated = args.includes('--outdated');
let showSecurity = args.includes('--security');
let specificPackage = args.find((_, i) => args[i-1] === '--package');

// Find target directory
const dirIndex = args.findIndex(a => !a.startsWith('--') && !args[args.indexOf(a)-1]?.startsWith('--'));
if (dirIndex >= 0) {
  targetDir = args[dirIndex];
}

function printHeader(title) {
  console.log(colors.cyan + '═'.repeat(66) + colors.reset);
  console.log(colors.bold + title.padStart(33 + title.length/2).padEnd(66) + colors.reset);
  console.log(colors.cyan + '═'.repeat(66) + colors.reset);
  console.log();
}

function parseVersion(version) {
  // Remove leading ^, ~, >=, <=, etc.
  const clean = version.replace(/^[^0-9]*/, '');
  const parts = clean.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    raw: version
  };
}

function compareVersions(v1, v2) {
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.patch - v2.patch;
}

function getUpdateType(current, latest) {
  const cur = parseVersion(current);
  const lat = parseVersion(latest);
  
  if (cur.major !== lat.major) return 'major';
  if (cur.minor !== lat.minor) return 'minor';
  if (cur.patch !== lat.patch) return 'patch';
  return 'current';
}

async function getLatestVersion(pkg) {
  try {
    const result = execSync(`npm view ${pkg} version 2>/dev/null`, { encoding: 'utf8', timeout: 5000 });
    return result.trim();
  } catch (e) {
    return null;
  }
}

async function scanDependencies(projectDir) {
  const packageJsonPath = path.join(projectDir, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error(colors.red + `Error: No package.json found in ${projectDir}` + colors.reset);
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = packageJson.dependencies || {};
  const devDeps = packageJson.devDependencies || {};
  
  printHeader('DEPENDENCY SCAN REPORT');
  
  console.log(`${colors.bold}Project:${colors.reset} ${packageJson.name || 'unknown'}`);
  console.log(`${colors.bold}Package Manager:${colors.reset} npm`);
  console.log(`${colors.bold}Location:${colors.reset} ${projectDir}`);
  console.log();
  
  const results = {
    current: [],
    patch: [],
    minor: [],
    major: []
  };
  
  // Process dependencies
  if (Object.keys(deps).length > 0) {
    console.log(colors.bold + `DEPENDENCIES (${Object.keys(deps).length} total)` + colors.reset);
    console.log(colors.cyan + '─'.repeat(66) + colors.reset);
    
    for (const [pkg, version] of Object.entries(deps)) {
      if (specificPackage && pkg !== specificPackage) continue;
      
      const latest = await getLatestVersion(pkg);
      if (!latest) {
        console.log(`  ${warn} ${pkg.padEnd(15)} ${version.padEnd(12)} (unable to check)`);
        continue;
      }
      
      const updateType = getUpdateType(version.replace(/^[^0-9]*/, ''), latest);
      
      if (updateType === 'current') {
        if (!showOutdated && !showSecurity) {
          console.log(`  ${check} ${colors.green}${pkg.padEnd(15)}${colors.reset} ${version.padEnd(12)} (current)`);
        }
        results.current.push({ pkg, version, latest });
      } else if (updateType === 'patch') {
        console.log(`  ${warn} ${colors.yellow}${pkg.padEnd(15)}${colors.reset} ${version.padEnd(12)} → ${colors.green}${latest}${colors.reset} (patch)`);
        results.patch.push({ pkg, version, latest });
      } else if (updateType === 'minor') {
        console.log(`  ${warn} ${colors.yellow}${pkg.padEnd(15)}${colors.reset} ${version.padEnd(12)} → ${colors.green}${latest}${colors.reset} (minor)`);
        results.minor.push({ pkg, version, latest });
      } else {
        console.log(`  ${fail} ${colors.red}${pkg.padEnd(15)}${colors.reset} ${version.padEnd(12)} → ${colors.yellow}${latest}${colors.reset} (major)`);
        results.major.push({ pkg, version, latest });
      }
    }
    console.log();
  }
  
  // Process dev dependencies
  if (Object.keys(devDeps).length > 0 && !specificPackage) {
    console.log(colors.bold + `DEV DEPENDENCIES (${Object.keys(devDeps).length} total)` + colors.reset);
    console.log(colors.cyan + '─'.repeat(66) + colors.reset);
    
    for (const [pkg, version] of Object.entries(devDeps)) {
      const latest = await getLatestVersion(pkg);
      if (!latest) {
        console.log(`  ${warn} ${pkg.padEnd(15)} ${version.padEnd(12)} (unable to check)`);
        continue;
      }
      
      const updateType = getUpdateType(version.replace(/^[^0-9]*/, ''), latest);
      
      if (updateType === 'current') {
        if (!showOutdated && !showSecurity) {
          console.log(`  ${check} ${colors.green}${pkg.padEnd(15)}${colors.reset} ${version.padEnd(12)} (current)`);
        }
        results.current.push({ pkg, version, latest, dev: true });
      } else if (updateType === 'patch') {
        console.log(`  ${warn} ${colors.yellow}${pkg.padEnd(15)}${colors.reset} ${version.padEnd(12)} → ${colors.green}${latest}${colors.reset} (patch)`);
        results.patch.push({ pkg, version, latest, dev: true });
      } else if (updateType === 'minor') {
        console.log(`  ${warn} ${colors.yellow}${pkg.padEnd(15)}${colors.reset} ${version.padEnd(12)} → ${colors.green}${latest}${colors.reset} (minor)`);
        results.minor.push({ pkg, version, latest, dev: true });
      } else {
        console.log(`  ${fail} ${colors.red}${pkg.padEnd(15)}${colors.reset} ${version.padEnd(12)} → ${colors.yellow}${latest}${colors.reset} (major)`);
        results.major.push({ pkg, version, latest, dev: true });
      }
    }
    console.log();
  }
  
  // Summary
  console.log(colors.cyan + '─'.repeat(66) + colors.reset);
  console.log(colors.bold + 'SUMMARY' + colors.reset);
  console.log(colors.cyan + '─'.repeat(66) + colors.reset);
  console.log(`  ${colors.green}Up to date:${colors.reset}      ${results.current.length}`);
  console.log(`  ${colors.blue}Patch updates:${colors.reset}   ${results.patch.length}`);
  console.log(`  ${colors.yellow}Minor updates:${colors.reset}   ${results.minor.length}`);
  console.log(`  ${colors.red}Major updates:${colors.reset}   ${results.major.length}`);
  console.log();
  
  if (results.major.length > 0) {
    console.log(colors.yellow + '⚠ Consider updating packages with major version updates' + colors.reset);
  }
}

// Main
scanDependencies(targetDir);
