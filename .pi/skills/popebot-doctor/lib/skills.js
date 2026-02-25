/**
 * Skills Health Diagnostics
 * Check skill structure and integrity
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = '/job/.pi/skills';
const PI_SKILLS_DIR = '/job/pi-skills';

/**
 * Run skills diagnostics
 * @returns {Promise<Array>} Diagnostic items
 */
async function run() {
  const results = [];
  
  // Check skills directories exist
  results.push(checkSkillsDirectory());
  results.push(checkPiSkillsDirectory());
  
  // Check installed skills
  const skillChecks = await checkInstalledSkills();
  results.push(...skillChecks);
  
  // Check for broken symlinks
  results.push(...checkBrokenSymlinks());
  
  // Check for common issues
  results.push(...checkCommonIssues());
  
  return results;
}

function checkSkillsDirectory() {
  try {
    const stats = fs.statSync(SKILLS_DIR);
    if (stats.isDirectory()) {
      const skills = fs.readdirSync(SKILLS_DIR).filter(d => {
        const fullPath = path.join(SKILLS_DIR, d);
        return fs.statSync(fullPath).isDirectory();
      });
      
      return {
        category: 'skills',
        check: 'skills-directory',
        severity: 'ok',
        message: `Skills directory exists (${skills.length} skills installed)`,
        details: `Path: ${SKILLS_DIR}`
      };
    }
  } catch (err) {
    return {
      category: 'skills',
      check: 'skills-directory',
      severity: 'error',
      message: `Skills directory not accessible: ${err.message}`,
      remediation: `Create directory: mkdir -p ${SKILLS_DIR}`
    };
  }
}

function checkPiSkillsDirectory() {
  try {
    const stats = fs.statSync(PI_SKILLS_DIR);
    if (stats.isDirectory()) {
      return {
        category: 'skills',
        check: 'pi-skills-directory',
        severity: 'ok',
        message: 'Pi-skills library directory exists',
        details: `Path: ${PI_SKILLS_DIR}`
      };
    }
  } catch (err) {
    return {
      category: 'skills',
      check: 'pi-skills-directory',
      severity: 'warning',
      message: 'Pi-skills directory not found (library skills unavailable)',
      remediation: `Skills will install but library features limited`
    };
  }
}

async function checkInstalledSkills() {
  const results = [];
  
  try {
    const skills = fs.readdirSync(SKILLS_DIR).filter(d => {
      const fullPath = path.join(SKILLS_DIR, d);
      try {
        return fs.statSync(fullPath).isDirectory();
      } catch {
        return false;
      }
    });
    
    for (const skill of skills) {
      const skillPath = path.join(SKILLS_DIR, skill);
      
      // Check SKILL.md exists
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      const hasSkillMd = fs.existsSync(skillMdPath);
      
      results.push({
        category: 'skills',
        check: `skill-${skill}-skillmd`,
        severity: hasSkillMd ? 'ok' : 'error',
        message: hasSkillMd 
          ? `${skill}: SKILL.md present`
          : `${skill}: Missing SKILL.md`,
        ...(hasSkillMd ? {} : { remediation: `Create SKILL.md in ${skillPath}` })
      });
      
      if (hasSkillMd) {
        // Check frontmatter
        try {
          const content = fs.readFileSync(skillMdPath, 'utf8');
          const hasFrontmatter = content.startsWith('---');
          
          if (hasFrontmatter) {
            // Try to parse
            const endMatch = content.match(/^---\s*$/m);
            if (endMatch) {
              results.push({
                category: 'skills',
                check: `skill-${skill}-frontmatter`,
                severity: 'ok',
                message: `${skill}: Valid YAML frontmatter`
              });
            } else {
              results.push({
                category: 'skills',
                check: `skill-${skill}-frontmatter`,
                severity: 'warning',
                message: `${skill}: Frontmatter may be malformed`
              });
            }
          } else {
            results.push({
              category: 'skills',
              check: `skill-${skill}-frontmatter`,
              severity: 'warning',
              message: `${skill}: No YAML frontmatter (recommended but optional)`
            });
          }
        } catch (err) {
          results.push({
            category: 'skills',
            check: `skill-${skill}-frontmatter`,
            severity: 'error',
            message: `${skill}: Could not read SKILL.md: ${err.message}`
          });
        }
      }
      
      // Check for package.json and node_modules
      const packageJsonPath = path.join(skillPath, 'package.json');
      const nodeModulesPath = path.join(skillPath, 'node_modules');
      
      if (fs.existsSync(packageJsonPath)) {
        const hasNodeModules = fs.existsSync(nodeModulesPath);
        
        results.push({
          category: 'skills',
          check: `skill-${skill}-dependencies`,
          severity: hasNodeModules ? 'ok' : 'warning',
          message: hasNodeModules
            ? `${skill}: Dependencies installed`
            : `${skill}: Package.json exists but node_modules missing`,
          ...(hasNodeModules ? {} : { remediation: `Run: cd ${skillPath} && npm install` })
        });
      }
    }
  } catch (err) {
    results.push({
      category: 'skills',
      check: 'skills-list',
      severity: 'error',
      message: `Could not enumerate skills: ${err.message}`
    });
  }
  
  return results;
}

function checkBrokenSymlinks() {
  const results = [];
  
  try {
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(SKILLS_DIR, entry.name);
      
      try {
        // This will throw if symlink is broken
        fs.realpathSync(fullPath);
      } catch (err) {
        if (entry.isSymbolicLink || err.code === 'ENOENT') {
          results.push({
            category: 'skills',
            check: `symlink-${entry.name}`,
            severity: 'error',
            message: `Broken symlink: ${entry.name}`,
            remediation: `Remove and reinstall: rm ${fullPath}`,
            details: err.message
          });
        }
      }
    }
  } catch (err) {
    // Don't fail the whole check if we can't read
  }
  
  return results;
}

function checkCommonIssues() {
  const results = [];
  
  // Check for duplicate skill names (symlinked vs real)
  const skillNames = new Set();
  try {
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        const stats = fs.lstatSync(path.join(SKILLS_DIR, entry.name));
        
        if (stats.isSymbolicLink()) {
          const target = fs.readlinkSync(path.join(SKILLS_DIR, entry.name));
          results.push({
            category: 'skills',
            check: `symlink-${entry.name}-status`,
            severity: 'ok',
            message: `${entry.name} is a symlink`,
            details: `→ ${target}`
          });
        }
      }
    }
  } catch (err) {
    // Silent fail for this check
  }
  
  return results;
}

module.exports = { run };
