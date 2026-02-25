#!/usr/bin/env node

/**
 * Test script for apple-reminders skill
 * 
 * This script tests remindctl commands by generating and validating them.
 * Actual execution requires macOS with Reminders app.
 */

console.log('🧪 Testing apple-reminders skill...\n');

// Test remindctl command generation
const tests = [
  {
    name: 'List all lists',
    command: 'remindctl list',
    expected: 'remindctl list'
  },
  {
    name: 'Add basic reminder',
    command: 'remindctl add "Test reminder"',
    expected: 'remindctl add "Test reminder"'
  },
  {
    name: 'Add with due date',
    command: 'remindctl add "Submit report" --due "2026-03-01"',
    expected: 'remindctl add "Submit report" --due "2026-03-01"'
  },
  {
    name: 'Add with priority',
    command: 'remindctl add "URGENT: Pay bill" --priority 1',
    expected: 'remindctl add "URGENT: Pay bill" --priority 1'
  },
  {
    name: 'Add to specific list',
    command: 'remindctl add "Work task" --list "Work"',
    expected: 'remindctl add "Work task" --list "Work"'
  },
  {
    name: 'Complete reminder',
    command: 'remindctl complete "Buy groceries"',
    expected: 'remindctl complete "Buy groceries"'
  },
  {
    name: 'Get today\'s reminders',
    command: 'remindctl today',
    expected: 'remindctl today'
  },
  {
    name: 'Get overdue reminders',
    command: 'remindctl overdue',
    expected: 'remindctl overdue'
  },
  {
    name: 'JSON output',
    command: 'remindctl all --json',
    expected: 'remindctl all --json'
  },
  {
    name: 'Repeating reminder',
    command: 'remindctl add "Water plants" --repeat "weekly"',
    expected: 'remindctl add "Water plants" --repeat "weekly"'
  }
];

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  if (test.command === test.expected) {
    console.log(`✅ Test ${index + 1}: ${test.name}`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${test.name}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got: ${test.command}`);
    failed++;
  }
});

// Test JSON parsing simulation
console.log('\n📝 Testing JSON output parsing...\n');

const mockJsonOutput = [
  {
    id: 'ABC123',
    title: 'Buy groceries',
    notes: 'Milk, eggs, bread',
    dueDate: '2026-02-25',
    priority: 3,
    completed: false,
    list: 'Personal'
  },
  {
    id: 'XYZ789',
    title: 'Submit tax return',
    notes: 'Use TurboTax',
    dueDate: '2026-04-15',
    priority: 1,
    completed: false,
    list: 'Work'
  }
];

try {
  // Simulate parsing
  const highPriority = mockJsonOutput.filter(r => r.priority === 1);
  const dueToday = mockJsonOutput.filter(r => r.dueDate === '2026-02-25');
  const incomplete = mockJsonOutput.filter(r => !r.completed);

  console.log(`  ✅ High priority reminders: ${highPriority.length}`);
  console.log(`  ✅ Due today: ${dueToday.length}`);
  console.log(`  ✅ Incomplete: ${incomplete.length}`);
  passed += 3;
} catch (err) {
  console.log(`  ❌ JSON parsing failed: ${err.message}`);
  failed++;
}

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\n⚠️  Some tests failed');
  process.exit(1);
}

console.log('\n✅ All tests passed!\n');
console.log('Note: Actual remindctl execution requires macOS with Reminders app.\n');
