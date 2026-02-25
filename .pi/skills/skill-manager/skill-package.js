#!/usr/bin/env node
/**
 * Skill Packager - Package skills for distribution
 */

const fs = require('fs');
const path = require('path');

function packageSkill(skillPath, outputDir) {
  const skillName = path.basename(skillPath);
  const output = path.join(outputDir, `${skillName}.tar.gz`);
  
  // Ensure output dir exists
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Validate skill first
  const validate = require('./skill-validate.js');
  const validation = validate.validateSkill(skillPath);
  
  if (!validation.valid) {
    console.error('❌ Skill validation failed. Cannot package.');
    validation.errors.forEach(e => console.error(`   - ${e}`));
    return false;
  }
  
  // Create tar.gz
  const { execSync } = require('child_process');
  try {
    execSync(\`tar -czf "\${output}" -C "\${path.dirname(skillPath)}" "\${skillName}"\`, { stdio: 'inherit' });
    
    const stats = fs.statSync(output);
    console.log('✅ Packaged successfully');
    console.log(\`   Output: \${output}\`);
    console.log(\`   Size: \${(stats.size / 1024).toFixed(2)} KB\`);
    
    return output;
  } catch (err) {
    console.error('❌ Packaging failed:', err.message);
    return false;
  }
}

function main() {
  const skillPath = process.argv[2];
  const outputDir = process.argv[3] || '/tmp/skill-packages';
  
  if (!skillPath) {
    console.error('Usage: skill-package.js <skill-path> [output-dir]');
    process.exit(1);
  }
  
  const absolute = path.resolve(skillPath);
  packageSkill(absolute, outputDir);
}

if (require.main === module) {
  main();
}

module.exports = { packageSkill };