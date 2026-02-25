#!/usr/bin/env node
const { search } = require('./index-add.js');

const query = process.argv.slice(2).join(' ');
if (!query) {
  console.error('Usage: index-search.js "search query"');
  process.exit(1);
}

const results = search(query, { limit: parseInt(process.env.LIMIT) || 10 });

console.log(`🔍 Search: "${query}"\n`);
console.log(`Found ${results.length} results\n`);

results.forEach((r, i) => {
  console.log(`${i + 1}. ${r.title} [${r.category}] (score: ${r.score})`);
  console.log(`   Keywords: ${r.keywords.slice(0, 5).join(', ')}`);
  console.log(`   Preview: ${r.preview?.slice(0, 100)}...`);
  console.log();
});
