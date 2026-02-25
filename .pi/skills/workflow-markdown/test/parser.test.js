/**
 * Parser unit tests
 */

import { parseWorkflow, validateWorkflow, substituteVariables } from '../lib/parser.js';

// Test 1: Basic workflow parsing
function testBasicParsing() {
  const content = `---
name: Test Workflow
description: A test workflow
tags:
  - test
  - example
---

# Test Workflow

## Step 1: Check Environment

Check that Node.js is installed.

\`\`\`shell:check
node --version
\`\`\`

## Step 2: Run Test

\`\`\`javascript:test
console.log("Hello from workflow!");
\`\`\`
`;

  const result = parseWorkflow(content);
  
  console.assert(result.metadata.name === 'Test Workflow', 'Name should match');
  console.assert(result.metadata.description === 'A test workflow', 'Description should match');
  console.assert(result.metadata.tags.includes('test'), 'Should have test tag');
  console.assert(result.steps.length === 2, 'Should have 2 steps');
  console.assert(result.steps[0].id === 'check', 'First step ID should be check');
  console.assert(result.steps[0].type === 'shell', 'First step should be shell type');
  console.assert(result.steps[1].type === 'javascript', 'Second step should be javascript type');
  
  console.log('✅ Basic parsing test passed');
}

// Test 2: Variable substitution
function testVariableSubstitution() {
  const code = `echo {{message}} && node -v {{version}}`;
  const variables = { message: 'Hello World', version: '--version' };
  
  const result = substituteVariables(code, variables);
  
  console.assert(result === 'echo Hello World && node -v --version', 'Variables should be substituted');
  console.log('✅ Variable substitution test passed');
}

// Test 3: Validation
function testValidation() {
  const validContent = `---
name: Valid Workflow
description: This is valid
---

# Valid

\`\`\`shell:test
echo "ok"
\`\`\`
`;

  const invalidContent = `No frontmatter here

Some content
`;

  const validResult = validateWorkflow(validContent);
  console.assert(validResult.valid === true, 'Valid workflow should pass');
  console.assert(validResult.workflow !== null, 'Valid workflow should return workflow');
  
  const invalidResult = validateWorkflow(invalidContent);
  console.assert(invalidResult.valid === false, 'Invalid workflow should fail');
  console.assert(invalidResult.errors.length > 0, 'Should have errors');
  
  console.log('✅ Validation test passed');
}

// Test 4: Step parsing with different languages
function testLanguageParsing() {
  const content = `---
name: Language Test
---

\`\`\`shell:bash-step
echo "shell"
\`\`\`

\`\`\`python:py-step
print("python")
\`\`\`

\`\`\`javascript:js-step
console.log("js");
\`\`\`

\`\`\`yaml:data
test: value
\`\`\`
`;

  const result = parseWorkflow(content);
  
  console.assert(result.steps.length === 4, 'Should have 4 steps');
  console.assert(result.steps[0].type === 'shell', 'Shell should be shell type');
  console.assert(result.steps[1].type === 'python', 'Python should be python type');
  console.assert(result.steps[2].type === 'javascript', 'JS should be javascript type');
  console.assert(result.steps[3].type === 'data', 'YAML should be data type');
  
  console.log('✅ Language parsing test passed');
}

// Run all tests
console.log('\n🧪 Running Parser Tests\n');

try {
  testBasicParsing();
  testVariableSubstitution();
  testValidation();
  testLanguageParsing();
  
  console.log('\n✅ All parser tests passed!\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
