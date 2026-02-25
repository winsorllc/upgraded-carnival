#!/usr/bin/env node

/**
 * Skill Auto-Installer: Discovery Module
 * 
 * Scans GitHub repositories for potential PopeBot skills.
 * Looks for SKILL.md files in common skill directories.
 */

import { join, dirname, relative } from 'path';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

// Parse command line arguments
const args = process.argv.slice(2);
const repoArg = args.find(a => a.startsWith('--repo='));
const dirArg = args.find(a => a.startsWith('--dir='));
const patternArg = args.find(a => a.startsWith('--pattern='));
const jsonOutput = args.includes('--json');

const REPO = repoArg?.split('=')[1] || '';
const DIR = dirArg?.split('=')[1] || '';
const PATTERN = patternArg?.split('=')[1] || 'skills/*';
const TMP_DIR = join(tmpdir(), 'popebot-skill-discovery', Date.now().toString());

/**
 * Clone a GitHub repository temporarily
 */
function cloneRepo(repo) {
  console.log(`📦 Cloning ${repo}...`);
  const url = `https://github.com/${repo}.git`;
  const cloneDir = join(TMP_DIR, 'repo');
  
  try {
    execSync(`git clone --depth 1 ${url} ${cloneDir}`, {
      stdio: 'pipe',
      timeout: 60000
    });
    return cloneDir;
  } catch (error) {
    console.error(`❌ Failed to clone ${repo}:`, error.message);
    throw error;
  }
}

/**
 * Find all SKILL.md files in a directory
 */
function findSkillFiles(dir, pattern = 'skills/*') {
  const skills = [];
  
  try {
    // Use find command to locate SKILL.md files
    const findPattern = pattern.replace('/*', '/**/SKILL.md');
    const cmd = `find "${dir}" -name "SKILL.md" -type f 2>/dev/null`;
    const result = execSync(cmd, { encoding: 'utf-8' });
    
    const files = result.split('\n').filter(line => line.trim());
    
    for (const file of files) {
      const skillDir = dirname(file);
      const skillInfo = parseSkillFile(file, skillDir);
      if (skillInfo) {
        skills.push(skillInfo);
      }
    }
  } catch (error) {
    // If find fails, do a manual search
    manualSearch(dir, skills);
  }
  
  return skills;
}

/**
 * Manual recursive search for SKILL.md files
 */
function manualSearch(dir, skills, depth = 0) {
  if (depth > 5) return; // Limit recursion depth
  
  try {
    const entries = execSync(`ls -la "${dir}" 2>/dev/null`, { encoding: 'utf-8' });
    const lines = entries.split('\n');
    
    for (const line of lines) {
      if (line.includes('SKILL.md')) {
        const skillFile = join(dir, 'SKILL.md');
        if (existsSync(skillFile)) {
          const skillInfo = parseSkillFile(skillFile, dir);
          if (skillInfo) {
            skills.push(skillInfo);
          }
        }
      }
    }
    
    // Search subdirectories
    const subdirs = lines
      .filter(line => line.startsWith('d') && !line.endsWith(' .') && !line.endsWith(' ..'))
      .map(line => line.split(/\s+/)[8])
      .filter(name => name && !name.startsWith('.'));
    
    for (const subdir of subdirs) {
      manualSearch(join(dir, subdir), skills, depth + 1);
    }
  } catch (error) {
    // Directory not accessible
  }
}

/**
 * Parse a SKILL.md file and extract metadata
 */
