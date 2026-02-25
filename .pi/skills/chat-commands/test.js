#!/usr/bin/env node
const assert = require('assert');
const { execSync } = require('child_process');

console.log('🧪 Testing chat-commands...\n');

['/', '/status', '/help', '/skills', '/health'].forEach(cmd => {
  const out = execSync(`node /job/.pi/skills/chat-commands/chat.js "${cmd}"`, { encoding: 'utf8' });
  assert(out.length > 0, `Command ${cmd} should produce output`);
  console.log(`  ✓ ${cmd}`);
});

console.log('\n' + '='.repeat(50));
console.log('✅ All tests passed!');
console.log('='.repeat(50));
