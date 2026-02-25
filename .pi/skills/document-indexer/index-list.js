#!/usr/bin/env node
const { loadIndex } = require('./index-add.js');

const index = loadIndex();

console.log(`📚 Document Index (${index.length} documents)\n`);

const byCategory = index.reduce((acc, d) => {
  acc[d.category] = acc[d.category] || [];
  acc[d.category].push(d);
  return acc;
}, {});

Object.entries(byCategory).forEach(([cat, docs]) => {
  console.log(`\n## ${cat} (${docs.length})`);
  docs.forEach(d => {
    console.log(`  • ${d.title} (${Math.round(d.size / 1024)}KB) - ${d.keywords.slice(0, 3).join(', ')}`);
  });
});

console.log();