function parseSkillFile(filePath, skillDir) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Extract frontmatter (YAML between --- markers)
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null; // No valid frontmatter
    }
    
    const frontmatter = frontmatterMatch[1];
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
    const homepageMatch = frontmatter.match(/^homepage:\s*(.+)$/m);
    
    if (!nameMatch) {
      return null; // No skill name
    }
    
    const name = nameMatch[1].trim();
    const description = descMatch ? descMatch[1].trim() : '';
    const homepage = homepageMatch ? homepageMatch[1].trim() : '';
    
    // Extract metadata
    const metadataMatch = frontmatter.match(/^metadata:\s*\{([\s\S]*?)\}\s*$/m);
    let metadata = {};
    if (metadataMatch) {
      try {
        // Try to parse the metadata as JSON
        const metadataStr = `{${metadataMatch[1]}}`;
        metadata = JSON.parse(metadataStr.replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
      } catch (e) {
        // Metadata parsing failed, skip it
      }
    }
    
    // Check for required binaries/tools
    const requires = metadata.popebot?.requires?.bins || [];
    const install = metadata.popebot?.install || [];
    
    return {
      name,
      description,
      homepage,
      path: skillDir,
      file: filePath,
      metadata,
      requires,
      install,
      source: relative(TMP_DIR, skillDir)
    };
  } catch (error) {
    console.error(`⚠️  Failed to parse ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Copy skill to temporary working directory
 */
function copySkill(skill, destDir) {
  const skillDest = join(destDir, skill.name);
  
  try {
    const skillDirname = dirname(skill.file);
    execSync(`cp -r "${skillDirname}" "${skillDest}"`, { stdio: 'pipe' });
    return skillDest;
  } catch (error) {
    console.error(`❌ Failed to copy skill ${skill.name}:`, error.message);
    return null;
  }
}

/**
 * Main discovery function
 */
async function discover() {
  console.log('🔍 Skill Auto-Installer: Discovery Mode\n');
  
  let repoDir;
  
  try {
    // Clone repo if specified
    if (REPO) {
      repoDir = cloneRepo(REPO);
    } else if (DIR && existsSync(DIR)) {
      repoDir = DIR;
    } else {
      console.error('❌ Error: Must specify --repo=<owner/repo> or --dir=<path>');
      if (!jsonOutput) {
        console.log('\nUsage:');
        console.log('  discover.js --repo=zeroclaw-labs/zeroclaw');
        console.log('  discover.js --dir=/path/to/repo');
        console.log('  discover.js --repo=openclaw/openclaw --pattern="skills/*"');
      }
      process.exit(1);
    }
    
    console.log(`📁 Scanning ${repoDir} for skills...\n`);
    
    // Find all skills
    const skills = findSkillFiles(repoDir, PATTERN);
    
    if (skills.length === 0) {
      const result = {
        status: 'success',
        repo: REPO || DIR,
        skills: [],
        message: 'No skills found'
      };
      
      if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('\n❌ No skills found in repository');
      }
      return result;
    }
    
    // Copy skills to temp directory for evaluation
    const skillsDestDir = join(TMP_DIR, 'skills');
    mkdirSync(skillsDestDir, { recursive: true });
    
    const discoveredSkills = [];
    for (const skill of skills) {
      const copiedPath = copySkill(skill, skillsDestDir);
      if (copiedPath) {
        discoveredSkills.push({
          ...skill,
          tempPath: copiedPath
        });
      }
    }
    
    // Save discovery results
    const resultsFile = join(TMP_DIR, 'discovery-results.json');
    const results = {
      status: 'success',
      repo: REPO || DIR,
      timestamp: new Date().toISOString(),
      tempDir: TMP_DIR,
      skills: discoveredSkills.map(s => ({
        name: s.name,
        description: s.description,
        homepage: s.homepage,
        tempPath: s.tempPath,
        requires: s.requires,
        installMethods: s.install.length
      })),
      totalFound: discoveredSkills.length
    };
    
    writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    // Output results
    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(`\n✅ Discovery Complete!\n`);
      console.log(`📊 Found ${discoveredSkills.length} skill${discoveredSkills.length !== 1 ? 's' : ''}:\n`);
      
      for (const skill of discoveredSkills) {
        console.log(`  ${skill.metadata.popebot?.emoji || '🔧'} ${skill.name}`);
        console.log(`     ${skill.description || 'No description'}`);
        if (skill.requires.length > 0) {
          console.log(`     Requires: ${skill.requires.join(', ')}`);
        }
        if (skill.install.length > 0) {
          console.log(`     Install methods: ${skill.install.map(i => i.id).join(', ')}`);
        }
        console.log('');
      }
      
      console.log(`📁 Skills copied to: ${skillsDestDir}`);
      console.log(`📄 Results saved to: ${resultsFile}`);
      console.log(`\nNext steps:`);
      console.log(`  1. Evaluate: node evaluate.js --path <skill-path>`);
      console.log(`  2. Install: node install.js --path <skill-path> --activate`);
    }
    
    return results;
  } catch (error) {
    const errorResult = {
      status: 'error',
      error: error.message,
      repo: REPO || DIR
    };
    
    if (jsonOutput) {
      console.log(JSON.stringify(errorResult, null, 2));
    } else {
      console.error(`\n❌ Discovery failed:`, error.message);
    }
    
    return errorResult;
  }
}

// Run discovery
discover();
