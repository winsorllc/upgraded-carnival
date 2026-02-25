#!/usr/bin/env node
/**
 * Skill List - List active/installed skills
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = '/job/.pi/skills';

function parseSkillMd(skillPath) {
  try {
    const skillMd = fs.readFileSync(path.join(skillPath, 'SKILL.md'), 'utf8');
    const frontmatter = skillMd.match(/^---\n([\s\S]*?)\n---/);
    
    let name = path.basename(skillPath);
    let description = '';
    
    if (frontmatter) {
      const meta = frontmatter[1];
      const nameMatch = meta.match(/name:\s*(.+)/);
      const descMatch = meta.match(/description:\s*(.+)/);
      if (nameMatch) name = nameMatch[1].trim();
      if (descMatch) description = descMatch[1].trim();
    }
    
    return { name, description, path: skillPath };
  } catch {
    return { name: path.basename(skillPath), description: 'No description', path: skillPath };
  }
}

function listSkills() {
  console.log('📦 Installed Skills\n');
  
  try {
    const skills = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => parseSkillMd(path.join(SKILLS_DIR, d.name)));
    
    const longestName = Math.max(...skills.map(s => s.name.length), 4);
    
    console.log(`  ${'NAME'.padEnd(longestName)}  DESCRIPTION`);
    console.log(`  ${'-'.repeat(longestName + 50)}`);
    
    skills.forEach(skill => {
      const files = fs.readdirSync(skill.path).length;
      const hasTest = fs.existsSync(path.join(skill.path, 'test.js'));
      const status = hasTest ? '✅' : '⚠️ ';
      console.log(`  ${skill.name.padEnd(longestName)}  ${skill.description.slice(0, 50)} ${status}`);
    });
    
    console.log(`\nTotal: ${skills.length} skills`);
    console.log(`With tests: ${skills.filter(s => fs.existsSync(path.join(s.path, 'test.js'))).length}`);
    
    return skills;
  } catch (err) {
    console.error('Error listing skills:', err.message);
    return [];
  }
}

if (require.main === module) {
  listSkills();
}

module.exports = { listSkills, parseSkillMd };