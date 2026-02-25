#!/usr/bin/env node
const { validateExpr, describe } = require('./cron-utils.js');

const expr = process.argv[2];
if (!expr) {
  console.error('Usage: cron-validate.js "0 9 * * *"');
  process.exit(1);
}

const result = validateExpr(expr);
if (result.valid) {
  console.log('✅ Valid cron expression');
  console.log(`   Description: ${describe(expr)}`);
  result.fields.forEach(f => {
    console.log(`   ${f.field}: ${f.value}`);
  });
  process.exit(0);
} else {
  console.error('❌ Invalid cron expression');
  console.error(`   Error: ${result.error}`);
  process.exit(1);
}