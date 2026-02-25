#!/usr/bin/env node
/**
 * Skill Creator - Create new skill template
 */

const fs = require('fs');
const path = require('path');

function createSkill(name, baseDir = '/job/.pi/skills') {
  const skillDir = path.join(baseDir, name);
  
  if (fs.existsSync(skillDir)) {
    console.error(`❌ Skill already exists: ${skillDir}`);
    return false;
  }
  
  // Create directory
  fs.mkdirSync(skillDir, { recursive: true });
  
  // Create SKILL.md
  const skillMd = `---
name: ${name}
description: ${name} skill - briefly describe what this skill does
---

# ${name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')}

Brief description of the skill's purpose and capabilities.

## Capabilities

- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

## Usage

\`\`\`bash
# Example command
/job/.pi/skills/${name}/main.js
\`\`\`

## When to Use

- When you need to do X
- When you need to do Y

## Configuration

Optional configuration details.
`;
  
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd);
  
  // Create basic implementation
  const impl = `#!/usr/bin/env node
/**
 * ${name} skill implementation
 */

function main() {
  console.log('${name} skill is working!');
}

if (require.main === module) {
  main();
}

module.exports = { main };
`;
  
  fs.writeFileSync(path.join(skillDir, 'main.js'), impl);
  
  // Create test file
  const test = `#!/usr/bin/env node
/**
 * Test for ${name} skill
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing ${name} skill...\\n');

// Test 1: Files exist
console.log('Test 1: Check files exist');
const skillDir = __dirname;
const requiredFiles = ['SKILL.md', 'main.js'];

requiredFiles.forEach(file => {
  const filePath = path.join(skillDir, file);
  assert(fs.existsSync(filePath), \\\`Missing file: \${file}\\\`);
  console.log(\`  ✓ \${file} exists\`);
});

console.log('\\n✅ All tests passed!');
`;
  
  fs.writeFileSync(path.join(skillDir, 'test.js'), test);
  
  console.log(`✅ Created skill: ${name}`);
  console.log(`   Location: ${skillDir}`);
  console.log(`   Files created:`);
  console.log(`      - SKILL.md`);
  console.log(`      - main.js`);
  console.log(`      - test.js`);
  console.log(`\n   Next steps:`);
  console.log(`      1. Edit ${skillDir}/SKILL.md`);
  console.log(`      2. Implement ${skillDir}/main.js`);
  console.log(`      3. Run tests: node ${skillDir}/test.js`);
  
  return skillDir;
}

function main() {
  const name = process.argv[2];
  
  if (!name) {
    console.error('Usage: skill-create.js <skill-name>');
    console.error('Example: skill-create.js my-new-skill');
    process.exit(1);
  }
  
  // Validate name
  if (!/^[a-z0-9-]+$/.test(name)) {
    console.error('Error: Skill name must be lowercase letters, numbers, and hyphens only');
    process.exit(1);
  }
  
  if (name.length < 2 || name.length > 50) {
    console.error('Error: Skill name must be 2-50 characters');
    process.exit(1);
  }
  
  const dir = process.argv[3] || '/job/.pi/skills';
  createSkill(name, dir);
}

if (require.main === module) {
  main();
}

module.exports = { createSkill };