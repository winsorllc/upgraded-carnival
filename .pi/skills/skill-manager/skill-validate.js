#!/usr/bin/env node
/**
 * Skill Validator - Validate skill structure
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = ['SKILL.md'];
const RECOMMENDED_FILES = ['test.js'];

function validateSkill(skillPath) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  };
  
  // Check path exists
  if (!fs.existsSync(skillPath)) {
    return { valid: false, errors: [`Path does not exist: ${skillPath}`] };
  }
  
  const stat = fs.statSync(skillPath);
  if (!stat.isDirectory()) {
    return { valid: false, errors: [`Path is not a directory: ${skillPath}`] };
  }
  
  // Check required files
  REQUIRED_FILES.forEach(file => {
    const filePath = path.join(skillPath, file);
    if (!fs.existsSync(filePath)) {
      results.errors.push(`Missing required file: ${file}`);
      results.valid = false;
    }
  });
  
  // Validate SKILL.md structure
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf8');
    
    // Check frontmatter
    if (!content.startsWith('---')) {
      results.errors.push('SKILL.md missing frontmatter (must start with ---)');
      results.valid = false;
    } else {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatter) {
        results.errors.push('SKILL.md frontmatter not properly closed');
        results.valid = false;
      } else {
        if (!content.includes('name:')) {
          results.errors.push('SKILL.md missing name field in frontmatter');
          results.valid = false;
        }
        if (!content.includes('description:')) {
          results.warnings.push('SKILL.md missing description field');
        }
      }
    }
    
    // Check for usage section
    if (!content.includes('#')) {
      results.warnings.push('SKILL.md missing header/usage section');
    }
    
    results.info.push(`SKILL.md size: ${content.length} bytes`);
  }
  
  // Check recommended files
  RECOMMENDED_FILES.forEach(file => {
    const filePath = path.join(skillPath, file);
    if (!fs.existsSync(filePath)) {
      results.warnings.push(`Missing recommended file: ${file}`);
    }
  });
  
  // Check for implementation files
  const files = fs.readdirSync(skillPath);
  const implFiles = files.filter(f => !f.startsWith('.') && (f.endsWith('.js') || f.endsWith('.sh') || f.endsWith('.py')));
  if (implFiles.length === 0) {
    results.warnings.push('No implementation files found (.js, .sh, .py)');
  } else {
    results.info.push(`Implementation files: ${implFiles.join(', ')}`);
  }
  
  // Check for test files
  const testFiles = files.filter(f => f.includes('test') && f.endsWith('.js'));
  if (testFiles.length > 0) {
    results.info.push(`Test files: ${testFiles.join(', ')}`);
  }
  
  results.info.push(`Total files: ${files.length}`);
  
  return results;
}

function main() {
  const skillPath = process.argv[2] || '/job/.pi/skills/skill-list';
  const absolute = path.resolve(skillPath);
  
  console.log(`🔍 Validating skill: ${absolute}\n`);
  
  const results = validateSkill(absolute);
  
  // Print results
  if (results.errors.length > 0) {
    console.log('❌ ERRORS:');
    results.errors.forEach(e => console.log(`   - ${e}`));
    console.log();
  }
  
  if (results.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    results.warnings.forEach(w => console.log(`   - ${w}`));
    console.log();
  }
  
  if (results.info.length > 0) {
    console.log('ℹ️  INFO:');
    results.info.forEach(i => console.log(`   - ${i}`));
    console.log();
  }
  
  console.log(results.valid ? '✅ Skill is valid' : '❌ Skill validation failed');
  process.exit(results.valid ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { validateSkill };